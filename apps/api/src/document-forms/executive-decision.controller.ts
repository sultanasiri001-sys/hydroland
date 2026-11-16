import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ExecutiveDecisionService } from './executive-decision.service';
type Actor={auth:{accountId:string}};
@Controller('executive-decisions')
@UseGuards(AccessTokenGuard)
export class ExecutiveDecisionController {
  constructor(private readonly service:ExecutiveDecisionService){}
  @Get('inbox') @Header('Cache-Control','private, no-store')
  inbox(@Req() r:Actor,@Query('cursor') cursor?:string){return this.service.inbox(r.auth.accountId,cursor);}
  @Get('organizations/:org/candidates') @Header('Cache-Control','private, no-store')
  candidates(@Req() r:Actor,@Param('org') org:string,@Query('department') department:string){return this.service.candidates(r.auth.accountId,org,department);}
  @Get('organizations/:org/documents/:id/source') @Header('Cache-Control','private, no-store')
  inspect(@Req() r:Actor,@Param('org') org:string,@Param('id') id:string){return this.service.inspect(r.auth.accountId,org,id);}
  @Post('organizations/:org/documents/:id/issue') @Header('Cache-Control','private, no-store')
  issue(@Req() r:Actor,@Param('org') org:string,@Param('id') id:string,@Body() body:unknown){return this.service.issue(r.auth.accountId,org,id,body);}
  @Get('organizations/:org/documents/:id') @Header('Cache-Control','private, no-store')
  detail(@Req() r:Actor,@Param('org') org:string,@Param('id') id:string){return this.service.detail(r.auth.accountId,org,id);}
  @Post('organizations/:org/documents/:id/transitions') @Header('Cache-Control','private, no-store')
  transition(@Req() r:Actor,@Param('org') org:string,@Param('id') id:string,@Body() body:unknown){return this.service.transition(r.auth.accountId,org,id,body);}
}
