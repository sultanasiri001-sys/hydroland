import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DiveLogsService } from './dive-logs.service';

@UseGuards(AccessTokenGuard)
@Controller('dive-logs')
export class DiveLogsController {
  constructor(private readonly service: DiveLogsService) {}

  @Get()
  list(@Req() req: { auth: { accountId: string } }) {
    return this.service.list(req.auth.accountId);
  }

  @Post()
  create(
    @Req() req: { auth: { accountId: string } },
    @Body() body: { siteName: string; regionCode?: string; diveDate: string; maxDepthM: number; durationMin: number; buddyName?: string; instructorName?: string; notes?: string },
  ) {
    return this.service.create(req.auth.accountId, body);
  }
}
