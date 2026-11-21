'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const compiled = process.env.COMMERCE_BOOKING_MODULE_ROOT || path.join(__dirname, '../dist');
const { TripsService } = require(path.join(compiled, 'trips/trips.service.js'));
const { captureTripBookingContract, capturedTripPrice } = require(path.join(compiled, 'commerce/trip-booking-contract.js'));

global.fetch = () => { throw new Error('Network is forbidden in booking contract tests'); };

function fixture() {
  const now = Date.now();
  const state = {
    trip: { id: 'trip-1', title: 'Stored terms trip', status: 'OPEN', capacity: 50,
      startsAt: new Date(now + 20 * 86_400_000), endsAt: new Date(now + 21 * 86_400_000),
      organizationId: 'seller-center', organization: { id: 'seller-center', displayName: 'Supplying center',
        legalName: 'Supplying center legal name', registrationNumber: 'fixture-registration', address: 'Fixture address' } },
    price: { pricePerSeatMinor: 5_750, currency: 'SAR' },
    bookings: [], participants: [], payments: [], audits: [], priceReads: 0,
  };
  const clone = value => structuredClone(value);
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    const actual = row[key] ?? null;
    return value && typeof value === 'object' && Array.isArray(value.in) ? value.in.includes(actual) : actual === value;
  });
  const tx = {
    trip: { findUnique: async () => clone(state.trip) },
    operationalSetting: { findUnique: async ({ where }) => {
      assert.equal(where.key, 'trip-price:trip-1'); state.priceReads++;
      return state.price ? { value: clone(state.price) } : null;
    } },
    safetyChecklist: { findFirst: async () => ({ decision: 'ALLOWED' }) },
    organizationMember: { findFirst: async () => ({ id: 'active-member' }) },
    booking: {
      findFirst: async ({ where }) => clone(state.bookings.find(row => matches(row, where)) || null),
      findUnique: async ({ where }) => {
        const row = state.bookings.find(item => matches(item, where));
        return row ? { ...clone(row), participants: clone(state.participants.filter(item => item.bookingId === row.id)) } : null;
      },
      aggregate: async ({ where }) => ({ _sum: { seats: state.bookings.filter(row => matches(row, where)).reduce((sum, row) => sum + row.seats, 0) } }),
      create: async ({ data }) => {
        assert.match(data.id, /^[0-9a-f-]{36}$/);
        assert(data.contractSnapshot, 'snapshot must be written with the booking, not in a later write');
        assert.equal(data.contractSnapshot.recordedAt, data.createdAt.toISOString());
        const row = clone({ ...data, organizationId: data.organizationId ?? null, updatedAt: data.createdAt });
        state.bookings.push(row); return clone(row);
      },
      update: async () => { throw new Error('Cancelled booking must never be rewritten'); },
    },
    bookingParticipant: {
      deleteMany: async () => { throw new Error('Historical roster must never be deleted'); },
      createMany: async ({ data }) => {
        for (const item of data) state.participants.push({ ...clone(item), id: `participant-${state.participants.length + 1}` });
      },
      findMany: async ({ where }) => clone(state.participants.filter(row => matches(row, where))),
    },
  };
  const db = {
    serializable: async callback => callback(tx),
    operationalSetting: { findUnique: async () => { throw new Error('Price must not be re-read outside the booking transaction'); } },
  };
  const weatherGate = { settings: async () => ({ enabled: false }), evaluateReview: () => ({ blocking: false }) };
  const reviews = { latest: async () => null };
  const participants = { ensureForBooking: async (bookingId, accountId, seats, client) => {
    assert.equal(client, tx);
    const rows = Array.from({ length: seats }, (_, index) => ({ id: `participant-${state.participants.length + index + 1}`,
      bookingId, accountId: index === 0 ? accountId : null, fullName: `Fixture ${index}`, eligibilityStatus: 'PENDING' }));
    state.participants.push(...clone(rows)); return clone(rows);
  } };
  const policies = { decision: async () => ({ state: 'BYPASSED', enforce: false, review: false }) };
  const audit = { record: async (row, client) => { assert.equal(client, tx); state.audits.push(clone(row)); } };
  return { state, service: new TripsService({}, db, weatherGate, reviews, participants, policies, audit) };
}

