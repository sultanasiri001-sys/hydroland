import { BadRequestException, ConflictException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { eligibleReviewParticipant, reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';
import type { DocumentFieldDefinition } from '../document-forms/document-form.domain';
import { assertCalendarHumanAvailable } from './calendar-training-availability';
import { mandatoryBindingStatus } from './mandatory-policy.domain';
import { compensationTerms } from '../organizations/instructor-compensation';

export type CrewTx = Prisma.TransactionClient;
export const CREW_SOURCE_CODE = 'MAR-F02-CREW-QUALIFICATION';
export const crewObject = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const crewJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const crewHash = (value: unknown) => decisionDigest(crewJson(value));
export const crewFailure = (code: string): never => { throw new ConflictException({ code, message: code }); };
export const crewId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value)) throw new BadRequestException('F02_INVALID_REFERENCE');
  return value;
};
export const crewNote = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length < 3 || value.length > 1000 || /[\u0000-\u001f]/u.test(value)) throw new BadRequestException('F02_REASON_REQUIRED');
  return value.trim();
};
export function crewFields(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new BadRequestException('F02_INVALID_FIELDS');
  return value as Record<string, unknown>;
}
export function crewRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new BadRequestException('F02_REFRESH_REQUIRED');
  return Number(value);
}
const field = (key: string, labelAr: string, labelEn: string, type: DocumentFieldDefinition['type'] = 'TEXT', options?: string[]): DocumentFieldDefinition => ({key, labelAr, labelEn, type, required: true, ...(options ? {options} : {})});
// Explicit owner installation creates only this blank form. No real credential
// requirement, approval, source reference or pay rule is seeded by F02.
export const crewSourceTemplate = {
  code: CREW_SOURCE_CODE, titleAr: 'مصدر تأهيل تكليف طاقم الرحلة', titleEn: 'Trip crew qualification source', department: 'MARINE_OPERATIONS',
  fields: [
    field('purpose', 'غرض المصدر', 'Source purpose', 'SELECT', ['F02_CREW_QUALIFICATION']),
    field('organizationId', 'مرجع الجهة المشغلة', 'Operating organization reference'),
    field('tripType', 'نوع الرحلة المطابق', 'Exact trip activity type'),
    field('roleType', 'دور التكليف', 'Assignment role', 'SELECT', ['INSTRUCTOR', 'CAPTAIN', 'CREW']),
    field('effectiveFrom', 'بدء السريان بصيغة UTC كاملة', 'Effective from, full UTC timestamp'),
    field('validUntil', 'نهاية السريان بصيغة UTC كاملة', 'Valid until, full UTC timestamp'),
    field('sourceAuthority', 'جهة مصدر المتطلبات', 'Requirement source authority'),
    field('sourceReference', 'مرجع المصدر الأصلي', 'Original source reference'),
    field('sourceVersion', 'إصدار المصدر', 'Source version'),
    field('sourceClause', 'بند المصدر', 'Source clause'),
    field('applicabilityReason', 'سبب انطباق المصدر على الدور والنشاط', 'Applicability to this role and activity', 'TEXTAREA'),
    field('credentialRequirements', 'متطلبات الشهادات JSON: issuer وtitle وexpiryRequired وexternalVerificationRequired', 'Credential requirements JSON: issuer, title, expiryRequired, externalVerificationRequired', 'TEXTAREA'),
  ],
};

export type CrewTrip = { id: string; title: string; type: string; status: string; organizationId: string | null; startsAt: Date; endsAt: Date };
export type CrewRow = {
  id: string; tripId: string; resourceId: string; accountId: string; roleType: string; status: string; replacesAssignmentId: string | null;
  respondedAt: Date | null; createdAt: Date; updatedAt: Date; revision: number; requestedByAccountId: string | null; approvedByAccountId: string | null;
  approvedAt: Date | null; replacesRevision: number | null; qualificationSnapshot: Prisma.JsonValue | null; compensationSnapshot: Prisma.JsonValue | null;
  approvalAuthority: Prisma.JsonValue | null; decisionReason: string | null;
};

