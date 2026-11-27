import { ConflictException, HttpException } from '@nestjs/common';
import { ParticipationCase, Prisma } from '@prisma/client';
import { ageOn } from '../governance/training-standard-profile';
import { mandatoryBindingStatus } from '../trips/mandatory-policy.domain';
import { participationAccount, participationReviewer, participationSubject } from './participation-access';
import { CaseState, consentDigest, decisionDigest, GuardianTerms, hash, IdentityTerms, MedicalTerms, PolicyTerms, SubjectType } from './participation.domain';
import { participationSource, ParticipationSource } from './participation-sources.service';
import { verifyParticipationChain } from './participation-store';

export type ParticipationReadiness = {
  status: 'CLEARED' | 'ACTION_REQUIRED'; ready: boolean; hardBlocked: boolean;
  reasons: string[]; caseId: string | null; revision: number | null; digest: string | null;
};
export type ParticipationEvaluation = {
  readiness: ParticipationReadiness; row: ParticipationCase | null; state: CaseState | null;
  subject: Awaited<ReturnType<typeof participationSubject>> | null;
  sources: Partial<Record<'policy' | 'identity' | 'guardian' | 'medical', ParticipationSource>>;
  age: number | null; guardianRequired: boolean; consentRequired: boolean; signatureReady: boolean;
};
const domainFailure = (error: unknown): error is HttpException => error instanceof HttpException && error.getStatus() >= 400 && error.getStatus() < 500;

/** A single current-source evaluator for consent review and all native gates.
 * Administrative ELIGIBLE and editable DiverProfile declarations are not inputs
 * from which formal source acceptance can be inferred. */
