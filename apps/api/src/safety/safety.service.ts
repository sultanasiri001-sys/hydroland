import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import {
  aggregateComplianceDecision,
  ComplianceControlInput,
  ComplianceDecision,
  evaluateComplianceControl,
} from './compliance-engine.domain';

@Injectable()
export class SafetyService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private mapComplianceToSafetyDecision(
    complianceDecision: ComplianceDecision,
  ): 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED' {
    if (complianceDecision === 'PASS') return 'ALLOWED';
    if (complianceDecision === 'REVIEW') return 'REVIEW_REQUIRED';
    return 'DEFERRED';
  }

  async assess(
    accountId: string,
    tripId: string,
    input: {
      items: Record<string, boolean>;
      notes?: string;
      complianceControls?: ComplianceControlInput[];
    },
  ) {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });
    if (!trip) throw new NotFoundException('Trip not found.');
    if (
      !input.items ||
      typeof input.items !== 'object' ||
      Array.isArray(input.items) ||
      !Object.keys(input.items).length
    ) {
      throw new BadRequestException('Safety checklist items are required.');
    }

    const failedItems = Object.entries(input.items)
      .filter((entry: [string, boolean]) => !entry[1])
      .map((entry: [string, boolean]) => entry[0]);

    const complianceResults = (input.complianceControls ?? []).map(
      evaluateComplianceControl,
    );
    const complianceDecision = complianceResults.length
      ? aggregateComplianceDecision(complianceResults)
      : undefined;

    // Preserve the existing checklist contract while compliance is introduced.
    // A failed physical checklist remains deferred. When the checklist passes,
    // verified compliance controls can allow, review, block, or escalate.
    const decision = failedItems.length
      ? 'DEFERRED'
      : complianceDecision
        ? this.mapComplianceToSafetyDecision(complianceDecision)
        : 'REVIEW_REQUIRED';

    const checklist = await this.db.safetyChecklist.create({
      data: {
        tripId,
        items: input.items,
        notes: input.notes?.trim() || null,
        decision,
      },
    });

    await this.audit.record({
      action: 'SAFETY_ASSESSMENT_CREATED',
      resource: 'SafetyChecklist',
      resourceId: checklist.id,
      metadata: {
        accountId,
        tripId,
        decision,
        failedItems,
        notesProvided: Boolean(input.notes?.trim()),
        complianceDecision: complianceDecision ?? null,
        complianceResults,
      },
    });

    return {
      ...checklist,
      complianceDecision: complianceDecision ?? null,
      complianceResults,
    };
  }

  async decide(
    id: string,
    decision: 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED',
  ) {
    if (decision === 'ALLOWED') {
      return this.db.safetyChecklist.update({
        where: { id },
        data: { decision, decidedAt: new Date() },
      });
    }
    throw new BadRequestException('Only an allowed decision is final.');
  }
}