export async function crewAccount(tx: CrewTx, id: string) {
  const account = await tx.account.findFirst({where: {id, status: 'ACTIVE', emailVerifiedAt: {not: null}}, select: {id: true, personId: true, emailVerifiedAt: true}});
  if (!account) throw new ForbiddenException('F02_ACTIVE_VERIFIED_ACCOUNT_REQUIRED');
  return account;
}
export async function crewOrganization(tx: CrewTx, trip: CrewTrip) {
  const id = trip.organizationId ?? (await reviewPlatform(tx)).id;
  const organization = await tx.organization.findFirst({where: {id, status: 'ACTIVE'}, select: {id: true, ownerId: true, kind: true}});
  if (!organization) return crewFailure('F02_OPERATOR_INACTIVE');
  return organization;
}
export async function crewAuthority(tx: CrewTx, actor: string, organizationId: string) {
  const account = await crewAccount(tx, actor), platform = await reviewPlatform(tx);
  const organization = await tx.organization.findFirst({where: {id: organizationId, status: 'ACTIVE'}, select: {id: true, ownerId: true, kind: true}});
  if (!organization) throw new ForbiddenException('F02_OPERATOR_INACTIVE');
  if (platform.ownerId === actor) return {accountId: actor, personId: account.personId, kind: 'PLATFORM_OWNER', digest: crewHash(platform)};
  const member = await tx.organizationMember.findFirst({where: {organizationId, accountId: actor, status: 'ACTIVE', role: {in: ['OWNER', 'ADMIN']}}});
  const roleName = organization.kind === 'DIVE_CENTER' ? 'DIVE_CENTER' : organization.kind === 'MARINE_OPERATOR' ? 'BOAT_OWNER' : 'ORGANIZATION';
  const role = member && await tx.roleAssignment.findFirst({where: {accountId: actor, role: roleName, status: 'ACTIVE'}});
  if (member && role && (member.role !== 'OWNER' || organization.ownerId === actor)) return {
    accountId: actor, personId: account.personId, kind: 'OPERATOR_MANAGER',
    digest: crewHash({memberId: member.id, memberRevision: member.updatedAt, roleId: role.id, roleRevision: role.updatedAt, organization, verifiedAt: account.emailVerifiedAt}),
  };
  const participant = await eligibleReviewParticipant(tx, platform.id, 'MARINE_OPERATIONS', actor);
  return {accountId: actor, personId: account.personId, kind: 'MARINE_OPERATIONS', digest: crewHash(participant.binding)};
}
export async function crewSource(tx: CrewTx, id: string, trip: CrewTrip, roleType: string) {
  const platform = await reviewPlatform(tx), organization = await crewOrganization(tx, trip);
  // Shared lock keeps the original approved version pinned through the command.
  await tx.$queryRaw`SELECT id FROM "ManagedDocument" WHERE id::text=${id} FOR SHARE`;
  const {d, sourceHash} = await reviewSource(tx, platform.id, id), p = crewObject(d.payload), now = new Date();
  if (d.template.code !== CREW_SOURCE_CODE || d.department !== 'MARINE_OPERATIONS' || d.template.status !== 'ACTIVE'
    || crewHash(d.template.fields) !== crewHash(crewSourceTemplate.fields) || !['APPROVED', 'SIGNED'].includes(d.status)
    || !d.approvedByAccountId || !d.approvedAt || d.approvedAt > now) return crewFailure('F02_QUALIFICATION_SOURCE_NOT_APPROVED');
  validateDocumentPayload(d.template.fields, d.payload);
  const exactDate = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
  if (p.purpose !== 'F02_CREW_QUALIFICATION' || p.organizationId !== organization.id || p.tripType !== trip.type || p.roleType !== roleType
    || !exactDate(p.effectiveFrom) || !exactDate(p.validUntil) || Date.parse(String(p.effectiveFrom)) > Math.min(now.getTime(), trip.startsAt.getTime())
    || Date.parse(String(p.validUntil)) < Math.max(now.getTime(), trip.endsAt.getTime())
    || ['sourceAuthority','sourceReference','sourceVersion','sourceClause','applicabilityReason'].some(key => typeof p[key] !== 'string' || !(p[key] as string).trim())) return crewFailure('F02_QUALIFICATION_SOURCE_NOT_APPLICABLE');
  let requirements: unknown;
  try { requirements = JSON.parse(String(p.credentialRequirements)); } catch { return crewFailure('F02_QUALIFICATION_REQUIREMENTS_INVALID'); }
  if (!Array.isArray(requirements) || requirements.length < 1 || requirements.length > 12) return crewFailure('F02_QUALIFICATION_REQUIREMENTS_INVALID');
  const parsed = requirements.map(value => {
    const requirement = crewObject(value);
    if (Object.keys(requirement).sort().join(',') !== 'expiryRequired,externalVerificationRequired,issuer,title'
      || ['issuer','title'].some(key => typeof requirement[key] !== 'string' || !(requirement[key] as string).trim() || (requirement[key] as string).length > 200)
      || typeof requirement.expiryRequired !== 'boolean' || typeof requirement.externalVerificationRequired !== 'boolean') return crewFailure('F02_QUALIFICATION_REQUIREMENTS_INVALID');
    return requirement as {issuer: string; title: string; expiryRequired: boolean; externalVerificationRequired: boolean};
  });
  const approver = await crewAuthority(tx, d.approvedByAccountId, organization.id);
  // A generic ADMIN flag cannot replace a scoped, current review authority.
  return {
    organization, requirements: parsed, approver,
    pin: {documentId: d.id, version: d.version, contentHash: d.contentHash, sourceHash, referenceNumber: d.referenceNumber,
      approvedByAccountId: d.approvedByAccountId, approvedAt: d.approvedAt.toISOString(), approvalAuthority: approver.digest},
  };
}

