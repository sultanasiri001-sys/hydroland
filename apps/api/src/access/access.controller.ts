import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessService } from './access.service';

@Controller('me/access')
@UseGuards(AccessTokenGuard)
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get()
  getMyAccess(@CurrentUser() user: { sub: string }) {
    return this.accessService.getEffectiveAccess(user.sub);
  }
}
