import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {DatabaseService} from '../database/database.service';
import {AuditService} from '../audit/audit.service';
import {CenterLicenseService} from './center-license.service';
const types=['LICENSE','PERMIT','CERTIFICATE','REGULATORY_APPROVAL'];
@Injectable()
export class CenterLicensePlatformReviewService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly licenses:CenterLicenseService){}
 async submit(actor:string,organizationId:string,id:string){
  return this.db.serializable(async tx=>{
   const [member,role]=await Promise.all([
    tx.organizationMember.findFirst({where:{accountId:actor,organizationId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{status:'ACTIVE',kind:{contains:'DIVE',mode:'insensitive'}}}}),
    tx.roleAssignment.findFirst({where:{accountId:actor,status:'ACTIVE',role:'DIVE_CENTER'}}),
   ]);
   if(!member||!role)throw new ForbiddenException('Center manager scope required.');
   const row=await tx.administrativeRecord.findFirst({where:{id,organizationId,type:{in:types}}});
   if(!row)throw new NotFoundException('License not found in managed center.');
   if(row.licenseReviewStatus==='PENDING')return {id,status:'PENDING'};
   if(row.licenseReviewStatus||!['DRAFT','REGISTERED'].includes(row.status))throw new ConflictException('سبق البت في هذه الرخصة. أضف سجل تجديد لإرسال نسخة جديدة.');
   if(!row.licenseAssetId||!row.licenseIssuedAt||!row.licenseExpiresAt)throw new ConflictException('احفظ ملف الرخصة وتواريخها أولًا.');
   const asset=await tx.organizationDocumentAsset.findFirst({where:{id:row.licenseAssetId,organizationId,kind:'LICENSE_ATTACHMENT'}});
   if(!asset||createHash('sha256').update(Buffer.from(asset.content)).digest('hex')!==asset.sha256)throw new ConflictException('تعذر التحقق من سلامة المرفق.');
   const claimed=await tx.administrativeRecord.updateMany({where:{id,organizationId,updatedAt:row.updatedAt,licenseReviewStatus:null},data:{status:'REGISTERED',licenseReviewStatus:'PENDING',licenseReviewSubmittedAt:new Date(),licenseReviewSubmittedById:actor}});
   if(claimed.count!==1)throw new ConflictException('تغيرت الرخصة. حدّث الصفحة ثم أعد الإرسال.');
   await this.audit.record({actorId:actor,action:'CENTER_LICENSE_PLATFORM_SUBMITTED',resource:'AdministrativeRecord',resourceId:id,metadata:{organizationId,assetId:asset.id,sha256:asset.sha256}},tx);
   return {id,status:'PENDING'};
  });
 }
 list(){return this.db.administrativeRecord.findMany({where:{type:{in:types},licenseReviewStatus:'PENDING'},select:{id:true,organizationId:true,referenceNumber:true,subject:true,type:true,licenseIssuedAt:true,licenseExpiresAt:true,licenseReviewStatus:true,licenseReviewSubmittedAt:true,updatedAt:true,organization:{select:{displayName:true,regionCode:true}}},orderBy:{licenseReviewSubmittedAt:'asc'},take:200});}
 async download(id:string){
  const row=await this.db.administrativeRecord.findFirst({where:{id,type:{in:types},licenseReviewStatus:{not:null}},select:{organizationId:true}});
  if(!row)throw new NotFoundException('Submitted center license not found.');
  return this.licenses.download(row.organizationId,id);
 }
 async decide(actor:string,id:string,input:{outcome?:unknown;reason?:unknown;expectedUpdatedAt?:unknown}){
  if(!['APPROVED','REJECTED'].includes(String(input?.outcome)))throw new BadRequestException('اختر اعتمادًا أو رفضًا.');
  const outcome=String(input.outcome),reason=typeof input.reason==='string'?input.reason.trim():'';
  if(reason.length>1000||(outcome==='REJECTED'&&reason.length<5))throw new BadRequestException('اكتب سبب رفض من 5 إلى 1000 حرف.');
  if(typeof input.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(input.expectedUpdatedAt)))throw new BadRequestException('حدّث الطلب قبل اتخاذ القرار.');
  const expectedUpdatedAt=new Date(input.expectedUpdatedAt);
  return this.db.serializable(async tx=>{
   const role=await tx.roleAssignment.findFirst({where:{accountId:actor,status:'ACTIVE',role:{in:['ADMIN','REVIEWER']},account:{status:'ACTIVE'}}});
   if(!role)throw new ForbiddenException('Review scope required.');
   const row=await tx.administrativeRecord.findFirst({where:{id,type:{in:types}},include:{organization:{select:{ownerId:true,status:true}}}});
   if(!row||row.licenseReviewStatus!=='PENDING')throw new ConflictException('الطلب ليس بانتظار المراجعة.');
   const member=await tx.organizationMember.findFirst({where:{accountId:actor,organizationId:row.organizationId,status:'ACTIVE'}});
   if(actor===row.ownerAccountId||actor===row.licenseReviewSubmittedById||actor===row.organization.ownerId||member)throw new ForbiddenException('لا يمكن مراجعة رخصة مركز تملكه أو تنتمي إليه أو أرسلت طلبه.');
   if(outcome==='APPROVED'){
    const today=new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z');
    if(row.organization.status!=='ACTIVE'||!row.licenseAssetId||!row.licenseIssuedAt||!row.licenseExpiresAt||row.licenseIssuedAt>today||row.licenseExpiresAt<today)throw new ConflictException('لا يمكن اعتماد رخصة غير سارية أو مركز غير نشط.');
    const asset=await tx.organizationDocumentAsset.findFirst({where:{id:row.licenseAssetId,organizationId:row.organizationId,kind:'LICENSE_ATTACHMENT'}});
    if(!asset||createHash('sha256').update(Buffer.from(asset.content)).digest('hex')!==asset.sha256)throw new ConflictException('تعذر التحقق من سلامة المرفق.');
   }
   const claimed=await tx.administrativeRecord.updateMany({where:{id,status:'REGISTERED',licenseReviewStatus:'PENDING',updatedAt:expectedUpdatedAt},data:{licenseReviewStatus:outcome,licenseReviewDecidedAt:new Date(),licenseReviewDecidedById:actor,licenseReviewReason:reason||null}});
   if(claimed.count!==1)throw new ConflictException('تغير الطلب أو اتخذ مراجع آخر القرار. حدّث الصفحة.');
   await this.audit.record({actorId:actor,action:'CENTER_LICENSE_PLATFORM_'+outcome,resource:'AdministrativeRecord',resourceId:id,metadata:{organizationId:row.organizationId,assetId:row.licenseAssetId,reason:reason||null}},tx);
   return {id,status:outcome};
  });
 }
}
