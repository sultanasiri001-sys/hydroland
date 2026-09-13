import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ProfileService } from './profile.service';

@UseGuards(AccessTokenGuard)
@Controller('me')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}
  @Get() get(@Req() req: { auth: { accountId: string } }) { return this.profiles.get(req.auth.accountId); }
  @Patch() update(@Req() req: { auth: { accountId: string } }, @Body() body: { firstName?: string; lastName?: string; phone?: string; headline?: string; bio?: string; regionCode?: string }) { return this.profiles.update(req.auth.accountId, body); }
}
