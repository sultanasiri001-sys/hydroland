import { createHash } from 'node:crypto';
import { tripBookingPaymentRequirement } from './trip-booking-contract';

type JsonRecord = Record<string, unknown>;
const object = (value: unknown): JsonRecord | null => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : object(value) ? Object.fromEntries(Object.keys(value as JsonRecord).sort().map(key => [key, canonical((value as JsonRecord)[key])])) : value;
export const entitlementContractHash = (snapshot: unknown): string => createHash('sha256').update(JSON.stringify(canonical(snapshot)) ?? 'null').digest('hex');
const minor = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647;
const identifiers = (value: unknown): value is string[] => Array.isArray(value) && value.every(id => typeof id === 'string' && id.length > 0) && new Set(value).size === value.length;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.trim() === value;
const sameIdentifiers = (left: unknown, right: string[]): boolean => identifiers(left) && left.length === right.length && left.every(id => right.includes(id));
// Customer acceptance adds evidence without changing the original commercial terms.
const originalTerms = (value: unknown) => {
  const record = object(value);
  return record ? Object.fromEntries(Object.entries(record).filter(([key]) => !['termsAcceptanceStatus', 'termsAcceptedAt', 'acceptedQuoteHash'].includes(key))) : null;
};

export interface CenterTripEntitlementInput {
  organizationId: string;
  booking: { id: string; tripId: string; accountId: string; organizationId: string | null; status: string; seats: number; contractSnapshot: unknown };
  tripStatus: string;
  participantIds: string[];
  payment: {
    id: string; bookingId: string; accountId: string; status: string; amountMinor: number; currency: string;
    refundedAmountMinor: number; providerReference: string | null; moyasarPaymentId: string | null; contractSnapshot: unknown;
  } | null;
  ambiguousPayment: boolean;
  pendingRefund: boolean;
  collection: {
    id: string; organizationId: string; referenceType: string; referenceId: string; type: string; status: string;
    amountMinor: number; currency: string; accountOrganizationId: string; accountCurrency: string;
    accountActive: boolean; approvalAndPostingVerified: boolean;
  } | null;
  ambiguousCollection: boolean;
  completion: { id: string; tripId: string; occurredAt: string; attendedParticipantIds: unknown; absentParticipantIds: unknown } | null;
  allocation: {
    evidenceId: string; ownerVerified: boolean; organizationId: string; bookingId: string; paymentId: string;
    completionEventId: string; contractHash: string; currency: string; grossAmountMinor: number;
    commissionAmountMinor: number; otherDeductionsMinor: number; netAmountMinor: number; financeAccountId: string;
    occurredAt: string; participantIds: unknown; completedParticipantIds: unknown; allocationEvidenceHash: string;
  } | null;
  existingSettlement: { id: string; status: string; amountMinor: number; currency: string } | null;
  ambiguousSettlement: boolean;
  observedAt: string;
}

export interface CenterTripEntitlementReadiness {
  bookingId: string;
  tripId: string;
  currency: 'SAR';
  grossReadiness: 'ELIGIBLE' | 'BLOCKED';
  completedQuantity: number;
  totalQuantity: number;
  eligibleGrossAmountMinor: number;
  unperformedGrossAmountMinor: number | null;
  netPayoutAmountMinor: number | null;
  commissionAmountMinor: number | null;
  otherDeductionsMinor: number | null;
  payoutReadiness: 'REVIEW_REQUIRED' | 'READY_FOR_LEDGER_PREPARATION' | 'ALREADY_PREPARED';
  canPrepareSettlement: boolean;
  blockers: string[];
  reviewReasons: string[];
  paymentId: string | null;
  completionEventId: string | null;
  collectionFinanceEntryId: string | null;
  allocationApprovalEventId: string | null;
  settlementFinanceEntryId: string | null;
  settlementLedgerStatus: string | null;
  contractHash: string;
  allocationEvidenceHash: string;
  financialActionExecuted: false;
  bankTransferExecuted: false;
  bankExecutionReadiness: 'PROVIDER_ROUTE_AND_EXECUTION_CONFIRMATION_REQUIRED';
}

/**
 * Per-booking earned gross is distinct from a net transfer. No-show retention
 * and other bookings on a combined invoice never become performed services.
 * Allocation fields are accepted only from a separately verified owner event.
 */
