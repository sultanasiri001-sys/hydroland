import { Body, Controller, Header, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { MembershipPassService } from './membership-pass.service';

type AuthenticatedRequest = { auth: { accountId: string; sessionId: string } };

@UseGuards(AccessTokenGuard)
@Controller('me/membership-pass')
export class MembershipPassController {
  constructor(private readonly passes: MembershipPassService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  issue(@Req() req: AuthenticatedRequest) {
    return this.passes.issue(req.auth.accountId, req.auth.sessionId);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  verify(@Req() req: AuthenticatedRequest, @Body() body: { reference?: unknown } | null) {
    return this.passes.verify(req.auth.accountId, body?.reference);
  }
}
