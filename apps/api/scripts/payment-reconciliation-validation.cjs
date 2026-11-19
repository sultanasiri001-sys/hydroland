// Deterministic service regressions. A held provider response models a real GET
// that began before another reconciliation committed. Network access is forbidden.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { PaymentsService } = require('../dist/payments/payments.service');
global.fetch = () => { throw new Error('Network is forbidden in payment reconciliation regressions'); };

const paymentId = '11111111-1111-4111-8111-111111111111';
const invoiceId = '22222222-2222-4222-8222-222222222222';
const providerPaymentId = '33333333-3333-4333-8333-333333333333';
const originalPayment = () => ({ id: paymentId, bookingId: 'booking-1', accountId: 'buyer-1', amountMinor: 24690,
  currency: 'SAR', status: 'PENDING', providerReference: invoiceId, moyasarPaymentId: null,
  idempotencyKey: 'checkout-1', createdAt: new Date(0), updatedAt: new Date(0) });
const event = id => ({ id, type: 'payment_updated', live: false, data: { invoice_id: invoiceId } });
const stale = error => error.getStatus?.() === 409 && error.getResponse?.().code === 'PAYMENT_RECONCILIATION_STALE';

function fixture({ missing = false, auditFails = false, webhookAuditFails = false } = {}) {
  let state = { payment: missing ? null : originalPayment(), events: [] };
  const pending = [], controls = { auditFails, webhookAuditFails };
  let inTransaction = false, tail = Promise.resolve(), providerCalls = 0;
  const facade = getState => ({
    payment: {
      findUnique: async ({ where }) => {
        const row = getState().payment;
        return row && Object.entries(where).every(([key, value]) => row[key] === value) ? structuredClone(row) : null;
      },
      findFirst: async args => facade(getState).payment.findUnique(args),
      upsert: async () => structuredClone(getState().payment),
      update: async ({ where, data }) => {
        const row = getState().payment; assert.equal(where.id, row.id);
        Object.assign(row, data, { updatedAt: new Date(row.updatedAt.getTime() + 1) });
        return structuredClone(row);
      },
    },
    auditEvent: {
      findFirst: async ({ where }) => getState().events.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) || null,
      create: async ({ data }) => {
        if (controls.webhookAuditFails && data.resource === 'PaymentProviderWebhook') throw new Error('Injected webhook audit failure');
        const row = { id: `audit-${getState().events.length + 1}`, ...data }; getState().events.push(row); return row;
      },
    },
    $executeRaw: async (sql, value, id) => {
      assert.match(sql.join('?'), /UPDATE "Payment" SET "moyasarPaymentId"=/);
      const row = getState().payment;
      if (!row || row.id !== id || (row.moyasarPaymentId && row.moyasarPaymentId !== value)) return 0;
      row.moyasarPaymentId = value; return 1;
    },
    $queryRaw: async () => [{ moyasarPaymentId: getState().payment?.moyasarPaymentId ?? null }],
  });
  const db = facade(() => state);
  db.booking = { findFirst: async ({ where }) => ({ id: where.id, accountId: where.accountId, tripId: 'trip-1', seats: 2, status: 'PENDING' }) };
  db.operationalSetting = { findUnique: async () => ({ value: { pricePerSeatMinor: 12345, currency: 'SAR' } }) };
  const transaction = work => {
    const result = tail.then(async () => {
      const draft = structuredClone(state), tx = facade(() => draft);
      inTransaction = true;
      try { const value = await work(tx); state = draft; return value; }
      finally { inTransaction = false; }
    });
    tail = result.catch(() => {}); return result;
  };
  db.serializable = transaction;
  db.$transaction = transaction; // Baseline path, used to prove the stale-response defect.
  const audit = { record: async (input, tx = db) => {
    if (controls.auditFails) throw new Error('Injected reconciliation audit failure');
    return tx.auditEvent.create({ data: input });
  } };
  const provider = {
    verifyWebhook: payload => payload,
    fetchInvoice: async requestedId => {
      assert.equal(inTransaction, false, 'provider I/O must remain outside database transactions');
      assert.equal(requestedId, invoiceId); providerCalls++;
      const next = pending.shift(); assert(next, 'unexpected provider request');
      next.started(); await next.released; return structuredClone(next.invoice);
    },
  };
  const queue = (status, { hold = false, paidReference = false, patch = {} } = {}) => {
    let started, release;
    const called = new Promise(resolve => { started = resolve; });
    const released = new Promise(resolve => { release = resolve; });
    pending.push({ started, released, invoice: {
      id: invoiceId, status, amount: 24690, currency: 'SAR', url: 'https://checkout.example.invalid/payment',
      payments: paidReference ? [{ id: providerPaymentId, status: 'paid', amount: 24690, currency: 'SAR' }] : [],
      metadata: { hydroland_payment_id: paymentId, hydroland_booking_id: 'booking-1' }, ...patch,
    } });
    if (!hold) release();
    return { called, release };
  };
  const service = new PaymentsService(db, { decision: async () => ({ bypass: false, review: false, state: 'ENABLED' }) },
    audit, { requireOperational: () => ({ status: 'SANDBOX' }) }, provider);
  const call = (path, eventId = 'old-event') => path === 'webhook' ? service.handleMoyasarWebhook(event(eventId))
    : path === 'create' ? service.create('buyer-1', { bookingId: 'booking-1', idempotencyKey: 'checkout-1' })
      : service.refresh('buyer-1', paymentId);
  return { get state() { return state; }, get providerCalls() { return providerCalls; }, controls, service, call, queue };
}