test('personal booking atomically records its original schedule, supplier, inclusive price and policy version', async () => {
  const { state, service } = fixture();
  const result = await service.book('buyer-1', 'trip-1', 2);
  const saved = state.bookings[0].contractSnapshot;
  assert.equal(saved.source.id, result.id);
  assert.equal(saved.source.offeringId, 'trip-1');
  assert.equal(saved.customerAccountId, 'buyer-1');
  assert.equal(saved.buyerOrganizationId, null);
  assert.equal(saved.issuer.organizationId, 'seller-center');
  assert.equal(saved.amountMinor, 11_500);
  assert.equal(saved.refundPolicy.snapshot.grossAmountMinor, 11_500);
  assert.equal(saved.originalSchedule.startsAt, state.trip.startsAt.toISOString());
  assert.equal(saved.refundPolicy.snapshot.contractedScheduledAt, saved.originalSchedule.startsAt);
  assert.equal(saved.refundPolicy.snapshot.contractedAt, saved.recordedAt);
  assert.equal(saved.termsAcceptanceStatus, 'NOT_RECORDED');
  assert.equal(saved.financialActionExecuted, false);
  assert.deepEqual(result.price, { pricePerSeatMinor: 5_750, currency: 'SAR', configured: true });
  assert.equal(state.priceReads, 1);
  const before = JSON.stringify(saved);
  state.trip.startsAt = new Date(state.trip.startsAt.getTime() - 2 * 86_400_000);
  state.trip.organization.legalName = 'Changed supplier name';
  state.price.pricePerSeatMinor = 1;
  assert.equal(JSON.stringify(state.bookings[0].contractSnapshot), before);
});

test('personal rebooking creates a new identity and preserves every cancelled contract, payment and participant', async () => {
  const { state, service } = fixture();
  const cancelled = { id: 'cancelled-original', tripId: 'trip-1', accountId: 'buyer-1', organizationId: null,
    status: 'CANCELLED', seats: 1, contractSnapshot: { originalEvidence: 'never change' } };
  const oldParticipant = { id: 'old-participant', bookingId: cancelled.id, fullName: 'Historical participant' };
  const oldPayment = { id: 'old-payment', bookingId: cancelled.id, amountMinor: 5_750, status: 'CAPTURED' };
  state.bookings.push(structuredClone(cancelled));
  state.participants.push(structuredClone(oldParticipant));
  state.payments.push(structuredClone(oldPayment));
  const result = await service.book('buyer-1', 'trip-1', 2);
  assert.notEqual(result.id, cancelled.id);
  assert.equal(result.rebooked, true);
  assert.equal(state.bookings.length, 2);
  assert.deepEqual(state.bookings[0], cancelled);
  assert.deepEqual(state.participants[0], oldParticipant);
  assert.deepEqual(state.payments[0], oldPayment);
  assert(result.participants.every(row => row.bookingId === result.id));
  assert.equal(result.contractSnapshot.source.id, result.id);
});

test('a later edited cancelled record cannot hide an existing active personal booking', async () => {
  const { state, service } = fixture();
  state.bookings.push(
    { id: 'cancelled-newer', tripId: 'trip-1', accountId: 'buyer-1', organizationId: null, status: 'CANCELLED', seats: 1 },
    { id: 'active-older', tripId: 'trip-1', accountId: 'buyer-1', organizationId: null, status: 'CONFIRMED', seats: 1 },
  );
  await assert.rejects(() => service.book('buyer-1', 'trip-1', 1), error => error.getStatus?.() === 409);
  assert.equal(state.bookings.length, 2);
  assert.equal(state.priceReads, 0);
});

