'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const compiled = process.env.COMMERCE_ENTITLEMENT_MODULE_ROOT || path.join(__dirname, '../dist');
const { evaluateCenterTripEntitlement, entitlementContractHash } = require(path.join(compiled, 'commerce/center-service-entitlement.js'));
const { captureTripBookingContract } = require(path.join(compiled, 'commerce/trip-booking-contract.js'));

function fixture() {
  const snapshot = captureTripBookingContract({ bookingId: 'booking', accountId: 'customer', buyerOrganizationId: null,
    seats: 2, createdAt: new Date('2026-11-01T09:00:00Z'), price: { pricePerSeatMinor: 5750, currency: 'SAR', configured: true },
    trip: { id: 'trip', title: 'Synthetic trip', organizationId: 'center', organization: { id: 'center', displayName: 'Synthetic center' },
      startsAt: new Date('2026-11-10T09:00:00Z'), endsAt: new Date('2026-11-10T15:00:00Z') } });
  return {
    organizationId: 'center', booking: { id: 'booking', tripId: 'trip', accountId: 'customer', organizationId: null,
      status: 'CONFIRMED', seats: 2, contractSnapshot: snapshot }, tripStatus: 'COMPLETED', participantIds: ['attendee', 'no-show'],
    payment: { id: 'payment', bookingId: 'booking', accountId: 'customer', status: 'CAPTURED', amountMinor: 11500,
      currency: 'SAR', refundedAmountMinor: 0, providerReference: 'provider-invoice', moyasarPaymentId: 'provider-payment',
      contractSnapshot: { ...snapshot, termsAcceptanceStatus: 'ACCEPTED', termsAcceptedAt: '2026-11-01T10:00:00Z', acceptedQuoteHash: 'acceptance-evidence' } },
    ambiguousPayment: false, pendingRefund: false,
    collection: { id: 'collection', organizationId: 'center', referenceType: 'TRIP_PAYMENT_COLLECTION', referenceId: 'payment',
      type: 'REVENUE', status: 'POSTED', amountMinor: 11500, currency: 'SAR', accountOrganizationId: 'center', accountCurrency: 'SAR',
      accountActive: true, approvalAndPostingVerified: true }, ambiguousCollection: false,
    completion: { id: 'completion', tripId: 'trip', occurredAt: '2026-11-10T15:00:00Z',
      attendedParticipantIds: ['attendee', 'different-booking-person'], absentParticipantIds: ['no-show'] },
    allocation: null, existingSettlement: null, ambiguousSettlement: false, observedAt: '2026-11-11T12:00:00Z',
  };
}

function allocation(input) {
  return { evidenceId: 'approval', ownerVerified: true, organizationId: 'center', bookingId: 'booking', paymentId: 'payment',
    completionEventId: 'completion', contractHash: entitlementContractHash(input.booking.contractSnapshot), currency: 'SAR',
    grossAmountMinor: 5750, commissionAmountMinor: 575, otherDeductionsMinor: 25, netAmountMinor: 5150,
    financeAccountId: 'settlement-account', occurredAt: '2026-11-11T09:00:00Z', participantIds: ['no-show', 'attendee'],
    completedParticipantIds: ['attendee'], allocationEvidenceHash: evaluateCenterTripEntitlement(input).allocationEvidenceHash };
}

test('only the actually attended part earns collected VAT-inclusive gross; no commission is invented', () => {
  const input = fixture(), result = evaluateCenterTripEntitlement(input);
  assert.equal(result.grossReadiness, 'ELIGIBLE');
  assert.equal(result.completedQuantity, 1); assert.equal(result.eligibleGrossAmountMinor, 5750);
  assert.equal(result.unperformedGrossAmountMinor, 5750);
  assert.equal(result.netPayoutAmountMinor, null); assert.equal(result.commissionAmountMinor, null);
  assert.equal(result.payoutReadiness, 'REVIEW_REQUIRED'); assert.equal(result.canPrepareSettlement, false);
  assert.deepEqual(result.reviewReasons, ['OWNER_APPROVED_ALLOCATION_REQUIRED']);
  input.completion.attendedParticipantIds = ['different-booking-person'];
  input.completion.absentParticipantIds = input.participantIds;
  const unperformed = evaluateCenterTripEntitlement(input);
  assert.equal(unperformed.eligibleGrossAmountMinor, 0);
  assert(unperformed.blockers.includes('NO_PERFORMED_SERVICE_FOR_THIS_BOOKING'));
});

test('explicit owner allocation binds every amount and completed participant without executing a transfer', () => {
  const input = fixture(); input.allocation = allocation(input);
  const result = evaluateCenterTripEntitlement(input);
  assert.equal(result.canPrepareSettlement, true); assert.equal(result.netPayoutAmountMinor, 5150);
  assert.equal(result.commissionAmountMinor, 575); assert.equal(result.otherDeductionsMinor, 25);
  assert.equal(result.financialActionExecuted, false); assert.equal(result.bankTransferExecuted, false);
  assert.equal(result.bankExecutionReadiness, 'PROVIDER_ROUTE_AND_EXECUTION_CONFIRMATION_REQUIRED');
});

