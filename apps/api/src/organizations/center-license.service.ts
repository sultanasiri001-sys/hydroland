import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const types=['LICENSE','PERMIT','CERTIFICATE','REGULATORY_APPROVAL'];
export type LicenseAttachmentInput={mimeType?:string;base64?:string;issuedAt?:string;expiresAt?:string};
@Injectable()
export class CenterLicenseService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
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
