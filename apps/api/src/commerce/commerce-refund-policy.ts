/**
 * Owner-approved commercial terms, with an independent statutory-rights gate.
 * The caller must load evidence from trusted domain records, never a request DTO.
 * This evaluator neither issues refunds nor creates service-completion events.
 * Legal basis: Saudi E-Commerce Law art.13 and executive regulation art.11.
 * https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/360de590-0286-4fa5-a243-aa9100c31979/1
 * https://uqn.gov.sa/wp-content/uploads/2022/10/%D8%A7%D9%84%D8%B9%D8%AF%D8%AF-4816.pdf
 */
export const COMMERCE_REFUND_POLICY_VERSION = '2026-11-21.1' as const;

export const COURSE_REFUND_POLICY_VERSION = '2026-11-21.2' as const;
type PolicyVersion = typeof COMMERCE_REFUND_POLICY_VERSION | typeof COURSE_REFUND_POLICY_VERSION;

export type CommerceLineKind = 'TRIP' | 'COURSE' | 'RENTAL' | 'PHYSICAL_GOOD';
export type CommerceRefundCause =
  | 'CUSTOMER_CANCELLATION'
  | 'NO_SHOW'
  | 'PROVIDER_CANCELLATION'
  | 'DEFECT'
  | 'NON_CONFORMITY'
  | 'WARRANTY';

export type StatutoryException =
  | 'CUSTOM_MADE'
  | 'USED_SOFTWARE_OR_RECORDING'
  | 'PUBLICATION'
  | 'CUSTOMER_CAUSED_DAMAGE'
  | 'ACCOMMODATION'
  | 'TRANSPORT'
  | 'CATERING'
  | 'SOFTWARE_DOWNLOAD'
  | 'PERISHABLE'
  | 'HEALTH_RESALE_RESTRICTION'
  | 'IRREVERSIBLY_INTEGRATED'
  | 'HOTEL_BOOKING'
  | 'TRAVEL_TICKET'
  | 'VEHICLE_RENTAL'
  | 'EVENT_ORGANIZATION'
  | 'PUBLIC_AUCTION'
  | 'UNCONTROLLED_MARKET_PRICE';

export interface CommerceRefundSnapshotInput {
  lineId: string;
  kind: CommerceLineKind;
  currency: 'SAR';
  /** Original line total, including VAT, in halalas. */
  grossAmountMinor: number;
  contractedAt: string;
  /** Original agreed departure/start/handover time; never a rewritten calendar time. */
  contractedScheduledAt?: string | null;
}

export interface CommerceRefundPolicySnapshot {
  readonly version: PolicyVersion;
  readonly lineId: string;
  readonly kind: CommerceLineKind;
  readonly currency: 'SAR';
  readonly grossAmountMinor: number;
  readonly contractedAt: string;
  readonly contractedScheduledAt: string | null;
  readonly calendarTimeZone: 'Asia/Riyadh';
}

/** All facts concern this line and the state at requestedAt, verified by the server. */
export interface CommerceRefundEvidence {
  lineId: string;
  receiptAt?: string | null;
  handoverAt?: string | null;
  serviceStartedAt?: string | null;
  tripClosedAt?: string | null;
  noShowAt?: string | null;
  consumption: 'NONE' | 'CONSUMED' | 'UNKNOWN';
  /** ELIGIBLE means the governing rule applies and no evidenced exception applies. */
  statutoryClassification: 'ELIGIBLE' | 'EXEMPT' | 'UNKNOWN';
  statutoryException?: StatutoryException;
  legalEvidenceReference?: string;
  providerFailureVerified?: boolean;
  providerEvidenceReference?: string;
  defectStatus?: 'CONFIRMED' | 'ALLEGED' | 'NONE';
  /** A verified remedy, not merely an allegation or a generic defect flag. */
  fullRefundRightVerified?: boolean;
  fullRefundRightReference?: string;
}

