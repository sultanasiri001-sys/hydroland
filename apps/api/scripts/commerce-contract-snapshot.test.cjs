// Transactional service substitutes: no provider, external HTTP or production DB.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolve } = require('node:path');
const build = process.env.COMMERCE_BUILD_DIR || resolve(__dirname, '../dist');
const { createCommerceContractSnapshot } = require(resolve(build, 'commerce/commerce-contract-snapshot.js'));
const { StoreService } = require(resolve(build, 'store/store.service.js'));
const { StoreOfferingsService } = require(resolve(build, 'store/store-offerings.service.js'));
global.fetch = () => { throw new Error('Network is forbidden in snapshot regressions'); };

const center = (id = 'center-a') => ({ id, displayName: `Display ${id}`, legalName: `Legal ${id}`, registrationNumber: `TEST-${id}`, address: `Synthetic ${id}` });
const product = (id, org = center(), patch = {}) => ({ id, sku: id, nameAr: `معدات ${id}`, organizationId: org?.id ?? null, organization: org, kind: 'GOODS', priceMinor: 11500, currency: 'SAR', stockQuantity: 10, status: 'ACTIVE', ...patch });
const course = () => ({ id: 'course-a', organizationId: 'center-a', organization: center(), courseCode: 'SYNTHETIC', title: 'دورة تجريبية', priceMinor: 39000, currency: 'SAR', startsAt: new Date('2099-01-01T00:00:00Z'), endsAt: new Date('2099-01-01T04:00:00Z'), capacity: 10, locationName: 'Test' });
const direct = (patch = {}) => ({ sourceKind: 'STORE_ORDER_ITEM', sourceId: 'item-a', parentId: 'order-a', offeringId: 'product-a', customerAccountId: 'buyer', organizationId: 'center-a', organization: center(), kind: 'PHYSICAL_GOOD', title: 'معدات', quantity: 2, unitPriceMinor: 11500, currency: 'SAR', recordedAt: '2026-11-21T04:00:00+03:00', ...patch });

function fixture({ products = [product('a')], offer = course(), failOrder = false, failAudit = false } = {}) {
  const db = { state: { products, offer, orders: [], enrollments: [], audits: [] } };
  function facade(owner) {
    return {
      account: { findFirst: async ({ where }) => ({ id: where.id, status: 'ACTIVE' }) },
      storeProduct: {
        findMany: async ({ where, include }) => {
          assert.equal(include.organization.select.legalName, true, 'issuer is read with the catalog in the same transaction');
          return owner.state.products.filter(p => where.id.in.includes(p.id));
        },
        updateMany: async ({ where, data }) => {
          const p = owner.state.products.find(p => p.id === where.id && p.stockQuantity >= where.stockQuantity.gte);
          if (!p) return { count: 0 };
          p.stockQuantity -= data.stockQuantity.decrement; return { count: 1 };
        },
      },
      storeOrder: {
        create: async ({ data }) => {
          if (failOrder) throw new Error('Injected order persistence failure');
          const row = { ...data, status: 'CREATED', items: data.items.create.map(item => ({ ...item, orderId: data.id, actualReceivedAt: null })) };
          owner.state.orders.push(structuredClone(row)); return structuredClone(row);
        },
        findMany: async ({ where }) => owner.state.orders.filter(o => o.accountId === where.accountId).map(o => ({ ...structuredClone(o), items: o.items.map(item => ({ ...structuredClone(item), product: structuredClone(owner.state.products.find(p => p.id === item.productId)) })) })),
      },
      storeCourseOffer: { findFirst: async ({ include }) => { assert.equal(include.organization.select.registrationNumber, true); return owner.state.offer; } },
      trainingEnrollment: {
        findFirst: async ({ where }) => owner.state.enrollments.find(e => e.studentAccountId === where.studentAccountId && e.storeCourseOfferId === where.storeCourseOfferId && e.status !== 'CANCELLED') ?? null,
        count: async () => owner.state.enrollments.filter(e => e.status !== 'CANCELLED').length,
        create: async ({ data }) => { owner.state.enrollments.push(structuredClone(data)); return structuredClone(data); },
      },
      auditEvent: { create: async ({ data }) => { if (failAudit) throw new Error('Injected course audit failure'); owner.state.audits.push(structuredClone(data)); return data; } },
      $queryRaw: async () => [],
    };
  }
  Object.assign(db, facade(db));
  db.serializable = async work => {
    const tx = { state: structuredClone(db.state) }; Object.assign(tx, facade(tx));
    const result = await work(tx); db.state = tx.state; return result;
  };
  return { db, store: new StoreService(db, {}), offers: new StoreOfferingsService(db) };
}

