import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ParticipationCase, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { CaseState, consentDigest, decisionDigest, GuardianTerms, hash, IdentityTerms, json, keys, MedicalTerms, normalizedName, object, parseCaseCommand, PolicyTerms, sameParticipationPerson, SourceReference, SUBJECT_TYPES, text, uuid, choice } from './participation.domain';
import { isParticipationReviewer, participationAccount, participationOrganizationWhere, participationReadAccess, participationReviewer, participationSubject } from './participation-access';
import { evaluateParticipation } from './participation-evaluator';
import { participationSource, ParticipationSourcesService } from './participation-sources.service';
import { verifyParticipationChain, writeParticipationCase } from './participation-store';
import { PARTICIPATION_SOURCE_PREFIX } from './participation.domain';

const reference = (source: Awaited<ReturnType<typeof participationSource>>): SourceReference => ({ id: source.row.id, version: source.row.version, hash: source.hash });
const controlled = (error: unknown): error is HttpException => error instanceof HttpException && error.getStatus() >= 400 && error.getStatus() < 500;

export async function reviewParticipation(tx: Prisma.TransactionClient, actorId: string, row: ParticipationCase, decision: 'ELIGIBLE' | 'REJECTED', reason: string, occurrence: { requestId: string; eventId: string; occurredAt: Date; fingerprint: string }) {
  const authority = await participationReviewer(tx, actorId, row.organizationId), { state } = await verifyParticipationChain(tx, row);
  if (authority.personId === state.participant.personId || authority.personId === state.guardianActor?.personId) throw new ForbiddenException('A participant or guardian cannot review their own participation.');
  const subject = await participationSubject(tx, state.subjectType, state.subjectId);
  if (subject.terminal || subject.service.startsAt && new Date(subject.service.startsAt) <= new Date()) throw new ConflictException('Participation approval must precede the activity.');
  if (decision === 'ELIGIBLE') {
    const evaluation = await evaluateParticipation(tx, state.subjectType, state.subjectId, { requireDecision: false });
    const reasons = evaluation.readiness.reasons.filter(code => code !== 'PARTICIPATION_REJECTED');
    if (reasons.length) throw new ConflictException({ code: 'PARTICIPATION_NOT_CLEARED', message: 'استكمل موافقة المشارك ومصادر الأهلية السارية قبل اعتمادها.', reasons });
  }
  const next = json(state);
  next.review = { eventId: occurrence.eventId, actorAccountId: actorId, authority, decision, evidenceDigest: decisionDigest(next), reason, reviewedAt: occurrence.occurredAt.toISOString() };
  return writeParticipationCase(tx, { row, id: row.id, actorId, requestId: occurrence.requestId, action: 'REVIEW', fingerprint: occurrence.fingerprint, state: next, occurredAt: occurrence.occurredAt, eventId: occurrence.eventId });
}

@Injectable()
export class ParticipationService {
  constructor(private readonly db: DatabaseService, private readonly sources: ParticipationSourcesService) {}

  private async sourcePair(tx: Prisma.TransactionClient, subject: Awaited<ReturnType<typeof participationSubject>>, policyDocumentId: string, identityDocumentId: string) {
    const policy = await participationSource(tx, policyDocumentId, subject.organizationId), identity = await participationSource(tx, identityDocumentId, subject.organizationId);
    if (policy.kind !== 'POLICY' || identity.kind !== 'IDENTITY') throw new ConflictException('Select the policy and verified participant identity sources.');
    const terms = policy.payload as PolicyTerms, person = identity.payload as IdentityTerms;
    if (terms.serviceType !== subject.service.type || terms.serviceId !== subject.service.id || terms.activityCode !== subject.service.activityCode || !['ALL', subject.subjectId].includes(terms.subjectId)
      || person.subjectType !== subject.subjectType || person.subjectId !== subject.subjectId || normalizedName(person.fullName) !== normalizedName(subject.participantName)
      || subject.accountId && person.participantAccountId !== subject.accountId) throw new ConflictException('The selected sources do not bind this participant and service.');
    const account = person.participantAccountId ? await participationAccount(tx, person.participantAccountId) : null;
    if (subject.personId && account?.personId !== subject.personId) throw new ConflictException('The participant person binding does not match.');
    return { policy, identity, participant: { accountId: account?.id ?? null, personId: account?.personId ?? null, fullName: person.fullName, dateOfBirth: person.dateOfBirth } };
  }