export interface EvaluateCommerceRefundInput {
  snapshot: CommerceRefundPolicySnapshot;
  requestedAt: string;
  /** Evidence must include facts through the cancellation request's receipt time. */
  evidenceAsOf: string;
  cause: CommerceRefundCause;
  collectedAmountMinor: number;
  refundedAmountMinor: number;
  /** Pending/unknown provider outcomes reserve money until reconciled. */
  reservedRefundAmountMinor?: number;
  evidence: CommerceRefundEvidence;
}

export interface CommerceRefundDecision {
  status: 'ELIGIBLE' | 'NO_REFUND' | 'REVIEW_REQUIRED';
  reasonCode: string;
  basis: 'COMMERCIAL' | 'STATUTORY' | 'VERIFIED_RIGHT' | 'PROVIDER_FAILURE' | 'REVIEW';
  lineId: string;
  policyVersion: PolicyVersion;
  currency: 'SAR';
  requestedAt: string;
  /** null means no amount has been decided and must never be coerced to zero. */
  refundAmountMinor: number | null;
  cumulativeRefundEntitlementMinor: number | null;
  remainingCollectedMinor: number;
  refundBasisPoints: number | null;
  statutoryDeadline: string | null;
  financialActionExecuted: false;
  serviceCompletionImplied: false;
}

export class CommerceRefundValidationError extends Error {
  readonly code = 'INVALID_COMMERCE_REFUND_INPUT';
  constructor(message: string) {
    super(message);
    this.name = 'CommerceRefundValidationError';
  }
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const RIYADH_OFFSET_MS = 3 * HOUR_MS;
const KINDS = ['TRIP', 'COURSE', 'RENTAL', 'PHYSICAL_GOOD'] as const;
const CAUSES = ['CUSTOMER_CANCELLATION', 'NO_SHOW', 'PROVIDER_CANCELLATION', 'DEFECT', 'NON_CONFORMITY', 'WARRANTY'] as const;
const EXCEPTIONS: readonly StatutoryException[] = [
  'CUSTOM_MADE', 'USED_SOFTWARE_OR_RECORDING', 'PUBLICATION', 'CUSTOMER_CAUSED_DAMAGE',
  'ACCOMMODATION', 'TRANSPORT', 'CATERING', 'SOFTWARE_DOWNLOAD', 'PERISHABLE',
  'HEALTH_RESALE_RESTRICTION', 'IRREVERSIBLY_INTEGRATED', 'HOTEL_BOOKING',
  'TRAVEL_TICKET', 'VEHICLE_RENTAL', 'EVENT_ORGANIZATION', 'PUBLIC_AUCTION',
  'UNCONTROLLED_MARKET_PRICE',
];

function invalid(message: string): never {
  throw new CommerceRefundValidationError(message);
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || value.length > 256) {
    invalid(`${name} must be a nonempty canonical string of at most 256 characters`);
  }
  return value;
}

function amount(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    invalid(`${name} must be a nonnegative safe integer of minor currency units`);
  }
  return value;
}

/** Strict RFC3339 with seconds and an explicit zone; no locale-dependent parsing. */
function instant(value: unknown, name: string): number {
  if (typeof value !== 'string') invalid(`${name} must be an RFC3339 timestamp`);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) invalid(`${name} must include seconds and an explicit time zone`);
  const [, year, month, day, hour, minute, second, , zone] = match;
  const y = Number(year), m = Number(month), d = Number(day), h = Number(hour), min = Number(minute), s = Number(second);
  const local = new Date(Date.UTC(y, m - 1, d, h, min, s));
  if (y < 1970 || local.getUTCFullYear() !== y || local.getUTCMonth() !== m - 1
    || local.getUTCDate() !== d || h > 23 || min > 59 || s > 59
    || (zone !== 'Z' && (Number(zone.slice(1, 3)) > 14 || Number(zone.slice(4, 6)) > 59
      || (Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4, 6)) !== 0)))) {
    invalid(`${name} is not a valid supported timestamp`);
  }
  const result = Date.parse(value);
  if (!Number.isSafeInteger(result)) invalid(`${name} is not a finite timestamp`);
  return result;
}