test('mixed sellers freeze independent identities, policies and exact amounts per item', async () => {
  const { db, store } = fixture({ products: [product('a'), product('b', center('center-b'), { priceMinor: 2500 })] });
  const row = await store.createOrder('buyer', [{ productId: 'a', quantity: 2 }, { productId: 'b', quantity: 1 }]);
  assert.equal(row.totalMinor, 25500);
  assert.equal(row.items.length, 2);
  assert.notEqual(row.items[0].id, row.items[1].id);
  for (const item of row.items) {
    const snapshot = item.contractSnapshot;
    assert.equal(snapshot.source.id, item.id);
    assert.equal(snapshot.source.parentId, row.id);
    assert.equal(snapshot.amountMinor, item.quantity * item.unitPriceMinor);
    assert.equal(snapshot.refundPolicy.snapshot.lineId, item.id);
    assert.equal(snapshot.refundPolicy.snapshot.kind, 'PHYSICAL_GOOD');
    assert.equal(snapshot.customerAccountId, 'buyer');
    assert.equal(item.actualReceivedAt, null, 'creation is not delivery');
  }
  assert.deepEqual(row.items.map(x => x.contractSnapshot.issuer.organizationId), ['center-a', 'center-b']);
  assert.deepEqual(db.state.products.map(x => x.stockQuantity), [8, 9]);
});

test('catalog and seller edits cannot rewrite saved order contract exposed by existing reads', async () => {
  const { db, store } = fixture();
  const row = await store.createOrder('buyer', [{ productId: 'a', quantity: 1 }]);
  const before = structuredClone(row.items[0].contractSnapshot);
  db.state.products[0].priceMinor = 99999; db.state.products[0].nameAr = 'عنوان معدل';
  db.state.products[0].organization.legalName = 'Changed legal name';
  const [read] = await store.listMine('buyer');
  assert.equal(read.items[0].product.priceMinor, 99999, 'fixture demonstrates a real catalog change');
  assert.deepEqual(read.items[0].contractSnapshot, before);
});

test('duplicate product rows combine quantity into one exact line snapshot', async () => {
  const { store } = fixture();
  const row = await store.createOrder('buyer', [{ productId: 'a', quantity: 1 }, { productId: 'a', quantity: 2 }]);
  assert.equal(row.items.length, 1);
  assert.equal(row.items[0].contractSnapshot.quantity, 3);
  assert.equal(row.items[0].contractSnapshot.amountMinor, 34500);
});

test('generic service remains unclassified even when its display name says trip', async () => {
  const { store } = fixture({ products: [product('generic', center(), { kind: 'SERVICE', nameAr: 'رحلة بحرية' })] });
  const row = await store.createOrder('buyer', [{ productId: 'generic', quantity: 1 }]);
  assert.equal(row.items[0].contractSnapshot.kind, 'UNCLASSIFIED_SERVICE');
  assert.deepEqual(row.items[0].contractSnapshot.refundPolicy, { status: 'REVIEW_REQUIRED', reasonCode: 'SERVICE_CLASSIFICATION_REQUIRED', snapshot: null });
});

test('existing non-SAR store behavior is preserved without inventing conversion or refund policy', async () => {
  const { store } = fixture({ products: [product('usd', center(), { currency: 'USD', priceMinor: 250 })] });
  const row = await store.createOrder('buyer', [{ productId: 'usd', quantity: 2 }]);
  assert.equal(row.currency, 'USD'); assert.equal(row.totalMinor, 500);
  assert.equal(row.items[0].contractSnapshot.currency, 'USD');
  assert.deepEqual(row.items[0].contractSnapshot.refundPolicy, { status: 'REVIEW_REQUIRED', reasonCode: 'UNSUPPORTED_POLICY_CURRENCY', snapshot: null });
});

test('missing issuer information remains explicit and cannot claim invoice or customer acceptance', () => {
  const snapshot = createCommerceContractSnapshot(direct({ organizationId: null, organization: null }));
  assert.equal(snapshot.issuer.legalName, null); assert.equal(snapshot.issuer.taxRegistrationNumber, null);
  assert.equal(snapshot.issuer.invoiceReadiness, 'REVIEW_REQUIRED');
  assert.equal(snapshot.issuer.taxStatus, 'UNVERIFIED');
  assert.equal(snapshot.collectionModel, 'REVIEW_REQUIRED');
  assert.equal(snapshot.termsAcceptanceStatus, 'NOT_RECORDED');
  assert.equal(snapshot.financialActionExecuted, false);
  assert.ok(snapshot.issuer.missingFiscalFields.includes('organizationId'));
});

test('builder copies only selected issuer fields and returns independently frozen data', () => {
  const organization = { ...center(), unrelatedPrivateField: 'must-not-be-copied' };
  const snapshot = createCommerceContractSnapshot(direct({ organization }));
  organization.legalName = 'Later mutation';
  assert.equal(snapshot.issuer.legalName, 'Legal center-a');
  assert.equal(JSON.stringify(snapshot).includes('must-not-be-copied'), false);
  assert.ok(Object.isFrozen(snapshot)); assert.ok(Object.isFrozen(snapshot.issuer));
  assert.ok(Object.isFrozen(snapshot.refundPolicy.snapshot));
});

