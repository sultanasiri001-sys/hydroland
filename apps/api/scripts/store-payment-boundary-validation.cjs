// Offline service regressions: no PrismaClient, database, provider, or HTTP requests.
// Compile StoreService/StoreOfferingsService into .tmp-commerce-validation first.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolve } = require('node:path');
const { Prisma } = require('@prisma/client');
const { StoreService } = require(resolve(process.env.COMMERCE_BUILD_DIR || resolve(__dirname, '../.tmp-commerce-validation'), 'store/store.service.js'));
const { StoreOfferingsService } = require(resolve(process.env.COMMERCE_BUILD_DIR || resolve(__dirname, '../.tmp-commerce-validation'), 'store/store-offerings.service.js'));
global.fetch = () => { throw new Error('Network is forbidden in commerce boundary regressions'); };
const order = (patch = {}) => ({ id: 'order-1', accountId: 'buyer', status: 'CREATED', totalMinor: 12500, currency: 'SAR', items: [{ productId: 'product-1', quantity: 2 }], ...patch });
const payment = (patch = {}) => ({ id: 'payment-1', orderId: 'order-1', accountId: 'buyer', amountMinor: 12500, currency: 'SAR', status: 'CREATED', idempotencyKey: 'request-1', ...patch });
function fixture({ orders = [order()], payments = [], products = [], auditFails = false } = {}) {
  const db = { state: { orders, payments, products, audits: [] }, transactions: 0 };
  const facade = (owner) => ({
    storeOrder: {
      findFirst: async ({ where }) => { const row = owner.state.orders.find(x => x.id === where.id && x.accountId === where.accountId); return row && { ...row, payment: owner.state.payments.find(p => p.orderId === row.id) || null }; },
      findUnique: async ({ where }) => owner.state.orders.find(x => x.id === where.id) || null,
      findUniqueOrThrow: async ({ where }) => assert.ok(owner.state.orders.some(x => x.id === where.id)) || owner.state.orders.find(x => x.id === where.id),
      updateMany: async ({ where, data }) => { const row = owner.state.orders.find(x => x.id === where.id && x.status === where.status); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
      create: async ({ data }) => { const row = order({ id: 'new-order', currency: 'SAR', ...data }); owner.state.orders.push(row); return row; },
    },
    storePayment: {
      findUnique: async ({ where }) => owner.state.payments.find(p => Object.entries(where).every(([k, v]) => p[k] === v)) || null,
      findFirst: async ({ where }) => owner.state.payments.find(p => where.OR.some(part => Object.entries(part).every(([k, v]) => p[k] === v))) || null,
      create: async ({ data }) => { if (owner.state.payments.some(p => p.orderId === data.orderId || p.idempotencyKey === data.idempotencyKey)) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'offline' }); const row = payment(data); owner.state.payments.push(row); return row; },
    },
    storeProduct: {
      findMany: async () => owner.state.products,
      updateMany: async ({ where, data }) => { const row = owner.state.products.find(p => p.id === where.id && p.stockQuantity >= where.stockQuantity.gte); if (!row) return { count: 0 }; row.stockQuantity -= data.stockQuantity.decrement; return { count: 1 }; },
      update: async ({ where, data }) => { const row = owner.state.products.find(p => p.id === where.id); if (row) row.stockQuantity += data.stockQuantity.increment; return row; },
    },
  });
  Object.assign(db, facade(db));
  db.serializable = async work => {
    db.transactions++;
    const tx = { state: structuredClone(db.state) }; Object.assign(tx, facade(tx));
    const externalAuditCount = db.state.audits.length;
    const result = await work(tx); tx.state.audits.push(...db.state.audits.slice(externalAuditCount)); db.state = tx.state; return result;
  };
  const audit = { record: async (input, tx) => {
    if (auditFails) throw new Error('Injected audit failure');
    (tx || db).state.audits.push(input); return { id: 'audit-1' };
  } };
  return { db, audit, service: new StoreService(db, audit) };
}
const rejectsStatus = (work, status) => assert.rejects(work, e => e.getStatus?.() === status);

