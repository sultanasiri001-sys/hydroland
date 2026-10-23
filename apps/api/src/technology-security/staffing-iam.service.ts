import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { lockActiveSessionAccount } from '../auth/account-session-lock';
import { intentKey, platformOrganization, platformOwnerCanReview, profileFor, readIntent, record } from '../hr/staffing-catalog';

@Injectable()
export class StaffingIamService {
  constructor(private readonly audit:AuditService){}

  // Internal IAM boundary: the caller supplies the same transaction that makes
  // the reviewed appointment effective. No client can supply role/scope grants.
  async applyAppointment(tx:Prisma.TransactionClient,movementId:string){
    const movement=await tx.employmentMovement.findUniqueOrThrow({where:{id:movementId},include:{employment:{include:{orgUnit:true,position:true}}}});
    const employment=movement.employment,organization=await platformOrganization(tx);
    const intent=readIntent((await tx.operationalSetting.findUnique({where:{key:intentKey(movement.id)}}))?.value);
    if(!organization||movement.type!=='APPOINTMENT'||movement.status!=='APPROVED'||employment.status!=='ACTIVE'||
      !movement.reviewedByAccountId||!movement.approvedByAccountId||
      movement.approvedByAccountId===movement.requestedByAccountId||movement.approvedByAccountId===movement.reviewedByAccountId||
      !platformOwnerCanReview(organization,movement.reviewedByAccountId,employment.accountId)||
      [movement.reviewedByAccountId,movement.approvedByAccountId].includes(employment.accountId)||
      organization.id!==employment.organizationId||!employment.orgUnit.active||!employment.position?.active||employment.position.orgUnitId!==employment.orgUnitId||movement.toOrgUnitId!==employment.orgUnitId||movement.toPositionId!==employment.positionId||
      intent.employmentId!==employment.id||intent.accountId!==employment.accountId||intent.organizationId!==organization.id||intent.orgUnitId!==employment.orgUnitId||intent.positionId!==employment.positionId){
      throw new ConflictException('تطبيق الصلاحيات يتطلب تعيينًا معتمدًا مستقلًا مطابقًا للطلب.');
    }
    const actor=await requireVerifiedAdmin(tx,movement.approvedByAccountId);
    await requireVerifiedAdmin(tx,movement.reviewedByAccountId);await requireVerifiedAdmin(tx,movement.requestedByAccountId);
    await lockActiveSessionAccount(tx,employment.accountId);
    const candidate=await tx.hrCandidate.findUnique({where:{organizationId_personId:{organizationId:organization.id,personId:(await tx.account.findUniqueOrThrow({where:{id:employment.accountId},select:{personId:true}})).personId}}});
    if(candidate?.status!=='APPROVED'||candidate.verifiedByAccountId!==movement.reviewedByAccountId)throw new ConflictException('يلزم تحقق الموارد البشرية المطابق للمراجعة.');
    const profile=profileFor(intent.profile,employment.orgUnit.code);
    const previous=[];
    for(const role of profile.roles){
      const existing=await tx.roleAssignment.findUnique({where:{accountId_role:{accountId:employment.accountId,role}}});
      if(existing&&existing.status!=='ACTIVE')throw new ConflictException('توجد صلاحية معلقة أو مؤرشفة؛ يلزم مسار مراجعة الصلاحيات قبل تفعيلها.');
      previous.push({role,status:existing?.status??null,scope:existing?.scope??null});
      // A pre-existing ordinary STAFF assignment is sufficient; never replace its scope.
      if(existing&&role==='STAFF')continue;
      const scope=record(existing?.scope),ids=scope.organizationIds;
      if(existing&&(!Array.isArray(ids)||!ids.every(id=>typeof id==='string')))throw new ConflictException('نطاق الصلاحية الحالية غير قابل للتوسيع من طلب التوظيف.');
      const departmentIds=Array.isArray(scope.departmentIds)?scope.departmentIds.filter((id):id is string=>typeof id==='string'):[];
      const nextScope={...scope,organizationIds:[...new Set([...(Array.isArray(ids)?ids as string[]:[]),organization.id])],departmentIds:[...new Set([...departmentIds,employment.orgUnitId])]};
      if(existing)await tx.roleAssignment.update({where:{id:existing.id},data:{scope:nextScope as Prisma.InputJsonValue}});
      else await tx.roleAssignment.create({data:{accountId:employment.accountId,role,status:'ACTIVE',activeAt:new Date(),scope:nextScope as Prisma.InputJsonValue}});
    }
    const member=await tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId:organization.id,accountId:employment.accountId}}});
    if(member&&member.status!=='ACTIVE')throw new ConflictException('عضوية الجهة الداخلية تحتاج مراجعة مستقلة قبل منح الوصول.');
    if(!member)await tx.organizationMember.create({data:{organizationId:organization.id,accountId:employment.accountId,role:'STAFF',status:'ACTIVE'}});
    const revoked=await tx.session.updateMany({where:{accountId:employment.accountId,revokedAt:null},data:{revokedAt:new Date()}});
    await this.audit.record({actorId:actor.personId,action:'STAFFING_IAM_APPLIED',resource:'Employment',resourceId:employment.id,metadata:{movementId,organizationId:organization.id,departmentId:employment.orgUnitId,profile:profile.code,previous,roles:[...profile.roles],revokedSessionCount:revoked.count,requiresNewLogin:true}},tx);
    return {roles:[...profile.roles],requiresNewLogin:true,revokedSessionCount:revoked.count};
  }
}
