import { createCommerceContractSnapshot, CommerceIssuerSource, COMMERCE_CONTRACT_SNAPSHOT_VERSION } from './commerce-contract-snapshot';
import { createRefundPolicySnapshot } from './commerce-refund-policy';

export interface CapturedTripPrice {
  pricePerSeatMinor: number;
  currency: 'SAR';
  configured: boolean;
}

interface TripBookingContractInput {
  bookingId: string;
  accountId: string;
  buyerOrganizationId: string | null;
  seats: number;
  createdAt: Date;
  price: CapturedTripPrice;
  trip: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    organizationId: string | null;
    organization: CommerceIssuerSource | null;
  };
}

/** Called inside the booking transaction, before the new booking is inserted. */
export function captureTripBookingContract(input: TripBookingContractInput) {
  const { bookingId, accountId, buyerOrganizationId, seats, createdAt, price, trip } = input;
  const total = price.pricePerSeatMinor * seats;
  if (!price.configured || !Number.isSafeInteger(total) || total > 2_147_483_647) {
    // An unpriced reservation was already allowed. Preserve that workflow,
    // explicitly withholding financial terms rather than fabricating a zero price.
    return Object.freeze({
      version: COMMERCE_CONTRACT_SNAPSHOT_VERSION,
      source: Object.freeze({ kind: 'TRIP_BOOKING', id: bookingId, parentId: null, offeringId: trip.id }),
      customerAccountId: accountId,
      buyerOrganizationId,
      kind: 'TRIP',
      quantity: seats,
      unitPriceMinor: null,
      amountMinor: null,
      currency: 'SAR',
      recordedAt: createdAt.toISOString(),
      originalSchedule: Object.freeze({ startsAt: trip.startsAt.toISOString(), endsAt: trip.endsAt.toISOString() }),
      issuer: Object.freeze({ organizationId: trip.organizationId }),
      termsAcceptanceStatus: 'NOT_RECORDED',
      refundPolicy: Object.freeze({ status: 'REVIEW_REQUIRED', reasonCode: 'TRIP_PRICE_NOT_CONFIGURED_AT_BOOKING', snapshot: null }),
      financialActionExecuted: false,
    });
  }
  const contract = createCommerceContractSnapshot({
    sourceKind: 'TRIP_BOOKING', sourceId: bookingId, parentId: null, offeringId: trip.id,
    customerAccountId: accountId, organizationId: trip.organizationId, organization: trip.organization,
    kind: 'TRIP', title: trip.title, quantity: seats, unitPriceMinor: price.pricePerSeatMinor,
    currency: price.currency, recordedAt: createdAt.toISOString(),
    originalStartsAt: trip.startsAt.toISOString(), originalEndsAt: trip.endsAt.toISOString(),
  });
  return Object.freeze({ ...contract, buyerOrganizationId });
}

/** Replays display the saved contract price; current catalog prices are irrelevant. */
export function capturedTripPrice(snapshot: unknown): CapturedTripPrice {
  const unknownPrice: CapturedTripPrice = { pricePerSeatMinor: 0, currency: 'SAR', configured: false };
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return unknownPrice;
  const record = snapshot as Record<string, unknown>;
  if (record.version !== COMMERCE_CONTRACT_SNAPSHOT_VERSION || record.kind !== 'TRIP' || record.currency !== 'SAR'
    || typeof record.unitPriceMinor !== 'number' || !Number.isSafeInteger(record.unitPriceMinor)
    || record.unitPriceMinor < 0 || record.unitPriceMinor > 2_147_483_647
    || typeof record.quantity !== 'number' || !Number.isSafeInteger(record.quantity) || record.quantity < 1
    || typeof record.amountMinor !== 'number' || !Number.isSafeInteger(record.amountMinor)
    || record.amountMinor !== record.quantity * record.unitPriceMinor || record.amountMinor > 2_147_483_647) return unknownPrice;
  return { pricePerSeatMinor: record.unitPriceMinor, currency: 'SAR', configured: true };
}

interface BookingPriceSource {
  id: string;
  tripId: string;
  accountId: string;
  seats: number;
  organizationId?: string | null;
  contractSnapshot?: unknown;
}

