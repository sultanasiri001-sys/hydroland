import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PrivacyErasureService } from './privacy-erasure.service';
type Session={auth:{accountId:string}};
@Controller('privacy/grievances')
@UseGuards(AccessTokenGuard)
export class PrivacyErasureController {
  constructor(private readonly erasure:PrivacyErasureService){}
  @Get(':id/erasure-options') @Header('Cache-Control','private, no-store')
  options(@Req() r:Session,@Param('id') id:string){return this.erasure.options(r.auth.accountId,id);}
  @Post(':id/erasure-preview') @Header('Cache-Control','private, no-store')
  preview(@Req() r:Session,@Param('id') id:string,@Body() b:unknown){return this.erasure.preview(r.auth.accountId,id,b);}
  @Post(':id/erasure') @Header('Cache-Control','private, no-store')
  execute(@Req() r:Session,@Param('id') id:string,@Body() b:unknown){return this.erasure.execute(r.auth.accountId,id,b);}
  @Post(':id/retention-holds') @Header('Cache-Control','private, no-store')
  hold(@Req() r:Session,@Param('id') id:string,@Body() b:unknown){return this.erasure.hold(r.auth.accountId,id,b);}
  @Post(':id/retention-holds/:holdId/release') @Header('Cache-Control','private, no-store')
  release(@Req() r:Session,@Param('id') id:string,@Param('holdId') holdId:string,@Body() b:unknown){return this.erasure.releaseHold(r.auth.accountId,id,holdId,b);}
}
