import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {DatabaseService} from '../database/database.service';
import {MARINE_ASSET_TYPES,REQUIRED_MARINE_DOCUMENTS,MarineAssetType,MarineReadinessResult} from './marine-operations.domain';

@Injectable()
export class MarineOperationsService{
 constructor(private readonly db:DatabaseService){}
 async createAsset(input:{organizationId:string;name:string;assetType:MarineAssetType;registrationNumber?:string;passengerCapacity?:number}){
  if(!MARINE_ASSET_TYPES.includes(input.assetType))throw new BadRequestException('Unsupported marine asset type.');
  if(!input.name?.trim())throw new BadRequestException('Marine asset name is required.');
  if(input.passengerCapacity!==undefined&&(!Number.isInteger(input.passengerCapacity)||input.passengerCapacity<1))throw new BadRequestException('Passenger capacity must be a positive integer.');
  const org=await this.db.organization.findUnique({where:{id:input.organizationId},select:{id:true}});
  if(!org)throw new NotFoundException('Organization not found.');
  return this.db.marineAsset.create({data:{...input,name:input.name.trim(),registrationNumber:input.registrationNumber?.trim()||null}});
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
