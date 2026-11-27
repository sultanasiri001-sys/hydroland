import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma, TrainingCertificate } from '@prisma/client';
import { notConnectedExternalCertification } from './training-certification-contract';

export const certificateActions = {
  recommended: 'training.certificate_recommended', decided: 'training.certificate_decided',
  requested: 'training.certificate_reconsideration_requested', reconsidered: 'training.certificate_reconsideration_decided',
  revoked: 'training.certificate_revoked',
} as const;
export const certificateObject = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function certificateEvidenceDigest(value: unknown): string {
  const canonical = (input: unknown): unknown => {
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
    return input;
  };
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export const certificateStateDigest = (row: TrainingCertificate) => certificateEvidenceDigest({
  id: row.id, trainingRecordId: row.trainingRecordId, studentAccountId: row.studentAccountId, courseCode: row.courseCode,
  recommendedByInstructorId: row.recommendedByInstructorId, recommendedAt: row.recommendedAt, status: row.status,
  reviewedByAccountId: row.reviewedByAccountId, reviewedAt: row.reviewedAt, reviewReason: row.reviewReason,
  certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, verificationTokenHash: row.verificationTokenHash,
  createdAt: row.createdAt, updatedAt: row.updatedAt,
});

export function certificateDecisionSnapshot(row: TrainingCertificate) {
  return { status: row.status, reviewedAt: row.reviewedAt?.toISOString() ?? null, reviewReason: row.reviewReason,
    certificateNumber: row.certificateNumber, issuedAt: row.issuedAt?.toISOString() ?? null };
}

export function internalCertificate(row: Pick<TrainingCertificate, 'id' | 'trainingRecordId' | 'courseCode' | 'status' | 'recommendedAt' | 'reviewedAt' | 'reviewReason' | 'certificateNumber' | 'issuedAt' | 'updatedAt'>) {
  return {
    id: row.id, trainingRecordId: row.trainingRecordId, courseCode: row.courseCode, status: row.status,
    recommendedAt: row.recommendedAt, reviewedAt: row.reviewedAt, reviewReason: row.reviewReason,
    certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, updatedAt: row.updatedAt,
    internalResult: { scope: 'HYDROLAND_INTERNAL' as const, status: row.status, certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, officialIssuance: false as const },
    externalCertification: notConnectedExternalCertification(),
  };
}

export async function certificateHistory(tx: Prisma.TransactionClient, row: TrainingCertificate) {
  const events = await tx.auditEvent.findMany({ where: { resource: 'trainingCertificate', resourceId: row.id,
    action: { in: Object.values(certificateActions) } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 101,
    select: { id: true, action: true, occurredAt: true, metadata: true } });
  const latest = events.find(event => event.action === certificateActions.requested || event.action === certificateActions.reconsidered);
  const metadata = certificateObject(latest?.metadata);
  const pending = latest?.action === certificateActions.requested && row.status === 'REJECTED';
  if (pending && (metadata.afterUpdatedAt !== row.updatedAt.toISOString() || metadata.afterStateDigest !== certificateStateDigest(row))) {
    throw new ConflictException('يلزم مراجعة سلامة سجل اعتراض الشهادة قبل متابعة الإجراء.');
  }
  const reconsideration = latest ? {
    status: pending ? 'PENDING' as const : metadata.outcome === 'REOPEN' ? 'REOPENED' as const : 'DISMISSED' as const,
    requestedAt: typeof metadata.requestedAt === 'string' ? metadata.requestedAt : latest.occurredAt.toISOString(),
    reason: typeof metadata.requestReason === 'string' ? metadata.requestReason : typeof metadata.reason === 'string' ? metadata.reason : '',
    decidedAt: latest.action === certificateActions.reconsidered ? latest.occurredAt.toISOString() : null,
    decisionReason: latest.action === certificateActions.reconsidered && typeof metadata.reason === 'string' ? metadata.reason : null,
  } : null;
  return {
    pending, requestedByAccountId: typeof metadata.requestedByAccountId === 'string' ? metadata.requestedByAccountId : null,
    requestEventId: latest?.action === certificateActions.requested ? latest.id : null,
    reconsideration,
    history: events.slice(0, 100).map(event => {
      const data = certificateObject(event.metadata), previous = certificateObject(data.previousDecision);
      return { id: event.id, action: event.action, occurredAt: event.occurredAt,
        outcome: typeof data.outcome === 'string' ? data.outcome : event.action === certificateActions.revoked ? 'REVOKED' : null,
        reason: typeof data.reason === 'string' ? data.reason : null,
        ...(Object.keys(previous).length ? { previousDecision: {
          status: previous.status, reviewedAt: previous.reviewedAt, reviewReason: previous.reviewReason,
          certificateNumber: previous.certificateNumber, issuedAt: previous.issuedAt,
        } } : {}),
      };
    }),
    historyTruncated: events.length > 100,
  };
}

export async function certificateActorProjection(tx: Prisma.TransactionClient, row: TrainingCertificate,
  actor: { requester: boolean; reviewer: boolean; independent: boolean; accountId: string }) {
  const history = await certificateHistory(tx, row);
  return { ...internalCertificate(row), reconsideration: history.reconsideration, history: history.history, historyTruncated: history.historyTruncated,
    canRequestReconsideration: actor.requester && row.status === 'REJECTED' && !history.pending,
    canDecideReconsideration: actor.reviewer && actor.independent && history.pending && history.requestedByAccountId !== actor.accountId,
    canRevoke: actor.reviewer && actor.independent && row.status === 'APPROVED',
  };
}
