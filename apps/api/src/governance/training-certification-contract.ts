import { createHash } from 'node:crypto';

/** A HYDROLAND-owned preparation contract, not an agency's API specification. */
export const TRAINING_CERTIFICATION_PROTOCOL = 'HYDROLAND_TRAINING_CERTIFICATION_V1' as const;
export const MAX_TRAINING_CERTIFICATION_BYTES = 16_384;
export const MAX_TRAINING_CERTIFICATION_REQUEST_AGE_MS = 15 * 60_000;

export class TrainingCertificationContractError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = 'TrainingCertificationContractError';
    this.code = code;
  }
}

export type TrainingCertificationBinding = {
  organizationId: string;
  enrollmentId: string;
  trainingRecordId: string;
  participantAccountId: string;
  agencyCode: string;
  programCode: string;
  edition: string;
  profileHash: string;
  resultDigest: string;
};
export type InternalCertificationResult = {
  status: 'APPROVED';
  certificateId: string;
  certificateNumber: string;
};
export type TrainingCertificationSource = {
  binding: TrainingCertificationBinding;
  internalResult: InternalCertificationResult;
};
export type TrainingCertificationRequest = TrainingCertificationSource & {
  protocol: typeof TRAINING_CERTIFICATION_PROTOCOL;
  mode: 'TEST';
  requestId: string;
  requestedAt: string;
};
export type TrainingCertificationReceipt = {
  protocol: typeof TRAINING_CERTIFICATION_PROTOCOL;
  mode: 'TEST';
  requestId: string;
  requestDigest: string;
  binding: TrainingCertificationBinding;
  internalCertificateId: string;
  outcome: 'CONTRACT_ACCEPTED' | 'UNKNOWN';
  checkedAt: string;
  receiptId: string;
  synthetic: true;
  officialIssuance: false;
  externalCertificateNumber: null;
};

export function notConnectedExternalCertification() {
  return {
    status: 'NOT_CONNECTED' as const,
    provider: null,
    program: null,
    edition: null,
    certificateNumber: null,
    verifiedAt: null,
    officialIssuance: false as const,
    operationalAuthority: false as const,
  };
}

const fail = (code: string): never => { throw new TrainingCertificationContractError(code); };
function object(value: unknown, expected: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('CONTRACT_OBJECT_REQUIRED');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return fail('CONTRACT_OBJECT_REQUIRED');
  if (Object.getOwnPropertySymbols(value).length) return fail('CONTRACT_FIELDS_INVALID');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== expected.length || expected.some(key => !Object.hasOwn(descriptors, key))
    || Object.values(descriptors).some(descriptor => !Object.hasOwn(descriptor, 'value'))) return fail('CONTRACT_FIELDS_INVALID');
  return value as Record<string, unknown>;
}
function text(value: unknown, maximum = 160): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum || value !== value.trim()
    || /[\u0000-\u001f\u007f]/u.test(value)) return fail('CONTRACT_TEXT_INVALID');
  return value;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)) return fail('CONTRACT_ID_INVALID');
  return value;
}
function digest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return fail('CONTRACT_DIGEST_INVALID');
  return value;
}
function instant(value: unknown, now: number): string {
  if (!Number.isFinite(now) || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return fail('CONTRACT_TIME_INVALID');
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > now) return fail('CONTRACT_TIME_INVALID');
  const normalized = new Date(timestamp).toISOString();
  if (normalized !== (value.includes('.') ? value : value.replace('Z', '.000Z'))) return fail('CONTRACT_TIME_INVALID');
  return normalized;
}
function bounded<T>(value: T): T {
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_TRAINING_CERTIFICATION_BYTES) return fail('CONTRACT_MESSAGE_TOO_LARGE');
  return value;
}

