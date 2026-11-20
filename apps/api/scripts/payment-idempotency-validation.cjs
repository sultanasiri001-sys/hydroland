// Exercise the compiled service with controlled database interleavings.
// No database, HTTP requests, or real payment provider is used.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { PaymentsService } = require('../dist/payments/payments.service');

global.fetch = () => { throw new Error('Network is forbidden in payment idempotency regressions'); };

test('invalid checkout identifiers return 400 before any dependency or provider access', async () => {
  const accesses = [];
  const forbidden = new Proxy({}, {
    get(_target, property) {
      accesses.push(String(property));
      throw new Error('Invalid checkout input must not access dependencies');
    },
  });
  const service = new PaymentsService(forbidden, forbidden, forbidden, forbidden, forbidden);
  for (const field of ['bookingId', 'idempotencyKey']) {
    for (const value of [undefined, null, '', ' ', 42, true, {}, [], ['identifier']]) {
      const input = { bookingId: 'booking-1', idempotencyKey: 'request-1', [field]: value };
      await assert.rejects(() => service.create('buyer-1', input), error => error.getStatus?.() === 400);
    }
  }
  assert.deepEqual(accesses, [], 'invalid input must not read or mutate any financial dependency');
});

const key = 'shared-checkout-request';
const now = new Date('2026-01-01T00:00:00Z');
const payment = (patch = {}) => ({
  id: 'payment-1', accountId: 'buyer-1', bookingId: 'booking-1', amountMinor: 24690,
  currency: 'SAR', idempotencyKey: key, status: 'CREATED', providerReference: null,
  createdAt: now, updatedAt: now, ...patch,
});

function fixture({ participants = 1, incumbent = null } = {}) {
  const state = { payment: null, preflightReads: 0, upserts: 0, audits: [], created: [], fetched: [], cancelled: [] };
  let releaseReads;
  const readsFinished = new Promise(resolve => { releaseReads = resolve; });
  const invoice = (row, id) => ({
    id, status: 'initiated', amount: row.amountMinor, currency: row.currency,
    url: `https://checkout.example.invalid/${id}`, payments: [],
    metadata: { hydroland_payment_id: row.id, hydroland_booking_id: row.bookingId },
  });
  const db = {
    booking: { findFirst: async ({ where }) => ({ id: where.id, accountId: where.accountId, tripId: 'trip-1', seats: 2, status: 'PENDING' }) },
    operationalSetting: { findUnique: async () => ({ value: { pricePerSeatMinor: 12345, currency: 'SAR' } }) },
    payment: {
      findUnique: async ({ where }) => {
        if (where.id) {
          assert.equal(where.id, state.payment.id);
          return { ...state.payment };
        }
        assert.equal(where.idempotencyKey, key);
        // Snapshot both preflight reads before either request can claim the key.
        const snapshot = state.payment ? { ...state.payment } : null;
        state.preflightReads++;
        if (state.preflightReads === participants) releaseReads();
        await readsFinished;
        return snapshot;
      },
      upsert: async ({ where, create, update }) => {
        assert.equal(where.idempotencyKey, key);
        assert.deepEqual(update, {});
        state.upserts++;
        // The first upsert wins. The later upsert returns that persisted row,
        // even when its own earlier preflight lookup saw no payment.
        if (!state.payment) state.payment = payment(incumbent || create);
        return { ...state.payment };
      },
      updateMany: async ({ where, data }) => {
        assert.equal(where.id, state.payment.id);
        if (state.payment.providerReference !== where.providerReference) return { count: 0 };
        Object.assign(state.payment, data);
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }) => {
        assert.equal(where.id, state.payment.id);
        return { ...state.payment };
      },
      update: async ({ where, data }) => {
        assert.equal(where.id, state.payment.id);
        Object.assign(state.payment, data);
        return { ...state.payment };
      },
    },
  };
  db.serializable = async work => work(db);
  const policies = { decision: async () => ({ bypass: false, review: false, state: 'ENABLED' }) };
  const audit = { record: async input => { state.audits.push(input); return { id: `audit-${state.audits.length}` }; } };
  const integrations = { requireOperational: () => ({ status: 'SANDBOX' }) };
  const provider = {
    createInvoice: async input => {
      state.created.push(input);
      return invoice({ ...input, id: input.paymentId }, `invoice-${state.created.length}`);
    },
    fetchInvoice: async id => { state.fetched.push(id); return invoice(state.payment, id); },
    cancelInvoice: async id => { state.cancelled.push(id); return true; },
  };
  return { state, service: new PaymentsService(db, policies, audit, integrations, provider) };
}

