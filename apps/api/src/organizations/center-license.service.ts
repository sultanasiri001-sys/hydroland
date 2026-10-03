import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { AdministrativeAffairsPersistenceService } from '../administrative-affairs/administrative-affairs-persistence.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const types=['LICENSE','PERMIT','CERTIFICATE','REGULATORY_APPROVAL'];
export type LicenseRecordInput={type?:string;unitId?:string;referenceNumber?:string;subject?:string};
export type LicenseAttachmentInput={mimeType?:string;base64?:string;issuedAt?:string;expiresAt?:string};
@Injectable()
export class CenterLicenseService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly administrative:AdministrativeAffairsPersistenceService){}
  async reviewers(organizationId:string){
    const members=await this.db.organizationMember.findMany({where:{organizationId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},account:{status:'ACTIVE',roleAssignments:{some:{role:'DIVE_CENTER',status:'ACTIVE'}}}},select:{account:{select:{id:true,person:{select:{firstName:true,lastName:true}},organizationMemberships:{where:{status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:{contains:'DIVE',mode:'insensitive'},status:'ACTIVE'}},orderBy:{createdAt:'asc'},take:1,select:{organizationId:true}}}}}});
    return members.filter(x=>x.account.organizationMemberships[0]?.organizationId===organizationId).map(x=>({id:x.account.id,name:[x.account.person.firstName,x.account.person.lastName].filter(Boolean).join(' ').trim()||'مراجع المركز'}));
  }
  private async record(organizationId:string,id:string){
    const record=await this.db.administrativeRecord.findFirst({where:{id,organizationId,type:{in:types}}});
    if(!record)throw new NotFoundException('License record not found in managed center.');
    return record;
  }
  private async routing(organizationId:string,id:string){
    const routing=await this.db.administrativeRouting.findFirst({where:{id,organizationId,record:{organizationId,type:{in:types}}}});
    if(!routing)throw new NotFoundException('License review not found in managed center.');
    return routing;
  }
  async register(accountId:string,organizationId:string,id:string){
    const record=await this.record(organizationId,id);
    if(!record.licenseAssetId||!record.licenseIssuedAt||!record.licenseExpiresAt)throw new ConflictException('Attach the license and its validity dates before registration.');
    await this.download(organizationId,id);
    // Lock exactly the attachment and dates validated above, even if another
    // request edits the draft before the canonical registration transaction.
    return this.administrative.registerRecord(id,accountId,{
      updatedAt:record.updatedAt,licenseAssetId:record.licenseAssetId,
      licenseIssuedAt:record.licenseIssuedAt,licenseExpiresAt:record.licenseExpiresAt,
    });
  }
  async route(accountId:string,organizationId:string,id:string,toUnitId:unknown){
    await this.record(organizationId,id);
    if(typeof toUnitId!=='string'||!toUnitId)throw new BadRequestException('Review unit is required.');
    const target=await this.db.orgUnit.findFirst({where:{id:toUnitId,organizationId,active:true},select:{id:true}});
    if(!target)throw new NotFoundException('Active review unit not found in managed center.');
    return this.administrative.route(id,toUnitId,accountId);
  }
  async assign(accountId:string,organizationId:string,id:string,assignee:unknown){
    const routing=await this.routing(organizationId,id);
    if(typeof assignee!=='string'||!assignee)throw new BadRequestException('Reviewer is required.');
    if(assignee===routing.requestedByAccountId)throw new ForbiddenException('Requester cannot review own license request.');
    if(!(await this.reviewers(organizationId)).some(x=>x.id===assignee))throw new ForbiddenException('Reviewer is not eligible in this center portal.');
    return this.administrative.assign(id,assignee,accountId);
  }
  async decide(accountId:string,organizationId:string,id:string,decision:unknown){
    await this.routing(organizationId,id);
    if(decision!=='APPROVE'&&decision!=='REJECT')throw new BadRequestException('Decision must be APPROVE or REJECT.');
    return this.administrative.decide(id,decision,accountId);
  }
  async create(accountId:string,organizationId:string,input:LicenseRecordInput,renewalId?:string){
    const text=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length<=max?value.trim():'';
    const referenceNumber=text(input?.referenceNumber,120),subject=text(input?.subject,240);
    if(!referenceNumber||!subject)throw new BadRequestException('License reference and subject are required (120/240 characters maximum).');
    try{
      return await this.db.serializable(async tx=>{
        const previous=renewalId?await tx.administrativeRecord.findFirst({where:{id:renewalId,organizationId,type:{in:types}}}):null;
        if(renewalId&&!previous)throw new NotFoundException('Previous license not found in managed center.');
        if(previous?.status==='DRAFT')throw new ConflictException('Finish the existing draft instead of renewing it.');
        const type=previous?.type??input?.type,unitId=previous?.unitId??input?.unitId;
        if(typeof type!=='string'||!types.includes(type)||typeof unitId!=='string'||!unitId)throw new BadRequestException('A regulatory record type and active center unit are required.');
        const unit=await tx.orgUnit.findFirst({where:{id:unitId,organizationId,active:true},select:{id:true}});
        if(!unit)throw new NotFoundException('Active unit not found in managed center.');
        const record=await tx.administrativeRecord.create({data:{organizationId,unitId:unit.id,type,referenceNumber,subject,ownerAccountId:accountId,status:'DRAFT'}});
        await this.audit.record({actorId:accountId,action:previous?'CENTER_LICENSE_RENEWAL_CREATED':'CENTER_LICENSE_CREATED',resource:'AdministrativeRecord',resourceId:record.id,
          metadata:{organizationId,unitId:unit.id,type,referenceNumber,renewalOfRecordId:previous?.id??null,previousReferenceNumber:previous?.referenceNumber??null}},tx);
        return {id:record.id,type:record.type,referenceNumber:record.referenceNumber,subject:record.subject,status:record.status};
      });
    }catch(error){
      if(typeof error==='object'&&error!==null&&'code' in error&&error.code==='P2002')throw new ConflictException('License reference already exists in this center.');
      throw error;
    }
  }
  private date(value:unknown){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new BadRequestException('License dates must use YYYY-MM-DD.');
    const date=new Date(value+'T00:00:00.000Z');
    if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)throw new BadRequestException('Invalid license date.');
    return date;
  }
  async attach(accountId:string,organizationId:string,id:string,input:LicenseAttachmentInput){
    const record=await this.db.administrativeRecord.findFirst({where:{id,organizationId,type:{in:types}}});
    if(!record)throw new NotFoundException('License record not found in managed center.');
    if(record.status!=='DRAFT')throw new ConflictException('Only draft license attachments can be changed.');
    const issuedAt=this.date(input?.issuedAt),expiresAt=this.date(input?.expiresAt);
    if(expiresAt<=issuedAt)throw new BadRequestException('License expiry must be after issue date.');
    const encoded=input?.base64,mimeType=input?.mimeType;
    if(typeof encoded!=='string'||encoded.length>2_666_668||!encoded.length||encoded.length%4!==0||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw new BadRequestException('Invalid license file encoding or size.');
    const bytes=Buffer.from(encoded,'base64');
    if(!bytes.length||bytes.length>2_000_000)throw new BadRequestException('License file must be between 1 byte and 2 MB.');
    const png=mimeType==='image/png'&&bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg=mimeType==='image/jpeg'&&bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const pdf=mimeType==='application/pdf'&&bytes.subarray(0,5).toString()==='%PDF-';
    if(!png&&!jpeg&&!pdf)throw new BadRequestException('License must be a PDF, PNG or JPEG with a matching file signature.');
    if(pdf){try{const parsed=await PDFDocument.load(bytes);if(parsed.getPageCount()<1)throw new Error('Empty PDF');}catch{throw new BadRequestException('License PDF is unreadable or encrypted.');}}
    const sha256=createHash('sha256').update(bytes).digest('hex');
    return this.db.serializable(async tx=>{
      const asset=await tx.organizationDocumentAsset.upsert({where:{organizationId_sha256:{organizationId,sha256}},create:{organizationId,kind:'LICENSE_ATTACHMENT',mimeType:mimeType!,byteSize:bytes.length,sha256,content:new Uint8Array(bytes)},update:{}});
      if(asset.kind!=='LICENSE_ATTACHMENT')throw new ConflictException('File is already used as another organization asset type.');
      const claimed=await tx.administrativeRecord.updateMany({where:{id,organizationId,status:'DRAFT',updatedAt:record.updatedAt},data:{licenseAssetId:asset.id,licenseIssuedAt:issuedAt,licenseExpiresAt:expiresAt}});
      if(claimed.count!==1)throw new ConflictException('License record changed. Reload before attaching.');
      await this.audit.record({actorId:accountId,action:'CENTER_LICENSE_ATTACHED',resource:'AdministrativeRecord',resourceId:id,metadata:{organizationId,assetId:asset.id,sha256,issuedAt,expiresAt}},tx);
      return {id,licenseAssetId:asset.id,licenseIssuedAt:issuedAt,licenseExpiresAt:expiresAt};
    });
  }
  async download(organizationId:string,id:string){
    const record=await this.db.administrativeRecord.findFirst({where:{id,organizationId,type:{in:types}},select:{licenseAssetId:true}});
    if(!record?.licenseAssetId)throw new NotFoundException('License attachment not found.');
    const asset=await this.db.organizationDocumentAsset.findFirst({where:{id:record.licenseAssetId,organizationId,kind:'LICENSE_ATTACHMENT'}});
    if(!asset)throw new NotFoundException('License attachment not found.');
    const bytes=Buffer.from(asset.content);
    if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new ConflictException('License attachment integrity check failed.');
    const extension=asset.mimeType==='application/pdf'?'pdf':asset.mimeType==='image/png'?'png':'jpg';
    return {bytes,mimeType:asset.mimeType,filename:`license-${id.replace(/[^a-zA-Z0-9-]/g,'')}.${extension}`};
  }
}