function optionalInstant(value: unknown, name: string): number | null {
  return value === null || value === undefined ? null : instant(value, name);
}

/**
 * Customer-favourable calendar interpretation: include the entire seventh day
 * following receipt/contract in Riyadh. This is an explicit product policy,
 * not a claim that the statute defines an elapsed 168-hour cutoff.
 */
export function riyadhSevenDayRefundDeadline(anchor: string): string {
  const milliseconds = instant(anchor, 'deadline anchor');
  const localDay = Math.floor((milliseconds + RIYADH_OFFSET_MS) / DAY_MS);
  return new Date((localDay + 8) * DAY_MS - RIYADH_OFFSET_MS - 1).toISOString();
}

export function createRefundPolicySnapshot(input: CommerceRefundSnapshotInput, version: PolicyVersion = input?.kind === 'COURSE' ? COURSE_REFUND_POLICY_VERSION : COMMERCE_REFUND_POLICY_VERSION): CommerceRefundPolicySnapshot {
  if (!input || typeof input !== 'object') invalid('snapshot input is required');
  if (version !== COMMERCE_REFUND_POLICY_VERSION && !(version === COURSE_REFUND_POLICY_VERSION && input.kind === 'COURSE')) invalid('unsupported policy snapshot version');
  const lineId = text(input.lineId, 'lineId');
  if (!(KINDS as readonly unknown[]).includes(input.kind)) invalid('unknown line kind');
  if (input.currency !== 'SAR') invalid('only SAR is supported; currency conversion is not permitted');
  const grossAmountMinor = amount(input.grossAmountMinor, 'grossAmountMinor');
  const contractedAt = instant(input.contractedAt, 'contractedAt');
  const scheduledAt = optionalInstant(input.contractedScheduledAt, 'contractedScheduledAt');
  if (input.kind !== 'PHYSICAL_GOOD' && scheduledAt === null) invalid('service lines require their original contracted schedule');
  if (scheduledAt !== null && scheduledAt < contractedAt) invalid('contracted schedule cannot precede contract formation');
  return Object.freeze({
    version,
    lineId, kind: input.kind, currency: 'SAR', grossAmountMinor,
    contractedAt: new Date(contractedAt).toISOString(),
    contractedScheduledAt: scheduledAt === null ? null : new Date(scheduledAt).toISOString(),
    calendarTimeZone: 'Asia/Riyadh',
  });
}

