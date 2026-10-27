// Destructive fixture creation is restricted to an explicitly disposable loopback DB.
// Never runs PSP, wallet, rewards, refunds, or provider calls.
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { randomUUID, createHmac } = require('node:crypto');
const loopbackFetch = global.fetch;
const { Prisma } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
global.fetch = () => { throw new Error('Provider/network calls forbidden in commerce DB regressions'); };
const build = process.env.COMMERCE_BUILD_DIR || resolve(__dirname, '../dist');
const { DatabaseService } = require(resolve(build, 'database/database.service.js'));
const { AuditService } = require(resolve(build, 'audit/audit.service.js'));
const { StoreService } = require(resolve(build, 'store/store.service.js'));
const { StoreOfferingsService } = require(resolve(build, 'store/store-offerings.service.js'));
const db = new DatabaseService(), audit = new AuditService(db), store = new StoreService(db, audit);
let passed = 0, failed = 0;
const check = async (name, work) => { try { await work(); passed++; console.log('PASS', name); } catch (e) { failed++; console.error('FAIL', name, e.message); } };
const status = n => e => e.getStatus?.() === n;
(async () => {
  try {
    await db.$connect();
    const accounts = [];
    for (const name of ['buyer', 'other', 'admin']) {
      const person = await db.person.create({ data: { firstName: name, lastName: 'Disposable commerce regression' } });
      accounts.push(await db.account.create({ data: { personId: person.id, email: `${name}-${randomUUID()}@example.invalid`, passwordHash: 'not-a-login', status: 'ACTIVE', emailVerifiedAt: new Date() } }));
    }
    const [buyer, other, admin] = accounts;
    const product = await db.storeProduct.create({ data: { sku: randomUUID(), nameAr: 'اختبار محلي فقط', priceMinor: 12500, stockQuantity: 50, status: 'ACTIVE' } });
    const makeOrder = () => store.createOrder(buyer.id, [{ productId: product.id, quantity: 1 }]);
    const events = (resource, id) => db.auditEvent.findMany({ where: { resource, resourceId: id } });
    const first = await makeOrder(), key = randomUUID();
    const failStore = new StoreService(db, { record: async () => { throw new Error('Injected audit failure'); } });
    await check('audit failure rolls back newly created payment', async () => {
      await assert.rejects(() => failStore.createPayment(buyer.id, first.id, key), /Injected audit failure/);
      assert.equal(await db.storePayment.count({ where: { orderId: first.id } }), 0);
    });
    await check('retry after failed audit creates exactly one attributed audit', async () => {
      const result = await store.createPayment(buyer.id, first.id, key);
      assert.equal(result.status, 'CREATED'); assert.equal(result.provider, 'NOT_SELECTED'); assert.equal(result.financialActionExecuted, false);
      const rows = await events('StorePayment', result.id); assert.equal(rows.length, 1); assert.equal(rows[0].actorId, buyer.personId);
    });
    await check('serialization retry after payment audit commits exactly one payment/audit', async () => {
      const order = await makeOrder(), request = randomUUID(), original = db.serializable.bind(db); let injected = false;
      db.serializable = work => original(async tx => { const result = await work(tx); if (!injected) { injected = true; throw new Prisma.PrismaClientKnownRequestError('Injected serialization conflict after payment audit', { code: 'P2034', clientVersion: 'disposable-test' }); } return result; });
      let result; try { result = await store.createPayment(buyer.id, order.id, request); } finally { db.serializable = original; }
      assert.equal(injected, true); assert.equal(await db.storePayment.count({ where: { orderId: order.id } }), 1);
      const rows = await events('StorePayment', result.id); assert.equal(rows.length, 1); assert.equal(rows[0].actorId, buyer.personId);
    });
    await check('eight concurrent exact payment requests converge to one payment/audit', async () => {
      const order = await makeOrder(), request = randomUUID();
      const rows = await Promise.all(Array.from({ length: 8 }, () => store.createPayment(buyer.id, order.id, request)));
      assert.equal(new Set(rows.map(x => x.id)).size, 1); assert.equal(await db.storePayment.count({ where: { orderId: order.id } }), 1);
      assert.equal((await events('StorePayment', rows[0].id)).length, 1);
    });
    await check('concurrent different keys on one order produce one winner and one conflict', async () => {
      const order = await makeOrder(); const results = await Promise.allSettled([randomUUID(), randomUUID()].map(k => store.createPayment(buyer.id, order.id, k)));
      assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
      const rejected = results.find(x => x.status === 'rejected'); assert.equal(rejected.reason.getStatus(), 409);
      assert.equal(await db.storePayment.count({ where: { orderId: order.id } }), 1);
    });
    await check('foreign owner cannot create/replay payment', async () => { await assert.rejects(() => store.createPayment(other.id, first.id, key), status(404)); });
    await check('same idempotency key cannot move to a different order', async () => { const second = await makeOrder(); await assert.rejects(() => store.createPayment(buyer.id, second.id, key), status(409)); });
    await check('terminal order cannot create a payment', async () => { const order = await makeOrder(); await store.updateOrderStatus(order.id, 'CANCELLED', admin.id); await assert.rejects(() => store.createPayment(buyer.id, order.id, randomUUID()), status(400)); });
    await check('status audit failure rolls back cancellation and stock restoration', async () => {
      const order = await makeOrder(); const before = await db.storeProduct.findUniqueOrThrow({ where: { id: product.id } });
      await assert.rejects(() => failStore.updateOrderStatus(order.id, 'CANCELLED', admin.id), /Injected audit failure/);
      assert.equal((await db.storeOrder.findUniqueOrThrow({ where: { id: order.id } })).status, 'CREATED');
      assert.equal((await db.storeProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, before.stockQuantity);
      assert.equal((await events('StoreOrder', order.id)).length, 0);
    });
    await check('serialization retry after status audit leaves no ghost/duplicate audit', async () => {
      const order = await makeOrder(), original = db.serializable.bind(db); let injected = false;
      db.serializable = work => original(async tx => { const result = await work(tx); if (!injected) { injected = true; throw new Prisma.PrismaClientKnownRequestError('Injected serialization conflict after audit', { code: 'P2034', clientVersion: 'disposable-test' }); } return result; });
      try { await store.updateOrderStatus(order.id, 'CONFIRMED', admin.id); } finally { db.serializable = original; }
      assert.equal(injected, true); assert.equal((await db.storeOrder.findUniqueOrThrow({ where: { id: order.id } })).status, 'CONFIRMED');
      const rows = await events('StoreOrder', order.id); assert.equal(rows.length, 1); assert.equal(rows[0].actorId, admin.personId);
    });
    await check('eight concurrent cancellations restore exactly one unit and one audit', async () => {
      const order = await makeOrder(), before = await db.storeProduct.findUniqueOrThrow({ where: { id: product.id } });
      await Promise.all(Array.from({ length: 8 }, () => store.updateOrderStatus(order.id, 'CANCELLED', admin.id)));
      assert.equal((await db.storeProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, before.stockQuantity + 1);
      const rows = await events('StoreOrder', order.id); assert.equal(rows.length, 1); assert.equal(rows[0].actorId, admin.personId);
    });
    await check('unpaid fulfillment remains blocked', async () => { const order = await makeOrder(); await store.updateOrderStatus(order.id, 'CONFIRMED', admin.id); await assert.rejects(() => store.updateOrderStatus(order.id, 'FULFILLED', admin.id), status(409)); });
    await check('captured cancellation remains blocked; no refund is executed', async () => {
      const order = await makeOrder(); const row = await store.createPayment(buyer.id, order.id, randomUUID());
      // Synthetic state only, on the guarded disposable DB. No provider call.
      await db.storePayment.update({ where: { id: row.id }, data: { status: 'CAPTURED' } });
      await assert.rejects(() => store.updateOrderStatus(order.id, 'CANCELLED', admin.id), status(409));
      assert.equal((await db.storePayment.findUniqueOrThrow({ where: { id: row.id } })).status, 'CAPTURED');
    });
    await check('payment cancellation race never leaves a payment without its audit', async () => {
      for (let i = 0; i < 5; i++) {
        const order = await makeOrder();
        const results = await Promise.allSettled([store.createPayment(buyer.id, order.id, randomUUID()), store.updateOrderStatus(order.id, 'CANCELLED', admin.id)]);
        const created = results[0]; if (created.status === 'rejected') assert.equal(created.reason.getStatus(), 400);
        assert.equal(results[1].status, 'fulfilled');
        const row = await db.storePayment.findUnique({ where: { orderId: order.id } });
        if (row) { assert.equal(row.status, 'CREATED'); assert.equal((await events('StorePayment', row.id)).length, 1); }
      }
    });
    const organization = await db.organization.create({ data: { displayName: 'Disposable course center', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: admin.id } });
    const course = await db.storeCourseOffer.create({ data: { organizationId: organization.id, courseCode: 'NO-REAL-TRAINING', title: 'Disposable course', description: 'Offline boundary test', locationName: 'Test', startsAt: new Date('2099-01-01T00:00:00Z'), endsAt: new Date('2099-01-01T02:00:00Z'), capacity: 1, priceMinor: 39000, status: 'ACTIVE' } });
    const offers = new StoreOfferingsService(db);
    await check('concurrent course enrollments preserve one seat and pending/nonfinancial snapshot', async () => {
      const results = await Promise.allSettled([buyer, other].map(a => offers.enroll(a.id, course.id)));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.getStatus(), 409);
      const row = results.find(r => r.status === 'fulfilled').value;
      assert.equal(row.status, 'PENDING'); assert.equal(row.metadata.financialActionExecuted, false); assert.equal(row.metadata.priceMinor, 39000);
      assert.equal((await offers.enroll(row.studentAccountId, course.id)).id, row.id);
      assert.equal(await db.trainingEnrollment.count({ where: { storeCourseOfferId: course.id } }), 1);
      assert.equal((await events('TrainingEnrollment', row.id)).length, 1);
    });
    await check('no invoice, wallet, reward, provider-reference or course certificate is issued', async () => {
      assert.equal(await db.storeInvoice.count(), 0); assert.equal(await db.invoice.count(), 0);
      assert.equal(await db.storePayment.count({ where: { providerReference: { not: null } } }), 0);
      assert.equal(await db.trainingCertificate.count(), 0);
      assert.equal(await db.walletEntry.count(), 0); assert.equal(await db.rewardEntry.count(), 0);
    });
    // Minimal real Nest HTTP boundary: actual controller/auth/admin guards, no
    // unrelated workers or external integrations are registered in this module.
    const { Module } = require('@nestjs/common');
    const { NestFactory } = require('@nestjs/core');
    const { StoreController } = require(resolve(__dirname, '../dist/store/store.controller.js'));
    const { AuthService } = require(resolve(__dirname, '../dist/auth/auth.service.js'));
    const { MfaService } = require(resolve(__dirname, '../dist/auth/mfa.service.js'));
    const { GoogleIdentityService } = require(resolve(__dirname, '../dist/auth/google-identity.service.js'));
    const { AccessTokenGuard } = require(resolve(__dirname, '../dist/auth/access-token.guard.js'));
    const { AdminGuard } = require(resolve(__dirname, '../dist/admin/admin.guard.js'));
    class CommerceHttpModule {}
    Module({ controllers: [StoreController], providers: [
      { provide: DatabaseService, useValue: db }, { provide: StoreService, useValue: store },
      AuthService, MfaService, GoogleIdentityService, AccessTokenGuard, AdminGuard,
    ] })(CommerceHttpModule);
    process.env.JWT_SECRET = 'disposable-commerce-http-test-secret-only';
    const app = await NestFactory.create(CommerceHttpModule, { logger: false });
    try {
      app.setGlobalPrefix('api/v1'); await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const tokens = new Map();
      for (const account of accounts) {
        const session = await db.session.create({ data: { accountId: account.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
        const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
        const body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: account.id, sid: session.id, exp: Math.floor(Date.now() / 1000) + 60 })}`;
        tokens.set(account.id, `${body}.${createHmac('sha256', process.env.JWT_SECRET).update(body).digest('base64url')}`);
      }
      await db.roleAssignment.create({ data: { accountId: admin.id, role: 'ADMIN', status: 'ACTIVE' } });
      const request = async (actor, path, method, data) => {
        const response = await loopbackFetch(base + '/api/v1' + path, { method, headers: { 'content-type': 'application/json', ...(actor ? { authorization: 'Bearer ' + tokens.get(actor.id) } : {}) }, body: JSON.stringify(data) });
        return { status: response.status, body: await response.json() };
      };
      await check('HTTP denies missing credentials and non-admin status mutation', async () => {
        const order = await makeOrder(), path = `/store/admin/orders/${order.id}/status`;
        assert.equal((await request(null, path, 'PATCH', { status: 'CONFIRMED' })).status, 401);
        assert.equal((await request(buyer, path, 'PATCH', { status: 'CONFIRMED' })).status, 403);
      });
      await check('HTTP creates owner payment with same-transaction actor audit and rejects invalid key', async () => {
        const order = await makeOrder(), path = `/store/orders/${order.id}/payment`;
        assert.equal((await request(buyer, path, 'POST', { idempotencyKey: 42 })).status, 400);
        const response = await request(buyer, path, 'POST', { idempotencyKey: randomUUID() });
        assert.equal(response.status, 201); assert.equal(response.body.financialActionExecuted, false);
        assert.equal((await events('StorePayment', response.body.id))[0].actorId, buyer.personId);
      });
      await check('HTTP admin controller forwards authenticated actor, not body actor', async () => {
        const order = await makeOrder();
        const response = await request(admin, `/store/admin/orders/${order.id}/status`, 'PATCH', { status: 'CONFIRMED', actorId: buyer.id });
        assert.equal(response.status, 200); assert.equal(response.body.status, 'CONFIRMED');
        assert.equal((await events('StoreOrder', order.id))[0].actorId, admin.personId);
      });
      await check('HTTP revoked session cannot create local payment', async () => {
        const order = await makeOrder(); await db.session.updateMany({ where: { accountId: buyer.id }, data: { revokedAt: new Date() } });
        assert.equal((await request(buyer, `/store/orders/${order.id}/payment`, 'POST', { idempotencyKey: randomUUID() })).status, 401);
        assert.equal(await db.storePayment.count({ where: { orderId: order.id } }), 0);
      });
    } finally { await app.close(); }
    console.log(JSON.stringify({ passed, failed, actualPostgreSQL: true, providerCalls: 0 }));
    process.exitCode = failed ? 1 : 0;
  } finally { await db.$disconnect(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
