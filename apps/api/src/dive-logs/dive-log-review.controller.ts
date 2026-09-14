import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DiveLogReviewGuard } from './dive-log-review.guard';
import { DiveLogReviewService } from './dive-log-review.service';

@UseGuards(AccessTokenGuard, DiveLogReviewGuard)
@Controller('dive-logs/review')
export class DiveLogReviewController {
  constructor(private readonly review: DiveLogReviewService) {}

  @Get()
  pending() {
    return this.review.pending();
  }

  @Patch(':id')
  decide(
    @Req() req: { auth: { accountId: string } },
    @Param('id') id: string,
    @Body() body: { status: 'VERIFIED' | 'REJECTED'; reason?: string },
  ) {
    return this.review.decide(req.auth.accountId, id, body.status, body.reason);
  }
}