async function qualificationPolicies(tx: CrewTx) {
  const controls = [['CREW','QUALIFICATION'],['INSTRUCTOR','ACTIVE_ROLE'],['INSTRUCTOR','VERIFIED_CREDENTIAL'],['CAPTAIN','ACTIVE_ROLE'],['CAPTAIN','VERIFIED_LICENSE'],['CREW','ACTIVE_ROLE']];
  for (const [category, ruleKey] of controls) {
    const rule = await tx.policyControl.findUnique({where: {category_ruleKey: {category, ruleKey}}, select: {metadata: true}});
    if (mandatoryBindingStatus(category, ruleKey, rule?.metadata) === 'REVIEW_REQUIRED') return crewFailure('F02_MANDATORY_SOURCE_REVIEW_REQUIRED');
  }
  // These new source-backed decisions never turn a DISABLED generic preference
  // into proof of qualification. The explicit adopted requirements still apply.
}
export async function crewQualification(tx: CrewTx, trip: CrewTrip, resourceId: string, sourceId: string, checkCalendar = true) {
  await qualificationPolicies(tx);
  const resource = await tx.calendarResource.findFirst({where: {id: resourceId, active: true, type: {in: ['INSTRUCTOR','CAPTAIN','CREW']}}, select: {id: true, type: true, referenceId: true}});
  if (!resource?.referenceId) return crewFailure('F02_RESOURCE_UNAVAILABLE');
  const account = await crewAccount(tx, resource.referenceId), source = await crewSource(tx, sourceId, trip, resource.type);
  if (source.approver.personId === account.personId) return crewFailure('F02_QUALIFICATION_REVIEW_NOT_INDEPENDENT');
  const roles = resource.type === 'INSTRUCTOR' ? ['INSTRUCTOR'] as const : ['STAFF','BOAT_OWNER'] as const;
  const role = await tx.roleAssignment.findFirst({where: {accountId: account.id, status: 'ACTIVE', role: {in: [...roles]}}, orderBy: {id: 'asc'}});
  const membership = await tx.organizationMember.findFirst({where: {organizationId: source.organization.id, accountId: account.id, status: 'ACTIVE'}});
  if (!role || !membership) return crewFailure('F02_ROLE_OR_MEMBERSHIP_INACTIVE');
  const credentials = await tx.credential.findMany({where: {personId: account.personId, verificationStatus: {in: ['VERIFIED','DOCUMENT_VERIFIED']}}, orderBy: {id: 'asc'}});
  const now = new Date(), snapshots = [];
  for (const requirement of source.requirements) {
    const credential = credentials.find(c => c.issuer.trim() === requirement.issuer.trim() && c.title.trim() === requirement.title.trim()
      && (!c.issuedAt || c.issuedAt <= now && c.issuedAt <= trip.startsAt)
      && (c.expiresAt ? c.expiresAt >= trip.endsAt && c.expiresAt > now : !requirement.expiryRequired));
    if (!credential) return crewFailure('F02_QUALIFICATION_CREDENTIAL_REQUIRED');
    const review = await tx.auditEvent.findFirst({where: {resource: 'Credential', resourceId: credential.id, action: 'CREDENTIAL_REVIEWED'}, orderBy: [{occurredAt: 'desc'}, {id: 'desc'}]});
    const metadata = crewObject(review?.metadata), reviewerId = metadata.reviewerAccountId;
    const reviewer = typeof reviewerId === 'string' && await tx.account.findFirst({where: {id: reviewerId, status: 'ACTIVE', emailVerifiedAt: {not: null}, roleAssignments: {some: {role: {in: ['ADMIN','REVIEWER']}, status: 'ACTIVE'}}}, select: {id: true, personId: true}});
    if (!review || !reviewer || review.actorId !== reviewer.personId || reviewer.personId === account.personId
      || metadata.status !== credential.verificationStatus || review.occurredAt > now
      || requirement.externalVerificationRequired && (!metadata.externalVerification || !metadata.externalVerificationEvidence)) return crewFailure('F02_CREDENTIAL_REVIEW_REQUIRED');
    snapshots.push({id: credential.id, issuer: credential.issuer, title: credential.title, verificationStatus: credential.verificationStatus,
      issuedAt: credential.issuedAt?.toISOString() ?? null, expiresAt: credential.expiresAt?.toISOString() ?? null,
      revision: credential.updatedAt.toISOString(), reviewId: review.id, reviewerAccountId: reviewer.id});
  }
  if (checkCalendar) await assertCalendarHumanAvailable(tx, [resourceId], trip.startsAt, trip.endsAt, trip.id);
  return crewJson({version: 1, source: source.pin, organizationId: source.organization.id, tripId: trip.id, tripType: trip.type,
    startsAt: trip.startsAt.toISOString(), endsAt: trip.endsAt.toISOString(), resourceId, accountId: account.id, personId: account.personId,
    roleType: resource.type, roleId: role.id, roleRevision: role.updatedAt.toISOString(), membershipId: membership.id,
    membershipRevision: membership.updatedAt.toISOString(), credentials: snapshots});
}

