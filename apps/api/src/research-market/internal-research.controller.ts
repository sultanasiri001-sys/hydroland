import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { InternalResearchService } from './internal-research.service';
type Request = {auth:{accountId:string}};

@Controller('admin/research-initiatives')
@UseGuards(AccessTokenGuard,AdminGuard)
export class InternalResearchController {
  constructor(private readonly service: InternalResearchService) {}
  @Get() @Header('Cache-Control','private, no-store')
  list(@Req() r:Request,@Query('before') before?:unknown) {return this.service.list(r.auth.accountId,before);}
  @Post() @Header('Cache-Control','private, no-store')
  create(@Req() r:Request,@Body() body:unknown) {return this.service.create(r.auth.accountId,body);}
  @Get(':id') @Header('Cache-Control','private, no-store')
  inspect(@Req() r:Request,@Param('id') id:string) {return this.service.inspect(r.auth.accountId,id);}
  @Post(':id/revise') @Header('Cache-Control','private, no-store')
  revise(@Req() r:Request,@Param('id') id:string,@Body() body:unknown) {return this.service.revise(r.auth.accountId,id,body);}
  @Get(':id/review/candidates') @Header('Cache-Control','private, no-store')
  candidates(@Req() r:Request,@Param('id') id:string,@Query('before') before?:unknown) {return this.service.candidates(r.auth.accountId,id,before);}
  @Post(':id/review/preview') @Header('Cache-Control','private, no-store')
  preview(@Req() r:Request,@Param('id') id:string,@Body() body:unknown) {return this.service.assignmentPreview(r.auth.accountId,id,body);}
  @Post(':id/review/assign') @Header('Cache-Control','private, no-store')
  assign(@Req() r:Request,@Param('id') id:string,@Body() body:unknown) {return this.service.assign(r.auth.accountId,id,body);}
  @Post(':id/review/revoke') @Header('Cache-Control','private, no-store')
  revoke(@Req() r:Request,@Param('id') id:string,@Body() body:unknown) {return this.service.revoke(r.auth.accountId,id,body);}
  @Post(':id/transitions/preview') @Header('Cache-Control','private, no-store')
  transitionPreview(@Req() r:Request,@Param('id') id:string,@Body() body:unknown) {return this.service.transitionPreview(r.auth.accountId,id,body);}
  @Post(':id/transitions') @Header('Cache-Control','private, no-store')
  transition(@Req() r:Request,@Param('id') id:string,@Body() body:unknown) {return this.service.transition(r.auth.accountId,id,body);}
}

// These routes grant no administrative or general-document workspace access.
// The service accepts only the current actual employee's explicit one-record,
// bounded-expiry assignment and freshly checks all issuing/recipient bindings.
@Controller('research-reviews')
@UseGuards(AccessTokenGuard)
export class InternalResearchReviewsController {
  constructor(private readonly service: InternalResearchService) {}
  @Get('inbox') @Header('Cache-Control','private, no-store')
  inbox(@Req() r:Request,@Query('before') before?:unknown) {return this.service.inbox(r.auth.accountId,before);}
  @Get(':id') @Header('Cache-Control','private, no-store')
  inspect(@Req() r:Request,@Param('id') id:string) {return this.service.reviewView(r.auth.accountId,id);}
  @Post(':id/decisions') @Header('Cache-Control','private, no-store')
  decide(@Req() r:Request,@Param('id') id:string,@Body() body:unknown) {return this.service.decide(r.auth.accountId,id,body);}
}
