import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { SafetyReviewService } from './safety-review.service';
import { SafetyService } from './safety.service';

type SafetyDecision = 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED';

@UseGuards(AccessTokenGuard)
@Controller('trips/:tripId/safety')
export class SafetyController {
  constructor(
    private readonly safety: SafetyService,
    private readonly reviews: SafetyReviewService,
  ) {}

  @UseGuards(AdminGuard)
  @Post()
  assess(
    @Req() request: { auth: { accountId: string } },
    @Param('tripId') tripId: string,
    @Body() body: { items: Record<string, boolean>; notes?: string },
  ) {
    return this.safety.assess(request.auth.accountId, tripId, body);
  }

  @UseGuards(AdminGuard)
  @Get('history')
  history(@Param('tripId') tripId: string) {
    return this.reviews.history(tripId);
  }

  @UseGuards(AdminGuard)
  @Patch('checklists/:checklistId/decision')
  decide(
    @Req() request: { auth: { accountId: string } },
    @Param('checklistId') checklistId: string,
    @Body() body: { decision: SafetyDecision; notes?: string },
  ) {
    return this.reviews.decide(request.auth.accountId, checklistId, body.decision, body.notes);
  }
}
