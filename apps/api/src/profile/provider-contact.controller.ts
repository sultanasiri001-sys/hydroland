import { Body, Controller, Get, Header, Patch, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ProviderContactService } from './provider-contact.service';

type Request = { auth: {accountId: string} };

@Controller('me/provider-contact')
@UseGuards(AccessTokenGuard)
export class ProviderContactController {
  constructor(private readonly profiles: ProviderContactService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  read(@Req() req: Request) {
    return this.profiles.read(req.auth.accountId);
  }

  @Patch()
  @Header('Cache-Control', 'private, no-store')
  save(@Req() req: Request, @Body() body: Record<string, unknown>) {
    return this.profiles.save(req.auth.accountId, body);
  }
}
