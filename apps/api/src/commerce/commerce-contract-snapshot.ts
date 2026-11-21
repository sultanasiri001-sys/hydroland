import { createRefundPolicySnapshot } from './commerce-refund-policy';

export const COMMERCE_CONTRACT_SNAPSHOT_VERSION = '2026-11-21.1' as const;

/** These fields must come from the server's supplying organization, not the buyer or a request DTO. */
export interface CommerceIssuerSource {
  id: string;
  displayName: string;
  legalName?: string | null;
  registrationNumber?: string | null;
  address?: string | null;
}

export interface CommerceContractSnapshotInput {
  sourceKind: 'STORE_ORDER_ITEM' | 'TRAINING_ENROLLMENT' | 'TRIP_BOOKING';
  sourceId: string;
  parentId: string | null;
  offeringId: string;
  customerAccountId: string;
  organizationId: string | null;
  organization: CommerceIssuerSource | null;
  kind: 'PHYSICAL_GOOD' | 'COURSE' | 'TRIP' | 'RENTAL' | 'UNCLASSIFIED_SERVICE';
  title: string;
  quantity: number;
  unitPriceMinor: number;
  currency: string;
  recordedAt: string;
  originalStartsAt?: string | null;
  originalEndsAt?: string | null;
}

export class CommerceContractSnapshotError extends Error {
  readonly code = 'INVALID_COMMERCE_CONTRACT_SNAPSHOT';
  constructor(message: string) {
    super(message);
    this.name = 'CommerceContractSnapshotError';
  }
}

function text(value: unknown, name: string, limit = 512): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) {
    throw new CommerceContractSnapshotError(`${name} is invalid.`);
  }
  return value.trim();
}

function optionalText(value: unknown, name: string, limit = 512): string | null {
  if (value == null || value === '') return null;
  return text(value, name, limit);
}

function timestamp(value: unknown, name: string): string {
  const matched = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!matched) {
    throw new CommerceContractSnapshotError(`${name} requires an explicit time zone.`);
  }
  const [, year, month, day, hour, minute, second, zone] = matched;
  const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)
      || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
      || (zone !== 'Z' && (Number(zone.slice(1, 3)) > 14 || Number(zone.slice(4, 6)) > 59
        || (Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4, 6)) !== 0)))) {
    throw new CommerceContractSnapshotError(`${name} is invalid.`);
  }
  const date = new Date(value as string);
  if (!Number.isFinite(date.getTime())) throw new CommerceContractSnapshotError(`${name} is invalid.`);
  return date.toISOString();
}

function freeze<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
}

/**
 * Records the conditions offered when a new line is created. It is not a tax
 * invoice, proof that terms were displayed/accepted, collection, or delivery.
 * Existing rows without a snapshot must not be filled from today's catalog.
 */
