import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AccessTokenPrincipal } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../database/prisma.service';

@Controller('me')
@UseGuards(AccessTokenGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMe(@CurrentUser() user: AccessTokenPrincipal) {
    return this.prisma.person.findUnique({
      where: { id: user.sub },
      select: {
        publicId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        preferredLanguage: true,
        status: true,
        profile: true,
        accounts: {
          select: {
            id: true,
            email: true,
            phoneE164: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            status: true,
            lastLoginAt: true,
          },
        },
      },
    });
  }
}
