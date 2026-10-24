import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization } from './staffing-catalog';
import { exact, reviewReason, uuid } from './hr-control-review.domain';
import { lockOwnerReview, ownerReviewKey, ownerReviewStatus, OWNER_REVIEW_SCOPES, OwnerReviewGrant } from './temporary-owner-review';

@Injectable()
export class TemporaryOwnerReviewService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
  async get(actorId:string){return this.db.serializable(async tx=>{await requireVerifiedAdmin(tx,actorId);const status=await ownerReviewStatus(tx,actorId);if(!status.canManage)throw new ForbiddenException('إدارة المراجعة المؤقتة لمالك هيدرولاند فقط.');return status;});}
  async change(actorId:string,body:unknown){
    const x=exact(body,['action','durationMinutes','expectedRevision','reason','reviewed']),reason=reviewReason(x);
    if(!['ENABLE','DISABLE'].includes(String(x.action))||x.expectedRevision!==null&&!uuid(x.expectedRevision))throw new BadRequestException('الإجراء أو نسخة الإعداد غير صالحين.');
    if(x.action==='ENABLE'&&(!Number.isInteger(x.durationMinutes)||Number(x.durationMinutes)<1||Number(x.durationMinutes)>1440)||x.action==='DISABLE'&&x.durationMinutes!==undefined)throw new BadRequestException('اختر مدة من دقيقة إلى 24 ساعة.');
    return this.db.serializable(async tx=>{
      await lockOwnerReview(tx);
      const platform=await platformOrganization(tx);if(!platform||platform.ownerId!==actorId)throw new ForbiddenException('إدارة المراجعة المؤقتة لمالك هيدرولاند فقط.');
      await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
      await lockAccountIdentities(tx,[actorId]);const actor=await requireVerifiedAdmin(tx,actorId);
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${platform.id} FOR UPDATE`;
      const status=await ownerReviewStatus(tx,actorId);if(!status.canManage)throw new ForbiddenException();
      if(status.revision!==x.expectedRevision)throw new ConflictException('تغير إعداد المراجعة المؤقتة؛ حدّث البيانات وأكد الإجراء من جديد.');
      const org=await tx.organization.findUniqueOrThrow({where:{id:platform.id},select:{updatedAt:true}}),now=new Date();
      const grant:OwnerReviewGrant={version:1,grantId:randomUUID(),ownerId:actorId,organizationId:platform.id,organizationRevision:org.updatedAt.toISOString(),enabled:x.action==='ENABLE',issuedAt:now.toISOString(),expiresAt:new Date(now.getTime()+(x.action==='ENABLE'?Number(x.durationMinutes)*60000:1)).toISOString()};
      await tx.operationalSetting.upsert({where:{key:ownerReviewKey(platform.id)},create:{key:ownerReviewKey(platform.id),value:grant as unknown as Prisma.InputJsonValue},update:{value:grant as unknown as Prisma.InputJsonValue}});
      await this.audit.record({actorId:actor.personId,action:grant.enabled?'TEMPORARY_OWNER_REVIEW_ENABLED':'TEMPORARY_OWNER_REVIEW_DISABLED',resource:'Organization',resourceId:platform.id,metadata:{reason,previousRevision:status.revision,grantId:grant.grantId,issuedAt:grant.issuedAt,expiresAt:grant.expiresAt,scopes:OWNER_REVIEW_SCOPES,permissionsApplied:false}},tx);
      return ownerReviewStatus(tx,actorId);
    });
  }
}
