import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = { auth: { accountId: string; sessionId: string } };

@UseGuards(AccessTokenGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.notifications.list(request.auth.accountId);
  }

  @Post('device/register')
  @HttpCode(200)
  registerDevice(@Req() request: AuthenticatedRequest, @Body() body: {token?: unknown}) {
    return this.notifications.registerDevice(request.auth.accountId, request.auth.sessionId, body?.token);
  }

  @Post('device/unregister')
  @HttpCode(200)
  unregisterDevice(@Req() request: AuthenticatedRequest, @Body() body: {token?: unknown}) {
    return this.notifications.unregisterDevice(request.auth.accountId, request.auth.sessionId, body?.token);
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
