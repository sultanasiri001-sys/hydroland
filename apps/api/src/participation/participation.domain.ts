import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export { PARTICIPATION_SOURCE_PREFIX } from './participation-privacy';
export const SOURCE_KINDS = ['POLICY', 'IDENTITY', 'GUARDIAN', 'MEDICAL'] as const;
export type SourceKind = typeof SOURCE_KINDS[number];
export const SUBJECT_TYPES = ['BOOKING_PARTICIPANT', 'TRAINING_ENROLLMENT'] as const;
export type SubjectType = typeof SUBJECT_TYPES[number];
export type ServiceType = 'TRIP' | 'TRAINING_ENROLLMENT';
export const CASE_ACTIONS = ['LINK_EVIDENCE', 'SIGN_CONSENT', 'WITHDRAW_CONSENT', 'REVIEW', 'REVOKE', 'REPLACE_SOURCES'] as const;
export type CaseAction = typeof CASE_ACTIONS[number];
export type SourceReference = { id: string; version: number; hash: string };
export type ServiceSnapshot = { id: string; type: ServiceType; title: string; activityCode: string; startsAt: string | null; endsAt: string | null };
export type PolicyTerms = {
  purpose: 'D01_POLICY_V1'; serviceType: ServiceType; serviceId: string; subjectId: string;
  activityCode: string; effectiveFrom: string; validUntil: string; minimumAge: number; guardianBelowAge: number;
  consentRequirement: 'REQUIRED' | 'NOT_APPLICABLE'; medicalRequirement: 'REQUIRED' | 'NOT_APPLICABLE';
  consentTextAr: string; consentTextEn: string; sourceAuthority: string; sourceReference: string;
  sourceVersion: string; sourceClause: string; applicabilityReason: string;
};
export type IdentityTerms = {
  purpose: 'D01_IDENTITY_V1'; subjectType: SubjectType; subjectId: string; participantAccountId: string | null;
  fullName: string; dateOfBirth: string; issuerName: string; sourceReference: string; issuedAt: string; validUntil: string;
};
export type GuardianTerms = {
  purpose: 'D01_GUARDIAN_V1'; subjectType: SubjectType; subjectId: string; serviceType: ServiceType; serviceId: string;
  identityDocumentId: string; identityDocumentHash: string; guardianAccountId: string;
  relationshipKind: 'PARENT' | 'LEGAL_GUARDIAN'; authorityScope: 'PARTICIPATION_CONSENT';
  issuerName: string; sourceReference: string; issuedAt: string; validFrom: string; validUntil: string;
};
export type MedicalTerms = {
  purpose: 'D01_MEDICAL_V1'; subjectType: SubjectType; subjectId: string; serviceType: ServiceType; serviceId: string;
  identityDocumentId: string; identityDocumentHash: string; activityCode: string;
  issuerName: string; issuerReference: string; sourceReference: string; issuedAt: string; validFrom: string; validUntil: string;
  outcome: 'CLEARED_FOR_ACTIVITY' | 'NOT_CLEARED' | 'REQUIRES_REVIEW'; limitations: string;
};
export type SourceTerms = PolicyTerms | IdentityTerms | GuardianTerms | MedicalTerms;
export type AuthorityBinding = { accountId: string; personId: string; role: string; authorityId: string; authorityUpdatedAt: string };
export type CaseState = {
  schemaVersion: 1; subjectType: SubjectType; subjectId: string; organizationId: string;
  service: ServiceSnapshot; subjectFingerprint: string;
  policy: SourceReference; identity: SourceReference; guardian: SourceReference | null; medical: SourceReference | null;
  medicalHold: SourceReference | null;
  participant: { accountId: string | null; personId: string | null; fullName: string; dateOfBirth: string };
  guardianActor: { accountId: string; personId: string; name: string } | null;
  consent: {
    eventId: string; actorAccountId: string; actorPersonId: string; role: 'PARTICIPANT' | 'GUARDIAN';
    signedName: string; consentHash: string; signedAt: string;
    withdrawnAt: string | null; withdrawalEventId: string | null;
  } | null;
  review: { eventId: string; actorAccountId: string; authority: AuthorityBinding; decision: 'ELIGIBLE' | 'REJECTED'; evidenceDigest: string; reason: string; reviewedAt: string } | null;
  revokedAt: string | null; revocationReason: string | null;
};
export type ActionPermission = { allowed: boolean; reason: string | null };
export type CaseCommand = { requestId: string; expectedRevision: number; expectedDigest: string; action: CaseAction; payload: Record<string, unknown> };
export type SourceCreateInput = {
  requestId: string; organizationId: string; kind: SourceKind; title: string; payload: SourceTerms;
  attachment: { filename: string; mimeType: 'application/pdf'; base64: string };
};
export type SourceCommand = { requestId: string; expectedVersion: number; expectedHash: string; action: 'SUBMIT' | 'APPROVE' | 'SIGN' | 'REVOKE'; reason: string };

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new BadRequestException('Expected a plain object.');
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new BadRequestException('Unknown participation fields.');
}
export function text(value: unknown, label: string, maximum = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) throw new BadRequestException(label + ' is required.');
  return value.trim();
}
export function uuid(value: unknown, label = 'Reference'): string {
  const result = text(value, label, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) throw new BadRequestException(label + ' must be a UUID.');
  return result;
}
export function digest(value: unknown, label = 'Digest'): string {
  const result = text(value, label, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new BadRequestException(label + ' is invalid.');
  return result;
}
export function choice<T extends string>(value: unknown, choices: readonly T[], label: string): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new BadRequestException(label + ' is invalid.');
  return value as T;
}
export function integer(value: unknown, label: string, min = 0, max = 120): number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) throw new BadRequestException(label + ' is invalid.');
  return Number(value);
}
export function instant(value: unknown, label: string): string {
  const result = text(value, label, 30);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 19) !== result.slice(0, 19)) throw new BadRequestException(label + ' must be an exact UTC timestamp.');
  return new Date(result).toISOString();
}
export function dateOnly(value: unknown): string {
  const result = text(value, 'Date of birth', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new BadRequestException('Date of birth is invalid.');
  return result;
}
export function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => [key, canonical(v)]));
  return value;
}
export const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const normalizedName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
export function sameParticipationPerson(left: CaseState['participant'], right: CaseState['participant']): boolean {
  if (left.accountId !== right.accountId || left.personId !== right.personId) return false;
  // A verified canonical person remains the same person after a corrected name
  // or birth date. Two missing person bindings do not establish that identity.
  return Boolean(left.accountId && left.personId)
    || normalizedName(left.fullName) === normalizedName(right.fullName) && left.dateOfBirth === right.dateOfBirth;
}
export function occurrenceId(seed: string): string {
  const value = hash(seed);
  return value.slice(0, 8) + '-' + value.slice(8, 12) + '-4' + value.slice(13, 16) + '-a' + value.slice(17, 20) + '-' + value.slice(20, 32);
}