export function trainingCertificationBinding(input: unknown): TrainingCertificationBinding {
  const row = object(input, ['organizationId', 'enrollmentId', 'trainingRecordId', 'participantAccountId', 'agencyCode', 'programCode', 'edition', 'profileHash', 'resultDigest']);
  return {
    organizationId: id(row.organizationId), enrollmentId: id(row.enrollmentId), trainingRecordId: id(row.trainingRecordId),
    participantAccountId: id(row.participantAccountId), agencyCode: text(row.agencyCode), programCode: text(row.programCode),
    edition: text(row.edition), profileHash: digest(row.profileHash), resultDigest: digest(row.resultDigest),
  };
}
function internalResult(input: unknown): InternalCertificationResult {
  const row = object(input, ['status', 'certificateId', 'certificateNumber']);
  if (row.status !== 'APPROVED') return fail('INTERNAL_CERTIFICATE_APPROVAL_REQUIRED');
  const certificateNumber = text(row.certificateNumber, 80);
  if (!/^HYD-TRN-\d{4}-[A-F0-9]{16}$/.test(certificateNumber)) return fail('INTERNAL_CERTIFICATE_NUMBER_INVALID');
  return { status: 'APPROVED', certificateId: id(row.certificateId), certificateNumber };
}
export function trainingCertificationSource(input: unknown): TrainingCertificationSource {
  const row = object(input, ['binding', 'internalResult']);
  return bounded({ binding: trainingCertificationBinding(row.binding), internalResult: internalResult(row.internalResult) });
}
export function trainingCertificationRequest(input: unknown, now = Date.now()): TrainingCertificationRequest {
  const row = object(input, ['protocol', 'mode', 'requestId', 'requestedAt', 'binding', 'internalResult']);
  if (row.protocol !== TRAINING_CERTIFICATION_PROTOCOL || row.mode !== 'TEST') return fail('TEST_CONTRACT_REQUIRED');
  const requestedAt = instant(row.requestedAt, now);
  if (now - Date.parse(requestedAt) > MAX_TRAINING_CERTIFICATION_REQUEST_AGE_MS) return fail('CONTRACT_REQUEST_EXPIRED');
  return bounded({ protocol: TRAINING_CERTIFICATION_PROTOCOL, mode: 'TEST', requestId: id(row.requestId), requestedAt,
    binding: trainingCertificationBinding(row.binding), internalResult: internalResult(row.internalResult) });
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
/** Hash only a parsed request/source. It contains no provider secret or medical document. */
export function trainingCertificationDigest(value: TrainingCertificationRequest | TrainingCertificationSource): string {
  return createHash('sha256').update(JSON.stringify(canonical(value)), 'utf8').digest('hex');
}

export function trainingCertificationReceipt(input: unknown, request: TrainingCertificationRequest, now = Date.now()): TrainingCertificationReceipt {
  const row = object(input, ['protocol', 'mode', 'requestId', 'requestDigest', 'binding', 'internalCertificateId', 'outcome', 'checkedAt', 'receiptId', 'synthetic', 'officialIssuance', 'externalCertificateNumber']);
  if (row.protocol !== TRAINING_CERTIFICATION_PROTOCOL || row.mode !== 'TEST' || row.synthetic !== true
    || row.officialIssuance !== false || row.externalCertificateNumber !== null) return fail('SYNTHETIC_RECEIPT_REQUIRED');
  if (row.outcome !== 'CONTRACT_ACCEPTED' && row.outcome !== 'UNKNOWN') return fail('CONTRACT_OUTCOME_INVALID');
  const receipt: TrainingCertificationReceipt = bounded({ protocol: TRAINING_CERTIFICATION_PROTOCOL, mode: 'TEST', requestId: id(row.requestId),
    requestDigest: digest(row.requestDigest), binding: trainingCertificationBinding(row.binding), internalCertificateId: id(row.internalCertificateId),
    outcome: row.outcome, checkedAt: instant(row.checkedAt, now), receiptId: id(row.receiptId), synthetic: true, officialIssuance: false, externalCertificateNumber: null });
  if (receipt.requestId !== request.requestId || receipt.requestDigest !== trainingCertificationDigest(request)
    || receipt.internalCertificateId !== request.internalResult.certificateId
    || trainingCertificationDigest({ binding: receipt.binding, internalResult: request.internalResult }) !== trainingCertificationDigest({ binding: request.binding, internalResult: request.internalResult })) return fail('CONTRACT_SOURCE_MISMATCH');
  if (Date.parse(receipt.checkedAt) < Date.parse(request.requestedAt)) return fail('CONTRACT_RECEIPT_STALE');
  return receipt;
}

/** Machine-readable description of the platform contract; no external agency is selected. */
export function trainingCertificationContract() {
  return {
    protocol: TRAINING_CERTIFICATION_PROTOCOL,
    mode: 'TEST' as const,
    integration: 'CERTIFICATION' as const,
    agencyApiCompatibilityEstablished: false,
    externalCertification: notConnectedExternalCertification(),
    maximumMessageBytes: MAX_TRAINING_CERTIFICATION_BYTES,
    maximumRequestAgeMs: MAX_TRAINING_CERTIFICATION_REQUEST_AGE_MS,
    requiredBindingFields: ['organizationId', 'enrollmentId', 'trainingRecordId', 'participantAccountId', 'agencyCode', 'programCode', 'edition', 'profileHash', 'resultDigest'],
    requiredInternalResult: ['APPROVED', 'certificateId', 'certificateNumber'],
    outcomes: ['NOT_CONNECTED', 'UNKNOWN', 'CONTRACT_ACCEPTED'],
    officialIssuance: false,
    limitations: ['A selected agency must accept this contract or require a provider-specific adapter.', 'Synthetic contract acceptance never grants an external certificate or operational authority.'],
  };
}