export async function evaluateParticipation(tx: Prisma.TransactionClient, subjectType: SubjectType, subjectId: string, options: {
  requireDecision?: boolean; at?: Date; endsAt?: Date;
} = {}): Promise<ParticipationEvaluation> {
  const row = await tx.participationCase.findUnique({ where: subjectType === 'BOOKING_PARTICIPANT' ? { bookingParticipantId: subjectId } : { trainingEnrollmentId: subjectId } });
  const readiness: ParticipationReadiness = { status: 'ACTION_REQUIRED', ready: false, hardBlocked: false, reasons: [], caseId: row?.id ?? null, revision: row?.revision ?? null, digest: row?.digest ?? null };
  const result: ParticipationEvaluation = { readiness, row, state: null, subject: null, sources: {}, age: null, guardianRequired: false, consentRequired: false, signatureReady: false };
  const add = (code: string, hard = false) => { if (!readiness.reasons.includes(code)) readiness.reasons.push(code); if (hard) readiness.hardBlocked = true; };
  if (!row) { add('PARTICIPATION_SOURCE_REVIEW_REQUIRED'); return result; }
  try {
    const chain = await verifyParticipationChain(tx, row);
    result.state = chain.state;
  } catch (error) {
    if (!domainFailure(error)) throw error;
    add('PARTICIPATION_HISTORY_INVALID', true); return result;
  }
  const state = result.state!;
  if (state.revokedAt) add('PARTICIPATION_REVOKED', true);
  if (state.consent?.withdrawnAt) add('PARTICIPATION_CONSENT_WITHDRAWN', true);
  if (state.review?.decision === 'REJECTED') add('PARTICIPATION_REJECTED', true);
  if (state.medicalHold) add('PARTICIPATION_MEDICAL_PROHIBITION', true);
  try {
    result.subject = await participationSubject(tx, subjectType, subjectId);
    if (result.subject.organizationId !== row.organizationId || result.subject.fingerprint !== state.subjectFingerprint) add('PARTICIPATION_SUBJECT_CHANGED');
    const organization = await tx.organization.findFirst({ where: { id: row.organizationId, status: 'ACTIVE' }, select: { id: true } });
    if (!organization) add('PARTICIPATION_OPERATOR_INACTIVE', true);
  } catch (error) {
    if (!domainFailure(error)) throw error;
    add('PARTICIPATION_SUBJECT_UNAVAILABLE'); return result;
  }
  const subject = result.subject!;
  for (const key of ['policy', 'identity', 'guardian', 'medical'] as const) {
    const ref = state[key];
    if (!ref) continue;
    try {
      const source = await participationSource(tx, ref.id, row.organizationId);
      if (source.kind !== key.toUpperCase() || source.row.version !== ref.version || source.hash !== ref.hash) add('PARTICIPATION_' + key.toUpperCase() + '_CHANGED');
      else result.sources[key] = source;
    } catch (error) {
      if (!domainFailure(error)) throw error;
      const revoked = await tx.documentLifecycleEvent.findFirst({ where: { documentId: ref.id, action: 'D01_SOURCE_REVOKED' }, select: { id: true } });
      add('PARTICIPATION_' + key.toUpperCase() + (revoked ? '_REVOKED' : '_INVALID'), Boolean(revoked));
    }
  }
  // Once an actual signed source has been adopted into a case, a generic
  // preference cannot discard its requirements or revive broken evidence.
  if (readiness.reasons.length) readiness.hardBlocked = true;
  const policy = result.sources.policy?.payload as PolicyTerms | undefined, identity = result.sources.identity?.payload as IdentityTerms | undefined;
  const start = options.at?.toISOString() ?? subject.service.startsAt ?? new Date().toISOString();
  const end = options.endsAt?.toISOString() ?? subject.service.endsAt ?? start;
  const inRange = (from: string, until: string) => from <= start && until >= end && start <= end;
  if (!policy || !identity) { readiness.hardBlocked = true; return result; }
  if (policy.serviceType !== subject.service.type || policy.serviceId !== subject.service.id || policy.activityCode !== subject.service.activityCode
    || !['ALL', subjectId].includes(policy.subjectId) || !inRange(policy.effectiveFrom, policy.validUntil)) add('PARTICIPATION_POLICY_NOT_APPLICABLE');
  if (identity.subjectType !== subjectType || identity.subjectId !== subjectId || identity.fullName !== state.participant.fullName
    || identity.dateOfBirth !== state.participant.dateOfBirth || identity.participantAccountId !== state.participant.accountId
    || identity.validUntil < end || identity.issuedAt > start || subject.birthDate && subject.birthDate !== identity.dateOfBirth) add('PARTICIPATION_IDENTITY_CHANGED');
  if (subject.accountId && subject.accountId !== identity.participantAccountId) add('PARTICIPATION_IDENTITY_ACCOUNT_MISMATCH');
  if (state.participant.accountId) {
    try {
      const actor = await participationAccount(tx, state.participant.accountId);
      if (actor.personId !== state.participant.personId) add('PARTICIPATION_IDENTITY_PERSON_CHANGED');
    } catch (error) { if (!domainFailure(error)) throw error; add('PARTICIPATION_PARTICIPANT_INACTIVE'); }
  }
  result.age = ageOn(new Date(identity.dateOfBirth), new Date(start));
  if (result.age === null || result.age < policy.minimumAge) add('PARTICIPATION_AGE_REQUIREMENT');
  result.guardianRequired = result.age !== null && result.age < policy.guardianBelowAge;
  result.consentRequired = policy.consentRequirement === 'REQUIRED' || result.guardianRequired || Boolean(state.consent?.withdrawnAt) || Boolean(state.revokedAt);
  const guardian = result.sources.guardian?.payload as GuardianTerms | undefined;
  if (result.guardianRequired && !guardian) add('PARTICIPATION_GUARDIAN_REQUIRED');
  if (guardian) {
    if (guardian.subjectType !== subjectType || guardian.subjectId !== subjectId || guardian.serviceType !== subject.service.type || guardian.serviceId !== subject.service.id
      || guardian.identityDocumentId !== state.identity.id || guardian.identityDocumentHash !== state.identity.hash || !inRange(guardian.validFrom, guardian.validUntil)
      || guardian.guardianAccountId !== state.guardianActor?.accountId || guardian.authorityScope !== 'PARTICIPATION_CONSENT') add('PARTICIPATION_GUARDIAN_NOT_APPLICABLE');
    try {
      const actor = await participationAccount(tx, guardian.guardianAccountId);
      if (actor.personId !== state.guardianActor?.personId || actor.personId === state.participant.personId) add('PARTICIPATION_GUARDIAN_IDENTITY');
    } catch (error) { if (!domainFailure(error)) throw error; add('PARTICIPATION_GUARDIAN_INACTIVE'); }
  }
  const signatureBlockers = readiness.reasons.filter(code => !['PARTICIPATION_REVOKED', 'PARTICIPATION_CONSENT_WITHDRAWN', 'PARTICIPATION_REJECTED'].includes(code) && !code.startsWith('PARTICIPATION_MEDICAL'));
  result.signatureReady = !signatureBlockers.length && Boolean(result.guardianRequired ? guardian && state.guardianActor : state.participant.accountId);
  const medical = result.sources.medical?.payload as MedicalTerms | undefined;
  if (policy.medicalRequirement === 'REQUIRED' && !medical) add('PARTICIPATION_MEDICAL_REQUIRED');
  if (medical) {
    if (medical.subjectType !== subjectType || medical.subjectId !== subjectId || medical.serviceType !== subject.service.type || medical.serviceId !== subject.service.id
      || medical.identityDocumentId !== state.identity.id || medical.identityDocumentHash !== state.identity.hash || medical.activityCode !== subject.service.activityCode
      || !inRange(medical.validFrom, medical.validUntil)) add('PARTICIPATION_MEDICAL_NOT_APPLICABLE');
    if (medical.outcome === 'NOT_CLEARED') add('PARTICIPATION_MEDICAL_PROHIBITION', true);
    if (medical.outcome === 'REQUIRES_REVIEW' || medical.limitations) add('PARTICIPATION_MEDICAL_REVIEW_REQUIRED');
  }
  if (result.consentRequired) {
    const consent = state.consent, actor = result.guardianRequired ? state.guardianActor : state.participant.accountId ? { accountId: state.participant.accountId, personId: state.participant.personId } : null;
    if (!consent || consent.withdrawnAt) add('PARTICIPATION_CONSENT_REQUIRED');
    else if (!actor || consent.actorAccountId !== actor.accountId || consent.actorPersonId !== actor.personId
      || consent.role !== (result.guardianRequired ? 'GUARDIAN' : 'PARTICIPANT') || consent.consentHash !== consentDigest(state)
      || consent.signedAt > start || consent.signedAt > new Date().toISOString()) add('PARTICIPATION_CONSENT_STALE');
  }
  if (options.requireDecision !== false) {
    if (!state.review || state.review.decision !== 'ELIGIBLE') add('PARTICIPATION_REVIEW_REQUIRED');
    else {
      if (state.review.evidenceDigest !== decisionDigest(state)) add('PARTICIPATION_DECISION_STALE');
      try {
        const authority = await participationReviewer(tx, state.review.actorAccountId, row.organizationId);
        if (hash(authority) !== hash(state.review.authority) || authority.personId === state.participant.personId || authority.personId === state.guardianActor?.personId) add('PARTICIPATION_REVIEW_AUTHORITY_CHANGED');
      } catch (error) { if (!domainFailure(error)) throw error; add('PARTICIPATION_REVIEW_AUTHORITY_CHANGED'); }
      if (subjectType === 'BOOKING_PARTICIPANT') {
        const native = await tx.bookingParticipant.findUnique({ where: { id: subjectId }, select: { eligibilityStatus: true } });
        if (native?.eligibilityStatus !== 'ELIGIBLE') add('PARTICIPATION_NATIVE_REVIEW_REQUIRED');
      }
    }
  }
  readiness.ready = readiness.reasons.length === 0;
  if (!readiness.ready) readiness.hardBlocked = true;
  readiness.status = readiness.ready ? 'CLEARED' : 'ACTION_REQUIRED';
  return result;
}