test('local payment is server-priced, explicitly not collected, and atomically attributed', async () => {
  const { db, service } = fixture();
  const result = await service.createPayment('buyer', 'order-1', ' request-1 ');
  assert.equal(result.amountMinor, 12500); assert.equal(result.currency, 'SAR');
  assert.equal(result.provider, 'NOT_SELECTED'); assert.equal(result.financialActionExecuted, false); assert.equal(result.status, 'CREATED');
  assert.equal(db.state.audits.length, 1); assert.equal(db.state.audits[0].actorId, 'buyer');
  assert.equal(db.transactions, 1);
});
test('failed audit leaves no local payment; identical retry creates one audited record', async () => {
  const { db, audit, service } = fixture({ auditFails: true });
  await assert.rejects(() => service.createPayment('buyer', 'order-1', 'request-1'), /Injected audit failure/);
  assert.equal(db.state.payments.length, 0, 'payment must roll back together with its audit');
  audit.record = async (input, tx) => { tx.state.audits.push(input); return { id: 'audit-retry' }; };
  await service.createPayment('buyer', 'order-1', 'request-1');
  assert.equal(db.state.payments.length, 1); assert.equal(db.state.audits.length, 1);
});
test('exact replay returns canonical payment without duplicate audit', async () => {
  const { db, service } = fixture({ payments: [payment()] });
  assert.equal((await service.createPayment('buyer', 'order-1', 'request-1')).id, 'payment-1');
  assert.equal(db.state.payments.length, 1); assert.equal(db.state.audits.length, 0);
});
for (const terminal of [false, true]) test(`unique-conflict fallback rechecks canonical owner/order and terminal=${terminal}`, async () => {
  const { db, service } = fixture(); const original = db.serializable; let first = true;
  db.serializable = async work => {
    if (first) { first = false; db.state.payments.push(payment()); if (terminal) db.state.orders[0].status = 'CANCELLED'; throw new Prisma.PrismaClientKnownRequestError('winner committed', { code: 'P2002', clientVersion: 'offline' }); }
    return original(work);
  };
  if (terminal) await rejectsStatus(() => service.createPayment('buyer', 'order-1', 'request-1'), 400);
  else assert.equal((await service.createPayment('buyer', 'order-1', 'request-1')).id, 'payment-1');
  assert.equal(db.state.payments.length, 1); assert.equal(db.state.audits.length, 0);
});
test('payment lookup is owner-scoped', async () => {
  const { db, service } = fixture(); await rejectsStatus(() => service.createPayment('other', 'order-1', 'request-1'), 404); assert.equal(db.state.payments.length, 0);
});
test('different key for an existing order conflicts', async () => { const { service } = fixture({ payments: [payment()] }); await rejectsStatus(() => service.createPayment('buyer', 'order-1', 'request-2'), 409); });
test('cross-order idempotency reuse conflicts', async () => { const { service } = fixture({ orders: [order(), order({ id: 'order-2' })], payments: [payment()] }); await rejectsStatus(() => service.createPayment('buyer', 'order-2', 'request-1'), 409); });
for (const status of ['CANCELLED', 'FULFILLED']) test(`${status} order cannot create or replay payment`, async () => { const { db, service } = fixture({ orders: [order({ status })], payments: [payment()] }); await rejectsStatus(() => service.createPayment('buyer', 'order-1', 'request-1'), 400); assert.equal(db.state.audits.length, 0); });
test('invalid idempotency key returns client error rather than TypeError', async () => { for (const key of [undefined, null, '', ' ', 42, {}]) { const { service } = fixture(); await rejectsStatus(() => service.createPayment('buyer', 'order-1', key), 400); } });
test('fulfillment remains blocked without captured payment', async () => { const { db, service } = fixture({ orders: [order({ status: 'CONFIRMED' })] }); await rejectsStatus(() => service.updateOrderStatus('order-1', 'FULFILLED', 'admin'), 409); assert.equal(db.state.orders[0].status, 'CONFIRMED'); });
test('captured cancellation stays blocked pending approved refund flow', async () => { const { db, service } = fixture({ payments: [payment({ status: 'CAPTURED' })] }); await rejectsStatus(() => service.updateOrderStatus('order-1', 'CANCELLED', 'admin'), 409); assert.equal(db.state.orders[0].status, 'CREATED'); });
test('order status audit is transaction-bound and actor-attributed', async () => {
  const { db, audit, service } = fixture();
  audit.record = async (input, tx) => { assert.ok(tx, 'status audit must use the same transaction'); assert.equal(input.actorId, 'admin'); tx.state.audits.push(input); return { id: 'audit-1' }; };
  await service.updateOrderStatus('order-1', 'CONFIRMED', 'admin');
  assert.equal(db.state.orders[0].status, 'CONFIRMED'); assert.equal(db.state.audits.length, 1);
});
test('status audit failure rolls back state and cancellation stock restoration', async () => {
  const { db, service } = fixture({ products: [{ id: 'product-1', stockQuantity: 3 }], auditFails: true });
  await assert.rejects(() => service.updateOrderStatus('order-1', 'CANCELLED', 'admin'), /Injected audit failure/);
  assert.equal(db.state.orders[0].status, 'CREATED'); assert.equal(db.state.products[0].stockQuantity, 3); assert.equal(db.state.audits.length, 0);
});
test('cancellation replay restores stock only once', async () => {
  const { db, service } = fixture({ products: [{ id: 'product-1', stockQuantity: 3 }] });
  await service.updateOrderStatus('order-1', 'CANCELLED', 'admin'); await service.updateOrderStatus('order-1', 'CANCELLED', 'admin');
  assert.equal(db.state.products[0].stockQuantity, 5); assert.equal(db.state.audits.length, 1);
});
function courseFixture({ existing = null, count = 0, capacity = 1, disabled = false, active = true } = {}) {
  const saved = [], audits = [];
  const course = { id: 'course-1', organizationId: 'center-1', courseCode: 'SAFE-TEST', title: 'Offline fixture', priceMinor: 39000, currency: 'SAR', startsAt: new Date('2099-01-01T00:00:00Z'), endsAt: new Date('2099-01-01T02:00:00Z'), locationName: 'Offline', capacity };
  const tx = { account: { findFirst: async () => active ? { id: 'buyer' } : null }, storeCourseOffer: { findFirst: async () => course }, trainingEnrollment: { findFirst: async () => existing, count: async () => count, create: async ({ data }) => { const row = { id: 'enrollment-1', ...data }; saved.push(row); return row; } }, $queryRaw: async () => disabled ? [{ ruleKey: 'CAPACITY_LIMIT', state: 'DISABLED' }] : [], auditEvent: { create: async ({ data }) => { audits.push(data); return data; } } };
  return { saved, audits, course, service: new StoreOfferingsService({ serializable: work => work(tx) }) };
}
test('paid-price course enrollment remains pending, snapshots price, and cannot collect money', async () => {
  const { service, saved, audits } = courseFixture(); const result = await service.enroll('buyer', 'course-1');
  assert.equal(result.status, 'PENDING'); assert.equal(result.metadata.priceMinor, 39000); assert.equal(result.metadata.financialActionExecuted, false);
  assert.equal(saved.length, 1); assert.equal(audits.length, 1); assert.equal(result.storeCourseOfferId, 'course-1'); assert.equal(result.centerOrganizationId, 'center-1');
});
test('course replay returns same enrollment without duplicate audit or seat', async () => { const existing = { id: 'existing-enrollment', status: 'PENDING' }; const { service, saved, audits } = courseFixture({ existing }); assert.equal((await service.enroll('buyer', 'course-1')).id, existing.id); assert.equal(saved.length, 0); assert.equal(audits.length, 0); });
test('course capacity follows existing enabled policy', async () => { const { service, saved } = courseFixture({ count: 1 }); await rejectsStatus(() => service.enroll('buyer', 'course-1'), 409); assert.equal(saved.length, 0); });
test('course capacity disabled policy is unchanged', async () => { const { service } = courseFixture({ count: 1, disabled: true }); assert.equal((await service.enroll('buyer', 'course-1')).status, 'PENDING'); });
test('inactive account cannot enroll', async () => { const { service } = courseFixture({ active: false }); await rejectsStatus(() => service.enroll('buyer', 'course-1'), 403); });