export function evaluateCenterTripEntitlement(input: CenterTripEntitlementInput): CenterTripEntitlementReadiness {
  const blockers: string[] = [], reviewReasons: string[] = [];
  const { booking, payment, collection, completion, allocation } = input;
  const contract = object(booking.contractSnapshot), issuer = object(contract?.issuer);
  const requirement = tripBookingPaymentRequirement(booking);
  const contractHash = entitlementContractHash(booking.contractSnapshot);
  if (requirement.source !== 'SNAPSHOT' || issuer?.organizationId !== input.organizationId) blockers.push('BOUND_PROVIDER_CONTRACT_REQUIRED');
  if (booking.status !== 'CONFIRMED') blockers.push('CONFIRMED_BOOKING_REQUIRED');
  if (input.tripStatus !== 'COMPLETED') blockers.push('TRIP_NOT_COMPLETED');
  if (!identifiers(input.participantIds) || input.participantIds.length !== booking.seats) blockers.push('BOOKING_ROSTER_REVIEW_REQUIRED');
  if (input.ambiguousPayment) blockers.push('MULTIPLE_COLLECTED_PAYMENTS_REVIEW_REQUIRED');
  if (!payment || payment.bookingId !== booking.id || payment.accountId !== booking.accountId
    || payment.status !== 'CAPTURED' || payment.currency !== 'SAR' || !minor(payment.amountMinor)
    || payment.amountMinor !== requirement.requiredAmountMinor || !identifier(payment.providerReference) || !identifier(payment.moyasarPaymentId)) blockers.push('VERIFIED_COLLECTION_REQUIRED');
  if (payment && (tripBookingPaymentRequirement({ ...booking, contractSnapshot: payment.contractSnapshot }).source !== 'SNAPSHOT'
    || entitlementContractHash(originalTerms(payment.contractSnapshot)) !== entitlementContractHash(originalTerms(booking.contractSnapshot)))) {
    blockers.push('PAYMENT_ORIGINAL_CONTRACT_BINDING_REQUIRED');
  }
  if (payment && (!minor(payment.refundedAmountMinor) || payment.refundedAmountMinor > 0)) blockers.push('REFUND_ALLOCATION_REVIEW_REQUIRED');
  if (input.pendingRefund) blockers.push('PENDING_REFUND_REQUIRES_RECONCILIATION');
  if (input.ambiguousCollection) blockers.push('DUPLICATE_COLLECTION_LEDGER_REVIEW_REQUIRED');
  if (!collection || !payment || collection.organizationId !== input.organizationId || collection.accountOrganizationId !== input.organizationId
    || collection.referenceType !== 'TRIP_PAYMENT_COLLECTION' || collection.referenceId !== payment.id
    || collection.type !== 'REVENUE' || collection.status !== 'POSTED' || !collection.accountActive
    || collection.currency !== 'SAR' || collection.accountCurrency !== 'SAR' || collection.amountMinor !== payment.amountMinor
    || !collection.approvalAndPostingVerified) blockers.push('POSTED_COLLECTION_LEDGER_REQUIRED');
  let completedQuantity = 0;
  let completedParticipantIds: string[] = [];
  const observed = Date.parse(input.observedAt), completedAt = completion ? Date.parse(completion.occurredAt) : NaN;
  const startsAt = Date.parse(String(object(contract?.originalSchedule)?.startsAt ?? ''));
  if (!completion || completion.tripId !== booking.tripId || !Number.isFinite(observed) || !Number.isFinite(completedAt)
    || !Number.isFinite(startsAt) || completedAt < startsAt || completedAt > observed
    || !identifiers(completion.attendedParticipantIds) || !identifiers(completion.absentParticipantIds)) {
    blockers.push('ACTUAL_COMPLETION_ATTENDANCE_REQUIRED');
  } else {
    const attended = new Set(completion.attendedParticipantIds), absent = new Set(completion.absentParticipantIds);
    if ([...attended].some(id => absent.has(id)) || input.participantIds.some(id => !attended.has(id) && !absent.has(id))) {
      blockers.push('CONTRADICTORY_OR_INCOMPLETE_ATTENDANCE');
    } else {
      completedParticipantIds = input.participantIds.filter(id => attended.has(id));
      completedQuantity = completedParticipantIds.length;
    }
  }
  if (completedQuantity === 0) blockers.push('NO_PERFORMED_SERVICE_FOR_THIS_BOOKING');
  const unitPrice = typeof contract?.unitPriceMinor === 'number' && minor(contract.unitPriceMinor) ? contract.unitPriceMinor : null;
  const performedGross = unitPrice === null ? 0 : unitPrice * completedQuantity;
  const unperformedGross = unitPrice === null || !Number.isSafeInteger(booking.seats) ? null : unitPrice * (booking.seats - completedQuantity);
  if (!minor(performedGross) || performedGross === 0 || (payment && performedGross > payment.amountMinor)) blockers.push('ELIGIBLE_GROSS_AMOUNT_REVIEW_REQUIRED');
  if (input.ambiguousSettlement) blockers.push('DUPLICATE_SETTLEMENT_LEDGER_REVIEW_REQUIRED');
  // A preview token binds an owner decision to current source evidence, while
  // excluding wall-clock observation time and the decision being replaced.
  const allocationEvidenceHash = entitlementContractHash({
    organizationId: input.organizationId, bookingId: booking.id, accountId: booking.accountId, tripId: booking.tripId,
    bookingStatus: booking.status, tripStatus: input.tripStatus, contractHash,
    participantIds: [...input.participantIds].sort(), payment: payment ? {
      id: payment.id, bookingId: payment.bookingId, accountId: payment.accountId, status: payment.status,
      amountMinor: payment.amountMinor, currency: payment.currency, refundedAmountMinor: payment.refundedAmountMinor,
      providerReference: payment.providerReference, moyasarPaymentId: payment.moyasarPaymentId,
      originalTermsHash: entitlementContractHash(originalTerms(payment.contractSnapshot)),
    } : null,
    collection, completion: completion ? { id: completion.id, tripId: completion.tripId, occurredAt: completion.occurredAt,
      attendedParticipantIds: identifiers(completion.attendedParticipantIds) ? [...completion.attendedParticipantIds].sort() : null,
      absentParticipantIds: identifiers(completion.absentParticipantIds) ? [...completion.absentParticipantIds].sort() : null } : null,
    pendingRefund: input.pendingRefund, ambiguousPayment: input.ambiguousPayment, ambiguousCollection: input.ambiguousCollection,
    performedGross, completedParticipantIds: [...completedParticipantIds].sort(),
  });
  let net: number | null = null, commission: number | null = null, deductions: number | null = null;
  if (!allocation) reviewReasons.push('OWNER_APPROVED_ALLOCATION_REQUIRED');
  else if (!allocation.ownerVerified || !identifier(allocation.evidenceId) || allocation.organizationId !== input.organizationId || allocation.bookingId !== booking.id
    || allocation.paymentId !== payment?.id || allocation.completionEventId !== completion?.id || allocation.contractHash !== contractHash
    || allocation.allocationEvidenceHash !== allocationEvidenceHash || allocation.currency !== 'SAR' || allocation.grossAmountMinor !== performedGross
    || !Number.isFinite(Date.parse(allocation.occurredAt)) || Date.parse(allocation.occurredAt) < completedAt || Date.parse(allocation.occurredAt) > observed
    || !sameIdentifiers(allocation.participantIds, input.participantIds) || !sameIdentifiers(allocation.completedParticipantIds, completedParticipantIds)
    || !minor(allocation.commissionAmountMinor) || !minor(allocation.otherDeductionsMinor) || !minor(allocation.netAmountMinor)
    || allocation.netAmountMinor + allocation.commissionAmountMinor + allocation.otherDeductionsMinor !== performedGross
    || !identifier(allocation.financeAccountId)) reviewReasons.push('OWNER_ALLOCATION_EVIDENCE_MISMATCH');
  else {
    net = allocation.netAmountMinor; commission = allocation.commissionAmountMinor; deductions = allocation.otherDeductionsMinor;
    if (net === 0) reviewReasons.push('NO_POSITIVE_NET_SETTLEMENT_AMOUNT');
  }
  if (input.existingSettlement) reviewReasons.push('EXISTING_SETTLEMENT_REQUIRES_CURRENT_RECONCILIATION');
  const grossEligible = blockers.length === 0;
  const canPrepareSettlement = grossEligible && reviewReasons.length === 0 && net !== null && net > 0 && !input.existingSettlement;
  return {
    bookingId: booking.id, tripId: booking.tripId, currency: 'SAR', grossReadiness: grossEligible ? 'ELIGIBLE' : 'BLOCKED',
    completedQuantity, totalQuantity: booking.seats, eligibleGrossAmountMinor: grossEligible ? performedGross : 0,
    unperformedGrossAmountMinor: minor(unperformedGross) ? unperformedGross : null,
    netPayoutAmountMinor: grossEligible ? net : null, commissionAmountMinor: commission, otherDeductionsMinor: deductions,
    payoutReadiness: input.existingSettlement ? 'ALREADY_PREPARED' : canPrepareSettlement ? 'READY_FOR_LEDGER_PREPARATION' : 'REVIEW_REQUIRED',
    canPrepareSettlement, blockers: [...new Set(blockers)], reviewReasons,
    paymentId: payment?.id ?? null, completionEventId: completion?.id ?? null,
    collectionFinanceEntryId: collection?.id ?? null, allocationApprovalEventId: allocation?.evidenceId ?? null,
    settlementFinanceEntryId: input.existingSettlement?.id ?? null, settlementLedgerStatus: input.existingSettlement?.status ?? null,
    contractHash, allocationEvidenceHash, financialActionExecuted: false, bankTransferExecuted: false,
    bankExecutionReadiness: 'PROVIDER_ROUTE_AND_EXECUTION_CONFIRMATION_REQUIRED',
  };
}