/** Freeze native terms, not a calculated earning or a payment instruction. */
export async function crewCompensation(tx: CrewTx, trip: CrewTrip, accountId: string, roleType: string, pinned?: unknown) {
  const organization = await crewOrganization(tx, trip), p = crewObject(pinned);
  if (roleType === 'INSTRUCTOR') {
    const agreement = await tx.instructorCompensationAgreement.findFirst({where: {organizationId: organization.id, instructorAccountId: accountId,
      ...(p.sourceId ? {id: String(p.sourceId)} : {})}, orderBy: {revision: 'desc'}});
    if (!agreement || agreement.recordedAt > new Date() || agreement.currency !== 'SAR' || agreement.recordedByAccountId !== organization.ownerId
      || !['PERCENTAGE','FIXED','FIXED_PLUS_PERCENTAGE','SALARY_ONLY'].includes(agreement.mode)
      || agreement.mode !== 'SALARY_ONLY' && (!agreement.earningTiming || !agreement.reversalTerms)) return crewFailure('F02_COMPENSATION_AGREEMENT_REQUIRED');
    try {
      compensationTerms({mode: agreement.mode, rateBps: agreement.rateBps, fixedMinor: agreement.fixedMinor, expectedRevision: agreement.revision,
        ...(agreement.mode === 'SALARY_ONLY' ? {} : {earningTiming: agreement.earningTiming, reversalTerms: agreement.reversalTerms})});
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      return crewFailure('F02_COMPENSATION_AGREEMENT_REQUIRED');
    }
    await crewAccount(tx, agreement.recordedByAccountId);
    return crewJson({version: 1, kind: 'INSTRUCTOR_AGREEMENT', sourceId: agreement.id, organizationId: organization.id, accountId,
      revision: agreement.revision, mode: agreement.mode, fixedMinor: agreement.fixedMinor, rateBps: agreement.rateBps, currency: agreement.currency,
      earningTiming: agreement.earningTiming, reversalTerms: agreement.reversalTerms, recordedByAccountId: agreement.recordedByAccountId, recordedAt: agreement.recordedAt.toISOString(), financialExecution: false});
  }
  const term = await tx.compensationTerm.findFirst({where: {
    ...(p.sourceId ? {id: String(p.sourceId)} : {}), status: {in: ['APPROVED','EFFECTIVE']}, effectiveFrom: {lte: trip.startsAt}, OR: [{effectiveTo: null}, {effectiveTo: {gte: trip.endsAt}}],
    employment: {organizationId: organization.id, accountId, status: 'ACTIVE', AND: [{OR: [{startsAt: null}, {startsAt: {lte: trip.startsAt}}]}, {OR: [{endsAt: null}, {endsAt: {gte: trip.endsAt}}]}]},
  }, include: {employment: {select: {id: true, updatedAt: true}}}, orderBy: [{effectiveFrom: 'desc'}, {createdAt: 'desc'}]});
  if (!term || !term.approvedByAccountId || !term.reviewedByAccountId || !term.requestedByAccountId || term.baseAmountMinor === null || term.baseAmountMinor < 0 || term.currency !== 'SAR') return crewFailure('F02_APPROVED_COMPENSATION_TERM_REQUIRED');
  const people = await tx.account.findMany({where: {id: {in: [accountId, term.approvedByAccountId, term.reviewedByAccountId, term.requestedByAccountId]}, status: 'ACTIVE'}, select: {id: true, personId: true}});
  const person = (id: string) => people.find(a => a.id === id)?.personId;
  if (!person(term.approvedByAccountId) || !person(term.reviewedByAccountId) || !person(term.requestedByAccountId)
    || person(term.approvedByAccountId) === person(accountId) || person(term.approvedByAccountId) === person(term.requestedByAccountId)
    || person(term.approvedByAccountId) === person(term.reviewedByAccountId)) return crewFailure('F02_COMPENSATION_APPROVAL_NOT_INDEPENDENT');
  return crewJson({version: 1, kind: 'EMPLOYMENT_COMPENSATION_TERM', sourceId: term.id, organizationId: organization.id, accountId,
    employmentId: term.employmentId, employmentRevision: term.employment.updatedAt.toISOString(), revision: term.updatedAt.toISOString(),
    effectiveFrom: term.effectiveFrom.toISOString(), effectiveTo: term.effectiveTo?.toISOString() ?? null, baseAmountMinor: term.baseAmountMinor,
    currency: term.currency, allowances: term.allowances, benefits: term.benefits, approvedByAccountId: term.approvedByAccountId, financialExecution: false});
}

