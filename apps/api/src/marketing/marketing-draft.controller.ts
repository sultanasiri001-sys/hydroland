import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { MarketingDraftService } from './marketing-draft.service';
type Request={auth:{accountId:string}};
@Controller('admin/marketing-campaign-drafts')
@UseGuards(AccessTokenGuard,AdminGuard)
export class MarketingDraftController{
  constructor(private readonly drafts:MarketingDraftService){}
  @Get() @Header('Cache-Control','private, no-store') list(@Req()r:Request,@Query('cursor')cursor?:string,@Query('status')status?:string){return this.drafts.list(r.auth.accountId,cursor,status);}
  @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req()r:Request,@Param('id')id:string){return this.drafts.detail(r.auth.accountId,id);}
  @Post() @Header('Cache-Control','private, no-store') create(@Req()r:Request,@Body()body:unknown){return this.drafts.create(r.auth.accountId,body);}
  @Patch(':id') @Header('Cache-Control','private, no-store') edit(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.drafts.edit(r.auth.accountId,id,body);}
  @Post(':id/archive') @Header('Cache-Control','private, no-store') archive(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.drafts.transition(r.auth.accountId,id,body,'ARCHIVED');}
  @Post(':id/restore') @Header('Cache-Control','private, no-store') restore(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.drafts.transition(r.auth.accountId,id,body,'DRAFT');}
}