export function applyParticipationPolicy(readiness: ParticipationReadiness[], policy: { enforce: boolean; review: boolean; bypass: boolean }) {
  const incomplete = readiness.filter(item => !item.ready), hard = incomplete.filter(item => item.hardBlocked);
  return {
    ready: hard.length === 0 && (!policy.enforce || incomplete.length === 0),
    cleared: incomplete.length === 0, hardBlocked: hard.length > 0,
    blockers: [...new Set([...hard, ...(policy.enforce ? incomplete : [])].flatMap(item => item.reasons))],
    issues: policy.review ? [...new Set(incomplete.flatMap(item => item.reasons))] : [],
    assessments: readiness,
  };
}

export async function participationTrainingGate(tx: Prisma.TransactionClient, enrollmentId: string, at?: Date, endsAt?: Date) {
  const rows = await tx.$queryRawUnsafe<Array<{ state: string; metadata: unknown }>>('SELECT state,metadata FROM "PolicyControl" WHERE category=$1 AND "ruleKey"=$2 LIMIT 1', 'TRAINING', 'PARTICIPANT_ELIGIBILITY');
  const binding = mandatoryBindingStatus('TRAINING', 'PARTICIPANT_ELIGIBILITY', rows[0]?.metadata);
  if (binding === 'REVIEW_REQUIRED') throw new ConflictException('PARTICIPATION_REQUIREMENT_SOURCE_REVIEW');
  const mode = binding === 'MANDATORY' ? 'ENABLED' : rows[0]?.state ?? 'ENABLED';
  const assessment = await evaluateParticipation(tx, 'TRAINING_ENROLLMENT', enrollmentId, { at, endsAt });
  const gate = applyParticipationPolicy([assessment.readiness], { enforce: mode === 'ENABLED', review: mode === 'REVIEW', bypass: mode === 'DISABLED' });
  if (!gate.ready) throw new ConflictException({ code: 'PARTICIPATION_NOT_CLEARED', message: 'راجع موافقة المشارك ومصادر الأهلية السارية قبل متابعة التدريب.', reasons: gate.blockers });
  return gate;
}