  private async view(tx: Prisma.TransactionClient, actorId: string, row: ParticipationCase) {
    const access = await participationReadAccess(tx, actorId, row);
    const raw = row.state as unknown as CaseState;
    const evaluation = await evaluateParticipation(tx, raw.subjectType, raw.subjectId);
    const state = evaluation.state ?? raw, subject = evaluation.subject ?? await participationSubject(tx, raw.subjectType, raw.subjectId);
    const mutable = !subject.terminal && (!subject.service.startsAt || new Date(subject.service.startsAt) > new Date());
    const signatureActor = evaluation.guardianRequired ? state.guardianActor?.accountId : state.participant.accountId;
    const independentReviewer = Boolean(access.reviewer && access.reviewer.personId !== state.participant.personId && access.reviewer.personId !== state.guardianActor?.personId);
    const allow = (allowed: boolean, reason: string) => ({ allowed, reason: allowed ? null : reason });
    const validHistory = !evaluation.readiness.reasons.includes('PARTICIPATION_HISTORY_INVALID');
    const events = await tx.participationEvent.findMany({ where: { caseId: row.id }, orderBy: { afterRevision: 'asc' }, select: { id: true, action: true, actorAccountId: true, actorPersonId: true, createdAt: true, beforeRevision: true, afterRevision: true, payload: true, actor: { select: { person: { select: { firstName: true, lastName: true } } } } } });
    const visibleEvents = access.reviewer ? events : events.filter(event => {
      const original = object(object(event.payload).state).participant as CaseState['participant'] | undefined;
      return Boolean(original && sameParticipationPerson(original, state.participant));
    });
    return {
      id: row.id, revision: row.revision, digest: row.digest, status: evaluation.readiness.status,
      subject: { subjectType: subject.subjectType, subjectId: subject.subjectId, organizationId: subject.organizationId, participantName: subject.participantName, accountId: subject.accountId, service: subject.service },
      policy: { reference: state.policy, terms: evaluation.sources.policy?.payload ?? null },
      identity: { reference: state.identity, terms: evaluation.sources.identity?.payload ?? null, participant: state.participant },
      guardian: state.guardian ? { reference: state.guardian, terms: evaluation.sources.guardian?.payload ?? null, actor: state.guardianActor } : null,
      medical: state.medical ? { reference: state.medical, terms: evaluation.sources.medical?.payload ?? null } : null,
      consent: state.consent, consentHash: consentDigest(state), signatureName: access.actor.name,
      resumeReasonRequired: Boolean(state.consent?.withdrawnAt || state.revokedAt || state.review?.decision === 'REJECTED'),
      review: state.review ? { ...state.review, authority: undefined } : null,
      revokedAt: state.revokedAt, revocationReason: state.revocationReason,
      readiness: { ...evaluation.readiness, age: evaluation.age, guardianRequired: evaluation.guardianRequired, consentRequired: evaluation.consentRequired,
        selfDeclarationIsMedicalEvidence: false, clinicalDecisionPerformed: false },
      actions: {
        LINK_EVIDENCE: allow(Boolean(access.reviewer && mutable && validHistory), 'Current review authority and an open activity are required.'),
        SIGN_CONSENT: allow(Boolean(validHistory && mutable && evaluation.signatureReady && signatureActor === actorId), 'Only the actual participant or currently evidenced guardian can sign the current wording.'),
        WITHDRAW_CONSENT: allow(Boolean(validHistory && state.consent && !state.consent.withdrawnAt && state.consent.actorAccountId === actorId && state.consent.actorPersonId === access.actor.personId), 'Only the original signer can withdraw this consent.'),
        REVIEW: allow(Boolean(validHistory && mutable && independentReviewer), 'An independent current participant reviewer is required.'),
        REVOKE: allow(Boolean(validHistory && access.reviewer && !state.revokedAt), 'Current review authority is required.'),
        REPLACE_SOURCES: allow(Boolean(validHistory && mutable && access.reviewer), 'Current review authority and a new source assessment are required.'),
      },
      events: visibleEvents.map(event => ({ id: event.id, action: event.action, actorAccountId: event.actorAccountId, actorPersonId: event.actorPersonId, actorName: [event.actor.person.firstName, event.actor.person.lastName].filter(Boolean).join(' '), createdAt: event.createdAt, beforeRevision: event.beforeRevision, afterRevision: event.afterRevision })),
    };
  }

  async detail(actorId: string, id: string) {
    uuid(id);
    const result = await this.db.serializable(async tx => {
      const row = await tx.participationCase.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Participation case not found.');
      return this.view(tx, actorId, row);
    });
    await this.db.serializable(async tx => {
      const row = await tx.participationCase.findUniqueOrThrow({ where: { id } });
      await participationReadAccess(tx, actorId, row);
    });
    return result;
  }

