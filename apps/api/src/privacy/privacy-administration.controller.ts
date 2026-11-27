import { Body, Controller, Get, Header, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PrivacyAdministrationService } from './privacy-administration.service';
type Session={auth:{accountId:string}};
@Controller('privacy') @UseGuards(AccessTokenGuard)
export class PrivacyAdministrationController {
  constructor(private readonly administration:PrivacyAdministrationService){}
  @Get('retention-activation') @Header('Cache-Control','private, no-store')
  options(@Req() r:Session){return this.administration.options(r.auth.accountId);}
  @Post('retention-activation') @Header('Cache-Control','private, no-store')
  activate(@Req() r:Session,@Body() b:unknown){return this.administration.activate(r.auth.accountId,b);}
  @Post('retention-templates') @Header('Cache-Control','private, no-store')
  templates(@Req() r:Session,@Body() b:unknown){return this.administration.prepareTemplates(r.auth.accountId,b);}
  @Post('retention-dispositions') @Header('Cache-Control','private, no-store')
  disposition(@Req() r:Session,@Body() b:unknown){return this.administration.authorizeDisposition(r.auth.accountId,b);}
}
