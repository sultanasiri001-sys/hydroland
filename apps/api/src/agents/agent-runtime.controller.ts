import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AgentRuntimeService } from './agent-runtime.service';
import { GovernanceReviewInboxService } from './governance-review-inbox.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin/agents')
export class AgentRuntimeController {
  constructor(private readonly runtime:AgentRuntimeService,private readonly inbox:GovernanceReviewInboxService){}
  @Get() @Header('Cache-Control','no-store') catalog(@Req()req:{auth:{accountId:string}}){return this.runtime.catalog(req.auth.accountId);}
  @Get('provider-connection') @Header('Cache-Control','no-store') connection(@Req()req:{auth:{accountId:string}}){return this.runtime.checkProviderConnection(req.auth.accountId);}
  @Get('governance-reviews') @Header('Cache-Control','no-store') reviews(@Req()req:{auth:{accountId:string}},@Query('cursor')cursor?:string){return this.inbox.list(req.auth.accountId,cursor);}
  @Get('governance-reviews/:id') @Header('Cache-Control','no-store') review(@Req()req:{auth:{accountId:string}},@Param('id')id:string){return this.inbox.detail(req.auth.accountId,id);}
  @Post('initialize') initialize(@Req()req:{auth:{accountId:string}},@Body()body:unknown){return this.runtime.initialize(req.auth.accountId,body);}
  @Patch(':key/control') control(@Req()req:{auth:{accountId:string}},@Param('key')key:string,@Body()body:unknown){return this.runtime.control(req.auth.accountId,key,body);}
  @Get(':key/tasks') @Header('Cache-Control','no-store') tasks(@Req()req:{auth:{accountId:string}},@Param('key')key:string,@Query('cursor')cursor?:string){return this.runtime.tasks(req.auth.accountId,key,cursor);}
  @Post(':key/tasks') enqueue(@Req()req:{auth:{accountId:string}},@Param('key')key:string,@Body()body:unknown){return this.runtime.enqueue(req.auth.accountId,key,body);}
  @Patch('tasks/:id/decision') decide(@Req()req:{auth:{accountId:string}},@Param('id')id:string,@Body()body:unknown){return this.runtime.decideTask(req.auth.accountId,id,body);}
}
