import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ManagedDocumentStatus } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DocumentPersistenceService } from './document-persistence.service';
type ReqAuth={auth:{accountId:string}};
@UseGuards(AccessTokenGuard)
@Controller('documents')
export class DocumentPersistenceController {
  constructor(private readonly documents:DocumentPersistenceService){}
  @Post('templates') createTemplate(@Req() r:ReqAuth,@Body() b:any){return this.documents.createTemplate(r.auth.accountId,b);}
  @Get('organizations/:organizationId/templates') listTemplates(@Req() r:ReqAuth,@Param('organizationId') org:string){return this.documents.listTemplates(r.auth.accountId,org);}
  @Post() create(@Req() r:ReqAuth,@Body() b:any){return this.documents.createDocument(r.auth.accountId,b);}
  @Get(':id') get(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.get(r.auth.accountId,id);}
  @Get(':id/revisions') revisions(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.listRevisions(r.auth.accountId,id);}
  @Get(':id/revisions/:version') revision(@Req() r:ReqAuth,@Param('id') id:string,@Param('version') version:string){return this.documents.getRevision(r.auth.accountId,id,Number(version));}
  @Post(':id/revise') revise(@Req() r:ReqAuth,@Param('id') id:string,@Body() b:any){return this.documents.revise(r.auth.accountId,id,b);}
  @Post(':id/submit') submit(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.PENDING_APPROVAL);}
  @Post(':id/approve') approve(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.APPROVED);}
  @Post(':id/sign') sign(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.SIGNED);}
  @Post(':id/archive') archive(@Req() r:ReqAuth,@Param('id') id:string){return this.documents.transition(r.auth.accountId,id,ManagedDocumentStatus.ARCHIVED);}
}
