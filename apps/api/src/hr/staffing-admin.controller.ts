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
  @Post() request(@Req() req:{auth:{accountId:string}},@Body() body:unknown){return this.service.request(req.auth.accountId,body);}
  @Patch(':id/decision') decide(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:unknown){return this.service.decide(req.auth.accountId,id,body);}
}
