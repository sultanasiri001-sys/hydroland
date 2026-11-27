import { ConflictException } from '@nestjs/common';
import { ParticipationCase, Prisma } from '@prisma/client';
import { CaseState, caseDigest, hash, json, occurrenceId } from './participation.domain';
import { participationAccount } from './participation-access';

export function participationEventHash(event: {
  id: string; caseId: string; actorAccountId: string; actorPersonId: string; requestId: string; action: string;
  requestFingerprint: string; beforeRevision: number; afterRevision: number; previousDigest: string | null;
  resultDigest: string; payload: unknown; createdAt: Date;
}) {
  return hash({ id: event.id, caseId: event.caseId, actorAccountId: event.actorAccountId, actorPersonId: event.actorPersonId,
    requestId: event.requestId, action: event.action, requestFingerprint: event.requestFingerprint,
    beforeRevision: event.beforeRevision, afterRevision: event.afterRevision, previousDigest: event.previousDigest,
    resultDigest: event.resultDigest, payload: event.payload, createdAt: event.createdAt });
}

export async function verifyParticipationChain(tx: Prisma.TransactionClient, row: ParticipationCase) {
  const state = row.state as unknown as CaseState;
  if (state.schemaVersion !== 1 || caseDigest(row.id, row.revision, state) !== row.digest
    || state.organizationId !== row.organizationId || state.policy.id !== row.policyDocumentId || state.identity.id !== row.identityDocumentId
    || (state.guardian?.id ?? null) !== row.guardianDocumentId || (state.medical?.id ?? null) !== row.medicalDocumentId
    || state.participant.accountId !== row.participantAccountId || (state.guardianActor?.accountId ?? null) !== row.guardianAccountId
    || (state.subjectType === 'BOOKING_PARTICIPANT' ? row.bookingParticipantId : row.trainingEnrollmentId) !== state.subjectId) throw new ConflictException('PARTICIPATION_STATE_INTEGRITY');
  const events = await tx.participationEvent.findMany({ where: { caseId: row.id }, orderBy: { afterRevision: 'asc' } });
  if (events.length !== row.revision) throw new ConflictException('PARTICIPATION_HISTORY_INCOMPLETE');
  let previous: string | null = null;
  for (let index = 0; index < events.length; index++) {
    const event = events[index], payload = event.payload as Record<string, unknown>;
    if (event.beforeRevision !== index || event.afterRevision !== index + 1 || event.previousDigest !== previous
      || event.evidenceHash !== participationEventHash(event)
      || caseDigest(row.id, event.afterRevision, payload.state as CaseState) !== event.resultDigest) throw new ConflictException('PARTICIPATION_HISTORY_INTEGRITY');
    previous = event.resultDigest;
  }
  if (previous !== row.digest) throw new ConflictException('PARTICIPATION_HISTORY_CURRENT_MISMATCH');
  return { state, events };
}

export async function writeParticipationCase(tx: Prisma.TransactionClient, input: {
  row: ParticipationCase | null; id: string; actorId: string; requestId: string; action: string; fingerprint: string;
  state: CaseState; occurredAt: Date; eventId: string;
}) {
  const actor = await participationAccount(tx, input.actorId), beforeRevision = input.row?.revision ?? 0, afterRevision = beforeRevision + 1;
  const state = json(input.state), resultDigest = caseDigest(input.id, afterRevision, state);
  const data = {
    organizationId: state.organizationId, bookingParticipantId: state.subjectType === 'BOOKING_PARTICIPANT' ? state.subjectId : null,
    trainingEnrollmentId: state.subjectType === 'TRAINING_ENROLLMENT' ? state.subjectId : null,
    participantAccountId: state.participant.accountId, guardianAccountId: state.guardianActor?.accountId ?? null,
    policyDocumentId: state.policy.id, identityDocumentId: state.identity.id, guardianDocumentId: state.guardian?.id ?? null,
    medicalDocumentId: state.medical?.id ?? null, revision: afterRevision, digest: resultDigest, state: state as unknown as Prisma.InputJsonValue,
    updatedAt: input.occurredAt,
  };
  const row = input.row
    ? await tx.participationCase.update({ where: { id: input.id }, data })
    : await tx.participationCase.create({ data: { id: input.id, ...data, createdByAccountId: input.actorId, createdAt: input.occurredAt } });
  const event = { id: input.eventId, caseId: input.id, actorAccountId: input.actorId, actorPersonId: actor.personId,
    requestId: input.requestId, action: input.action, requestFingerprint: input.fingerprint,
    beforeRevision, afterRevision, previousDigest: input.row?.digest ?? null, resultDigest,
    payload: json({ state }) as unknown as Prisma.InputJsonValue, createdAt: input.occurredAt };
  await tx.participationEvent.create({ data: { ...event, evidenceHash: participationEventHash(event) } });
  await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'PARTICIPATION_' + input.action, resource: 'ParticipationCase', resourceId: row.id,
    metadata: { schemaVersion: 1, actorAccountId: input.actorId, eventId: input.eventId, subjectType: state.subjectType, subjectId: state.subjectId, revision: afterRevision, digest: resultDigest } } });
  // Source withdrawal and its native operating signal commit atomically.
  if (row.bookingParticipantId) {
    const participant = await tx.bookingParticipant.findUniqueOrThrow({ where: { id: row.bookingParticipantId }, select: { bookingId: true, updatedAt: true } });
    const eligibilityStatus = !state.revokedAt && !state.consent?.withdrawnAt && state.review?.decision === 'ELIGIBLE' ? 'ELIGIBLE' : state.review?.decision === 'REJECTED' ? 'REJECTED' : 'PENDING';
    const updatedAt = new Date(Math.max(input.occurredAt.getTime(), participant.updatedAt.getTime() + 1));
    await tx.bookingParticipant.update({ where: { id: row.bookingParticipantId }, data: { eligibilityStatus, updatedAt } });
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: participant.bookingId }, select: { updatedAt: true } });
    await tx.booking.update({ where: { id: participant.bookingId }, data: { updatedAt: new Date(Math.max(updatedAt.getTime(), booking.updatedAt.getTime() + 1)) } });
  } else if (row.trainingEnrollmentId) {
    const enrollment = await tx.trainingEnrollment.findUniqueOrThrow({ where: { id: row.trainingEnrollmentId }, select: { updatedAt: true } });
    await tx.trainingEnrollment.update({ where: { id: row.trainingEnrollmentId }, data: { updatedAt: new Date(Math.max(input.occurredAt.getTime(), enrollment.updatedAt.getTime() + 1)) } });
  }
  return row;
}

export async function invalidateParticipationSource(tx: Prisma.TransactionClient, documentId: string, actorId: string, requestId: string, reason: string, occurredAt: Date) {
  const cases = await tx.participationCase.findMany({ where: { OR: [{ policyDocumentId: documentId }, { identityDocumentId: documentId }, { guardianDocumentId: documentId }, { medicalDocumentId: documentId }] }, orderBy: { id: 'asc' } });
  for (const row of cases) {
    const { state } = await verifyParticipationChain(tx, row);
    const next = { ...state, review: null, revokedAt: occurredAt.toISOString(), revocationReason: reason };
    const eventId = occurrenceId('source-revocation:' + requestId + ':' + row.id);
    await writeParticipationCase(tx, { row, id: row.id, actorId, requestId: occurrenceId('source-request:' + requestId + ':' + row.id),
      action: 'SOURCE_REVOKED', fingerprint: hash({ documentId, requestId, reason, caseId: row.id }), state: next, occurredAt, eventId });
  }
}