export function evaluateCommerceRefund(input: EvaluateCommerceRefundInput): CommerceRefundDecision {
  if (!input || typeof input !== 'object' || !input.snapshot || !input.evidence) invalid('snapshot and trusted evidence are required');
  if (input.snapshot.calendarTimeZone !== 'Asia/Riyadh') invalid('unsupported policy snapshot version or time zone');
  if (!input.snapshot.version) invalid('unsupported policy snapshot version');
  const snapshot = createRefundPolicySnapshot(input.snapshot, input.snapshot.version);
  const requestedAt = instant(input.requestedAt, 'requestedAt');
  const evidenceAsOf = instant(input.evidenceAsOf, 'evidenceAsOf');
  const contractedAt = instant(snapshot.contractedAt, 'contractedAt');
  const scheduledAt = optionalInstant(snapshot.contractedScheduledAt, 'contractedScheduledAt');
  if (!(CAUSES as readonly unknown[]).includes(input.cause)) invalid('unknown refund cause');
  const collected = amount(input.collectedAmountMinor, 'collectedAmountMinor');
  const refunded = amount(input.refundedAmountMinor, 'refundedAmountMinor');
  const reserved = amount(input.reservedRefundAmountMinor === undefined ? 0 : input.reservedRefundAmountMinor, 'reservedRefundAmountMinor');
  if (collected > snapshot.grossAmountMinor || refunded > collected || reserved > collected - refunded) invalid('collection, prior refunds or reservations exceed the line balance');
  const evidence = input.evidence;
  text(evidence.lineId, 'evidence.lineId');
  if (!['NONE', 'CONSUMED', 'UNKNOWN'].includes(evidence.consumption)) invalid('unknown consumption evidence');
  if (!['ELIGIBLE', 'EXEMPT', 'UNKNOWN'].includes(evidence.statutoryClassification)) invalid('unknown statutory classification');
  if (evidence.statutoryException !== undefined && !EXCEPTIONS.includes(evidence.statutoryException)) invalid('unknown statutory exception');
  if (evidence.defectStatus !== undefined && !['NONE', 'ALLEGED', 'CONFIRMED'].includes(evidence.defectStatus)) invalid('unknown defect status');
  for (const key of ['providerFailureVerified', 'fullRefundRightVerified'] as const) {
    if (evidence[key] !== undefined && typeof evidence[key] !== 'boolean') invalid(`${key} must be boolean`);
  }
  for (const key of ['legalEvidenceReference', 'providerEvidenceReference', 'fullRefundRightReference'] as const) {
    if (evidence[key] !== undefined) text(evidence[key], key);
  }
  const receiptAt = optionalInstant(evidence.receiptAt, 'receiptAt');
  const handoverAt = optionalInstant(evidence.handoverAt, 'handoverAt');
  const startedAt = optionalInstant(evidence.serviceStartedAt, 'serviceStartedAt');
  const closedAt = optionalInstant(evidence.tripClosedAt, 'tripClosedAt');
  const noShowAt = optionalInstant(evidence.noShowAt, 'noShowAt');
  const events = [receiptAt, handoverAt, startedAt, closedAt, noShowAt];
  const remaining = collected - refunded - reserved;
  const statutoryAnchor = snapshot.kind === 'PHYSICAL_GOOD' ? receiptAt : contractedAt;
  const statutoryDeadline = statutoryAnchor === null ? null : riyadhSevenDayRefundDeadline(new Date(statutoryAnchor).toISOString());
  const base = {
    lineId: snapshot.lineId, policyVersion: snapshot.version, currency: 'SAR' as const,
    requestedAt: new Date(requestedAt).toISOString(), remainingCollectedMinor: remaining,
    statutoryDeadline, financialActionExecuted: false as const, serviceCompletionImplied: false as const,
  };
  const review = (reasonCode: string): CommerceRefundDecision => ({
    ...base, status: 'REVIEW_REQUIRED', reasonCode, basis: 'REVIEW',
    refundAmountMinor: null, cumulativeRefundEntitlementMinor: null, refundBasisPoints: null,
  });
  const decision = (basis: CommerceRefundDecision['basis'], reasonCode: string, refundBasisPoints: number): CommerceRefundDecision => {
    if (refundBasisPoints > 0 && refundBasisPoints < 10_000 && collected !== snapshot.grossAmountMinor) {
      return review('PARTIAL_COLLECTION_REQUIRES_REVIEW');
    }
    // Round once, half-up in the customer's favour; BigInt avoids multiplication overflow.
    const entitlement = Number((BigInt(snapshot.grossAmountMinor) * BigInt(refundBasisPoints) + 5_000n) / 10_000n);
    const additional = Math.min(remaining, Math.max(0, entitlement - refunded - reserved));
    const balanceReason = additional > 0 || refundBasisPoints === 0 ? reasonCode
      : reserved > 0 ? 'REFUND_ALREADY_RESERVED' : collected === 0 ? 'NO_COLLECTED_PAYMENT' : 'REFUND_ENTITLEMENT_ALREADY_SATISFIED';
    return {
      ...base, status: additional > 0 ? 'ELIGIBLE' : 'NO_REFUND', reasonCode: balanceReason, basis,
      refundAmountMinor: additional, cumulativeRefundEntitlementMinor: entitlement, refundBasisPoints,
    };
  };

  if (evidence.lineId !== snapshot.lineId) return review('EVIDENCE_LINE_ID_MISMATCH');
  if (requestedAt < contractedAt) return review('REQUEST_PRECEDES_CONTRACT');
  if (evidenceAsOf < requestedAt) return review('STALE_DOMAIN_EVIDENCE');
  if (events.some(event => event !== null && (event < contractedAt || event > evidenceAsOf))) return review('INCONSISTENT_EVENT_TIMELINE');
  if (snapshot.kind !== 'PHYSICAL_GOOD' && receiptAt !== null) return review('EVIDENCE_LINE_KIND_MISMATCH');
  if (snapshot.kind !== 'RENTAL' && handoverAt !== null) return review('EVIDENCE_LINE_KIND_MISMATCH');
  if (snapshot.kind !== 'TRIP' && closedAt !== null) return review('EVIDENCE_LINE_KIND_MISMATCH');
  if (snapshot.kind === 'PHYSICAL_GOOD' && (startedAt !== null || noShowAt !== null)) return review('EVIDENCE_LINE_KIND_MISMATCH');
  if (noShowAt !== null && scheduledAt !== null && noShowAt < scheduledAt) return review('NO_SHOW_PRECEDES_CONTRACTED_SCHEDULE');
  if (closedAt !== null && scheduledAt !== null && closedAt < scheduledAt) return review('TRIP_CLOSED_BEFORE_CONTRACTED_SCHEDULE');
  if (closedAt !== null && startedAt !== null && closedAt < startedAt) return review('TRIP_CLOSED_BEFORE_ACTUAL_START');
  if (noShowAt !== null && noShowAt <= requestedAt && evidence.consumption === 'CONSUMED') return review('NO_SHOW_CONFLICTS_WITH_CONSUMPTION');
  if (evidence.statutoryClassification !== 'EXEMPT' && evidence.statutoryException !== undefined) return review('CONTRADICTORY_STATUTORY_CLASSIFICATION');
  if (evidence.fullRefundRightVerified) {
    return evidence.fullRefundRightReference
      ? decision('VERIFIED_RIGHT', 'VERIFIED_FULL_REFUND_RIGHT', 10_000)
      : review('FULL_REFUND_RIGHT_EVIDENCE_REQUIRED');
  }

  // A defect allegation must remain reachable even after delivery or the ordinary deadline.
  if (['DEFECT', 'NON_CONFORMITY', 'WARRANTY'].includes(input.cause)
    || evidence.defectStatus === 'ALLEGED' || evidence.defectStatus === 'CONFIRMED') {
    return review('DEFECT_OR_WARRANTY_REMEDY_REVIEW');
  }
  if (input.cause === 'PROVIDER_CANCELLATION' || evidence.providerFailureVerified) {
    if (!evidence.providerFailureVerified || !evidence.providerEvidenceReference) return review('PROVIDER_FAILURE_EVIDENCE_REQUIRED');
    if (snapshot.kind === 'COURSE' && evidence.serviceStartedAt === null && evidence.consumption === 'NONE') {
      return decision('PROVIDER_FAILURE', 'COURSE_PROVIDER_CANCELLED_BEFORE_START', 10_000);
    }
    if (snapshot.kind === 'RENTAL' && evidence.handoverAt === null && evidence.consumption === 'NONE') {
      return decision('PROVIDER_FAILURE', 'RENTAL_PROVIDER_UNABLE_TO_HAND_OVER', 10_000);
    }
    // Trip weather/cancellation remedy was not independently adopted as a blanket policy.
    return review('PROVIDER_FAILURE_REMEDY_REVIEW');
  }

  const inStatutoryWindow = statutoryAnchor !== null && requestedAt >= statutoryAnchor
    && requestedAt <= instant(statutoryDeadline, 'statutoryDeadline');
  const classificationVerified = Boolean(evidence.legalEvidenceReference)
    && (evidence.statutoryClassification === 'ELIGIBLE'
      || (evidence.statutoryClassification === 'EXEMPT' && evidence.statutoryException !== undefined));
  const statutoryUnresolved = inStatutoryWindow && evidence.consumption !== 'CONSUMED'
    && (!classificationVerified || evidence.consumption === 'UNKNOWN');
  if (inStatutoryWindow && evidence.consumption === 'NONE'
    && evidence.statutoryClassification === 'ELIGIBLE' && classificationVerified) {
    return decision('STATUTORY', 'STATUTORY_SEVEN_DAY_RESCISSION', 10_000);
  }
  const commercial = (reason: string, rate: number): CommerceRefundDecision => {
    if (rate < 10_000 && (!classificationVerified || statutoryUnresolved)) return review('STATUTORY_ENTITLEMENT_REVIEW');
    return decision('COMMERCIAL', reason, rate);
  };

  if (snapshot.kind === 'PHYSICAL_GOOD') {
    if (input.cause === 'NO_SHOW') return review('NO_SHOW_NOT_APPLICABLE_TO_PHYSICAL_GOODS');
    if (receiptAt === null || receiptAt > requestedAt) return review('GOODS_PRE_RECEIPT_CANCELLATION_REVIEW');
    if (statutoryUnresolved) return review('GOODS_RETURN_ELIGIBILITY_REVIEW');
    if (!inStatutoryWindow) return commercial('GOODS_ORDINARY_RETURN_WINDOW_EXPIRED', 0);
    if (evidence.consumption === 'CONSUMED') return commercial('GOODS_USED_OR_BENEFIT_RECEIVED', 0);
    if (classificationVerified && evidence.statutoryClassification === 'EXEMPT') return commercial('GOODS_DOCUMENTED_RETURN_EXCEPTION', 0);
    return review('GOODS_RETURN_ELIGIBILITY_REVIEW');
  }
  if (input.cause === 'NO_SHOW') {
    if (noShowAt === null || noShowAt > requestedAt) return review('NO_SHOW_EVIDENCE_REQUIRED');
    if (snapshot.kind === 'RENTAL') return review('RENTAL_NO_SHOW_POLICY_REVIEW');
    return commercial(`${snapshot.kind}_VERIFIED_NO_SHOW`, 0);
  }
  if (snapshot.kind === 'TRIP') {
    if (closedAt !== null && closedAt <= requestedAt) return commercial('TRIP_CLOSED', 0);
    const beforeDeparture = scheduledAt! - requestedAt;
    if (beforeDeparture >= 48 * HOUR_MS) return commercial('TRIP_AT_LEAST_48_HOURS', 10_000);
    if (beforeDeparture > 0) return commercial('TRIP_WITHIN_48_HOURS', 5_000);
    return review('TRIP_AFTER_DEPARTURE_ATTENDANCE_REVIEW');
  }
  if (snapshot.kind === 'COURSE') {
    if (startedAt !== null && startedAt <= requestedAt) return commercial('COURSE_VOLUNTARY_WITHDRAWAL_AFTER_START', 0);
    if (snapshot.version === COURSE_REFUND_POLICY_VERSION && evidence.serviceStartedAt === null && requestedAt < scheduledAt!) {
      return scheduledAt! - requestedAt >= 48 * HOUR_MS
        ? commercial('COURSE_AT_LEAST_48_HOURS', 7_500)
        : commercial('COURSE_WITHIN_48_HOURS', 0);
    }
    return review(statutoryUnresolved ? 'STATUTORY_ENTITLEMENT_REVIEW' : 'COURSE_PRESTART_CHARGE_NOT_ADOPTED');
  }
  if (handoverAt !== null && handoverAt <= requestedAt) return commercial('RENTAL_VOLUNTARY_RETURN_AFTER_HANDOVER', 0);
  if (evidence.handoverAt === undefined) return review('RENTAL_HANDOVER_STATE_REQUIRED');
  const beforeHandover = scheduledAt! - requestedAt;
  if (beforeHandover >= 24 * HOUR_MS) return commercial('RENTAL_AT_LEAST_24_HOURS', 10_000);
  if (beforeHandover > 0) return commercial('RENTAL_WITHIN_24_HOURS', 7_500);
  return review('RENTAL_PAST_SCHEDULE_HANDOVER_REVIEW');
}
