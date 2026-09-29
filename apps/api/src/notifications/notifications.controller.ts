import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.notifications.list(request.auth.accountId);
  }

  @Post('safety-test')
  @HttpCode(200)
  safetyTest(@Req() request: AuthenticatedRequest) {
    return this.notifications.createSafetyTest(request.auth.accountId);
  }

  @Post(':id/read')
  read(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.notifications.read(request.auth.accountId, id);
  }
}