/** Write decisions pin their native evidence rows until commit. Serializable
 * alone can legitimately order a stale decision before concurrent revocation.
 * A locking read after validation instead raises 40001 if a row changed after
 * this transaction's snapshot; DatabaseService retries against the new truth.
 * Read-only projections do not take these decision locks. */
export async function crewLockDecision(tx: CrewTx, trip: CrewTrip, actors: Array<string|null>, qualification?: unknown, compensation?: unknown) {
  const q = crewObject(qualification), c = crewObject(compensation), source = crewObject(q.source);
  const credentials = Array.isArray(q.credentials) ? q.credentials.map(crewObject) : [];
  const platform = await reviewPlatform(tx), organization = await crewOrganization(tx, trip);
  const term = c.kind === 'EMPLOYMENT_COMPENSATION_TERM' && typeof c.sourceId === 'string'
    ? await tx.compensationTerm.findUnique({where: {id: c.sourceId}, select: {requestedByAccountId: true, reviewedByAccountId: true, approvedByAccountId: true}}) : null;
  const accounts = [...new Set([...actors, q.accountId, source.approvedByAccountId, c.recordedByAccountId, c.approvedByAccountId,
    term?.requestedByAccountId, term?.reviewedByAccountId, platform.ownerId, organization.ownerId,
    ...credentials.map(item => item.reviewerAccountId)].filter((id): id is string => typeof id === 'string'))].sort();
  const organizationIds = [...new Set([platform.id, organization.id])].sort();
  const credentialIds = credentials.map(item => String(item.id)).sort(), reviewIds = credentials.map(item => String(item.reviewId)).sort();
  const sourceId = typeof source.documentId === 'string' ? source.documentId : '';
  const resourceId = typeof q.resourceId === 'string' ? q.resourceId : '';
  const compensationId = typeof c.sourceId === 'string' ? c.sourceId : '';
  await tx.$queryRaw`SELECT id FROM "Account" WHERE id::text=ANY(${accounts}::text[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "RoleAssignment" WHERE "accountId"::text=ANY(${accounts}::text[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE "accountId"::text=ANY(${accounts}::text[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id::text=ANY(${organizationIds}::text[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT key FROM "OperationalSetting" WHERE key='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Employment" WHERE "accountId"::text=ANY(${accounts}::text[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "OrgUnit" WHERE id IN (SELECT "orgUnitId" FROM "Employment" WHERE "accountId"::text=ANY(${accounts}::text[])) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Position" WHERE id IN (SELECT "positionId" FROM "Employment" WHERE "accountId"::text=ANY(${accounts}::text[])) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Trip" WHERE id::text=${trip.id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "CalendarResource" WHERE id::text=${resourceId} FOR SHARE`;
  await tx.$queryRaw`SELECT a.id FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e.id=a."eventId"
    WHERE a."resourceId"::text=${resourceId} AND e."referenceType"='TRIP' AND e."referenceId"::text=${trip.id} ORDER BY a.id FOR SHARE OF a,e`;
  await tx.$queryRaw`SELECT id FROM "Credential" WHERE id::text=ANY(${credentialIds}::text[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "AuditEvent" WHERE id::text=ANY(${reviewIds}::text[]) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "ManagedDocument" WHERE id::text=${sourceId} FOR SHARE`;
  await tx.$queryRaw`SELECT t.id FROM "DocumentTemplate" t JOIN "ManagedDocument" d ON d."templateId"=t.id WHERE d.id::text=${sourceId} FOR SHARE OF t`;
  await tx.$queryRaw`SELECT id FROM "DocumentRevision" WHERE "documentId"::text=${sourceId} ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "DocumentLifecycleEvent" WHERE "documentId"::text=${sourceId} ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT b.id FROM "DocumentBrandSnapshot" b JOIN "ManagedDocument" d ON d."organizationId"=b."organizationId" AND d."documentBrandVersion"=b."brandVersion" WHERE d.id::text=${sourceId} FOR SHARE OF b`;
  await tx.$queryRaw`SELECT id FROM "InstructorCompensationAgreement" WHERE id::text=${compensationId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "CompensationTerm" WHERE id::text=${compensationId} FOR SHARE`;
}

