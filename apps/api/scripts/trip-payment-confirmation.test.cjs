'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const compiled = process.env.COMMERCE_BOOKING_MODULE_ROOT || path.join(__dirname, '../dist');
const { PaymentConfirmationGuard } = require(path.join(compiled, 'trips/payment-confirmation.guard.js'));
const { BookingManagementService } = require(path.join(compiled, 'trips/booking-management.service.js'));
const { captureTripBookingContract, tripBookingPaymentRequirement, satisfiesTripBookingPayment } = require(path.join(compiled, 'commerce/trip-booking-contract.js'));

global.fetch = () => { throw new Error('Network is forbidden in payment confirmation tests'); };

function fixture({ legacy = false, organizationId = null, paymentMode = 'ENABLED' } = {}) {
  const now = new Date(), start = new Date(now.getTime() + 20 * 86_400_000), end = new Date(start.getTime() + 86_400_000);
  const trip = { id: 'trip-1', title: 'Frozen quote', type: 'SHORE', status: 'OPEN', startsAt: start, endsAt: end,
    capacity: 10, updatedAt: now, organizationId: 'center-1', organization: { id: 'center-1', displayName: 'Supplying center' } };
  const snapshot = captureTripBookingContract({ bookingId: 'booking-1', accountId: 'buyer-1', buyerOrganizationId: organizationId,
    seats: 2, createdAt: now, price: { pricePerSeatMinor: 5_750, currency: 'SAR', configured: true }, trip });
  const state = {
    booking: { id: 'booking-1', tripId: trip.id, accountId: 'buyer-1', organizationId, seats: 2, status: 'PENDING',
      createdAt: now, updatedAt: now, contractSnapshot: legacy ? null : structuredClone(snapshot), trip,
      account: { person: { firstName: 'Fixture', lastName: 'Buyer' } } },
    payment: { id: 'payment-1', bookingId: 'booking-1', accountId: 'buyer-1', status: 'CAPTURED',
      amountMinor: 11_500, currency: 'SAR', refundedAmountMinor: 0,
      providerReference: 'PRIVATE_INVOICE_ID', moyasarPaymentId: 'PRIVATE_PROVIDER_PAYMENT_ID', updatedAt: now, refundOperations: [] },
    price: { pricePerSeatMinor: 5_750, currency: 'SAR' }, priceReads: 0, paymentReads: [], writes: 0,
  };
  const clone = value => structuredClone(value);
  const tx = {
    account: { findFirst: async () => ({ id: 'buyer-1', status: 'ACTIVE' }) },
    roleAssignment: { findFirst: async () => ({ id: 'admin-role' }) },
    booking: { findFirst: async () => clone(state.booking), aggregate: async () => ({ _sum: { seats: 0 } }),
      updateMany: async () => { state.writes++; throw new Error('Unexpected booking write'); } },
    payment: {
      findFirst: async input => { state.paymentReads.push(input); return clone(state.payment); },
      findMany: async () => state.payment ? [clone(state.payment)] : [],
    },
    operationalSetting: { findUnique: async () => {
      state.priceReads++;
      if (!legacy) throw new Error('New contracts must not read mutable catalog prices');
      return { value: clone(state.price), updatedAt: now };
    } },
    bookingParticipant: { findMany: async () => [
      { id: 'p1', fullName: 'One', eligibilityStatus: 'ELIGIBLE', certificationTitle: 'Fixture', updatedAt: now },
      { id: 'p2', fullName: 'Two', eligibilityStatus: 'ELIGIBLE', certificationTitle: 'Fixture', updatedAt: now },
    ] },
    calendarEvent: { findUnique: async () => null },
    safetyChecklist: { findFirst: async () => ({ id: 'safety', decision: 'ALLOWED', updatedAt: now }) },
    auditEvent: { findFirst: async () => null },
  };
  const db = { ...tx, serializable: async callback => callback(tx) };
  const policies = { decision: async category => {
    const state = category === 'PAYMENT' ? paymentMode : 'ENABLED';
    return { state, bypass: state === 'DISABLED', review: state === 'OPTIONAL', enforce: state === 'ENABLED' };
  } };
  const weather = { settings: async () => ({ enabled: false }), evaluateReview: () => ({ blocking: false, decision: 'ALLOW' }) };
  const reviews = { latest: async () => null };
  const context = { switchToHttp: () => ({ getRequest: () => ({ params: { id: 'trip-1', bookingId: 'booking-1' } }) }) };
  return { state, context, guard: new PaymentConfirmationGuard(db, policies),
    management: new BookingManagementService(db, {}, policies, weather, reviews, {}) };
}