test('issuer mismatch rejects before inventory or order mutation', async () => {
  const { db, store } = fixture({ products: [product('bad', center('center-b'), { organizationId: 'center-a' })] });
  await assert.rejects(() => store.createOrder('buyer', [{ productId: 'bad', quantity: 1 }]), e => e.getStatus?.() === 400);
  assert.equal(db.state.products[0].stockQuantity, 10); assert.equal(db.state.orders.length, 0);
});

test('order persistence failure rolls back reserved stock and contract together', async () => {
  const { db, store } = fixture({ failOrder: true });
  await assert.rejects(() => store.createOrder('buyer', [{ productId: 'a', quantity: 1 }]), /Injected order persistence/);
  assert.equal(db.state.products[0].stockQuantity, 10); assert.equal(db.state.orders.length, 0);
});

test('out-of-range aggregate amount rejects before stock mutation', async () => {
  const { db, store } = fixture({ products: [product('huge', center(), { priceMinor: 2147483647 })] });
  await assert.rejects(() => store.createOrder('buyer', [{ productId: 'huge', quantity: 2 }]), e => e.getStatus?.() === 400);
  assert.equal(db.state.products[0].stockQuantity, 10); assert.equal(db.state.orders.length, 0);
});

test('course enrollment freezes its own issuer, original schedule and policy without financial activation', async () => {
  const { db, offers } = fixture();
  const row = await offers.enroll('buyer', 'course-a');
  const before = structuredClone(row.metadata.contractSnapshot);
  assert.equal(before.source.id, row.id);
  assert.equal(before.source.offeringId, 'course-a');
  assert.equal(before.issuer.organizationId, 'center-a');
  assert.equal(before.refundPolicy.snapshot.kind, 'COURSE');
  assert.equal(before.refundPolicy.snapshot.contractedScheduledAt, '2099-01-01T00:00:00.000Z');
  assert.equal(before.refundPolicy.snapshot.grossAmountMinor, 39000);
  assert.equal(row.status, 'PENDING'); assert.equal(row.metadata.financialActionExecuted, false);
  db.state.offer.priceMinor = 77700; db.state.offer.startsAt = new Date('2099-02-01T00:00:00Z');
  db.state.offer.organization.legalName = 'Renamed center';
  const replay = await offers.enroll('buyer', 'course-a');
  assert.equal(replay.id, row.id); assert.deepEqual(replay.metadata.contractSnapshot, before);
  assert.equal(db.state.enrollments.length, 1); assert.equal(db.state.audits.length, 1);
});

test('course audit failure rolls back enrollment and its snapshot', async () => {
  const { db, offers } = fixture({ failAudit: true });
  await assert.rejects(() => offers.enroll('buyer', 'course-a'), /Injected course audit/);
  assert.equal(db.state.enrollments.length, 0); assert.equal(db.state.audits.length, 0);
});

test('invalid calendar dates, inverted course schedule and fractional money cannot enter snapshots', () => {
  assert.throws(() => createCommerceContractSnapshot(direct({ recordedAt: '2026-02-30T10:00:00Z' })), /invalid/);
  assert.throws(() => createCommerceContractSnapshot(direct({ unitPriceMinor: 1.5 })), /invalid/);
  assert.throws(() => createCommerceContractSnapshot(direct({ sourceKind: 'TRAINING_ENROLLMENT', kind: 'COURSE', quantity: 1, originalStartsAt: '2026-12-01T00:00:00Z', originalEndsAt: '2026-11-30T23:00:00Z' })), /schedule/);
});

test('trip booking snapshots preserve all seats and the original provider schedule', () => {
  const snapshot = createCommerceContractSnapshot(direct({ sourceKind: 'TRIP_BOOKING', kind: 'TRIP', sourceId: 'booking-a', parentId: null, offeringId: 'trip-a', quantity: 3, originalStartsAt: '2026-12-01T08:00:00+03:00', originalEndsAt: '2026-12-01T10:00:00+03:00' }));
  assert.equal(snapshot.amountMinor, 34500);
  assert.equal(snapshot.refundPolicy.snapshot.kind, 'TRIP');
  assert.equal(snapshot.refundPolicy.snapshot.lineId, 'booking-a');
  assert.equal(snapshot.refundPolicy.snapshot.contractedScheduledAt, '2026-12-01T05:00:00.000Z');
  assert.equal(snapshot.issuer.organizationId, 'center-a');
  assert.throws(() => createCommerceContractSnapshot(direct({ sourceKind: 'TRIP_BOOKING' })), /Trip booking/);
});