export function parseSource(kind: SourceKind, input: unknown): SourceTerms {
  const v = object(input);
  if (Buffer.byteLength(JSON.stringify(v)) > 32000) throw new BadRequestException('Participation source is too large.');
  if (kind === 'POLICY') {
    keys(v, ['purpose', 'serviceType', 'serviceId', 'subjectId', 'activityCode', 'effectiveFrom', 'validUntil', 'minimumAge', 'guardianBelowAge', 'consentRequirement', 'medicalRequirement', 'consentTextAr', 'consentTextEn', 'sourceAuthority', 'sourceReference', 'sourceVersion', 'sourceClause', 'applicabilityReason']);
    const terms: PolicyTerms = {
      purpose: choice(v.purpose, ['D01_POLICY_V1'], 'Policy purpose'), serviceType: choice(v.serviceType, ['TRIP', 'TRAINING_ENROLLMENT'], 'Service type'),
      serviceId: uuid(v.serviceId), subjectId: v.subjectId === 'ALL' ? 'ALL' : uuid(v.subjectId), activityCode: text(v.activityCode, 'Activity code', 120),
      effectiveFrom: instant(v.effectiveFrom, 'Effective time'), validUntil: instant(v.validUntil, 'Policy expiry'),
      minimumAge: integer(v.minimumAge, 'Minimum age'), guardianBelowAge: integer(v.guardianBelowAge, 'Guardian age boundary'),
      consentRequirement: choice(v.consentRequirement, ['REQUIRED', 'NOT_APPLICABLE'], 'Consent applicability'),
      medicalRequirement: choice(v.medicalRequirement, ['REQUIRED', 'NOT_APPLICABLE'], 'Medical applicability'),
      consentTextAr: text(v.consentTextAr, 'Arabic consent wording', 8000), consentTextEn: text(v.consentTextEn, 'English consent wording', 8000),
      sourceAuthority: text(v.sourceAuthority, 'Source authority'), sourceReference: text(v.sourceReference, 'Source reference', 1000),
      sourceVersion: text(v.sourceVersion, 'Source version', 100), sourceClause: text(v.sourceClause, 'Source clause', 1000),
      applicabilityReason: text(v.applicabilityReason, 'Applicability reason', 2000),
    };
    if (terms.validUntil <= terms.effectiveFrom) throw new BadRequestException('Policy expiry must follow its effective time.');
    return terms;
  }
  const subject = { subjectType: choice(v.subjectType, SUBJECT_TYPES, 'Subject type'), subjectId: uuid(v.subjectId) };
  const common = { issuerName: text(v.issuerName, 'Source issuer'), sourceReference: text(v.sourceReference, 'Source reference', 1000), issuedAt: instant(v.issuedAt, 'Issue time'), validUntil: instant(v.validUntil, 'Source expiry') };
  if (common.issuedAt > new Date().toISOString() || common.validUntil <= common.issuedAt) throw new BadRequestException('Source issue and expiry times are invalid.');
  if (kind === 'IDENTITY') {
    keys(v, ['purpose', 'subjectType', 'subjectId', 'participantAccountId', 'fullName', 'dateOfBirth', 'issuerName', 'sourceReference', 'issuedAt', 'validUntil']);
    const dateOfBirth = dateOnly(v.dateOfBirth);
    if (dateOfBirth > common.issuedAt.slice(0, 10)) throw new BadRequestException('Date of birth follows the identity source.');
    return { purpose: choice(v.purpose, ['D01_IDENTITY_V1'], 'Identity purpose'), ...subject, ...common,
      participantAccountId: v.participantAccountId === null ? null : uuid(v.participantAccountId), fullName: text(v.fullName, 'Participant name', 160), dateOfBirth };
  }
  const binding = { serviceType: choice(v.serviceType, ['TRIP', 'TRAINING_ENROLLMENT'], 'Service type'), serviceId: uuid(v.serviceId),
    identityDocumentId: uuid(v.identityDocumentId), identityDocumentHash: digest(v.identityDocumentHash), validFrom: instant(v.validFrom, 'Effective time') };
  if (binding.validFrom < common.issuedAt || binding.validFrom >= common.validUntil) throw new BadRequestException('Source effective range is invalid.');
  if (kind === 'GUARDIAN') {
    keys(v, ['purpose', 'subjectType', 'subjectId', 'serviceType', 'serviceId', 'identityDocumentId', 'identityDocumentHash', 'guardianAccountId', 'relationshipKind', 'authorityScope', 'issuerName', 'sourceReference', 'issuedAt', 'validFrom', 'validUntil']);
    return { purpose: choice(v.purpose, ['D01_GUARDIAN_V1'], 'Guardian purpose'), ...subject, ...common, ...binding,
      guardianAccountId: uuid(v.guardianAccountId), relationshipKind: choice(v.relationshipKind, ['PARENT', 'LEGAL_GUARDIAN'], 'Guardian relationship'),
      authorityScope: choice(v.authorityScope, ['PARTICIPATION_CONSENT'], 'Guardian authority scope') };
  }
  keys(v, ['purpose', 'subjectType', 'subjectId', 'serviceType', 'serviceId', 'identityDocumentId', 'identityDocumentHash', 'activityCode', 'issuerName', 'issuerReference', 'sourceReference', 'issuedAt', 'validFrom', 'validUntil', 'outcome', 'limitations']);
  if (typeof v.limitations !== 'string' || v.limitations.length > 2000) throw new BadRequestException('Medical limitations must be an explicit bounded string; omit diagnoses.');
  return { purpose: choice(v.purpose, ['D01_MEDICAL_V1'], 'Medical purpose'), ...subject, ...common, ...binding,
    activityCode: text(v.activityCode, 'Activity code', 120), issuerReference: text(v.issuerReference, 'Issuer professional reference'),
    outcome: choice(v.outcome, ['CLEARED_FOR_ACTIVITY', 'NOT_CLEARED', 'REQUIRES_REVIEW'], 'Recorded source outcome'), limitations: v.limitations.trim() };
}

