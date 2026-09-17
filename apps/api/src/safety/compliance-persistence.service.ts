import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  ComplianceControlResult,
  ComplianceDecision,
} from './compliance-engine.domain';

export interface ComplianceEvidenceInput {
  controlId: string;
  evidenceType: string;
  reference?: string;
  validFrom?: Date;
  validUntil?: Date;
  verified?: boolean;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CompliancePersistenceService {
  constructor(private readonly db: DatabaseService) {}

  async recordAssessment(input: {
    tripId: string;
    safetyChecklistId?: string;
    decision: ComplianceDecision;
    results: ComplianceControlResult[];
    assessedByAccountId?: string;
    evidence?: ComplianceEvidenceInput[];
  }) {
    const assessmentId = randomUUID();
    const resultsJson = JSON.stringify(input.results);

    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "ComplianceAssessment"
          ("id", "tripId", "safetyChecklistId", "decision", "results", "assessedByAccountId", "assessedAt", "createdAt")
        VALUES
          (${assessmentId}, ${input.tripId}, ${input.safetyChecklistId ?? null}, ${input.decision}, ${resultsJson}::jsonb, ${input.assessedByAccountId ?? null}, NOW(), NOW())
      `;

      for (const item of input.evidence ?? []) {
        const evidenceId = randomUUID();
        const metadataJson = item.metadata ? JSON.stringify(item.metadata) : null;
        await tx.$executeRaw`
          INSERT INTO "ComplianceEvidence"
            ("id", "assessmentId", "controlId", "evidenceType", "reference", "validFrom", "validUntil", "verified", "metadata", "createdAt", "updatedAt")
          VALUES
            (${evidenceId}, ${assessmentId}, ${item.controlId}, ${item.evidenceType}, ${item.reference ?? null}, ${item.validFrom ?? null}, ${item.validUntil ?? null}, ${item.verified === true}, ${metadataJson}::jsonb, NOW(), NOW())
        `;
      }
    });

    return {
      id: assessmentId,
      tripId: input.tripId,
      safetyChecklistId: input.safetyChecklistId ?? null,
      decision: input.decision,
      results: input.results,
      evidenceCount: input.evidence?.length ?? 0,
    };
  }
}
