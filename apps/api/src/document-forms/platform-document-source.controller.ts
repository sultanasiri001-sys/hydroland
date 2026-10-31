import { BadRequestException, Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PlatformDocumentSourceService } from './platform-document-source.service';
import { templateObject } from './document-template-input';
type Request={auth:{accountId:string}};
@UseGuards(AccessTokenGuard)
@Controller('documents/organizations/:organizationId')
export class PlatformDocumentSourceController{
 constructor(private readonly sources:PlatformDocumentSourceService){}
 @Get('platform-source-audit') @Header('Cache-Control','private, no-store')
 audit(@Req() r:Request,@Param('organizationId') org:string){return this.sources.audit(r.auth.accountId,org);}
 @Get('platform-sources/:kind') @Header('Cache-Control','private, no-store')
 candidates(@Req() r:Request,@Param('organizationId') org:string,@Param('kind') kind:string,@Query('cursor') cursor?:string){return this.sources.candidates(r.auth.accountId,org,kind,cursor);}
 @Post('platform-source-preview') @Header('Cache-Control','private, no-store')
 preview(@Req() r:Request,@Param('organizationId') org:string,@Body() body:unknown){
  const x=templateObject(body,['templateId','references']);
  if(typeof x.templateId!=='string')throw new BadRequestException('اختر قالب المستند.');
  return this.sources.preview(r.auth.accountId,org,x.templateId,x.references);
 }
}
