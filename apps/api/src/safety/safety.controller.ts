import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { ReviewGuard } from '../admin/review.guard';
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
    @Body() body: Record<string, unknown>,
  ) {
    if ('complianceControls' in body || 'complianceEvidence' in body) {
      throw new BadRequestException(
        'Compliance controls and evidence cannot be self-certified through the safety checklist endpoint.',
      );
    }

    const items = body.items;
    const notes = body.notes;
    if (!items || typeof items !== 'object' || Array.isArray(items)) {
      throw new BadRequestException('Safety checklist items are required.');
    }
    if (notes !== undefined && typeof notes !== 'string') {
      throw new BadRequestException('Safety checklist notes must be a string.');
    }

    return this.safety.assess(request.auth.accountId, tripId, {
      items: items as Record<string, boolean>,
      notes,
    });
  }

  @UseGuards(ReviewGuard)
  @Get('history')
  history(@Param('tripId') tripId: string) {
    return this.reviews.history(tripId);
  }

  @UseGuards(ReviewGuard)
  @Patch('checklists/:checklistId/decision')
  decide(
    @Req() request: { auth: { accountId: string } },
    @Param('checklistId') checklistId: string,
    @Body() body: { decision: SafetyDecision; notes?: string },
  ) {
    return this.reviews.decide(request.auth.accountId, checklistId, body.decision, body.notes);
  }
}
