// Actual PostgreSQL acceptance, restricted to a newly created disposable loopback DB.
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Prisma } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
global.fetch = () => { throw new Error('Provider/network calls forbidden in contract DB acceptance'); };
const build = process.env.COMMERCE_BUILD_DIR || resolve(__dirname, '../dist');
const { DatabaseService } = require(resolve(build, 'database/database.service.js'));
const { AuditService } = require(resolve(build, 'audit/audit.service.js'));
const { StoreService } = require(resolve(build, 'store/store.service.js'));
const { StoreOfferingsService } = require(resolve(build, 'store/store-offerings.service.js'));
const db = new DatabaseService();
const store = new StoreService(db, new AuditService(db)), offers = new StoreOfferingsService(db);
let passed = 0;
const check = async (name, run) => { await run(); passed++; console.log('PASS', name); };

(async () => {
  try {
    await db.$connect();
    const accounts = [];
    for (const label of ['owner', 'buyer']) {
      const person = await db.person.create({ data: { firstName: label, lastName: 'Synthetic snapshot acceptance' } });
      accounts.push(await db.account.create({ data: { personId: person.id, email: `snapshot-${label}-${randomUUID()}@example.invalid`, passwordHash: 'not-a-login', status: 'ACTIVE', emailVerifiedAt: new Date() } }));
    }
    const [owner, buyer] = accounts;
    const centers = [];
    for (const label of ['a', 'b']) centers.push(await db.organization.create({ data: { displayName: `Synthetic ${label}`, legalName: `Synthetic legal ${label}`, registrationNumber: `TEST-${randomUUID()}`, address: 'Disposable loopback fixture', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: owner.id } }));
    const goods = [];
    for (let i = 0; i < centers.length; i++) goods.push(await db.storeProduct.create({ data: { organizationId: centers[i].id, sku: randomUUID(), nameAr: `معدات تجريبية ${i}`, kind: 'GOODS', priceMinor: i ? 2500 : 11500, stockQuantity: 20, status: 'ACTIVE' } }));
    const makeOrder = () => store.createOrder(buyer.id, [{ productId: goods[0].id, quantity: 2 }, { productId: goods[1].id, quantity: 1 }]);
    const order = await makeOrder();
    const original = await db.storeOrderItem.findMany({ where: { orderId: order.id }, orderBy: { productId: 'asc' } });
    await check('PostgreSQL stores separate supplier and policy per order line', async () => {
      assert.equal(original.length, 2); assert.equal(order.totalMinor, 25500);
      for (const item of original) {
        const expected = goods.find(p => p.id === item.productId), contract = item.contractSnapshot;
        assert.equal(contract.issuer.organizationId, expected.organizationId);
        assert.equal(contract.source.id, item.id); assert.equal(contract.source.parentId, order.id);
        assert.equal(contract.amountMinor, item.quantity * item.unitPriceMinor);
        assert.equal(contract.refundPolicy.snapshot.kind, 'PHYSICAL_GOOD');
        assert.equal(contract.refundPolicy.snapshot.lineId, item.id);
        assert.equal(contract.customerAccountId, buyer.id); assert.equal(item.actualReceivedAt, null);
      }
    });
    await check('persisted line terms survive actual product and organization updates', async () => {
      await db.storeProduct.update({ where: { id: goods[0].id }, data: { priceMinor: 99999, nameAr: 'اسم معدّل بعد الطلب' } });
      await db.organization.update({ where: { id: centers[0].id }, data: { legalName: 'Changed after purchase' } });
      const persisted = await db.storeOrderItem.findMany({ where: { orderId: order.id }, orderBy: { productId: 'asc' } });
      assert.deepEqual(persisted, original);
      const read = (await store.listMine(buyer.id)).find(row => row.id === order.id);
      const changed = read.items.find(item => item.productId === goods[0].id);
      assert.equal(changed.product.priceMinor, 99999); assert.equal(changed.contractSnapshot.unitPriceMinor, 11500);
      assert.equal(changed.contractSnapshot.issuer.legalName, 'Synthetic legal a');
    });
    await check('generic service and existing non-SAR goods preserve unresolved policy boundaries', async () => {
      const generic = await db.storeProduct.create({ data: { organizationId: centers[0].id, sku: randomUUID(), nameAr: 'رحلة بلا تصنيف محدد', kind: 'SERVICE', priceMinor: 1000, stockQuantity: 2, status: 'ACTIVE' } });
      const usd = await db.storeProduct.create({ data: { organizationId: centers[0].id, sku: randomUUID(), nameAr: 'سلعة USD', kind: 'GOODS', currency: 'USD', priceMinor: 250, stockQuantity: 2, status: 'ACTIVE' } });
      const serviceOrder = await store.createOrder(buyer.id, [{ productId: generic.id, quantity: 1 }]);
      const usdOrder = await store.createOrder(buyer.id, [{ productId: usd.id, quantity: 2 }]);
      assert.equal(serviceOrder.items[0].contractSnapshot.refundPolicy.reasonCode, 'SERVICE_CLASSIFICATION_REQUIRED');
      assert.equal(usdOrder.currency, 'USD'); assert.equal(usdOrder.totalMinor, 500);
      assert.equal(usdOrder.items[0].contractSnapshot.refundPolicy.reasonCode, 'UNSUPPORTED_POLICY_CURRENCY');
    });
    await check('serialization rollback commits one contract with stable generated occurrence ids', async () => {
      const originalSerializable = db.serializable.bind(db); let first = true, firstOrderId, firstLineIds;
      db.serializable = work => originalSerializable(async tx => {
        const result = await work(tx);
        if (first) { first = false; firstOrderId = result.id; firstLineIds = result.items.map(item => item.id); throw new Prisma.PrismaClientKnownRequestError('Synthetic serialization conflict', { code: 'P2034', clientVersion: 'disposable-test' }); }
        return result;
      });
      let replayed;
      try { replayed = await makeOrder(); } finally { db.serializable = originalSerializable; }
      assert.equal(replayed.id, firstOrderId); assert.deepEqual(replayed.items.map(item => item.id), firstLineIds);
      assert.equal(await db.storeOrder.count({ where: { id: firstOrderId } }), 1);
      assert.equal(await db.storeOrderItem.count({ where: { orderId: firstOrderId } }), 2);
    });
    await check('forced transaction failure restores stock and leaves no order or snapshot', async () => {
      const beforeOrders = await db.storeOrder.count(), beforeItems = await db.storeOrderItem.count();
      const beforeStock = await db.storeProduct.findMany({ where: { id: { in: goods.map(p => p.id) } }, orderBy: { id: 'asc' } });
      const originalSerializable = db.serializable.bind(db);
      db.serializable = work => originalSerializable(async tx => { await work(tx); throw new Error('Injected post-write failure'); });
      try { await assert.rejects(makeOrder, /Injected post-write failure/); } finally { db.serializable = originalSerializable; }
      assert.equal(await db.storeOrder.count(), beforeOrders); assert.equal(await db.storeOrderItem.count(), beforeItems);
      assert.deepEqual(await db.storeProduct.findMany({ where: { id: { in: goods.map(p => p.id) } }, orderBy: { id: 'asc' } }), beforeStock);
    });
    await check('fulfillment does not invent actual receipt and legacy rows remain unsnapshotted', async () => {
      const legacy = await db.storeOrder.create({ data: { accountId: buyer.id, totalMinor: 1000, currency: 'SAR', items: { create: { productId: goods[0].id, quantity: 1, unitPriceMinor: 1000 } } }, include: { items: true } });
      assert.equal(legacy.items[0].contractSnapshot, null);
      await db.storePayment.create({ data: { orderId: legacy.id, accountId: buyer.id, amountMinor: 1000, currency: 'SAR', status: 'CAPTURED', idempotencyKey: randomUUID() } });
      await store.updateOrderStatus(legacy.id, 'CONFIRMED', owner.id);
      await store.updateOrderStatus(legacy.id, 'FULFILLED', owner.id);
      const row = await db.storeOrderItem.findUniqueOrThrow({ where: { id: legacy.items[0].id } });
      assert.equal(row.actualReceivedAt, null); assert.equal(row.contractSnapshot, null);
    });
    const offer = await db.storeCourseOffer.create({ data: { organizationId: centers[0].id, courseCode: 'SYNTHETIC-SNAPSHOT', title: 'دورة اختبار فقط', description: '', locationName: 'Loopback', startsAt: new Date('2099-03-01T00:00:00Z'), endsAt: new Date('2099-03-01T03:00:00Z'), capacity: 3, priceMinor: 39000, status: 'ACTIVE' } });
    await check('course persists original schedule, price and issuer through actual later edits and replay', async () => {
      const row = await offers.enroll(buyer.id, offer.id), contract = structuredClone(row.metadata.contractSnapshot);
      assert.equal(contract.source.id, row.id); assert.equal(contract.refundPolicy.snapshot.kind, 'COURSE');
      assert.equal(contract.refundPolicy.snapshot.contractedScheduledAt, offer.startsAt.toISOString());
      assert.equal(row.status, 'PENDING'); assert.equal(row.metadata.financialActionExecuted, false);
      await db.storeCourseOffer.update({ where: { id: offer.id }, data: { priceMinor: 60000, startsAt: new Date('2099-04-01T00:00:00Z'), endsAt: new Date('2099-04-01T03:00:00Z') } });
      const replay = await offers.enroll(buyer.id, offer.id);
      assert.equal(replay.id, row.id); assert.deepEqual(replay.metadata.contractSnapshot, contract);
      assert.equal(await db.auditEvent.count({ where: { resource: 'TrainingEnrollment', resourceId: row.id, action: 'STORE_COURSE_ENROLLED' } }), 1);
    });
    console.log(JSON.stringify({ suite: 'commerce-contract-snapshot-postgresql', passed, failed: 0, providerCalls: 0, productionWrites: 0 }));
  } finally { await db.$disconnect(); }
})().catch(error => { console.error('FAIL', error.message); process.exitCode = 1; });
