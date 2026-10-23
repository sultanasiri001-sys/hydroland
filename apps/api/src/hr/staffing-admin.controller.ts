import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { StaffingAdminService } from './staffing-admin.service';

@Controller('admin/employees')
@UseGuards(AccessTokenGuard,AdminGuard)
export class StaffingAdminController {
  constructor(private readonly service:StaffingAdminService){}
  @Get() @Header('Cache-Control','no-store') list(@Req() req:{auth:{accountId:string}},@Query('search') search?:unknown,@Query('cursor') cursor?:unknown){return this.service.list(req.auth.accountId,{search,cursor});}
  @Post('initialize') initialize(@Req() req:{auth:{accountId:string}},@Body() body:unknown){return this.service.initialize(req.auth.accountId,body);}
  @Get('approval-delegations') @Header('Cache-Control','no-store') delegations(@Req() req:{auth:{accountId:string}}){return this.service.delegationList(req.auth.accountId);}
  @Post('approval-delegations') delegation(@Req() req:{auth:{accountId:string}},@Body() body:unknown){return this.service.changeDelegation(req.auth.accountId,body);}
  @Post() request(@Req() req:{auth:{accountId:string}},@Body() body:unknown){return this.service.request(req.auth.accountId,body);}
  @Patch(':id/decision') decide(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:unknown){return this.service.decide(req.auth.accountId,id,body);}
}

// A delegated employee has no access to the platform's ADMIN controllers.
@Controller('employee-approvals')
@UseGuards(AccessTokenGuard)
export class EmployeeApprovalsController {
  constructor(private readonly service:StaffingAdminService){}
  @Get('capability') @Header('Cache-Control','no-store') capability(@Req() req:{auth:{accountId:string}}){return this.service.approvalCapability(req.auth.accountId);}
  @Get() @Header('Cache-Control','no-store') list(@Req() req:{auth:{accountId:string}},@Query('search') search?:unknown,@Query('cursor') cursor?:unknown){return this.service.list(req.auth.accountId,{search,cursor},true);}
  @Patch(':id/decision') decide(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:unknown){return this.service.delegatedDecision(req.auth.accountId,id,body);}
}
