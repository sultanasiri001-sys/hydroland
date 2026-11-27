import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { LegalContractLifecycleService } from './legal-contract-lifecycle.service';
type Request={auth:{accountId:string}};
@Controller('legal/contracts')
@UseGuards(AccessTokenGuard)
export class LegalContractLifecycleController {
  constructor(private readonly service:LegalContractLifecycleService){}
  @Get('workspaces') @Header('Cache-Control','private, no-store')
  workspaces(@Req() r:Request){return this.service.workspaces(r.auth.accountId);}
  @Get('organizations/:org/workspace') @Header('Cache-Control','private, no-store')
  workspace(@Req() r:Request,@Param('org')org:string){return this.service.workspace(r.auth.accountId,org);}
  @Post('organizations/:org/templates/install')
  install(@Req()r:Request,@Param('org')org:string){return this.service.install(r.auth.accountId,org);}
  @Post('organizations/:org/records')
  register(@Req()r:Request,@Param('org')org:string,@Body()body:unknown){return this.service.register(r.auth.accountId,org,body);}
  @Get('organizations/:org/records/:id') @Header('Cache-Control','private, no-store')
  get(@Req()r:Request,@Param('org')org:string,@Param('id')recordId:string){return this.service.get(r.auth.accountId,org,recordId);}
  @Post('organizations/:org/records/:id/actions')
  act(@Req()r:Request,@Param('org')org:string,@Param('id')recordId:string,@Body()body:unknown){return this.service.act(r.auth.accountId,org,recordId,body);}
}