test('organization buyer and supplying center remain distinct, and an idempotent replay keeps original price and schedule', async () => {
  const { state, service } = fixture();
  const input = { tripId: 'trip-1', seats: 2, requestKey: 'org-terms-test-1', participantNames: ['Participant One', 'Participant Two'] };
  const first = await service.bookForOrganization('buyer-operator', 'buying-organization', input);
  const saved = JSON.stringify(state.bookings[0].contractSnapshot);
  assert.equal(first.organizationId, 'buying-organization');
  assert.equal(first.contractSnapshot.buyerOrganizationId, 'buying-organization');
  assert.deepEqual(first.contractSnapshot.organizationPaymentTerms, {
    mode: 'PREPAYMENT', initiator: 'NAMED_FINANCIAL_DELEGATE',
    mandateIssuer: 'BUYER_ORGANIZATION', mandateApproval: 'PLATFORM_MANAGEMENT',
  });
  assert.equal(first.contractSnapshot.issuer.organizationId, 'seller-center');
  assert.equal(first.contractSnapshot.customerAccountId, 'buyer-operator');
  state.price.pricePerSeatMinor = 999_999;
  state.trip.startsAt = new Date(state.trip.startsAt.getTime() + 5 * 86_400_000);
  state.trip.endsAt = new Date(state.trip.endsAt.getTime() + 5 * 86_400_000);
  const replay = await service.bookForOrganization('buyer-operator', 'buying-organization', input);
  assert.equal(replay.id, first.id);
  assert.equal(replay.alreadyApplied, true);
  assert.deepEqual(replay.price, first.price);
  assert.equal(JSON.stringify(replay.contractSnapshot), saved);
  assert.equal(state.bookings.length, 1);
  assert.equal(state.priceReads, 1);
  assert.equal(state.audits.length, 1);
  await assert.rejects(() => service.bookForOrganization('buyer-operator', 'another-organization', input), error => error.getStatus?.() === 409);
});

test('unpriced bookings preserve the existing reservation workflow without fabricated zero-value financial terms', async () => {
  const { state, service } = fixture();
  state.price = null;
  const result = await service.book('buyer-1', 'trip-1', 1);
  assert.equal(result.status, 'PENDING');
  assert.equal(result.contractSnapshot.amountMinor, null);
  assert.equal(result.contractSnapshot.unitPriceMinor, null);
  assert.equal(result.contractSnapshot.refundPolicy.status, 'REVIEW_REQUIRED');
  assert.equal(result.contractSnapshot.refundPolicy.snapshot, null);
  assert.equal(result.price.configured, false);
  state.price = { pricePerSeatMinor: 10_000, currency: 'SAR' };
  assert.equal(state.bookings[0].contractSnapshot.amountMinor, null, 'later pricing must not silently rewrite the original contract');
});

test('capture helper does not retain mutable input references and rejects an unsupported total through explicit review', () => {
  const { state } = fixture();
  const input = { bookingId: 'helper-line', accountId: 'buyer-1', buyerOrganizationId: null, seats: 2,
    createdAt: new Date(), price: { pricePerSeatMinor: 5_750, currency: 'SAR', configured: true }, trip: state.trip };
  const saved = captureTripBookingContract(input);
  assert(Object.isFrozen(saved));
  assert(Object.isFrozen(saved.refundPolicy.snapshot));
  const original = JSON.stringify(saved);
  input.trip.startsAt.setUTCFullYear(input.trip.startsAt.getUTCFullYear() + 1);
  input.price.pricePerSeatMinor = 99;
  assert.equal(JSON.stringify(saved), original);
  const large = captureTripBookingContract({ ...input, price: { pricePerSeatMinor: 2_147_483_647, currency: 'SAR', configured: true } });
  assert.equal(large.amountMinor, null);
  assert.equal(large.refundPolicy.status, 'REVIEW_REQUIRED');
  assert.equal(capturedTripPrice(null).configured, false);
  assert.equal(capturedTripPrice({ ...saved, amountMinor: 1 }).configured, false);
});