export async function assertCrewSnapshot(tx: CrewTx, row: CrewRow, trip: CrewTrip, options: {latestCompensation?: boolean; calendar?: boolean; approval?: boolean} = {}) {
  const q = crewObject(row.qualificationSnapshot), p = crewObject(q.source);
  if (!row.qualificationSnapshot || !row.compensationSnapshot || typeof p.documentId !== 'string') return crewFailure('F02_LEGACY_SOURCE_REVIEW_REQUIRED');
  const qualification = await crewQualification(tx, trip, row.resourceId, p.documentId, options.calendar !== false);
  if (crewHash(qualification) !== crewHash(row.qualificationSnapshot)) return crewFailure('F02_QUALIFICATION_CHANGED');
  const compensation = await crewCompensation(tx, trip, row.accountId, row.roleType, options.latestCompensation ? undefined : row.compensationSnapshot);
  if (crewHash(compensation) !== crewHash(row.compensationSnapshot)) return crewFailure('F02_COMPENSATION_CHANGED');
  if (options.approval !== false) {
    if (!row.approvedByAccountId || !row.approvedAt || !row.approvalAuthority) return crewFailure('F02_INDEPENDENT_APPROVAL_REQUIRED');
    if (row.approvedAt > trip.startsAt || row.approvedAt > new Date() || Date.parse(String(p.approvedAt)) > row.approvedAt.getTime()
      || row.status === 'ACCEPTED' && (!row.respondedAt || row.respondedAt < row.approvedAt || row.respondedAt > trip.startsAt)) return crewFailure('F02_APPROVAL_TIMING_INVALID');
    const organization = await crewOrganization(tx, trip), authority = await crewAuthority(tx, row.approvedByAccountId, organization.id);
    if (crewHash(authority) !== crewHash(row.approvalAuthority)) return crewFailure('F02_APPROVAL_AUTHORITY_CHANGED');
    const requester = row.requestedByAccountId && await tx.account.findUnique({where: {id: row.requestedByAccountId}, select: {personId: true}});
    if (!requester || authority.personId === q.personId || authority.personId === requester.personId) return crewFailure('F02_INDEPENDENT_APPROVAL_REQUIRED');
    if (options.calendar !== false) {
      const allocation = await tx.calendarAllocation.findFirst({where: {resourceId: row.resourceId, status: 'ACTIVE', startsAt: trip.startsAt, endsAt: trip.endsAt,
        event: {referenceType: 'TRIP', referenceId: trip.id, status: 'ACTIVE', startsAt: trip.startsAt, endsAt: trip.endsAt}}, select: {id: true}});
      if (!allocation) return crewFailure('F02_CALENDAR_RESERVATION_CHANGED');
    }
  }
}

