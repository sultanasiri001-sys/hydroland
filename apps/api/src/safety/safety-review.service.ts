import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type SafetyDecision = 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED';
const decisions: SafetyDecision[] = ['ALLOWED', 'REVIEW_REQUIRED', 'DEFERRED'];

@Injectable()
export class SafetyReviewService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  history(tripId: string) {
    return this.db.safetyChecklist.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(
    reviewerAccountId: string,
    checklistId: string,
    decision: SafetyDecision,
    notes?: string,
  ) {
    if (!decisions.includes(decision)) throw new BadRequestException('Invalid safety decision.');
    const checklist = await this.db.safetyChecklist.findUnique({ where: { id: checklistId } });
    if (!checklist) throw new NotFoundException('Safety checklist not found.');

    const updated = await this.db.safetyChecklist.update({
      where: { id: checklistId },
      data: {
        decision,
        notes: notes?.trim() || checklist.notes,
        decidedAt: new Date(),
      },
    });

    await this.audit.record({
      action: 'SAFETY_DECISION_SET',
      resource: 'SafetyChecklist',
      resourceId: checklistId,
      metadata: {
        reviewerAccountId,
        tripId: checklist.tripId,
        previousDecision: checklist.decision,
        decision,
      },
    });

    return updated;
  }
}
