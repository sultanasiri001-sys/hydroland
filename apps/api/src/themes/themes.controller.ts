import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ThemesService } from './themes.service';

type AuthenticatedRequest = { auth?: { accountId: string } };
type ThemeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

@Controller('themes')
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  @Get('catalog')
  catalog() {
    return this.themes.catalog();
  }

  @Get('active')
  active() {
    return this.themes.active();
  }

  @UseGuards(AccessTokenGuard, AdminGuard)
  @Get('admin/schedules')
  schedules() {
    return this.themes.listSchedules();
  }

  @UseGuards(AccessTokenGuard, AdminGuard)
  @Post('admin/schedules')
  schedule(
    @Body() body: { themeId?: string; name?: string; startsAt?: string; endsAt?: string; status?: ThemeStatus },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.themes.schedule(body, req.auth?.accountId);
  }

  @UseGuards(AccessTokenGuard, AdminGuard)
  @Patch('admin/schedules/:id/status')
  status(@Param('id') id: string, @Body() body: { status: ThemeStatus }, @Req() req: AuthenticatedRequest) {
    return this.themes.setStatus(id, body.status, req.auth?.accountId);
  }
}
