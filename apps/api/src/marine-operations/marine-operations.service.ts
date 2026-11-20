import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';
import {CredentialObjectStorageService} from '../credentials/credential-object-storage.service';
import {MARINE_ASSET_TYPES,REQUIRED_MARINE_DOCUMENTS,MarineAssetType,MarineReadinessResult} from './marine-operations.domain';
import {lockAccountIdentities} from '../admin/admin-authorization';
import {reviewPlatform} from '../document-forms/internal-document-review.domain';
import {marineDocumentReviewRevision} from './marine-registration.domain';

type ReviewStage = 'CENTER' | 'PLATFORM';
type DocumentInput = {documentType?:string;referenceNumber?:string;expiresAt?:string;originalName?:string;mimeType?:string;base64?:string;expectedRevision?:string};
type Upload = {bytes:Buffer;name:string;type:string;sha256:string;storageKey:string};
type MarineAssetDecision='ACTIVE'|'SUSPENDED'|'OUT_OF_SERVICE';

@Injectable()
export class MarineOperationsService{
 constructor(private readonly db:DatabaseService,private readonly storage:CredentialObjectStorageService,private readonly audit:AuditService){}
 async overviewMine(accountId:string){
  const role=await this.db.roleAssignment.findFirst({where:{accountId,role:'BOAT_OWNER',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
  if(!role)throw new ForbiddenException('Active marine brokerage role required.');
  const memberships=await this.db.organizationMember.findMany({where:{accountId,status:'ACTIVE',organization:{status:'ACTIVE'}},select:{organizationId:true}});
  const ids=memberships.map(x=>x.organizationId);if(!ids.length)return{generatedAt:new Date(),metrics:{activeAssets:0,scheduledTrips:0,openMaintenance:0,confirmedBookings:0}};
  const now=new Date(),scope={organizationId:{in:ids}};
  const [activeAssets,scheduledTrips,openMaintenance,confirmedBookings]=await Promise.all([
   this.db.marineAsset.count({where:{...scope,status:'ACTIVE'}}),
   this.db.trip.count({where:{...scope,status:'OPEN',startsAt:{gte:now}}}),
   this.db.marineMaintenanceRecord.count({where:{status:{not:'COMPLETED'},marineAsset:{organizationId:{in:ids}}}}),
   this.db.booking.count({where:{status:'CONFIRMED',trip:{...scope,status:'OPEN',startsAt:{gte:now}}}}),
  ]);
  return{generatedAt:now,metrics:{activeAssets,scheduledTrips,openMaintenance,confirmedBookings}};
 }
 private async requireMember(accountId:string,organizationId:string,write=false,tx:Prisma.TransactionClient=this.db){
  const member=await tx.organizationMember.findFirst({where:{organizationId,accountId,status:'ACTIVE',account:{status:'ACTIVE'},organization:{status:'ACTIVE',kind:{in:['DIVE_CENTER','MARINE_OPERATOR']}}},select:{id:true,status:true,role:true}});
  if(!member||member.status!=='ACTIVE')throw new ForbiddenException('Active organization membership required.');
  if(write&&!['OWNER','ADMIN','OPERATOR','STAFF'].includes(member.role))throw new ForbiddenException('Marine asset write scope required.');
  return member;
 }
 private async requireOwnedAsset(accountId:string,marineAssetId:string,write=false,tx:Prisma.TransactionClient=this.db){
  const asset=await tx.marineAsset.findUnique({where:{id:marineAssetId},select:{id:true,organizationId:true}});
  if(!asset)throw new NotFoundException('Marine asset not found.');
  await this.requireMember(accountId,asset.organizationId,write,tx);
  return asset;
 }
 private parseExpiry(value?:string){if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException('Invalid document expiry date.');return date;}
 private decodeDocument(value:string){const base64=String(value||'').trim();if(!base64||base64.length>13_400_000||base64.length%4!==0)throw new BadRequestException('Invalid document payload.');const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>10_000_000||bytes.toString('base64')!==base64)throw new BadRequestException('Document must be valid and no larger than 10 MB.');return bytes;}
 private validateDocument(originalName:string,mimeType:string,bytes:Buffer){const name=String(originalName||'').split(/[\\/]/).pop()?.trim()||'';if(!name||name.length>180)throw new BadRequestException('Invalid document file name.');const type=String(mimeType||'').trim().toLowerCase();if(!['application/pdf','image/jpeg','image/png'].includes(type))throw new BadRequestException('Only PDF, JPEG and PNG documents are supported.');const lower=name.toLowerCase(),extensionOk=type==='application/pdf'?lower.endsWith('.pdf'):type==='image/png'?lower.endsWith('.png'):lower.endsWith('.jpg')||lower.endsWith('.jpeg');if(!extensionOk)throw new BadRequestException('File extension does not match the declared content type.');const signatureOk=type==='application/pdf'?bytes.subarray(0,5).toString('ascii')==='%PDF-':type==='image/png'?bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])):bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;if(!signatureOk)throw new BadRequestException('Document signature does not match the declared content type.');return{name,type};}
 private publicDocument<T extends {storageKey?:string|null;sha256?:string|null}>(document:T){const{storageKey,sha256,...safe}=document;return{...safe,hasFile:Boolean(storageKey)};}
 private parseDueAt(value?:string){if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException('Invalid maintenance due date.');return date;}
 async createAsset(input:{organizationId:string;name:string;assetType:MarineAssetType;registrationNumber?:string;passengerCapacity?:number}){
  if(!MARINE_ASSET_TYPES.includes(input.assetType))throw new BadRequestException('Unsupported marine asset type.');
  if(!input.name?.trim())throw new BadRequestException('Marine asset name is required.');
  if(input.passengerCapacity!==undefined&&(!Number.isInteger(input.passengerCapacity)||input.passengerCapacity<1))throw new BadRequestException('Passenger capacity must be a positive integer.');
  const org=await this.db.organization.findUnique({where:{id:input.organizationId},select:{id:true,kind:true,status:true}});
  if(!org||org.status!=='ACTIVE')throw new NotFoundException('Active organization not found.');
  if(!['DIVE_CENTER','MARINE_OPERATOR'].includes(org.kind))throw new BadRequestException('Marine assets must belong to an active dive center or marine operator.');
  return this.db.marineAsset.create({data:{organizationId:org.id,assetType:input.assetType,passengerCapacity:input.passengerCapacity,name:input.name.trim(),registrationNumber:input.registrationNumber?.trim()||null}});
 }
 async createOwnedAsset(accountId:string,input:{organizationId:string;name:string;assetType:MarineAssetType;registrationNumber?:string;passengerCapacity?:number}){
  await this.requireMember(accountId,input.organizationId,true);
  return this.createAsset(input);
 }
 async listMine(accountId:string){
  const memberships=await this.db.organizationMember.findMany({where:{accountId,status:'ACTIVE',account:{status:'ACTIVE'},organization:{status:'ACTIVE',kind:{in:['DIVE_CENTER','MARINE_OPERATOR']}}},select:{organizationId:true}});
  const ids=memberships.map(x=>x.organizationId);if(!ids.length)return[];
  const assets=await this.db.marineAsset.findMany({where:{organizationId:{in:ids}},include:{documents:{orderBy:{updatedAt:'desc'}},maintenance:{orderBy:{updatedAt:'desc'}},readiness:{orderBy:{checkedAt:'desc'},take:1}},orderBy:{updatedAt:'desc'}});return assets.map(asset=>({...asset,documents:asset.documents.map(document=>({...this.publicDocument(document),reviewRevision:marineDocumentReviewRevision(document,this.assetIdentity(asset))}))}));
 }
 private assetIdentity<T extends {documents?:unknown;maintenance?:unknown;readiness?:unknown}>(asset:T){
  const {documents:_docs,maintenance:_maintenance,readiness:_readiness,...identity}=asset;
  return identity;
 }
 reviewCenters(){
  return this.db.organization.findMany({where:{kind:'DIVE_CENTER',status:'ACTIVE'},select:{id:true,displayName:true},orderBy:[{displayName:'asc'},{id:'asc'}]});
 }
 async bindCenter(actor:string,id:string,centerId:unknown){
  if(typeof centerId!=='string'||!centerId||centerId.length>100)throw new BadRequestException('اختر المركز الذي يتبع له القارب.');
  return this.db.serializable(async tx=>{
   const asset=await this.requireOwnedAsset(actor,id,true,tx);
   const org=await tx.organization.findUniqueOrThrow({where:{id:asset.organizationId}});
   if(org.kind!=='MARINE_OPERATOR'||org.ownerId!==actor)throw new ForbiddenException('تحديد المركز متاح لصاحب الجهة البحرية.');
   const center=await tx.organization.findFirst({where:{id:centerId,kind:'DIVE_CENTER',status:'ACTIVE'},select:{id:true}});
   if(!center)throw new BadRequestException('المركز المحدد غير متاح.');
   const current=await tx.marineAsset.findUniqueOrThrow({where:{id}});
   if(current.reviewCenterId===center.id)return {reviewCenterId:center.id};
   if(current.reviewCenterId)throw new ConflictException('سبق تحديد مركز القارب.');
   const claimed=await tx.marineAsset.updateMany({where:{id,reviewCenterId:null},data:{reviewCenterId:center.id}});
   if(claimed.count!==1)throw new ConflictException('تغير مركز القارب. حدّث الصفحة.');
   await this.audit.record({actorId:actor,action:'MARINE_REVIEW_CENTER_SELECTED',resource:'MarineAsset',resourceId:id,metadata:{centerId:center.id}},tx);
   return {reviewCenterId:center.id};
  });
 }
 private async reviewScope(tx:Prisma.TransactionClient,actor:string,stage:ReviewStage):Promise<Prisma.MarineAssetDocumentWhereInput>{
  if(stage==='PLATFORM'){
   const platform=await reviewPlatform(tx);
   if(actor!==platform.ownerId)throw new ForbiddenException('يتطلب القرار صلاحية الإدارة العليا للمنصة.');
   return {status:{in:['PLATFORM_PENDING','ON_HOLD']},centerApprovedBy:{not:null}};
  }
  const centers=await tx.organization.findMany({where:{ownerId:actor,kind:'DIVE_CENTER',status:'ACTIVE',owner:{status:'ACTIVE',emailVerifiedAt:{not:null}},
   NOT:{members:{some:{accountId:actor,status:{not:'ACTIVE'}}}}},select:{id:true}});
  const ids=centers.map(center=>center.id);
  return {status:'PENDING',marineAsset:{OR:[{organizationId:{in:ids}},{reviewCenterId:{in:ids}}]}};
 }
 private async prepareFile(accountId:string,assetId:string,input:DocumentInput,currentDigest?:string|null):Promise<Upload|null>{
  if(input.base64===undefined&&input.originalName===undefined&&input.mimeType===undefined)return null;
  if(!input.base64||!input.originalName||!input.mimeType)throw new BadRequestException('Complete file metadata and content are required.');
  const bytes=this.decodeDocument(input.base64),{name,type}=this.validateDocument(input.originalName,input.mimeType,bytes);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(currentDigest===sha256)return null;
  if(await this.db.marineAssetDocument.findUnique({where:{sha256},select:{id:true}}))throw new BadRequestException('This document has already been uploaded.');
  const file={bytes,name,type,sha256,storageKey:this.storage.key(accountId,assetId,type,'marine-assets')};
  await this.storage.put(file.storageKey,file.bytes,file.type);
  return file;
 }
 private fileFields(file:Upload|null){
  return file?{storageKey:file.storageKey,originalName:file.name,mimeType:file.type,byteSize:file.bytes.length,sha256:file.sha256}:{};
 }
 private async discardUncommitted(file:Upload|null){
  if(file){
   const retained=await this.db.marineAssetDocument.findUnique({where:{storageKey:file.storageKey},select:{id:true}}).catch(()=>true);
   if(!retained)await this.storage.delete(file.storageKey);
  }
 }
 async addDocument(accountId:string,marineAssetId:string,input:{documentType:string;referenceNumber?:string;expiresAt?:string;originalName?:string;mimeType?:string;base64?:string}){
  await this.requireOwnedAsset(accountId,marineAssetId,true);
  if(!(REQUIRED_MARINE_DOCUMENTS as readonly string[]).includes(input.documentType))throw new BadRequestException('Unsupported marine document type.');
  const expiresAt=this.parseExpiry(input.expiresAt);
  const file=await this.prepareFile(accountId,marineAssetId,input);
  try{return await this.db.serializable(async tx=>{
   await this.requireOwnedAsset(accountId,marineAssetId,true,tx);
   const row=await tx.marineAssetDocument.create({data:{marineAssetId,documentType:input.documentType,referenceNumber:input.referenceNumber?.trim()||null,expiresAt,status:'PENDING',verifiedAt:null,...this.fileFields(file)}});
   await this.audit.record({actorId:accountId,action:'MARINE_DOCUMENT_CREATED',resource:'MarineAssetDocument',resourceId:row.id,metadata:{marineAssetId,hasFile:Boolean(file)}},tx);
   return this.publicDocument(row);
  });}
  catch(error){await this.discardUncommitted(file);throw error}
 }
 async documentAccess(accountId:string,marineAssetId:string,documentId:string){
  const document=await this.db.marineAssetDocument.findFirst({where:{id:documentId,marineAssetId},include:{marineAsset:{select:{organizationId:true}}}});
  if(!document?.storageKey)throw new NotFoundException('Marine document file not found.');
  await this.requireMember(accountId,document.marineAsset.organizationId);
  if(!await this.storage.exists(document.storageKey))throw new NotFoundException('Marine document bytes not found.');
  return this.db.serializable(async tx=>{
   await this.requireOwnedAsset(accountId,marineAssetId,false,tx);
   const current=await tx.marineAssetDocument.findFirst({where:{id:documentId,marineAssetId,storageKey:document.storageKey},select:{id:true}});
   if(!current)throw new NotFoundException('Marine document file changed.');
   const access=this.storage.signedGet(document.storageKey!,300);await this.audit.record({actorId:accountId,action:'MARINE_DOCUMENT_ACCESS_ISSUED',resource:'MarineAssetDocument',resourceId:document.id,metadata:{accountId,marineAssetId,mode:'OWNER',expiresAt:access.expiresAt}},tx);return access;
  });
 }
 async reviewerDocumentAccess(accountId:string,documentId:string,stage:ReviewStage='PLATFORM'){
  const read=async(tx:Prisma.TransactionClient)=>{
   const scope=await this.reviewScope(tx,accountId,stage);
   return tx.marineAssetDocument.findFirst({where:{AND:[scope,{id:documentId}]},select:{storageKey:true}});
  };
  const document=await this.db.serializable(read);
  if(!document?.storageKey||!await this.storage.exists(document.storageKey))throw new NotFoundException('Marine document file not found.');
  return this.db.serializable(async tx=>{
   const current=await read(tx);
   if(current?.storageKey!==document.storageKey)throw new ConflictException('تغيرت الوثيقة أو مرحلة مراجعتها.');
   const access=this.storage.signedGet(document.storageKey!,300);
   await this.audit.record({actorId:accountId,action:'MARINE_DOCUMENT_ACCESS_ISSUED',resource:'MarineAssetDocument',resourceId:documentId,metadata:{mode:stage,expiresAt:access.expiresAt}},tx);
   return access;
  });
 }
 async updateDocument(accountId:string,marineAssetId:string,documentId:string,input:DocumentInput){
  await this.requireOwnedAsset(accountId,marineAssetId,true);
  if(!input||Object.keys(input).some(k=>!['referenceNumber','expiresAt','expectedRevision','base64','originalName','mimeType'].includes(k)))throw new BadRequestException('حقول التعديل غير صالحة.');
  if(input.referenceNumber!==undefined&&(typeof input.referenceNumber!=='string'||input.referenceNumber.length>120))throw new BadRequestException('رقم مرجع الوثيقة غير صالح.');
  if(input.expiresAt!==undefined&&typeof input.expiresAt!=='string')throw new BadRequestException('تاريخ انتهاء الوثيقة غير صالح.');
  const initial=await this.db.marineAssetDocument.findFirst({where:{id:documentId,marineAssetId},include:{marineAsset:true}});
  if(!initial)throw new NotFoundException('Marine document not found.');
  if(!['PENDING','RETURNED'].includes(initial.status))throw new BadRequestException('هذه الوثيقة غير متاحة للتعديل.');
  const {marineAsset,...before}=initial;
  const revision=marineDocumentReviewRevision(before,marineAsset);
  if((input.expectedRevision!==undefined||initial.status==='RETURNED')&&input.expectedRevision!==revision)throw new ConflictException('حدّث الوثيقة قبل التعديل.');
  const expiresAt=input.expiresAt===undefined?initial.expiresAt:this.parseExpiry(input.expiresAt);
  const file=await this.prepareFile(accountId,marineAssetId,input,initial.sha256);
  let updated;
  try{updated=await this.db.serializable(async tx=>{
   await this.requireOwnedAsset(accountId,marineAssetId,true,tx);
   const current=await tx.marineAssetDocument.findUniqueOrThrow({where:{id:documentId},include:{marineAsset:true}});
   const {marineAsset:asset,...doc}=current;
   if(marineDocumentReviewRevision(doc,asset)!==revision)throw new ConflictException('تغيرت الوثيقة أثناء الحفظ.');
   const reference=input.referenceNumber===undefined?doc.referenceNumber:input.referenceNumber.trim()||null;
   if(doc.status==='RETURNED'&&!file&&reference===doc.referenceNumber&&expiresAt?.getTime()===doc.expiresAt?.getTime())throw new BadRequestException('أرفق نسخة معدلة أو صحح بيانات الوثيقة.');
   const row=await tx.marineAssetDocument.update({where:{id:documentId},data:{referenceNumber:reference,expiresAt,...this.fileFields(file),status:'PENDING',verifiedAt:null,centerApprovedBy:null,reviewNote:null}});
   await this.audit.record({actorId:accountId,action:'MARINE_DOCUMENT_RESUBMITTED',resource:'MarineAssetDocument',resourceId:documentId,metadata:{previousRevision:revision,previousFileHash:doc.sha256,fileHash:row.sha256,from:doc.status}},tx);
   return this.publicDocument(row);
  })}catch(error){await this.discardUncommitted(file);throw error}
  if(file&&initial.storageKey)await this.storage.delete(initial.storageKey);
  return updated;
 }
 async pendingDocuments(actor:string,stage:ReviewStage){
  return this.db.serializable(async tx=>{
   const where=await this.reviewScope(tx,actor,stage);
   const rows=await tx.marineAssetDocument.findMany({where,include:{marineAsset:true},orderBy:[{createdAt:'asc'},{id:'asc'}]});
   return rows.map(({marineAsset,...doc})=>({...this.publicDocument(doc),marineAsset,reviewRevision:marineDocumentReviewRevision(doc,marineAsset)}));
  });
 }
 async decideDocument(actorId:string,documentId:string,body:unknown,stage:ReviewStage='PLATFORM'){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Invalid marine document decision.');
  const input=body as Record<string,unknown>,outcome=String(input.outcome);
  const outcomes=stage==='CENTER'?['FORWARD','RETURNED']:['VERIFIED','REJECTED','RETURNED','ON_HOLD'];
  if(Object.keys(input).some(k=>!['outcome','expectedRevision','note'].includes(k))||!outcomes.includes(outcome)||typeof input.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(input.expectedRevision))throw new BadRequestException('راجع الوثيقة قبل اتخاذ القرار.');
  const note=typeof input.note==='string'?input.note.trim():'';
  if(note.length>1000||(['REJECTED','RETURNED','ON_HOLD'].includes(outcome)&&!note))throw new BadRequestException('اكتب سبب القرار أو التعديل المطلوب.');
  return this.db.serializable(async tx=>{
   await lockAccountIdentities(tx,[actorId]);
   const scope=await this.reviewScope(tx,actorId,stage);
   const row=await tx.marineAssetDocument.findFirst({where:{AND:[scope,{id:documentId}]},include:{marineAsset:true}});
   if(!row)throw new ConflictException('الوثيقة غير متاحة في مرحلة المراجعة الحالية.');
   const {marineAsset,...doc}=row;
   if(marineDocumentReviewRevision(doc,marineAsset)!==input.expectedRevision)throw new ConflictException('تغيرت الوثيقة أو هوية القارب؛ أعد القراءة والمراجعة.');
   if((outcome==='FORWARD'||outcome==='VERIFIED')&&!doc.storageKey)throw new ConflictException('أرفق ملف الوثيقة قبل اعتمادها.');
   if(stage==='PLATFORM'&&doc.centerApprovedBy===actorId)throw new ForbiddenException('يتطلب القرار النهائي حساب الإدارة العليا المستقل عن تدقيق المركز.');
   if(outcome==='ON_HOLD'&&doc.status==='ON_HOLD')throw new ConflictException('الطلب معلق بالفعل.');
   const status=outcome==='FORWARD'?'PLATFORM_PENDING':outcome;
   const updated=await tx.marineAssetDocument.update({where:{id:documentId},data:{status,verifiedAt:outcome==='VERIFIED'?new Date():null,reviewNote:note||null,
    ...(outcome==='FORWARD'?{centerApprovedBy:actorId}:outcome==='RETURNED'?{centerApprovedBy:null}:{})}});
   await this.audit.record({actorId,action:stage==='CENTER'?'MARINE_DOCUMENT_CENTER_REVIEWED':'MARINE_DOCUMENT_REVIEWED',resource:'MarineAssetDocument',resourceId:documentId,
    metadata:{accountId:actorId,from:doc.status,outcome,expectedRevision:input.expectedRevision,marineAssetId:marineAsset.id,registrationNumber:marineAsset.registrationNumber,note}},tx);
   return this.publicDocument(updated);
  });
 }
 async addMaintenance(marineAssetId:string,input:{maintenanceType:string;dueAt?:string;notes?:string}){
  const asset=await this.db.marineAsset.findUnique({where:{id:marineAssetId},select:{id:true}});
  if(!asset)throw new NotFoundException('Marine asset not found.');
  if(!input.maintenanceType?.trim())throw new BadRequestException('Maintenance type is required.');
  return this.db.marineMaintenanceRecord.create({data:{marineAssetId,maintenanceType:input.maintenanceType.trim(),dueAt:this.parseDueAt(input.dueAt),notes:input.notes?.trim()||null}});
 }
 async addOwnedMaintenance(accountId:string,marineAssetId:string,input:{maintenanceType:string;dueAt?:string;notes?:string}){
  await this.requireOwnedAsset(accountId,marineAssetId,true);
  return this.addMaintenance(marineAssetId,input);
 }
 async completeMaintenance(recordId:string){
  const record=await this.db.marineMaintenanceRecord.findUnique({where:{id:recordId}});
  if(!record)throw new NotFoundException('Marine maintenance record not found.');
  if(record.status==='COMPLETED')throw new BadRequestException('Marine maintenance record is already completed.');
  return this.db.marineMaintenanceRecord.update({where:{id:recordId},data:{status:'COMPLETED',completedAt:new Date()}});
 }
 async completeOwnedMaintenance(accountId:string,marineAssetId:string,recordId:string){
  const record=await this.db.marineMaintenanceRecord.findFirst({where:{id:recordId,marineAssetId},include:{marineAsset:{select:{organizationId:true}}}});
  if(!record)throw new NotFoundException('Marine maintenance record not found.');
  await this.requireMember(accountId,record.marineAsset.organizationId,true);
  return this.completeMaintenance(recordId);
 }
 async evaluateOwnedReadiness(accountId:string,marineAssetId:string){
  await this.requireOwnedAsset(accountId,marineAssetId);
  return this.evaluateReadiness(marineAssetId,undefined,accountId);
 }
 async reviewAssets(){
  const assets=await this.db.marineAsset.findMany({include:{documents:{where:{status:{in:['PLATFORM_PENDING','ON_HOLD','VERIFIED','REJECTED']}},orderBy:{updatedAt:'desc'}},maintenance:{orderBy:{updatedAt:'desc'}},readiness:{orderBy:{checkedAt:'desc'},take:1}},orderBy:{updatedAt:'desc'},take:200});
  return assets.map(asset=>({...asset,documents:asset.documents.map(document=>this.publicDocument(document))}));
 }
 async decideAssetStatus(marineAssetId:string,status:MarineAssetDecision){
  if(!['ACTIVE','SUSPENDED','OUT_OF_SERVICE'].includes(status))throw new BadRequestException('Invalid marine asset status decision.');
  const asset=await this.db.marineAsset.findUnique({where:{id:marineAssetId},select:{id:true}});
  if(!asset)throw new NotFoundException('Marine asset not found.');
  if(status==='ACTIVE'){
   const readiness=await this.evaluateReadiness(marineAssetId);
   const blockers=readiness.reasonCodes.filter(code=>code!=='ASSET_NOT_ACTIVE'&&code!=='CALENDAR_RESOURCE_NOT_LINKED');
   if(blockers.length)throw new BadRequestException('Marine asset cannot be activated until required documents and blocking maintenance are resolved.');
  }
  return this.db.marineAsset.update({where:{id:marineAssetId},data:{status}});
 }
 async linkCalendarResource(marineAssetId:string,resourceId:string){
  const [asset,resource]=await Promise.all([this.db.marineAsset.findUnique({where:{id:marineAssetId}}),this.db.calendarResource.findUnique({where:{id:resourceId}})]);
  if(!asset)throw new NotFoundException('Marine asset not found.');
  if(!resource||resource.type!=='BOAT'||!resource.active)throw new BadRequestException('Active BOAT calendar resource is required.');
  if(resource.referenceId&&resource.referenceId!==marineAssetId)throw new BadRequestException('Calendar resource is linked to another reference.');
  return this.db.$transaction(async tx=>{
   await tx.calendarResource.update({where:{id:resourceId},data:{referenceId:marineAssetId}});
   return tx.marineAsset.update({where:{id:marineAssetId},data:{calendarResourceId:resourceId}});
  });
 }
 async readinessForCalendarResource(resourceId:string,tripId?:string,checkedByAccountId?:string,tx:Prisma.TransactionClient=this.db){
  const asset=await tx.marineAsset.findUnique({where:{calendarResourceId:resourceId},select:{id:true}});
  if(!asset)return{status:'NOT_READY' as const,reasonCodes:['MARINE_ASSET_NOT_LINKED']};
  return this.evaluateReadiness(asset.id,tripId,checkedByAccountId,tx);
 }
 async evaluateReadiness(marineAssetId:string,tripId?:string,checkedByAccountId?:string,tx:Prisma.TransactionClient=this.db):Promise<MarineReadinessResult>{
  const asset=await tx.marineAsset.findUnique({where:{id:marineAssetId},include:{documents:true,maintenance:true}});
  if(!asset)throw new NotFoundException('Marine asset not found.');
  const now=new Date(),reasons:string[]=[];
  if(asset.status!=='ACTIVE')reasons.push('ASSET_NOT_ACTIVE');
  if(!asset.calendarResourceId)reasons.push('CALENDAR_RESOURCE_NOT_LINKED');
  for(const type of REQUIRED_MARINE_DOCUMENTS){
   const doc=asset.documents.find(d=>d.documentType===type&&d.status==='VERIFIED'&&(!d.expiresAt||d.expiresAt>now));
   if(!doc)reasons.push('DOCUMENT_'+type+'_INVALID');
  }
  if(asset.maintenance.some(m=>m.status!=='COMPLETED'&&(!m.dueAt||m.dueAt<=now)))reasons.push('MAINTENANCE_BLOCKING');
  const hard=reasons.filter(r=>r!=='CALENDAR_RESOURCE_NOT_LINKED');
  const status:MarineReadinessResult['status']=hard.length?'NOT_READY':reasons.length?'NEEDS_REVIEW':'READY';
  await tx.marineReadinessSnapshot.create({data:{marineAssetId,tripId:tripId??null,status,reasonCodes:reasons,checkedByAccountId:checkedByAccountId??null}});
  return{status,reasonCodes:reasons};
 }
}
