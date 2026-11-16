import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TechnologyAgentAccessService } from './technology-agent-access.service';
type Request={auth:{accountId:string}};
@Controller('technology/agent-access')
@UseGuards(AccessTokenGuard)
export class TechnologyAgentAccessController {
  constructor(private readonly service:TechnologyAgentAccessService){}
  @Get() @Header('Cache-Control','private, no-store') list(@Req()r:Request){return this.service.list(r.auth.accountId);}
  @Get('references') @Header('Cache-Control','private, no-store') references(@Req()r:Request){return this.service.references(r.auth.accountId);}
  @Post() @Header('Cache-Control','private, no-store') propose(@Req()r:Request,@Body()body:unknown){return this.service.propose(r.auth.accountId,body);}
  @Post(':id/actions/:action') @Header('Cache-Control','private, no-store') decide(@Req()r:Request,@Param('id')id:string,@Param('action')action:string,@Body()body:unknown){return this.service.decide(r.auth.accountId,id,action,body);}
}