test('confirmation guard uses bound original price and requires unreversed provider-backed collection', async () => {
  const { state, context, guard } = fixture();
  state.price.pricePerSeatMinor = 1;
  assert.equal(await guard.canActivate(context), true);
  assert.equal(state.priceReads, 0);
  assert.equal(state.paymentReads[0].where.amountMinor, 11_500);
  assert.equal(state.paymentReads[0].where.refundedAmountMinor, 0);
  assert.equal(state.paymentReads[0].where.accountId, 'buyer-1');
  assert.deepEqual(state.paymentReads[0].where.refundOperations.none.status.in, ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED']);
  for (const patch of [
    { refundedAmountMinor: 1 }, { refundedAmountMinor: 11_500 }, { refundedAmountMinor: -1 },
    { status: 'REFUNDED' }, { status: 'CREATED' }, { providerReference: null },
    { moyasarPaymentId: null }, { accountId: 'another-buyer' }, { bookingId: 'another-booking' },
    { amountMinor: 1 }, { currency: 'USD' },
  ]) {
    const original = state.payment;
    state.payment = { ...original, ...patch };
    await assert.rejects(() => guard.canActivate(context), error => error.getStatus?.() === 409, JSON.stringify(patch));
    state.payment = original;
  }
});

test('present corrupt or foreign contract snapshot fails without falling back to live price', async () => {
  const { state, context, guard } = fixture();
  const original = state.booking.contractSnapshot;
  for (const change of [
    { customerAccountId: 'other' }, { quantity: 1 }, { buyerOrganizationId: 'other-org' },
    { source: { ...original.source, id: 'other-booking' } },
    { source: { ...original.source, offeringId: 'other-trip' } },
    { amountMinor: 0 }, { currency: 'USD' }, { version: 'unknown' },
    { refundPolicy: { status: 'REVIEW_REQUIRED', snapshot: null } },
    { recordedAt: undefined, originalSchedule: {}, refundPolicy: { ...original.refundPolicy,
      snapshot: { ...original.refundPolicy.snapshot, contractedAt: undefined, contractedScheduledAt: undefined } } },
  ]) {
    state.booking.contractSnapshot = { ...original, ...change };
    await assert.rejects(() => guard.canActivate(context), error => error.getStatus?.() === 409);
  }
  assert.equal(state.priceReads, 0);
  assert.equal(state.paymentReads.length, 0);
});

test('legacy missing snapshot remains explicitly reviewable and does not receive retrospective policy terms', async () => {
  const { state, context, guard, management } = fixture({ legacy: true });
  state.payment.providerReference = null;
  state.payment.moyasarPaymentId = null;
  assert.equal(await guard.canActivate(context), true);
  const detail = await management.detail('admin', 'booking-1', 'admin');
  assert.equal(detail.paymentSatisfied, true);
  assert.deepEqual(detail.paymentContractReview, { source: 'LEGACY_PRICE', required: true, reasonCode: 'ORIGINAL_CONTRACT_SNAPSHOT_MISSING' });
  assert.equal(state.booking.contractSnapshot, null);
  state.payment.refundedAmountMinor = 1;
  await assert.rejects(() => guard.canActivate(context), error => error.getStatus?.() === 409);
  assert.equal((await management.detail('admin', 'booking-1', 'admin')).paymentSatisfied, false);
});

test('management preview and mutation reject partially refunded or reserved money, including stale preview race', async () => {
  const { state, management } = fixture();
  const before = await management.detail('admin', 'booking-1', 'admin');
  assert.equal(before.paymentSatisfied, true);
  assert.equal(before.requiredAmountMinor, 11_500);
  assert(before.actions.includes('CONFIRM'));
  state.payment.refundedAmountMinor = 1; // Even if updatedAt is unchanged, the state token must change.
  const after = await management.detail('admin', 'booking-1', 'admin');
  assert.equal(after.paymentSatisfied, false);
  assert(after.blockers.includes('PAYMENT_REQUIRED'));
  assert(!after.actions.includes('CONFIRM'));
  assert.notEqual(after.stateToken, before.stateToken);
  assert.equal(after.financial[0].refundedAmountMinor, 1);
  assert.equal(after.financial[0].netCollectedAmountMinor, 11_499);
  await assert.rejects(() => management.apply('admin', 'booking-1',
    { action: 'CONFIRM', requestId: randomUUID(), expectedState: before.stateToken }, 'admin'), error => error.getStatus?.() === 409);
  assert.equal(state.writes, 0);
  state.payment.refundedAmountMinor = 0;
  for (const status of ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED']) {
    state.payment.refundOperations = [{ id: 'refund-1', status, amountMinor: 500, updatedAt: new Date() }];
    const pending = await management.detail('admin', 'booking-1', 'admin');
    assert.equal(pending.paymentSatisfied, false, status);
    assert(!pending.actions.includes('CONFIRM'), status);
    assert.notEqual(pending.stateToken, before.stateToken);
  }
});

test('new confirmation snapshots remain stable after catalog price changes and expose no provider identifiers', async () => {
  const { state, management } = fixture();
  const before = await management.detail('admin', 'booking-1', 'admin');
  state.price = { pricePerSeatMinor: 999_999, currency: 'SAR' };
  const after = await management.detail('admin', 'booking-1', 'admin');
  assert.equal(after.requiredAmountMinor, 11_500);
  assert.equal(after.stateToken, before.stateToken);
  assert.equal(state.priceReads, 0);
  const serialized = JSON.stringify(after);
  for (const secret of ['PRIVATE_INVOICE_ID', 'PRIVATE_PROVIDER_PAYMENT_ID', 'accountId', 'providerReference', 'moyasarPaymentId']) {
    assert(!serialized.includes(secret), secret);
  }
  assert.equal(after.financialActionExecuted, false);
});

test('refund request or refund-policy entitlement alone cannot satisfy a chargeable booking', async () => {
  const { state, management, guard, context } = fixture();
  state.payment = null;
  const detail = await management.detail('admin', 'booking-1', 'admin');
  assert.equal(detail.paymentSatisfied, false);
  assert(!detail.actions.includes('CONFIRM'));
  assert.equal(detail.financialActionExecuted, false);
  await assert.rejects(() => guard.canActivate(context), error => error.getStatus?.() === 409);
});

test('legacy undefined refund field is compatible only with the legacy evidence path', () => {
  const { state } = fixture();
  const fresh = tripBookingPaymentRequirement(state.booking);
  const payment = { ...state.payment, refundedAmountMinor: undefined };
  assert.equal(satisfiesTripBookingPayment(payment, fresh), false);
  const legacy = tripBookingPaymentRequirement({ ...state.booking, contractSnapshot: null }, state.price);
  assert.equal(satisfiesTripBookingPayment(payment, legacy), true);
  assert.equal(satisfiesTripBookingPayment({ ...payment, refundedAmountMinor: 1 }, legacy), false);
});

for (const paymentMode of ['DISABLED', 'OPTIONAL', 'ENABLED']) {
  test(`organization confirmation requires prepayment when the general rule is ${paymentMode}`, async () => {
    const { state, guard, context, management } = fixture({ organizationId: 'buyer-org', paymentMode });
    const captured = state.payment;
    state.payment = null;
    await assert.rejects(() => guard.canActivate(context), error => error.getStatus?.() === 409);
    const unpaid = await management.detail('admin', 'booking-1', 'admin');
    assert(unpaid.blockers.includes('PAYMENT_REQUIRED'));
    await assert.rejects(() => management.apply('admin', 'booking-1', {
      action: 'CONFIRM', requestId: randomUUID(), expectedState: unpaid.stateToken, policyReviewAcknowledged: true,
    }, 'admin'), error => error.getStatus?.() === 409);
    assert.equal(state.writes, 0);
    state.payment = captured;
    assert.equal(await guard.canActivate(context), true);
    assert((await management.detail('admin', 'booking-1', 'admin')).actions.includes('CONFIRM'));
  });
}

test('organization confirmation cannot substitute a current catalog price for a missing original contract', async () => {
  const { state, guard, context, management } = fixture({ legacy: true, organizationId: 'buyer-org', paymentMode: 'DISABLED' });
  await assert.rejects(() => guard.canActivate(context), error => error.getStatus?.() === 409);
  const detail = await management.detail('admin', 'booking-1', 'admin');
  assert.equal(detail.paymentContractReview.reasonCode, 'ORIGINAL_ORGANIZATION_CONTRACT_REQUIRED');
  assert(detail.blockers.includes('PRICE_NOT_CONFIGURED'));
  assert.equal(state.priceReads, 0);
});

test('individual policy settings still apply to personal bookings', async () => {
  for (const paymentMode of ['OPTIONAL', 'DISABLED']) {
    const { state, context, guard, management } = fixture({ paymentMode });
    state.payment = null;
    assert.equal(await guard.canActivate(context), true);
    assert((await management.detail('admin', 'booking-1', 'admin')).actions.includes('CONFIRM'));
  }
});
