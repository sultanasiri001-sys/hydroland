import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { reviewPlatform } from '../document-forms/internal-document-review.domain';
import { decisionDigest, scopeId } from '../document-forms/owner-administrative-decision.domain';
import { registrationCorrectionInput, REGISTRATION_CORRECTION_NOTICE } from './marine-registration.domain';
import { Prisma } from '@prisma/client';

@Injectable()
export class MarineRegistrationService {
  constructor(private readonly db:DatabaseService){}
  private async owner(tx:Prisma.TransactionClient,actorId:string){const p=await reviewPlatform(tx);if(p.ownerId!==actorId)throw new ForbiddenException('تصحيح التسجيل متاح لمالك المنصة المتحقق فقط.');return p;}
  private async snapshot(tx:Prisma.TransactionClient,actorId:string,id:string){
    const authority=await this.owner(tx,actorId);
    const asset=await tx.marineAsset.findUnique({where:{id},include:{documents:{orderBy:{id:'asc'}}}});
    if(!asset)throw new NotFoundException('الأصل البحري غير موجود.');
    const organization=await tx.organization.findUnique({where:{id:asset.organizationId},select:{id:true,status:true,updatedAt:true}});
    if(!organization||organization.status!=='ACTIVE')throw new ConflictException('جهة الأصل غير نشطة؛ يلزم مراجعتها.');
    const revision=decisionDigest(JSON.parse(JSON.stringify({authority,asset,organization})));
    return {authority,asset,revision};
  }
  async read(actorId:string,id:string){scopeId(id);return this.db.serializable(async tx=>{const s=await this.snapshot(tx,actorId,id);const last=await tx.auditEvent.findFirst({where:{action:'MARINE_REGISTRATION_CORRECTED',resource:'MarineAsset',resourceId:id},orderBy:[{occurredAt:'desc'},{id:'desc'}],select:{id:true}});return {id:s.asset.id,name:s.asset.name,registrationNumber:s.asset.registrationNumber,status:s.asset.status,revision:s.revision,canCorrect:s.asset.status==='DRAFT',verifiedDocumentCount:s.asset.documents.filter(d=>d.status==='VERIFIED').length,latestCorrectionReference:last?'MRC-'+last.id:null,notice:REGISTRATION_CORRECTION_NOTICE};});}
  async correct(actorId:string,id:string,body:unknown){
    scopeId(id);const input=registrationCorrectionInput(body);
    return this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
      const initial=await this.owner(tx,actorId);await lockAccountIdentities(tx,[actorId]);
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${initial.id} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${initial.id} AND "accountId"::text=${actorId} FOR SHARE`;
      await this.owner(tx,actorId);
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`marine-registration:${input.registrationNumber}`},0))`;
      await tx.$queryRaw`SELECT "id" FROM "MarineAsset" WHERE "id"::text=${id} FOR UPDATE`;
      const initialAsset=await tx.marineAsset.findUnique({where:{id},select:{organizationId:true}});
      if(!initialAsset)throw new NotFoundException('الأصل البحري غير موجود.');
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${initialAsset.organizationId} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "MarineAssetDocument" WHERE "marineAssetId"::text=${id} ORDER BY "id" FOR UPDATE`;
      const s=await this.snapshot(tx,actorId,id);
      if(s.asset.status!=='DRAFT')throw new ConflictException('هذا التصحيح متاح للأصول المسودة فقط.');
      if(s.revision!==input.expectedRevision)throw new ConflictException('تغير الأصل أو الوثائق أو صلاحية المالك؛ أعد القراءة.');
      if(s.asset.registrationNumber===input.registrationNumber)throw new ConflictException('رقم التسجيل مسجل بالفعل؛ لا يلزم حفظه مجددًا.');
      const duplicates=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "MarineAsset" WHERE "id"::text<>${id} AND upper(btrim(translate("registrationNumber",'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789')))=${input.registrationNumber} LIMIT 1`;
      if(duplicates.length)throw new ConflictException('رقم التسجيل مستخدم؛ راجع السجل الموجود بدل إنشاء تعارض.');
      const reviewed=s.asset.documents.filter(d=>d.status==='VERIFIED').map(d=>d.id);
      await tx.marineAsset.update({where:{id},data:{registrationNumber:input.registrationNumber}});
      await tx.marineAssetDocument.updateMany({where:{marineAssetId:id,status:'VERIFIED'},data:{status:'PENDING',verifiedAt:null}});
      await tx.marineReadinessSnapshot.create({data:{marineAssetId:id,status:'NOT_READY',checkedByAccountId:actorId,reasonCodes:['REGISTRATION_IDENTITY_CHANGED','DOCUMENT_REVIEW_REQUIRED']}});
      const audit=await tx.auditEvent.create({data:{actorId:s.authority.ownerPersonId,action:'MARINE_REGISTRATION_CORRECTED',resource:'MarineAsset',resourceId:id,metadata:{accountId:actorId,previousRegistrationNumber:s.asset.registrationNumber,registrationNumber:input.registrationNumber,reason:input.reason,expectedRevision:s.revision,documentsReturnedForReview:reviewed,activated:false}}});
      return {reference:'MRC-'+audit.id,marineAssetId:id,registrationNumber:input.registrationNumber,documentsReturnedForReview:reviewed.length,activated:false,notice:REGISTRATION_CORRECTION_NOTICE};
    });
  }
}
