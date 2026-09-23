import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';

@Injectable()
export class DocumentAssetService {
  constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService){}

  async uploadLogo(accountId:string,organizationId:string,mimeType:string,bytes:Buffer){
    await this.authz.assert(accountId,organizationId,'BRAND_UPDATE');
    if(!['image/png','image/jpeg'].includes(mimeType)) throw new BadRequestException('Logo must be PNG or JPEG.');
    if(!bytes.length||bytes.length>2_000_000) throw new BadRequestException('Logo must be between 1 byte and 2 MB.');
    const png=mimeType==='image/png'&&bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const jpg=mimeType==='image/jpeg'&&bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
    if(!png&&!jpg) throw new BadRequestException('Logo file signature does not match its MIME type.');
    const sha256=createHash('sha256').update(bytes).digest('hex');
    const existing=await this.db.organizationDocumentAsset.findUnique({where:{organizationId_sha256:{organizationId,sha256}}});
    if(existing) return existing;
    return this.db.organizationDocumentAsset.create({data:{organizationId,kind:'LOGO',mimeType,byteSize:bytes.length,sha256,content:new Uint8Array(bytes)}});
  }

  async bytesForLogo(organizationId:string,assetId:string){
    const asset=await this.db.organizationDocumentAsset.findFirst({where:{id:assetId,organizationId,kind:'LOGO'}});
    if(!asset) throw new BadRequestException('Organization logo asset was not found.');
    const bytes=Buffer.from(asset.content);
    const digest=createHash('sha256').update(bytes).digest('hex');
    if(digest!==asset.sha256) throw new BadRequestException('Organization logo asset integrity check failed.');
    return {asset,bytes};
  }
}