/** D04 must retain the person in physical accountability even when this is false.
 * This is current source readiness, never a declaration of human acceptance. */
export async function crewAssignmentReadiness(tx: CrewTx, assignmentId: string): Promise<{operationalReady: boolean; legacyUnverified: boolean; reasons: string[]}> {
  const [row] = await tx.$queryRaw<CrewRow[]>`SELECT * FROM "CrewAssignment" WHERE id::text=${assignmentId}`;
  if (!row) throw new NotFoundException('F02_ASSIGNMENT_NOT_FOUND');
  const legacyUnverified = !row.qualificationSnapshot || !row.compensationSnapshot;
  try {
    const trip = await tx.trip.findUniqueOrThrow({where: {id: row.tripId}});
    if (['CANCELLED','COMPLETED'].includes(trip.status)) return {operationalReady: false, legacyUnverified, reasons: ['F02_TRIP_TERMINAL']};
    await assertCrewSnapshot(tx, row, trip);
    return {operationalReady: row.status === 'ACCEPTED', legacyUnverified, reasons: row.status === 'ACCEPTED' ? [] : ['F02_CREW_ACCEPTANCE_REQUIRED']};
  } catch (error) {
    if (!(error instanceof HttpException) || error.getStatus() >= 500) throw error;
    const code = crewObject(error.getResponse()).code;
    return {operationalReady: false, legacyUnverified, reasons: [typeof code === 'string' ? code : 'F02_CURRENT_EVIDENCE_REVIEW_REQUIRED']};
  }
}
