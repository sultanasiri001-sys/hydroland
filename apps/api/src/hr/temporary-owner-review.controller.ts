import { Body, Controller, Get, Header, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { TemporaryOwnerReviewService } from './temporary-owner-review.service';

@Controller('admin/employees/temporary-owner-review')
@UseGuards(AccessTokenGuard,AdminGuard)
export class TemporaryOwnerReviewController {
  constructor(private readonly service:TemporaryOwnerReviewService){}
  @Get() @Header('Cache-Control','no-store') get(@Req() r:{auth:{accountId:string}}){return this.service.get(r.auth.accountId);}
  @Post() change(@Req() r:{auth:{accountId:string}},@Body() body:unknown){return this.service.change(r.auth.accountId,body);}
}
