import {BadRequestException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {DatabaseService} from '../database/database.service';
import {MARINE_ASSET_TYPES,REQUIRED_MARINE_DOCUMENTS,MarineAssetType,MarineReadinessResult} from './marine-operations.domain';

type MarineAssetDecision='ACTIVE'|'SUSPENDED'|'OUT_OF_SERVICE';

@Injectable()
export class MarineOperationsService{
 constructor(private readonly db:DatabaseService){}
 private async requireMember(accountId:string,organizationId:string,write=false){
  const member=await this.db.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}}});
  if(!member||member.status!=='ACTIVE')throw new ForbiddenException('Active organization membership required.');
  if(write&&!['OWNER','ADMIN','OPERATOR','STAFF'].includes(member.role))throw new ForbiddenException('Marine asset write scope required.');
  return member;
 }
 private async requireOwnedAsset(accountId:string,marineAssetId:string,write=false){
  const asset=await this.db.marineAsset.findUnique({where:{id:marineAssetId},select:{id:true,organizationId:true}});
  if(!asset)throw new NotFoundException('Marine asset not found.');
  await this.requireMember(accountId,asset.organizationId,write);
  return asset;
 }
 private parseExpiry(value?:string){if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException('Invalid document expiry date.');return date;}
 private parseDueAt(value?:string){if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException('Invalid maintenance due date.');return date;}
 async createAsset(input:{organizationId:string;name:string;assetType:MarineAssetType;registrationNumber?:string;passengerCapacity?:number}){
  if(!MARINE_ASSET_TYPES.includes(input.assetType))throw new BadRequestException('Unsupported marine asset type.');
  if(!input.name?.trim())throw new BadRequestException('Marine asset name is required.');
  if(input.passengerCapacity!==undefined&&(!Number.isInteger(input.passengerCapacity)||input.passengerCapacity<1))throw new BadRequestException('Passenger capacity must be a positive integer.');
  const org=await this.db.organization.findUnique({where:{id:input.organizationId},select:{id:true}});
  if(!org)throw new NotFoundException('Organization not found.');
  return this.db.marineAsset.create({data:{...input,name:input.name.trim(),registrationNumber:input.registrationNumber?.trim()||null}});
 }
 async createOwnedAsset(accountId:string,input:{organizationId:string;name:string;assetType:MarineAssetType;registrationNumber?:string;passengerCapacity?:number}){
  await this.requireMember(accountId,input.organizationId,true);
  return this.createAsset(input);
 }
 async listMine(accountId:string){
  const memberships=await this.db.organizationMember.findMany({where:{accountId,status:'ACTIVE'},select:{organizationId:true}});
  const ids=memberships.map(x=>x.organizationId);if(!ids.length)return[];
  return this.db.marineAsset.findMany({where:{organizationId:{in:ids}},include:{documents:{orderBy:{updatedAt:'desc'}},maintenance:{orderBy:{updatedAt:'desc'}},readiness:{orderBy:{checkedAt:'desc'},take:1}},orderBy:{updatedAt:'desc'}});
 }
 async addDocument(accountId:string,marineAssetId:string,input:{documentType:string;referenceNumber?:string;expiresAt?:string}){
  await this.requireOwnedAsset(accountId,marineAssetId,true);
  if(!(REQUIRED_MARINE_DOCUMENTS as readonly string[]).includes(input.documentType))throw new BadRequestException('Unsupported marine document type.');
  return this.db.marineAssetDocument.create({data:{marineAssetId,documentType:input.documentType,referenceNumber:input.referenceNumber?.trim()||null,expiresAt:this.parseExpiry(input.expiresAt),status:'PENDING',verifiedAt:null}});
 }
 async updateDocument(accountId:string,marineAssetId:string,documentId:string,input:{referenceNumber?:string;expiresAt?:string}){
  const doc=await this.db.marineAssetDocument.findFirst({where:{id:documentId,marineAssetId},include:{marineAsset:{select:{organizationId:true}}}});if(!doc)throw new NotFoundException('Marine document not found.');
  await this.requireMember(accountId,doc.marineAsset.organizationId,true);
  if(doc.status==='VERIFIED')throw new BadRequestException('Verified marine documents cannot be edited.');
  return this.db.marineAssetDocument.update({where:{id:documentId},data:{...(input.referenceNumber!==undefined?{referenceNumber:input.referenceNumber.trim()||null}:{}),...(input.expiresAt!==undefined?{expiresAt:this.parseExpiry(input.expiresAt)}:{}),status:'PENDING',verifiedAt:null}});
 }
 async pendingDocuments(){return this.db.marineAssetDocument.findMany({where:{status:'PENDING'},include:{marineAsset:true},orderBy:{createdAt:'asc'},take:200});}
 async decideDocument(documentId:string,outcome:'VERIFIED'|'REJECTED'){
  if(!['VERIFIED','REJECTED'].includes(outcome))throw new BadRequestException('Invalid marine document decision.');
  const doc=await this.db.marineAssetDocument.findUnique({where:{id:documentId}});if(!doc)throw new NotFoundException('Marine document not found.');
  if(doc.status!=='PENDING')throw new BadRequestException('Marine document is not awaiting review.');
  return this.db.marineAssetDocument.update({where:{id:documentId},data:{status:outcome,verifiedAt:outcome==='VERIFIED'?new Date():null}});
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
  return this.db.marineAsset.findMany({include:{documents:{orderBy:{updatedAt:'desc'}},maintenance:{orderBy:{updatedAt:'desc'}},readiness:{orderBy:{checkedAt:'desc'},take:1}},orderBy:{updatedAt:'desc'},take:200});
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
 async readinessForCalendarResource(resourceId:string,tripId?:string,checkedByAccountId?:string){
  const asset=await this.db.marineAsset.findUnique({where:{calendarResourceId:resourceId},select:{id:true}});
  if(!asset)return{status:'NOT_READY' as const,reasonCodes:['MARINE_ASSET_NOT_LINKED']};
  return this.evaluateReadiness(asset.id,tripId,checkedByAccountId);
 }
 async evaluateReadiness(marineAssetId:string,tripId?:string,checkedByAccountId?:string):Promise<MarineReadinessResult>{
  const asset=await this.db.marineAsset.findUnique({where:{id:marineAssetId},include:{documents:true,maintenance:true}});
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
  await this.db.marineReadinessSnapshot.create({data:{marineAssetId,tripId:tripId??null,status,reasonCodes:reasons,checkedByAccountId:checkedByAccountId??null}});
  return{status,reasonCodes:reasons};
 }
}