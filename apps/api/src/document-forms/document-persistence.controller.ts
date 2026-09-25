import { Res, Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ManagedDocumentStatus } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DocumentPersistenceService } from './document-persistence.service';
import { DocumentListService } from './document-list.service';
import { DocumentPrintService } from './document-print.service';
import { DocumentPdfService } from './document-pdf.service';
import { DocumentAssetService } from './document-asset.service';
import { DocumentBrandingService } from './document-branding.service';
type ReqAuth={auth:{accountId:string}};
@UseGuards(AccessTokenGuard)
@Controller('documents')
export class DocumentPersistenceController {
  constructor(private readonly documents:DocumentPersistenceService,private readonly list:DocumentListService,private readonly print:DocumentPrintService,private readonly pdf:DocumentPdfService,private readonly assets:DocumentAssetService,private readonly branding:DocumentBrandingService){}
  @Post('templates') createTemplate(@Req() r:ReqAuth,@Body() b:any){return this.documents.createTemplate(r.auth.accountId,b);}
  @Put('templates/:id') updateTemplate(@Req() r:ReqAuth,@Param('id') id:string,@Body() b:any){return this.documents.updateTemplate(r.auth.accountId,id,b);}
  @Get('organizations/:organizationId/templates') listTemplates(@Req() r:ReqAuth,@Param('organizationId') org:string){return this.documents.listTemplates(r.auth.accountId,org);}
  @Get('organizations/:organizationId/list') listDocuments(@Req() r:ReqAuth,@Param('organizationId') org:string){return this.list.list(r.auth.accountId,org);}
  @Post('organizations/:organizationId/logo') async uploadLogo(@Req() r:ReqAuth,@Param('organizationId') org:string,@Body() b:{mimeType:string;base64:string}){
    const bytes=Buffer.from(b.base64||'','base64');
    return this.assets.uploadLogo(r.auth.accountId,org,b.mimeType,bytes);
  }
  @Get('organizations/:organizationId/branding') brandingCurrent(@Req() r:ReqAuth,@Param('organizationId') org:string){return this.branding.current(r.auth.accountId,org);}
  @Put('organizations/:organizationId/branding') brandingUpdate(@Req() r:ReqAuth,@Param('organizationId') org:string,@Body() b:any){return this.branding.update(r.auth.accountId,org,b);}
  @Post() create(@Req() r:ReqAuth,@Body() b:any){return this.documents.createDocument(r.auth.accountId,b);}
  @Get(':id') get(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.get(r.auth.accountId,id);}
  @Get(':id/pdf') async pdfFile(@Req() r:ReqAuth,@Param('id') id:string,@Res() res:any){
    const rendered=await this.pdf.render(r.auth.accountId,id);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`inline; filename="${rendered.filename.replace(/[^A-Za-z0-9._-]/g,'_')}"`);
    res.setHeader('Cache-Control','private, no-store');
    return res.send(rendered.bytes);
  }
  @Get(':id/print-contract') printContract(@Req() r:ReqAuth,@Param('id') id:string){return this.print.contract(r.auth.accountId,id);}
  @Get(':id/revisions') revisions(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.listRevisions(r.auth.accountId,id);}
  @Get(':id/revisions/:version') revision(@Req() r:ReqAuth,@Param('id') id:string,@Param('version') version:string){return this.documents.getRevision(r.auth.accountId,id,Number(version));}
  @Post(':id/revise') revise(@Req() r:ReqAuth,@Param('id') id:string,@Body() b:any){return this.documents.revise(r.auth.accountId,id,b);}
  @Post(':id/submit') submit(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.PENDING_APPROVAL);}
  @Post(':id/approve') approve(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.APPROVED);}
  @Post(':id/sign') sign(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.SIGNED);}
  @Post(':id/archive') archive(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.ARCHIVED);}
}
