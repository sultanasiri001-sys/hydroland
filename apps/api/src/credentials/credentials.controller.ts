import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialsService } from './credentials.service';

@Controller('me/credentials')
@UseGuards(AccessTokenGuard)
export class CredentialsController {
  constructor(private readonly credentials: CredentialsService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPrincipal) {
    return this.credentials.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AccessTokenPrincipal, @Body() input: CreateCredentialDto) {
    return this.credentials.create(user.sub, input);
  }
}