export function createCommerceContractSnapshot(input: CommerceContractSnapshotInput) {
  const sourceId = text(input.sourceId, 'Source id', 128);
  const customerAccountId = text(input.customerAccountId, 'Customer account', 128);
  const organizationId = optionalText(input.organizationId, 'Organization id', 128);
  if (!['STORE_ORDER_ITEM', 'TRAINING_ENROLLMENT', 'TRIP_BOOKING'].includes(input.sourceKind)) {
    throw new CommerceContractSnapshotError('Source kind is invalid.');
  }
  if (!['PHYSICAL_GOOD', 'COURSE', 'TRIP', 'RENTAL', 'UNCLASSIFIED_SERVICE'].includes(input.kind)) {
    throw new CommerceContractSnapshotError('Line kind is invalid.');
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 2147483647
      || !Number.isSafeInteger(input.unitPriceMinor) || input.unitPriceMinor < 0 || input.unitPriceMinor > 2147483647) {
    throw new CommerceContractSnapshotError('Line quantity or amount is invalid.');
  }
  const amountMinor = input.quantity * input.unitPriceMinor;
  if (!Number.isSafeInteger(amountMinor) || amountMinor > 2147483647) {
    throw new CommerceContractSnapshotError('Line amount exceeds its supported range.');
  }
  if (typeof input.currency !== 'string' || !/^[A-Z]{3}$/.test(input.currency)) {
    throw new CommerceContractSnapshotError('Currency is invalid.');
  }
  const recordedAt = timestamp(input.recordedAt, 'Recorded time');
  const originalStartsAt = input.originalStartsAt == null ? null : timestamp(input.originalStartsAt, 'Original start');
  const originalEndsAt = input.originalEndsAt == null ? null : timestamp(input.originalEndsAt, 'Original end');
  if (['COURSE', 'TRIP', 'RENTAL'].includes(input.kind) && (!originalStartsAt || !originalEndsAt || originalStartsAt < recordedAt || originalEndsAt <= originalStartsAt)) {
    throw new CommerceContractSnapshotError('A service requires its original future schedule.');
  }
  if (input.sourceKind === 'TRAINING_ENROLLMENT' && (input.kind !== 'COURSE' || input.quantity !== 1)) {
    throw new CommerceContractSnapshotError('Enrollment must identify one course seat.');
  }
  if (input.sourceKind === 'TRIP_BOOKING' && input.kind !== 'TRIP') {
    throw new CommerceContractSnapshotError('Trip booking must identify a trip.');
  }
  const organization = input.organization;
  if ((organizationId && (!organization || organization.id !== organizationId)) || (!organizationId && organization)) {
    throw new CommerceContractSnapshotError('Supplying organization does not match the offering.');
  }
  const legalName = optionalText(organization?.legalName, 'Legal name');
  const displayName = optionalText(organization?.displayName, 'Display name');
  const registrationNumber = optionalText(organization?.registrationNumber, 'Registration number');
  const address = optionalText(organization?.address, 'Address', 2048);
  // Organization has no verified tax profile in this schema. Absence is not an
  // assertion of VAT exemption or permission to issue a compliant tax invoice.
  const missingFiscalFields = [
    ...(!organizationId ? ['organizationId'] : []),
    ...(!legalName ? ['legalName'] : []),
    ...(!registrationNumber ? ['registrationNumber'] : []),
    ...(!address ? ['address'] : []),
    'verifiedTaxProfile',
  ];
  const refundPolicy = input.kind === 'UNCLASSIFIED_SERVICE'
    ? { status: 'REVIEW_REQUIRED' as const, reasonCode: 'SERVICE_CLASSIFICATION_REQUIRED', snapshot: null }
    : input.currency !== 'SAR'
      ? { status: 'REVIEW_REQUIRED' as const, reasonCode: 'UNSUPPORTED_POLICY_CURRENCY', snapshot: null }
      : { status: 'RECORDED' as const, reasonCode: null, snapshot: { ...createRefundPolicySnapshot({
        lineId: sourceId, kind: input.kind, currency: 'SAR', grossAmountMinor: amountMinor,
        contractedAt: recordedAt, contractedScheduledAt: originalStartsAt,
      }) } };
  return freeze({
    version: COMMERCE_CONTRACT_SNAPSHOT_VERSION,
    source: { kind: input.sourceKind, id: sourceId, parentId: optionalText(input.parentId, 'Parent id', 128), offeringId: text(input.offeringId, 'Offering id', 128) },
    customerAccountId,
    kind: input.kind,
    title: text(input.title, 'Line title', 1024),
    quantity: input.quantity,
    unitPriceMinor: input.unitPriceMinor,
    amountMinor,
    currency: input.currency,
    recordedAt,
    originalSchedule: { startsAt: originalStartsAt, endsAt: originalEndsAt },
    issuer: {
      organizationId, legalName, displayName, registrationNumber, address,
      taxRegistrationNumber: null,
      taxStatus: 'UNVERIFIED' as const,
      invoiceReadiness: 'REVIEW_REQUIRED' as const,
      missingFiscalFields,
    },
    collectionModel: organizationId ? 'HYDROLAND_ON_BEHALF_OF_PROVIDER' as const : 'REVIEW_REQUIRED' as const,
    taxBreakdownStatus: 'UNVERIFIED' as const,
    termsAcceptanceStatus: 'NOT_RECORDED' as const,
    refundPolicy,
    financialActionExecuted: false as const,
  });
}
