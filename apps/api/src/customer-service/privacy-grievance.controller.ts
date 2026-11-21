import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PrivacyGrievanceService } from './privacy-grievance.service';

type Request = {auth:{accountId:string}};
@Controller('privacy/grievances')
@UseGuards(AccessTokenGuard)
export class PrivacyGrievanceController {
  constructor(private readonly cases: PrivacyGrievanceService) {}
  @Get() inbox(@Req() req:Request,@Query('page',new ParseIntPipe({optional:true})) page?:number) {
    return this.cases.inbox(req.auth.accountId,page??1);
  }
  @Post() submit(@Req() req:Request,@Body() body:Record<string,unknown>) {
    return this.cases.submit(req.auth.accountId,body);
  }
  @Post(':id/appeal') appeal(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>) {
    return this.cases.appeal(req.auth.accountId,id,body);
  }
  @Post(':id/actions') act(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>) {
    return this.cases.act(req.auth.accountId,id,body);
  }
}
