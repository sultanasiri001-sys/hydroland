import { BadRequestException, ConflictException, Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { DocumentPrintService } from './document-print.service';
import { DocumentAssetService } from './document-asset.service';
import { PlatformDocumentSourceService } from './platform-document-source.service';
import { renderAdministrativeDocumentPdf } from './administrative-document-pdf';
import { approvalKey, verifyApproval } from './owner-administrative-approval.domain';
import { decisionDigest } from './owner-administrative-decision.domain';

@UseGuards(AccessTokenGuard)
@Controller('documents')
export class ApprovedDocumentIdentityController {
 constructor(private readonly db:DatabaseService,private readonly print:DocumentPrintService,private readonly assets:DocumentAssetService,private readonly sources:PlatformDocumentSourceService){}
 @Get(':id/identity-pdf')
 async pdf(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Res() res:any){
  const actor=r.auth.accountId,c=await this.print.contract(actor,id);
  if(c.cooperation||['SIGNED','ARCHIVED'].includes(c.status))throw new BadRequestException('تظل النسخ الموقعة والمؤرشفة في مسار طباعة الأصل.');
  const approval=await this.db.serializable(async tx=>{
   await this.sources.owner(tx,actor,c.organizationId);
   const d=await tx.managedDocument.findFirstOrThrow({where:{id,organizationId:c.organizationId}});
   if(d.version!==c.documentVersion||d.contentHash!==c.contentHash||d.status!==c.status)throw new ConflictException('تغيرت نسخة المستند؛ أعد فتحها.');
   const stored=await tx.operationalSetting.findUnique({where:{key:approvalKey(c.organizationId,id,c.documentVersion)}});
   if(!stored)return undefined;
   const receipt=verifyApproval(stored.value,c.organizationId,id,c.documentVersion);
   if(receipt.source.contentHash!==d.contentHash||decisionDigest(receipt.source.payload)!==decisionDigest(d.payload))throw new ConflictException('مرجع الاعتماد لا يطابق النسخة المحفوظة.');
   return {referenceNumber:receipt.referenceNumber,recordedAt:receipt.recordedAt,actorAccountId:receipt.actorAccountId};
  });
  const rendered=await renderAdministrativeDocumentPdf(c,this.assets,undefined,{approvedIdentity:true,administrativeApproval:approval});
  await this.sources.owner(this.db,actor,c.organizationId);
  const latest=await this.print.contract(actor,id);
  if(latest.documentVersion!==c.documentVersion||latest.contentHash!==c.contentHash||latest.status!==c.status)throw new ConflictException('تغير المستند أثناء التصدير؛ أعد فتح النسخة الحالية.');
  res.setHeader('Content-Type','application/pdf');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Disposition',`inline; filename="IDENTITY-${c.referenceNumber.replace(/[^A-Za-z0-9._-]/g,'_')}.pdf"`);
  return res.send(rendered.bytes);
 }
}
