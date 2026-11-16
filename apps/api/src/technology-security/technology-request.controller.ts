import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TechnologyRequestService } from './technology-request.service';
import { TechnologyRequestAction } from './technology-request.domain';
type Request={auth:{accountId:string}};
const actions=['SUBMIT','APPROVE','REJECT','START','RECORD_EXECUTION','PASS_TEST','FAIL_TEST','ACCEPT_RISK','REQUEST_ROLLBACK','RECORD_ROLLBACK','CLOSE','REVOKE'];
@Controller('technology/requests')
@UseGuards(AccessTokenGuard)
export class TechnologyRequestController {
  constructor(private readonly requests:TechnologyRequestService){}
  @Get() @Header('Cache-Control','private, no-store') list(@Req()r:Request,@Query('cursor')cursor?:string){return this.requests.list(r.auth.accountId,cursor);}
  @Get('references') @Header('Cache-Control','private, no-store') references(@Req()r:Request,@Query('type')type:string,@Query('kind')kind?:string,@Query('caseId')caseId?:string,@Query('cursor')cursor?:string){return this.requests.references(r.auth.accountId,type,kind,caseId,cursor);}
  @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req()r:Request,@Param('id')id:string){return this.requests.detail(r.auth.accountId,id);}
  @Post() @Header('Cache-Control','private, no-store') create(@Req()r:Request,@Body()body:unknown){return this.requests.create(r.auth.accountId,body);}
  @Post(':id/actions/:action') @Header('Cache-Control','private, no-store') transition(@Req()r:Request,@Param('id')id:string,@Param('action')action:string,@Body()body:unknown){if(!actions.includes(action))throw new BadRequestException('إجراء الطلب غير صالح.');return this.requests.transition(r.auth.accountId,id,action as TechnologyRequestAction,body);}
}