for (const [name, second] of [
  ['another account', { accountId: 'buyer-2', bookingId: 'booking-2' }],
  ['another booking of the same account', { accountId: 'buyer-1', bookingId: 'booking-2' }],
]) test(`concurrent key claim rejects ${name} before provider or audit side effects`, async () => {
  const { service, state } = fixture({ participants: 2 });
  const results = await Promise.allSettled([
    service.create('buyer-1', { bookingId: 'booking-1', idempotencyKey: key }),
    service.create(second.accountId, { bookingId: second.bookingId, idempotencyKey: key }),
  ]);
  assert.equal(state.preflightReads, 2);
  assert.equal(state.upserts, 2, 'both requests must pass the stale preflight lookup');
  const accepted = results.filter(result => result.status === 'fulfilled');
  const rejected = results.filter(result => result.status === 'rejected');
  assert.equal(accepted.length, 1, 'a mismatched caller must not receive the winning payment or checkout URL');
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.getStatus?.(), 409);
  assert.equal(accepted[0].value.accountId, 'buyer-1');
  assert.equal(accepted[0].value.bookingId, 'booking-1');
  assert.equal(state.created.length, 1, 'the losing request must not create an external invoice');
  assert.equal(state.fetched.length, 0, 'the losing request must not fetch another checkout');
  assert.equal(state.cancelled.length, 0);
  assert.deepEqual(state.audits.map(row => row.action), ['PAYMENT_CREATED', 'PAYMENT_CHECKOUT_CREATED']);
  assert(state.audits.every(row => row.metadata.accountId === 'buyer-1' && row.metadata.bookingId === 'booking-1'));
});

for (const [name, patch] of [
  ['account', { accountId: 'buyer-2' }],
  ['booking', { bookingId: 'booking-2' }],
  ['amount', { amountMinor: 24790 }],
  ['currency', { currency: 'USD' }],
]) test(`key claimed after lookup with a different ${name} cannot replay an existing provider checkout`, async () => {
  const incumbent = payment({ providerReference: 'existing-invoice', status: 'PENDING', ...patch });
  const { service, state } = fixture({ incumbent });
  await assert.rejects(
    () => service.create('buyer-1', { bookingId: 'booking-1', idempotencyKey: key }),
    error => error.getStatus?.() === 409,
  );
  assert.equal(state.upserts, 1);
  assert.deepEqual(state.payment, incumbent, 'rejected replay must leave the winning payment untouched');
  assert.equal(state.audits.length, 0);
  assert.equal(state.created.length, 0);
  assert.equal(state.fetched.length, 0);
  assert.equal(state.cancelled.length, 0);
});

test('identical concurrent requests retain the existing checkout-claim behavior', async () => {
  const { service, state } = fixture({ participants: 2 });
  const results = await Promise.all([
    service.create('buyer-1', { bookingId: 'booking-1', idempotencyKey: key }),
    service.create('buyer-1', { bookingId: 'booking-1', idempotencyKey: key }),
  ]);
  assert.equal(state.upserts, 2);
  assert.equal(results[0].id, results[1].id);
  assert.equal(results[0].providerReference, results[1].providerReference);
  assert.equal(results[0].checkoutUrl, results[1].checkoutUrl);
  assert.equal(state.created.length, 2);
  assert.equal(state.cancelled.length, 1, 'the existing provider-claim fallback cancels the unused invoice');
  assert.equal(state.fetched.length, 1);
});

test('matching replay after a stale lookup returns the canonical server-priced checkout', async () => {
  const incumbent = payment({ providerReference: 'existing-invoice', status: 'PENDING' });
  const { service, state } = fixture({ incumbent });
  const result = await service.create('buyer-1', { bookingId: 'booking-1', idempotencyKey: ` ${key} ` });
  assert.equal(result.id, incumbent.id);
  assert.equal(result.accountId, 'buyer-1');
  assert.equal(result.amountMinor, 24690);
  assert.equal(result.currency, 'SAR');
  assert.equal(result.checkoutUrl, 'https://checkout.example.invalid/existing-invoice');
  assert.equal(state.created.length, 0);
  assert.deepEqual(state.fetched, ['existing-invoice']);
});