export interface TripBookingPaymentRequirement {
  bookingId: string;
  accountId: string;
  requiredAmountMinor: number | null;
  currency: 'SAR';
  source: 'SNAPSHOT' | 'LEGACY_PRICE' | 'REVIEW_REQUIRED';
  reasonCode: string | null;
  providerEvidenceRequired: boolean;
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** A present but invalid snapshot must never fall back to today's mutable price. */
export function tripBookingPaymentRequirement(booking: BookingPriceSource, legacyPrice?: unknown): TripBookingPaymentRequirement {
  const base = { bookingId: booking.id, accountId: booking.accountId, currency: 'SAR' as const };
  const review = (reasonCode: string): TripBookingPaymentRequirement => ({ ...base, requiredAmountMinor: null,
    source: 'REVIEW_REQUIRED', reasonCode, providerEvidenceRequired: true });
  if (booking.contractSnapshot !== null && booking.contractSnapshot !== undefined) {
    const contract = record(booking.contractSnapshot), source = record(contract?.source);
    const refundPolicy = record(contract?.refundPolicy), policy = record(refundPolicy?.snapshot);
    const originalSchedule = record(contract?.originalSchedule);
    const price = capturedTripPrice(contract);
    if (!contract || source?.kind !== 'TRIP_BOOKING' || source.id !== booking.id || source.offeringId !== booking.tripId
      || contract.customerAccountId !== booking.accountId || contract.quantity !== booking.seats
      || (contract.buyerOrganizationId ?? null) !== (booking.organizationId ?? null)
      || !price.configured || refundPolicy?.status !== 'RECORDED'
      || policy?.version !== COMMERCE_CONTRACT_SNAPSHOT_VERSION || policy.lineId !== booking.id || policy.kind !== 'TRIP'
      || policy.currency !== 'SAR' || policy.grossAmountMinor !== contract.amountMinor
      || policy.contractedAt !== contract.recordedAt || policy.contractedScheduledAt !== originalSchedule?.startsAt
      || policy.calendarTimeZone !== 'Asia/Riyadh') return review('ORIGINAL_CONTRACT_PRICE_REVIEW_REQUIRED');
    try {
      const validated = createRefundPolicySnapshot({ lineId: booking.id, kind: 'TRIP', currency: 'SAR',
        grossAmountMinor: contract.amountMinor as number, contractedAt: policy.contractedAt as string,
        contractedScheduledAt: policy.contractedScheduledAt as string });
      if (validated.contractedAt !== contract.recordedAt || validated.contractedScheduledAt !== originalSchedule?.startsAt) {
        return review('ORIGINAL_CONTRACT_PRICE_REVIEW_REQUIRED');
      }
    } catch {
      return review('ORIGINAL_CONTRACT_PRICE_REVIEW_REQUIRED');
    }
    return { ...base, requiredAmountMinor: contract.amountMinor as number, source: 'SNAPSHOT', reasonCode: null, providerEvidenceRequired: true };
  }
  const price = record(legacyPrice);
  if (!price || typeof price.pricePerSeatMinor !== 'number' || !Number.isSafeInteger(price.pricePerSeatMinor)
    || price.pricePerSeatMinor < 0 || typeof price.currency !== 'string' || price.currency.trim().toUpperCase() !== 'SAR') return review('LEGACY_PRICE_NOT_CONFIGURED');
  const requiredAmountMinor = price.pricePerSeatMinor * booking.seats;
  if (!Number.isSafeInteger(requiredAmountMinor) || requiredAmountMinor < 0 || requiredAmountMinor > 2_147_483_647) return review('LEGACY_PRICE_INVALID');
  return { ...base, requiredAmountMinor, source: 'LEGACY_PRICE', reasonCode: 'ORIGINAL_CONTRACT_SNAPSHOT_MISSING', providerEvidenceRequired: false };
}

export interface TripCapturedPaymentEvidence {
  bookingId: string;
  accountId: string;
  status: string;
  amountMinor: number;
  currency: string;
  refundedAmountMinor?: number;
  providerReference?: string | null;
  moyasarPaymentId?: string | null;
  refundOperations?: Array<{ status: string }>;
}

/** This checks payment evidence; it does not confirm the booking or post money. */
export function satisfiesTripBookingPayment(payment: TripCapturedPaymentEvidence, requirement: TripBookingPaymentRequirement): boolean {
  const required = requirement.requiredAmountMinor;
  if (required === null || payment.bookingId !== requirement.bookingId || payment.accountId !== requirement.accountId
    || payment.status !== 'CAPTURED' || payment.currency !== requirement.currency
    || !Number.isSafeInteger(payment.amountMinor) || payment.amountMinor !== required) return false;
  const refunded = payment.refundedAmountMinor === undefined && !requirement.providerEvidenceRequired ? 0 : payment.refundedAmountMinor;
  if (typeof refunded !== 'number' || !Number.isSafeInteger(refunded) || refunded < 0
    || refunded > payment.amountMinor || payment.amountMinor - refunded < required) return false;
  if (payment.refundOperations?.some(operation => ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'].includes(operation.status))) return false;
  if (requirement.providerEvidenceRequired && [payment.providerReference, payment.moyasarPaymentId]
    .some(value => typeof value !== 'string' || !value.trim() || value.trim() !== value)) return false;
  return true;
}