export function parseCaseCommand(input: unknown): CaseCommand {
  const v = object(input);
  keys(v, ['requestId', 'expectedRevision', 'expectedDigest', 'action', 'payload']);
  return { requestId: uuid(v.requestId, 'Request ID'), expectedRevision: integer(v.expectedRevision, 'Revision', 1, 2147483646),
    expectedDigest: digest(v.expectedDigest), action: choice(v.action, CASE_ACTIONS, 'Participation action'), payload: object(v.payload) };
}
export function parseSourceCommand(input: unknown): SourceCommand {
  const v = object(input);
  keys(v, ['requestId', 'expectedVersion', 'expectedHash', 'action', 'reason']);
  return { requestId: uuid(v.requestId, 'Request ID'), expectedVersion: integer(v.expectedVersion, 'Version', 1, 10000),
    expectedHash: digest(v.expectedHash), action: choice(v.action, ['SUBMIT', 'APPROVE', 'SIGN', 'REVOKE'], 'Source action'),
    reason: text(v.reason, 'Source action reason', 1000) };
}

export function consentDigest(state: CaseState): string {
  return hash({ schemaVersion: 1, subjectType: state.subjectType, subjectId: state.subjectId, organizationId: state.organizationId,
    service: state.service, subjectFingerprint: state.subjectFingerprint, policy: state.policy, identity: state.identity,
    participant: state.participant, guardian: state.guardian, guardianActor: state.guardianActor });
}
export function decisionDigest(state: CaseState): string {
  return hash({ ...state, review: null, revokedAt: null, revocationReason: null });
}
export const caseDigest = (id: string, revision: number, state: CaseState) => hash({ id, revision, state });
