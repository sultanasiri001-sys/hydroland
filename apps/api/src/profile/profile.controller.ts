import { Body, Controller, Get, Header, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ProfileService } from './profile.service';

@UseGuards(AccessTokenGuard)
@Controller('me')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}
  @Get() @Header('Cache-Control','private, no-store') get(@Req() req: { auth: { accountId: string } }) { return this.profiles.get(req.auth.accountId); }
  @Post('data-export') @Header('Cache-Control','private, no-store') @Header('Content-Disposition','attachment; filename="hydroland-account-profile.json"')
  exportAccount(@Req() req:{auth:{accountId:string}},@Body()body:unknown){return this.profiles.exportAccount(req.auth.accountId,body);}
  @Patch() @Header('Cache-Control','private, no-store') update(@Req() req: { auth: { accountId: string } }, @Body() body: unknown) { return this.profiles.update(req.auth.accountId, body); }
}
