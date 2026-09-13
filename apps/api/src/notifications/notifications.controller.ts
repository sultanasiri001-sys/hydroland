import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('me/notifications')
@UseGuards(AccessTokenGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  listMine(@CurrentUser() user: AccessTokenPrincipal) {
    return this.notifications.listMine(user.sub);
  }

  @Patch(':publicId/read')
  markRead(@CurrentUser() user: AccessTokenPrincipal, @Param('publicId') publicId: string) {
    return this.notifications.markRead(user.sub, publicId);
  }
}
