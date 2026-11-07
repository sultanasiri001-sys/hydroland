import { Body, Controller, Get, Header, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { OperationalSourceLinkService } from './operational-source-link.service';
@Controller('admin/operational-source-links')
@UseGuards(AccessTokenGuard,AdminGuard)
export class OperationalSourceLinkController {
  constructor(private readonly service:OperationalSourceLinkService){}
  @Get()
  @Header('Cache-Control','private, no-store')
  list(@Req() r:{auth:{accountId:string}}){return this.service.list(r.auth.accountId);}
  @Post('preview')
  @Header('Cache-Control','private, no-store')
  preview(@Req() r:{auth:{accountId:string}},@Body() body:unknown){return this.service.preview(r.auth.accountId,body);}
  @Post()
  @Header('Cache-Control','private, no-store')
  record(@Req() r:{auth:{accountId:string}},@Body() body:unknown){return this.service.record(r.auth.accountId,body);}
}