test('payment acceptance may add evidence; it cannot replace the saved original schedule, supplier or price', () => {
  for (const mutate of [
    snapshot => { snapshot.originalSchedule.startsAt = '2026-11-10T10:00:00.000Z'; snapshot.refundPolicy.snapshot.contractedScheduledAt = snapshot.originalSchedule.startsAt; },
    snapshot => { snapshot.issuer.organizationId = 'another-center'; },
    snapshot => { snapshot.unitPriceMinor = 6000; snapshot.amountMinor = 12000; snapshot.refundPolicy.snapshot.grossAmountMinor = 12000; },
  ]) {
    const input = fixture(); input.payment.contractSnapshot = structuredClone(input.payment.contractSnapshot);
    mutate(input.payment.contractSnapshot);
    assert(evaluateCenterTripEntitlement(input).blockers.includes('PAYMENT_ORIGINAL_CONTRACT_BINDING_REQUIRED'));
  }
  const input = fixture(); input.booking.contractSnapshot = undefined;
  assert.doesNotThrow(() => evaluateCenterTripEntitlement(input));
  assert.equal(evaluateCenterTripEntitlement(input).canPrepareSettlement, false);
});

test('missing, future, foreign or contradictory completion evidence cannot turn retained money into work', () => {
  const changes = [
    input => { input.completion = null; }, input => { input.tripStatus = 'CLOSED'; },
    input => { input.completion.tripId = 'another-trip'; },
    input => { input.completion.occurredAt = '2026-11-12T15:00:00Z'; },
    input => { input.completion.absentParticipantIds.push('attendee'); },
    input => { input.participantIds = ['replacement-person', 'no-show']; },
    input => { input.participantIds = ['attendee', 'attendee']; },
  ];
  for (const mutate of changes) {
    const input = fixture(); mutate(input); const result = evaluateCenterTripEntitlement(input);
    assert.equal(result.grossReadiness, 'BLOCKED'); assert.equal(result.eligibleGrossAmountMinor, 0);
  }
});

test('verified collection remains scoped to this payment and excludes refunds, ambiguity and unposted ledgers', () => {
  for (const mutate of [
    input => { input.payment.bookingId = 'different-booking'; }, input => { input.payment.accountId = 'different-customer'; },
    input => { input.payment.providerReference = null; }, input => { input.payment.refundedAmountMinor = 1; },
    input => { input.pendingRefund = true; }, input => { input.ambiguousPayment = true; },
    input => { input.collection.status = 'APPROVED'; }, input => { input.collection.referenceId = 'different-payment'; },
    input => { input.collection.accountOrganizationId = 'another-center'; },
    input => { input.collection.approvalAndPostingVerified = false; }, input => { input.ambiguousCollection = true; },
  ]) {
    const input = fixture(); input.allocation = allocation(input); mutate(input);
    const result = evaluateCenterTripEntitlement(input);
    assert.equal(result.grossReadiness, 'BLOCKED'); assert.equal(result.netPayoutAmountMinor, null); assert.equal(result.canPrepareSettlement, false);
  }
});

test('stale or malformed allocation evidence returns review and never defaults commission to zero', () => {
  for (const mutate of [
    evidence => { evidence.ownerVerified = false; }, evidence => { delete evidence.commissionAmountMinor; },
    evidence => { evidence.netAmountMinor += 1; }, evidence => { evidence.netAmountMinor = 5150.5; },
    evidence => { evidence.contractHash = 'old-contract'; }, evidence => { evidence.completionEventId = 'old-completion'; },
    evidence => { evidence.participantIds = ['old-person', 'no-show']; },
    evidence => { evidence.completedParticipantIds = ['no-show']; }, evidence => { evidence.financeAccountId = 5; },
    evidence => { evidence.occurredAt = '2026-11-09T12:00:00Z'; },
  ]) {
    const input = fixture(); input.allocation = allocation(input); mutate(input.allocation);
    const result = evaluateCenterTripEntitlement(input);
    assert.equal(result.grossReadiness, 'ELIGIBLE'); assert.equal(result.netPayoutAmountMinor, null);
    assert.deepEqual(result.reviewReasons, ['OWNER_ALLOCATION_EVIDENCE_MISMATCH']); assert.equal(result.canPrepareSettlement, false);
  }
});

test('settlement history, including rejected or voided entries, does not authorize a second preparation', () => {
  for (const status of ['PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REJECTED', 'VOIDED']) {
    const input = fixture(); input.allocation = allocation(input);
    input.existingSettlement = { id: 'existing', status, amountMinor: 5150, currency: 'SAR' };
    const result = evaluateCenterTripEntitlement(input);
    assert.equal(result.canPrepareSettlement, false); assert.equal(result.settlementFinanceEntryId, 'existing');
    assert.equal(result.payoutReadiness, 'ALREADY_PREPARED'); assert.equal(result.bankTransferExecuted, false);
  }
});

test('contract proof is stable across JSONB object-key ordering and preserves array order', () => {
  assert.equal(entitlementContractHash({ b: { z: 1, a: 2 }, a: [1, 2] }), entitlementContractHash({ a: [1, 2], b: { a: 2, z: 1 } }));
  assert.notEqual(entitlementContractHash([1, 2]), entitlementContractHash([2, 1]));
});
