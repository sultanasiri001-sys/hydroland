import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { EquipmentInspectionService } from '../trips/equipment-inspection.service';

@Injectable()
export class CenterEquipmentManagementService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly inspections:EquipmentInspectionService){}
 private async scope(tx:Prisma.TransactionClient,accountId:string){
  const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}}});
  if(!role)throw new ForbiddenException('يتطلب الإجراء دور مركز غوص نشطًا.');
  const member=await tx.organizationMember.findFirst({where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},orderBy:{createdAt:'asc'},select:{organizationId:true}});
  if(!member)throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');return member.organizationId;
 }
 async create(accountId:string,input:Record<string,unknown>,retry=true):Promise<unknown>{
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['requestId','name','serialNumber','sku','location'].includes(key)))throw new BadRequestException('حقول المعدة غير صالحة.');
  if(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId))throw new BadRequestException('معرّف طلب الحفظ غير صالح.');
  const clean=(key:string,max:number,required=false)=>{const value=input[key];if((value===undefined||value===null)&&!required)return null;if(typeof value!=='string'||value.trim().length>max||(required&&value.trim().length<2))throw new BadRequestException('أدخل اسم المعدة وتحقق من طول الحقول.');return value.trim()||null};
  const name=clean('name',240,true)!,serialNumber=clean('serialNumber',120),sku=clean('sku',120),location=clean('location',240),resourceId=input.requestId.toLowerCase();
  const fingerprint=createHash('sha256').update(JSON.stringify({name,serialNumber,sku,location})).digest('hex');
  try{return await this.db.serializable(async tx=>{
   const organizationId=await this.scope(tx,accountId),key='center-equipment-create:'+resourceId;
   const previous=await tx.operationalSetting.findUnique({where:{key}});
   if(previous){const saved=previous.value as {organizationId:string;fingerprint:string;assetCode:string};if(saved.organizationId!==organizationId||saved.fingerprint!==fingerprint)throw new ConflictException('سبق استخدام طلب الحفظ ببيانات مختلفة. حدّث القائمة.');return {resourceId,assetCode:saved.assetCode};}
   if(await tx.calendarResource.findUnique({where:{id:resourceId}}))throw new ConflictException('تعذر استخدام طلب الحفظ.');
   if(serialNumber){const duplicate=await tx.$queryRaw<Array<{resourceId:string}>>`SELECT "resourceId" FROM "EquipmentBarcode" WHERE "serialNumber"=${serialNumber} LIMIT 1`;if(duplicate.length)throw new ConflictException('الرقم التسلسلي مسجل مسبقًا.');}
   await tx.calendarResource.create({data:{id:resourceId,type:'EQUIPMENT',name,active:true}});
   const assetCode='HYD-'+resourceId.replace(/-/g,'').toUpperCase();
   await tx.$executeRaw`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","serialNumber","sku","location","stockStatus","organizationId","createdAt","updatedAt") VALUES(gen_random_uuid()::text,${resourceId},${assetCode},${assetCode},${'hydroland:equipment:'+assetCode},${serialNumber},${sku},${location},'AVAILABLE',(jsonb_populate_record(NULL::"EquipmentBarcode",jsonb_build_object('organizationId',${organizationId}::text)))."organizationId",NOW(),NOW())`;
   await tx.$executeRaw`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","toLocation","notes","actorAccountId","occurredAt") VALUES(gen_random_uuid()::text,${resourceId},'CHECK_IN',${location},'تسجيل المعدة في مخزون المركز',${accountId},NOW())`;
   await tx.operationalSetting.create({data:{key,value:{organizationId,fingerprint,assetCode}}});
   await this.audit.record({actorId:accountId,action:'CENTER_EQUIPMENT_CREATED',resource:'CalendarResource',resourceId,metadata:{organizationId,name,assetCode,serialNumber,sku,location,inspectionApprovalGranted:false}},tx);
   return {resourceId,assetCode};
  });}catch(error){const e=error as {code?:string;meta?:{code?:string}};if(retry&&(e.code==='P2002'||(e.code==='P2010'&&e.meta?.code==='23505')))return this.create(accountId,input,false);throw error;}
 }
 async recordInspection(accountId:string,resourceId:string,input:Record<string,unknown>,retry=true):Promise<unknown>{
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['requestId','status','serviceExpiresAt','notes'].includes(key)))throw new BadRequestException('حقول الفحص غير صالحة.');
  if(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId))throw new BadRequestException('معرّف طلب الحفظ غير صالح.');
  if(input.status!=='REVIEW'&&input.status!=='FAIL')throw new BadRequestException('يسجل المركز فحصًا للمراجعة أو عدم صلاحية المعدة؛ اعتماد الاجتياز للمراجع.');
  if(typeof input.notes!=='string'||!input.notes.trim()||input.notes.trim().length>2000)throw new BadRequestException('أدخل تفاصيل الفحص والصيانة في حدود 2000 حرف.');
  const status=input.status,notes=input.notes.trim(),id=input.requestId.toLowerCase();
  let expiry:Date|null=null;
  if(input.serviceExpiresAt!==undefined&&input.serviceExpiresAt!==null&&input.serviceExpiresAt!==''){
   if(typeof input.serviceExpiresAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(input.serviceExpiresAt))throw new BadRequestException('موعد الصيانة غير صالح.');
   expiry=new Date(input.serviceExpiresAt);if(!Number.isFinite(expiry.getTime())||new Date(input.serviceExpiresAt.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==input.serviceExpiresAt.slice(0,10))throw new BadRequestException('موعد الصيانة غير صالح.');
  }
  const fingerprint=createHash('sha256').update(JSON.stringify({resourceId,status,notes,expiry:expiry?.toISOString()??null})).digest('hex');
  try{return await this.db.serializable(async tx=>{
   const organizationId=await this.scope(tx,accountId);
   const owned=await tx.$queryRaw<Array<{stockStatus:string;active:boolean}>>`SELECT b."stockStatus",r."active" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE b."resourceId"=${resourceId} AND r."type"='EQUIPMENT' AND b."organizationId"=(jsonb_populate_record(NULL::"EquipmentBarcode",jsonb_build_object('organizationId',${organizationId}::text)))."organizationId" FOR UPDATE OF b`;
   if(!owned.length)throw new NotFoundException('المعدة غير موجودة في المركز.');
   const key='center-equipment-inspection:'+id,previous=await tx.operationalSetting.findUnique({where:{key}});
   if(previous){const saved=previous.value as {organizationId:string;fingerprint:string;inspectedAt:string};if(saved.organizationId!==organizationId||saved.fingerprint!==fingerprint)throw new ConflictException('سبق استخدام طلب الفحص ببيانات مختلفة.');return {id,status,inspectedAt:saved.inspectedAt};}
   const existingId=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "EquipmentInspection" WHERE "id"=${id}`;if(existingId.length)throw new ConflictException('تعذر استخدام معرّف طلب الفحص.');
   if(!owned[0].active||owned[0].stockStatus==='RETIRED')throw new ConflictException('لا يمكن تسجيل فحص لمعدة مستبعدة أو غير مفعلة.');
   const inspectedAt=new Date();if(expiry&&expiry<=inspectedAt)throw new BadRequestException('يجب أن يكون موعد انتهاء الصيانة مستقبلًا.');
   await tx.$executeRaw`INSERT INTO "EquipmentInspection"("id","resourceId","status","inspectedAt","serviceExpiresAt","notes","reviewedByAccountId","createdAt") VALUES(${id},${resourceId},${status},${inspectedAt},${expiry},${notes},NULL,NOW())`;
   // Quarantine also fences a checkout that evaluated inspection policy before this transaction.
   {
    await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"='QUARANTINED',"updatedAt"=NOW() WHERE "resourceId"=${resourceId}`;
    await tx.$executeRaw`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","notes","actorAccountId","occurredAt") VALUES(gen_random_uuid()::text,${resourceId},'QUARANTINE',${status==='FAIL'?'فحص المركز: المعدة غير صالحة للاستخدام':'فحص المركز: المعدة بانتظار المراجعة'},${accountId},NOW())`;
   }
   await tx.operationalSetting.create({data:{key,value:{organizationId,fingerprint,inspectedAt:inspectedAt.toISOString()}}});
   await this.audit.record({actorId:accountId,action:'CENTER_EQUIPMENT_INSPECTION_RECORDED',resource:'CalendarResource',resourceId,metadata:{organizationId,inspectionId:id,status,serviceExpiresAt:expiry?.toISOString()??null,previousStockStatus:owned[0].stockStatus,stockStatus:'QUARANTINED',approvalGranted:false}},tx);
   return {id,status,inspectedAt};
  });}catch(error){const e=error as {code?:string;meta?:{code?:string}};if(retry&&(e.code==='P2002'||(e.code==='P2010'&&e.meta?.code==='23505')))return this.recordInspection(accountId,resourceId,input,false);throw error;}
 }
 async inspection(accountId:string,resourceId:string){
  await this.db.serializable(async tx=>{
   const organizationId=await this.scope(tx,accountId);
   const rows=await tx.$queryRaw<Array<{resourceId:string}>>`SELECT b."resourceId" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE b."resourceId"=${resourceId} AND r."type"='EQUIPMENT' AND b."organizationId"=(jsonb_populate_record(NULL::"EquipmentBarcode",jsonb_build_object('organizationId',${organizationId}::text)))."organizationId"`;
   if(!rows.length)throw new NotFoundException('المعدة غير موجودة في المركز.');
  });
  const [history,gate]=await Promise.all([this.inspections.history(resourceId),this.inspections.evaluate([resourceId])]);
  return {blocked:gate.blocked,reviewRequired:gate.reviewRequired,history:history.map(row=>({status:row.status,inspectedAt:row.inspectedAt,serviceExpiresAt:row.serviceExpiresAt,notes:row.notes}))};
 }
}