for (const path of ['create', 'refresh', 'webhook']) test(`${path}: delayed paid response cannot overwrite a newer refund or bind its reference`, async () => {
  const f = fixture(), held = f.queue('paid', { hold: true, paidReference: true });
  const old = f.call(path); await held.called;
  f.queue('refunded'); await f.call('refresh');
  assert.equal(f.state.payment.status, 'REFUNDED');
  const rejected = assert.rejects(old, stale); held.release(); await rejected;
  assert.equal(f.state.payment.status, 'REFUNDED');
  assert.equal(f.state.payment.moyasarPaymentId, null);
  assert.equal(f.state.events.length, 1);
  assert.equal(f.state.events[0].metadata.to, 'REFUNDED');
  assert.equal(f.state.events.some(row => row.resourceId === 'old-event'), false);
});

test('older initiated webhook cannot erase capture; the same event can be retried after stale 409', async () => {
  const f = fixture(), held = f.queue('initiated', { hold: true });
  const old = f.call('webhook'); await held.called;
  f.queue('paid'); await f.call('webhook', 'new-event');
  const rejected = assert.rejects(old, stale); held.release(); await rejected;
  assert.equal(f.state.payment.status, 'CAPTURED');
  assert.equal(f.state.events.some(row => row.resourceId === 'old-event'), false);
  f.queue('paid'); assert.equal((await f.call('webhook')).matched, true);
  assert.equal((await f.call('webhook')).duplicate, true);
  assert.equal(f.state.events.filter(row => row.resourceId === 'old-event').length, 1);
  assert.equal(f.providerCalls, 3, 'processed replay must not fetch the provider again');
});

for (const path of ['create', 'refresh']) test(`${path}: audit failure rolls back both status and provider payment reference`, async () => {
  const f = fixture({ auditFails: true }); f.queue('paid', { paidReference: true });
  await assert.rejects(f.call(path), /Injected reconciliation audit failure/);
  assert.deepEqual(f.state.payment, originalPayment()); assert.equal(f.state.events.length, 0);
  f.controls.auditFails = false; f.queue('paid', { paidReference: true }); await f.call(path);
  assert.equal(f.state.payment.status, 'CAPTURED'); assert.equal(f.state.payment.moyasarPaymentId, providerPaymentId);
  assert.equal(f.state.events.length, 1);
  assert.deepEqual([f.state.events[0].metadata.from, f.state.events[0].metadata.to], ['PENDING', 'CAPTURED']);
});

test('failed webhook audit leaves no processed receipt; retry commits one receipt with status and reference', async () => {
  const f = fixture({ webhookAuditFails: true }); f.queue('paid', { paidReference: true });
  await assert.rejects(f.call('webhook'), /Injected webhook audit failure/);
  assert.deepEqual(f.state.payment, originalPayment()); assert.equal(f.state.events.length, 0);
  f.controls.webhookAuditFails = false; f.queue('paid', { paidReference: true }); await f.call('webhook');
  assert.equal((await f.call('webhook')).duplicate, true);
  assert.equal(f.state.payment.status, 'CAPTURED'); assert.equal(f.state.payment.moyasarPaymentId, providerPaymentId);
  assert.equal(f.state.events.length, 1);
});

test('timestamp-only change while GET is in flight invalidates the snapshot', async () => {
  const f = fixture(), held = f.queue('paid', { hold: true });
  const old = f.call('refresh'); await held.called;
  f.state.payment.updatedAt = new Date(1);
  const rejected = assert.rejects(old, stale); held.release(); await rejected;
  assert.equal(f.state.payment.status, 'PENDING'); assert.equal(f.state.events.length, 0);
});

test('changed invoice binding rejects the response before any ledger or reference mutation', async () => {
  const f = fixture(), held = f.queue('paid', { hold: true, paidReference: true });
  const old = f.call('refresh'); await held.called;
  f.state.payment.providerReference = 'replacement-invoice';
  const rejected = assert.rejects(old, error => error.getStatus?.() === 409); held.release(); await rejected;
  assert.equal(f.state.payment.status, 'PENDING'); assert.equal(f.state.payment.moyasarPaymentId, null);
  assert.equal(f.state.events.length, 0);
});

test('provider invoice amount and metadata binding still reject tampered responses', async () => {
  for (const patch of [{ amount: 1 }, { metadata: { hydroland_payment_id: paymentId, hydroland_booking_id: 'another-booking' } }]) {
    const f = fixture(); f.queue('paid', { paidReference: true, patch });
    await assert.rejects(f.call('refresh'), error => error.getStatus?.() === 409);
    assert.deepEqual(f.state.payment, originalPayment()); assert.equal(f.state.events.length, 0);
  }
});

test('simultaneous duplicate webhook with no status change produces one processed receipt', async () => {
  const f = fixture(); f.state.payment.status = 'CAPTURED';
  const held = f.queue('paid', { hold: true }); const first = f.call('webhook'); await held.called;
  f.queue('paid'); const second = await f.call('webhook'); held.release();
  const results = [await first, second];
  assert.equal(results.filter(result => result.duplicate).length, 1);
  assert.equal(f.state.events.length, 1); assert.equal(f.state.payment.status, 'CAPTURED');
});

test('simultaneous unmatched webhook receipts are deduplicated without contacting the provider', async () => {
  const f = fixture({ missing: true }); const results = await Promise.all([f.call('webhook'), f.call('webhook')]);
  assert.equal(results.filter(result => result.duplicate).length, 1);
  assert.equal(f.state.events.length, 1); assert.equal(f.state.events[0].action, 'PAYMENT_PROVIDER_WEBHOOK_UNMATCHED');
  assert.equal(f.providerCalls, 0);
});
