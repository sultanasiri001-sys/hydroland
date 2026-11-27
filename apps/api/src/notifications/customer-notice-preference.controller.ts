import { Body, Controller, Get, Header, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CustomerNoticePreferenceService } from './customer-notice-preference.service';
type Request = {auth:{accountId:string;sessionId:string}};

@UseGuards(AccessTokenGuard)
@Controller('notifications/delivery')
export class CustomerNoticePreferenceController {
  constructor(private readonly preferences:CustomerNoticePreferenceService) {}
  @Get('preferences') @Header('Cache-Control','private, no-store')
  get(@Req() req:Request){return this.preferences.get(req.auth.accountId,req.auth.sessionId);}
  @Post('preferences') @HttpCode(200) @Header('Cache-Control','private, no-store')
  update(@Req() req:Request,@Body() body:unknown){return this.preferences.update(req.auth.accountId,req.auth.sessionId,body);}
  @Post('phone/challenges') @HttpCode(200) @Header('Cache-Control','private, no-store')
  challenge(@Req() req:Request,@Body() body:unknown){return this.preferences.challenge(req.auth.accountId,req.auth.sessionId,body);}
  @Post('phone/challenges/:id/verify') @HttpCode(200) @Header('Cache-Control','private, no-store')
  verify(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.preferences.verify(req.auth.accountId,req.auth.sessionId,id,body);}
  @Post('phone/remove') @HttpCode(200) @Header('Cache-Control','private, no-store')
  remove(@Req() req:Request,@Body() body:unknown){return this.preferences.removePhone(req.auth.accountId,req.auth.sessionId,body);}
  @Get('deliveries') @Header('Cache-Control','private, no-store')
  deliveries(@Req() req:Request){return this.preferences.deliveries(req.auth.accountId,req.auth.sessionId);}
}

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin/customer-channel-deliveries')
export class CustomerChannelReviewController {
  constructor(private readonly preferences:CustomerNoticePreferenceService) {}
  @Get() @Header('Cache-Control','private, no-store')
  list(@Req() req:Request){return this.preferences.reviewQueue(req.auth.accountId,req.auth.sessionId);}
  @Post(':id/close') @HttpCode(200) @Header('Cache-Control','private, no-store')
  close(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.preferences.closeReview(req.auth.accountId,req.auth.sessionId,id,body);}
}
