import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';

export interface DocumentBrandInput {
  logoUrl?: string | null;
  brandNameAr?: string | null;
  brandNameEn?: string | null;
  footerAr?: string | null;
  footerEn?: string | null;
}

@Injectable()
export class DocumentBrandingService {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService) {}

  async current(accountId:string,organizationId:string){
    await this.authz.assert(accountId,organizationId,'BRAND_READ');
    const org=await this.db.organization.findUnique({where:{id:organizationId}});
    if(!org) throw new NotFoundException('Organization not found.');
    return {organizationId:org.id,brandVersion:org.documentBrandVersion,logoUrl:org.documentLogoUrl,brandNameAr:org.documentBrandNameAr,brandNameEn:org.documentBrandNameEn,footerAr:org.documentFooterAr,footerEn:org.documentFooterEn};
  }

  async update(accountId:string,organizationId:string,input:DocumentBrandInput){
    await this.authz.assert(accountId,organizationId,'BRAND_UPDATE');
    if(input.logoUrl!==undefined&&input.logoUrl!==null){
      let logo:URL;
      try{logo=new URL(input.logoUrl);}catch{throw new BadRequestException('Document logo URL is invalid.');}
      if(logo.protocol!=='https:') throw new BadRequestException('Document logo URL must use HTTPS.');
      const host=logo.hostname.toLowerCase();
      if(host==='localhost'||host.endsWith('.localhost')||host==='0.0.0.0'||host==='::1'||host.startsWith('127.')||host.startsWith('10.')||host.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(host)||host.startsWith('169.254.')) throw new BadRequestException('Private or local document logo URLs are not allowed.');
    }
    return this.db.serializable(async tx=>{
      const org=await tx.organization.findUnique({where:{id:organizationId}});
      if(!org) throw new NotFoundException('Organization not found.');
      const next=org.documentBrandVersion+1;
      const brand={logoUrl:input.logoUrl===undefined?org.documentLogoUrl:input.logoUrl,brandNameAr:input.brandNameAr===undefined?org.documentBrandNameAr:input.brandNameAr,brandNameEn:input.brandNameEn===undefined?org.documentBrandNameEn:input.brandNameEn,footerAr:input.footerAr===undefined?org.documentFooterAr:input.footerAr,footerEn:input.footerEn===undefined?org.documentFooterEn:input.footerEn};
      await tx.documentBrandSnapshot.create({data:{organizationId,brandVersion:next,...brand}});
      await tx.organization.update({where:{id:organizationId},data:{documentBrandVersion:next,documentLogoUrl:brand.logoUrl,documentBrandNameAr:brand.brandNameAr,documentBrandNameEn:brand.brandNameEn,documentFooterAr:brand.footerAr,documentFooterEn:brand.footerEn}});
      return {organizationId,brandVersion:next,...brand};
    });
  }
}