  async workspace(actorId: string) {
    const result = await this.db.serializable(async tx => {
      const actor = await participationAccount(tx, actorId);
      const admin = await tx.roleAssignment.findFirst({ where: { accountId: actorId, role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
      const centerRole = await tx.roleAssignment.findFirst({ where: { accountId: actorId, role: 'DIVE_CENTER', status: 'ACTIVE' }, select: { id: true } });
      const organizations = admin || centerRole ? await tx.organization.findMany({ where: admin ? { status: 'ACTIVE' } : participationOrganizationWhere(actorId), select: { id: true, displayName: true }, orderBy: { id: 'asc' }, take: 100 }) : [];
      const organizationIds = organizations.map(item => item.id);
      const rows = await tx.participationCase.findMany({ where: { OR: [{ participantAccountId: actorId }, { guardianAccountId: actorId }, ...(organizationIds.length ? [{ organizationId: { in: organizationIds } }] : [])] }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 50 });
      const cases: Awaited<ReturnType<ParticipationService['view']>>[] = [];
      for (const row of rows) {
        try { cases.push(await this.view(tx, actorId, row)); }
        catch (error) { if (!(error instanceof NotFoundException) && !(error instanceof ForbiddenException)) throw error; }
      }
      const subjects: Array<Awaited<ReturnType<typeof participationSubject>>> = [];
      if (organizationIds.length) {
        const participants = await tx.bookingParticipant.findMany({ where: { booking: { status: { in: ['PENDING','CONFIRMED'] }, trip: { status: { in: ['OPEN','CLOSED','DRAFT'] }, ...(admin ? {} : { organizationId: { in: organizationIds } }) } } }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 50 });
        const enrollments = await tx.trainingEnrollment.findMany({ where: { status: { in: ['PENDING','ACTIVE','SUSPENDED'] }, centerOrganizationId: { in: organizationIds } }, select: { id: true }, orderBy: { enrolledAt: 'desc' }, take: 50 });
        for (const row of participants) {
          try { const subject = await participationSubject(tx, 'BOOKING_PARTICIPANT', row.id); if (organizationIds.includes(subject.organizationId)) subjects.push(subject); }
          catch (error) { if (!controlled(error)) throw error; }
        }
        for (const row of enrollments) subjects.push(await participationSubject(tx, 'TRAINING_ENROLLMENT', row.id));
      }
      const sourceIds = new Set(cases.flatMap(item => [item.policy.reference.id, item.identity.reference.id, ...(item.guardian ? [item.guardian.reference.id] : []), ...(item.medical ? [item.medical.reference.id] : [])]));
      const records = organizationIds.length ? await tx.managedDocument.findMany({ where: { organizationId: { in: organizationIds }, template: { code: { startsWith: PARTICIPATION_SOURCE_PREFIX } } }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 50 }) : [];
      for (const row of records) sourceIds.add(row.id);
      return { actor: { id: actor.id, name: actor.name }, organizations: organizations.map(item => ({ id: item.id, name: item.displayName })),
        subjects: subjects.map(subject => ({ subjectType: subject.subjectType, subjectId: subject.subjectId, organizationId: subject.organizationId, participantName: subject.participantName, accountId: subject.accountId, service: subject.service })),
        cases, sourceIds: [...sourceIds], capabilities: { createSource: { allowed: organizationIds.length > 0, reason: organizationIds.length ? null : 'Current verified review authority is required.' },
          createCase: { allowed: organizationIds.length > 0, reason: organizationIds.length ? null : 'Current verified review authority is required.' } } };
    });
    const sources: Awaited<ReturnType<ParticipationSourcesService['detail']>>[] = [];
    for (const id of result.sourceIds) {
      try { sources.push(await this.sources.detail(actorId, id)); }
      catch (error) { if (!(error instanceof NotFoundException) && !(error instanceof ForbiddenException)) throw error; }
    }
    await this.db.serializable(async tx => {
      await participationAccount(tx, actorId);
      for (const organization of result.organizations) await participationReviewer(tx, actorId, organization.id);
      for (const item of result.cases) await participationReadAccess(tx, actorId, await tx.participationCase.findUniqueOrThrow({ where: { id: item.id } }));
    });
    const { sourceIds: _sourceIds, ...view } = result;
    return { ...view, sources };
  }

  async accounts(actorId: string, organizationId: string, email: string) {
    uuid(organizationId); const exact = text(email, 'Exact account email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(exact)) throw new BadRequestException('Enter the exact verified account email.');
    return this.db.serializable(async tx => {
      await participationReviewer(tx, actorId, organizationId);
      const account = await tx.account.findFirst({ where: { email: exact, status: 'ACTIVE', emailVerifiedAt: { not: null } }, select: { id: true, person: { select: { firstName: true, lastName: true } } } });
      if (!account) throw new NotFoundException('Verified account not found.');
      return { account: { id: account.id, name: [account.person.firstName, account.person.lastName].filter(Boolean).join(' ') } };
    });
  }

  async create(actorId: string, input: unknown) {
    const v = object(input); keys(v, ['requestId','subjectType','subjectId','policyDocumentId','identityDocumentId']);
    const requestId = uuid(v.requestId), subjectType = choice(v.subjectType, SUBJECT_TYPES, 'Subject type'), subjectId = uuid(v.subjectId),
      policyDocumentId = uuid(v.policyDocumentId), identityDocumentId = uuid(v.identityDocumentId), fingerprint = hash({ subjectType, subjectId, policyDocumentId, identityDocumentId });
    const id = randomUUID(), eventId = randomUUID(), occurredAt = new Date();
    const result = await this.db.serializable(async tx => {
      const subject = await participationSubject(tx, subjectType, subjectId);
      await participationReviewer(tx, actorId, subject.organizationId);
      await tx.$queryRawUnsafe('SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext($1)::bigint)', 'participation-case:' + subjectType + ':' + subjectId);
      const prior = await tx.participationEvent.findUnique({ where: { actorAccountId_requestId: { actorAccountId: actorId, requestId } } });
      if (prior) {
        if (prior.action !== 'CREATE' || prior.requestFingerprint !== fingerprint) throw new ConflictException('Request ID was used for different participation content.');
        return { id: prior.caseId, eventId: prior.id, alreadyApplied: true };
      }
      if (subject.terminal || subject.service.startsAt && new Date(subject.service.startsAt) <= occurredAt) throw new ConflictException('A participation case must be prepared before the activity.');
      if (await tx.participationCase.findUnique({ where: subjectType === 'BOOKING_PARTICIPANT' ? { bookingParticipantId: subjectId } : { trainingEnrollmentId: subjectId } })) throw new ConflictException('This participant already has a source-bound case.');
      const pair = await this.sourcePair(tx, subject, policyDocumentId, identityDocumentId);
      const state: CaseState = { schemaVersion: 1, subjectType, subjectId, organizationId: subject.organizationId, service: subject.service,
        subjectFingerprint: subject.fingerprint, policy: reference(pair.policy), identity: reference(pair.identity), participant: pair.participant,
        guardian: null, guardianActor: null, medical: null, medicalHold: null, consent: null, review: null, revokedAt: null, revocationReason: null };
      await writeParticipationCase(tx, { row: null, id, actorId, requestId, action: 'CREATE', fingerprint, state, occurredAt, eventId });
      return { id, eventId, alreadyApplied: false };
    });
    return { ...await this.detail(actorId, result.id), command: { requestId, eventId: result.eventId, alreadyApplied: result.alreadyApplied } };
  }

  async act(actorId: string, id: string, input: unknown) {
    uuid(id);
    const command = parseCaseCommand(input), fingerprint = hash({ id, ...command }), eventId = randomUUID(), occurredAt = new Date();
    const result = await this.db.serializable(async tx => {
      await tx.$queryRawUnsafe('SELECT id FROM "ParticipationCase" WHERE id=$1 FOR UPDATE', id);
      const row = await tx.participationCase.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Participation case not found.');
      const access = await participationReadAccess(tx, actorId, row);
      const prior = await tx.participationEvent.findUnique({ where: { actorAccountId_requestId: { actorAccountId: actorId, requestId: command.requestId } } });
      if (prior) {
        if (prior.caseId !== id || prior.requestFingerprint !== fingerprint) throw new ConflictException('Request ID was used for different participation content.');
        return { eventId: prior.id, alreadyApplied: true };
      }
      if (row.revision !== command.expectedRevision || row.digest !== command.expectedDigest) throw new ConflictException('Participation evidence changed; reload before acting.');
      const view = await this.view(tx, actorId, row);
      if (!view.actions[command.action].allowed) throw new ForbiddenException(view.actions[command.action].reason ?? 'Participation action is unavailable.');
      const { state } = await verifyParticipationChain(tx, row), next = json(state), p = command.payload;
      if (command.action === 'REVIEW') {
        keys(p, ['decision','reason','reviewed']);
        if (p.reviewed !== true) throw new BadRequestException('Explicit source review is required.');
        await reviewParticipation(tx, actorId, row, choice(p.decision, ['ELIGIBLE','REJECTED'], 'Eligibility decision'), text(p.reason, 'Review reason', 1000), { requestId: command.requestId, eventId, occurredAt, fingerprint });
        return { eventId, alreadyApplied: false };
      }
      if (command.action === 'LINK_EVIDENCE') {
        keys(p, ['kind','documentId']);
        const kind = choice(p.kind, ['GUARDIAN','MEDICAL'], 'Evidence kind'), source = await participationSource(tx, uuid(p.documentId), row.organizationId);
        if (source.kind !== kind) throw new ConflictException('Evidence kind does not match the selected source.');
        const terms = source.payload as GuardianTerms;
        if (terms.subjectType !== state.subjectType || terms.subjectId !== state.subjectId || terms.serviceType !== state.service.type || terms.serviceId !== state.service.id
          || terms.identityDocumentId !== state.identity.id || terms.identityDocumentHash !== state.identity.hash) throw new ConflictException('Evidence must bind the current participant identity and service.');
        if (kind === 'GUARDIAN') {
          const actor = await participationAccount(tx, terms.guardianAccountId);
          if (actor.personId === state.participant.personId) throw new ConflictException('The participant cannot be their own guardian.');
          next.guardian = reference(source); next.guardianActor = { accountId: actor.id, personId: actor.personId, name: actor.name };
        } else {
          next.medical = reference(source);
          const medical = source.payload as MedicalTerms;
          if (medical.outcome === 'NOT_CLEARED') next.medicalHold = reference(source);
          else if (medical.outcome === 'CLEARED_FOR_ACTIVITY' && !medical.limitations) next.medicalHold = null;
        }
        next.review = null;
      } else if (command.action === 'SIGN_CONSENT') {
        keys(p, ['consent','signedName','consentHash','reason']);
        if (p.consent !== true || p.consentHash !== consentDigest(state) || normalizedName(text(p.signedName, 'Signature name', 160)) !== normalizedName(access.actor.name)) throw new BadRequestException('Review the current wording and sign using your own verified account name.');
        if (view.resumeReasonRequired) text(p.reason, 'Reason for renewing consent after withdrawal or revocation', 1000);
        next.consent = { eventId, actorAccountId: actorId, actorPersonId: access.actor.personId, role: view.readiness.guardianRequired ? 'GUARDIAN' : 'PARTICIPANT',
          signedName: access.actor.name, consentHash: consentDigest(state), signedAt: occurredAt.toISOString(), withdrawnAt: null, withdrawalEventId: null };
        next.review = null; next.revokedAt = null; next.revocationReason = null;
      } else if (command.action === 'WITHDRAW_CONSENT') {
        keys(p, ['reason']); text(p.reason, 'Withdrawal reason', 1000);
        next.consent = { ...state.consent!, withdrawnAt: occurredAt.toISOString(), withdrawalEventId: eventId };
        next.review = null;
      } else if (command.action === 'REVOKE') {
        keys(p, ['reason']); next.revocationReason = text(p.reason, 'Revocation reason', 1000);
        next.revokedAt = occurredAt.toISOString(); next.review = null;
      } else {
        keys(p, ['policyDocumentId','identityDocumentId','reason']); text(p.reason, 'Source reassessment reason', 1000);
        const subject = await participationSubject(tx, state.subjectType, state.subjectId);
        const pair = await this.sourcePair(tx, subject, uuid(p.policyDocumentId), uuid(p.identityDocumentId));
        const samePerson = sameParticipationPerson(state.participant, pair.participant);
        next.policy = reference(pair.policy); next.identity = reference(pair.identity); next.participant = pair.participant;
        next.subjectFingerprint = subject.fingerprint; next.service = subject.service; next.review = null;
        if (!samePerson) {
          // A replacement guest never receives the prior person's private
          // evidence or signature. Immutable events preserve the original case
          // for authorized reviewers without granting the new person access.
          next.guardian = null; next.guardianActor = null; next.medical = null;
          next.medicalHold = null; next.consent = null;
          next.revokedAt = null; next.revocationReason = null;
        }
        // For the same person, retain personal withdrawal and medical holds.
        // New source hashes require fresh consent; administrative replacement
        // cannot silently remove an existing personal restriction.
      }
      await writeParticipationCase(tx, { row, id, actorId, requestId: command.requestId, action: command.action, fingerprint, state: next, occurredAt, eventId });
      return { eventId, alreadyApplied: false };
    });
    return { ...await this.detail(actorId, id), command: { requestId: command.requestId, ...result } };
  }
}
