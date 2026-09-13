import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('me/profile')
@UseGuards(AccessTokenGuard)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AccessTokenPrincipal) {
    return this.profiles.getByPersonId(user.sub);
  }

  @Patch()
  updateProfile(@CurrentUser() user: AccessTokenPrincipal, @Body() input: UpdateProfileDto) {
    return this.profiles.update(user.sub, input);
  }
}
