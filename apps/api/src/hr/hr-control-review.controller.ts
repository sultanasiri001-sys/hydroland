import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { HrControlReviewService } from './hr-control-review.service';

@Controller('admin/employees/compliance-controls')
@UseGuards(AccessTokenGuard,AdminGuard)
export class HrControlReviewController {
 constructor(private readonly service:HrControlReviewService){}
 @Get() @Header('Cache-Control','no-store') list(@Req() r:{auth:{accountId:string}},@Query('cursor') cursor?:unknown){return this.service.list(r.auth.accountId,cursor);}
 @Post() request(@Req() r:{auth:{accountId:string}},@Body() body:unknown){return this.service.request(r.auth.accountId,body);}
 @Post(':id/decision') decide(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Body() body:unknown){return this.service.decide(r.auth.accountId,id,body);}
}
