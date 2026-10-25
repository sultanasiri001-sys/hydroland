import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DocumentAssetService } from './document-asset.service';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { isLibraryCode } from './contract-library.domain';
import { renderAdministrativeDocumentPdf } from './administrative-document-pdf';
import { assertCompatibleTemplateFields, templateFields, templateText } from './document-template-input';
import type { DocumentPrintContract } from './document-print.service';

type Actor={auth:{accountId:string}};
@UseGuards(AccessTokenGuard)
@Controller('documents')
export class DocumentTemplatePreviewController {
 constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService,private readonly assets:DocumentAssetService){}
 @Get('organizations/:organizationId/branding/logo/:assetId')
 async logo(@Req() r:Actor,@Param('organizationId') org:string,@Param('assetId') id:string,@Res() res:any){
  await this.authz.assert(r.auth.accountId,org,'BRAND_READ');
  const {asset,bytes}=await this.assets.bytesForLogo(org,id);
  if(!['image/png','image/jpeg'].includes(asset.mimeType)||bytes.length>2_000_000)throw new BadRequestException('Unsupported logo asset.');
  await this.authz.assert(r.auth.accountId,org,'BRAND_READ');
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type',asset.mimeType);
  return res.send(bytes);
 }
 @Post('organizations/:organizationId/templates/:id/preview-pdf')
 @HttpCode(200)
 async preview(@Req() r:Actor,@Param('organizationId') org:string,@Param('id') id:string,@Body() body:unknown,@Res() res:any){
  if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>128_000)throw new BadRequestException('Invalid preview input.');
  const b=body as Record<string,unknown>;
  for(const key of Object.keys(b))if(!['titleAr','titleEn','fields'].includes(key))throw new BadRequestException('Unsupported preview property.');
  // Preview is read-only, but unpersisted edits require the same editor permission.
  const snapshot=await this.db.serializable(async tx=>{
   await this.authz.assert(r.auth.accountId,org,'TEMPLATE_LIST',tx);
   await this.authz.assert(r.auth.accountId,org,'BRAND_READ',tx);
   if(Object.keys(b).length)await this.authz.assert(r.auth.accountId,org,'TEMPLATE_UPDATE',tx);
   const t=await tx.documentTemplate.findFirst({where:{id,organizationId:org,status:'ACTIVE'}});
   if(!t||t.code===COOPERATION_CODE||isLibraryCode(t.code))throw new NotFoundException('Active administrative template not found.');
   const fields=templateFields(b.fields??t.fields);assertCompatibleTemplateFields(t.fields,fields);
   const identity=await tx.organization.findUnique({where:{id:org}});
   if(!identity)throw new NotFoundException('Organization not found.');
   return {t,fields,identity};
  });
  const {t,fields,identity}=snapshot,now=new Date();
  // No managed document, reference counter, revision, signature or audit evidence is created.
  // Every page is visibly labelled PREVIEW by the shared production renderer.
  const c:DocumentPrintContract={
   documentId:'',organizationId:org,referenceNumber:'TEMPLATE-PREVIEW',department:t.department,
   status:'معاينة قالب — غير معتمدة / PREVIEW',documentVersion:0,contentHash:'لا توجد بصمة مستند — معاينة غير محفوظة',
   renderProfile:'ADMINISTRATIVE_FORM_V1',createdAt:now,updatedAt:now,
   template:{id:t.id,code:t.code,titleAr:templateText(b.titleAr??t.titleAr,'Arabic title'),titleEn:templateText(b.titleEn??t.titleEn,'English title'),version:t.version,printable:t.printable},
   branding:{brandVersion:identity.documentBrandVersion,logoUrl:null,logoAssetId:identity.documentLogoAssetId,brandNameAr:identity.documentBrandNameAr??identity.displayName,brandNameEn:identity.documentBrandNameEn??identity.displayName,footerAr:identity.documentFooterAr,footerEn:identity.documentFooterEn},
   fields:fields.map(f=>({...f,value:f.options?.join(' / ')||'................................................'})),
   approvals:{createdByAccountId:'معاينة فقط — لم يُنشأ مستند',approvedByAccountId:null,signedByAccountId:null,archivedByAccountId:null,approvedAt:null,signedAt:null,archivedAt:null}
  };
  const rendered=await renderAdministrativeDocumentPdf(c,this.assets,undefined,{templatePreview:true});
  await this.authz.assert(r.auth.accountId,org,'TEMPLATE_LIST');
  await this.authz.assert(r.auth.accountId,org,'BRAND_READ');
  if(Object.keys(b).length)await this.authz.assert(r.auth.accountId,org,'TEMPLATE_UPDATE');
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','inline; filename="TEMPLATE-PREVIEW.pdf"');
  return res.send(rendered.bytes);
 }
}
