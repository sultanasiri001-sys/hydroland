import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { DepartmentReportingService } from './department-reporting.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin/agents/reporting')
export class DepartmentReportingController {
  constructor(private readonly reporting:DepartmentReportingService){}
  @Get('catalog') @Header('Cache-Control','no-store') catalog(@Req()req:{auth:{accountId:string}}){return this.reporting.catalog(req.auth.accountId);}
  @Post('cycles') start(@Req()req:{auth:{accountId:string}},@Body()body:unknown){return this.reporting.start(req.auth.accountId,body);}
  @Get('cycles') @Header('Cache-Control','no-store') list(@Req()req:{auth:{accountId:string}}){return this.reporting.list(req.auth.accountId);}
  @Get('cycles/:id') @Header('Cache-Control','no-store') detail(@Req()req:{auth:{accountId:string}},@Param('id')id:string){return this.reporting.detail(req.auth.accountId,id);}
}
