// One grouped order, four native obligations, four original payment sources.
// This acceptance deliberately makes no single-charge or real-bank claim.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {Prisma} = require('@prisma/client');
const {openFixture} = require('./mixed-commerce-fixture.cjs');

(async () => {
  const f = await openFixture();
  const {db, call, ok, denied, buyer, stranger, center, requests} = f;
  const passed = [];
  const check = async (name, work) => {await work(); assert.deepEqual(f.providerErrors, []); passed.push(name); console.log('PASS B08 ' + name);};
  const snapshot = async offer => {
    const [goods, bookings, courses, rentals, orders, lines, payments, checkouts, collection, refunds, ledger] = await Promise.all([
      db.storeProduct.findUniqueOrThrow({where: {id: offer.goods.id}, select: {stockQuantity: true}}),
      db.booking.count({where: {tripId: offer.trip.id}}),
      db.trainingEnrollment.count({where: {storeCourseOfferId: offer.course.id}}),
      db.$queryRaw`SELECT count(*)::int AS count FROM "EquipmentRentalItem" WHERE "resourceId"=${offer.equipment.id}`,
      db.unifiedStoreOrder.count(), db.unifiedStoreOrderLine.count(), db.payment.count(), db.commerceCheckout.count(),
      db.commerceCollectionEvidence.count(), db.checkoutRefund.count(), db.financeEntry.count(),
    ]);
    return {stock: goods.stockQuantity, bookings, courses, rentals: rentals[0].count, orders, lines, payments, checkouts, collection, refunds, ledger,
      providerWrites: requests.filter(row => row.method === 'POST').length};
  };
  const retryOnce = async (input, beforeRetry = async () => {}) => {
    const serializable = db.serializable.bind(db);
    let first, completedAttempts = 0, retried = false;
    db.serializable = work => serializable(async tx => {
      // This callback is entered again only after the failed transaction has
      // rolled back. A separate committed catalog update remains visible to it.
      if (first && !retried) {retried = true; await beforeRetry();}
      const result = await work(tx);
      if (result?.requestId === input.requestId && Array.isArray(result.lines)) {
        completedAttempts++;
        if (!first) {
          first = structuredClone(result);
          throw new Prisma.PrismaClientKnownRequestError('Synthetic B08 serialization retry', {code: 'P2034', clientVersion: 'disposable-test'});
        }
      }
      return result;
    });
    try {return {response: await call(buyer, '/store/unified-orders', 'POST', input), first, completedAttempts, retried};}
    finally {db.serializable = serializable;}
  };
  let main, order, collected, financial;
  try {
    await check('authenticated requests only; rejected caller does not create native children', async () => {
      const offer = await f.offerings('auth'), before = await snapshot(offer);
      denied(await call(null, '/store/unified-orders', 'POST', offer.input), 401);
      assert.deepEqual(await snapshot(offer), before);
    });
    await check('goods from two centers create distinct original seller orders with one exact grouped total', async () => {
      const otherCenter = await db.organization.create({data: {ownerId: stranger.id, kind: 'DIVE_CENTER', status: 'ACTIVE',
        displayName: 'Synthetic B08 second center', legalName: 'Synthetic B08 second original issuer', registrationNumber: 'SYNTHETIC-SECOND', address: 'Loopback second issuer'}});
      const products = await Promise.all([[center.id, 900], [otherCenter.id, 1100]].map(([organizationId, priceMinor]) =>
        db.storeProduct.create({data: {organizationId, priceMinor, sku: 'SYN-' + randomUUID(), nameAr: 'Synthetic multi-center goods',
          currency: 'SAR', stockQuantity: 10, status: 'ACTIVE', kind: 'GOODS'}})));
      const before = requests.filter(row => row.method === 'POST').length;
      const result = ok(await call(buyer, '/store/unified-orders', 'POST', {requestId: randomUUID(), items: [
        {kind: 'GOODS', productId: products[0].id, quantity: 2, expectedUnitPriceMinor: 900},
        {kind: 'GOODS', productId: products[1].id, quantity: 1, expectedUnitPriceMinor: 1100},
      ]}));
      assert.equal(result.paymentMode, 'PER_SOURCE'); assert.equal(result.totalMinor, 2900); assert.equal(result.lines.length, 2);
      assert.deepEqual(result.lines.map(line => line.organizationId).sort(), [center.id, otherCenter.id].sort());
      assert.equal(new Set(result.lines.map(line => line.sourceId)).size, 2);
      for (const line of result.lines) {
        assert.equal(line.sourceType, 'STORE_ORDER'); assert.equal(line.contractSnapshot.issuer.organizationId, line.organizationId);
        const native = await db.storeOrder.findUniqueOrThrow({where: {id: line.sourceId}, include: {items: true}});
        assert.equal(native.totalMinor, line.amountMinor); assert.equal(native.accountId, buyer.id);
        assert.ok(native.items.every(item => item.contractSnapshot.issuer.organizationId === line.organizationId));
        const quote = ok(await call(buyer, `/store/orders/${line.sourceId}/quote`));
        assert.equal(quote.snapshot.amountMinor, line.amountMinor);
      }
      assert.equal(result.lines.reduce((sum, line) => sum + line.amountMinor, 0), 2900);
      assert.equal(requests.filter(row => row.method === 'POST').length, before);
    });
    await check('a rejected final course rolls back earlier goods and trip reservations', async () => {
      const offer = await f.offerings('rollback'), before = await snapshot(offer);
      const bad = structuredClone(offer.input); bad.items.find(row => row.kind === 'COURSE').expectedUnitPriceMinor = 1;
      denied(await call(buyer, '/store/unified-orders', 'POST', bad), 409);
      assert.deepEqual(await snapshot(offer), before);
    });
    await check('a database failure at parent persistence rolls back all four native children', async () => {
      const offer = await f.offerings('database-rollback'), before = await snapshot(offer);
      await db.$executeRawUnsafe("CREATE FUNCTION b08_fail_parent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic B08 parent persistence failure'; END $$");
      await db.$executeRawUnsafe('CREATE TRIGGER b08_fail_parent BEFORE INSERT ON "UnifiedStoreOrder" FOR EACH ROW EXECUTE FUNCTION b08_fail_parent()');
      try {denied(await call(buyer, '/store/unified-orders', 'POST', offer.input), 500);}
      finally {
        await db.$executeRawUnsafe('DROP TRIGGER b08_fail_parent ON "UnifiedStoreOrder"');
        await db.$executeRawUnsafe('DROP FUNCTION b08_fail_parent()');
      }
      assert.deepEqual(await snapshot(offer), before);
    });
    await check('serialization retry preserves grouped and native identities and original terms without freezing rental transaction time', async () => {
      const offer = await f.offerings('retry-identities'), before = await snapshot(offer);
      const retried = await retryOnce(offer.input), result = ok(retried.response);
      assert.equal(retried.completedAttempts, 2); assert.equal(retried.retried, true);
      const occurrence = value => ({id: value.id, lines: value.lines.map(line => {
        const contractSnapshot = structuredClone(line.contractSnapshot);
        // Native rental reservation time is the current transaction's database
        // clock. Preserve that existing rule while proving all other terms.
        if (line.kind === 'RENTAL') {delete contractSnapshot.contractedAt; delete contractSnapshot.policySnapshot.contractedAt;}
        return {id: line.id, kind: line.kind, sourceType: line.sourceType, sourceId: line.sourceId, contractSnapshot,
          ...(line.kind === 'RENTAL' ? {} : {contractHash: line.contractHash})};
      }).sort((a, b) => a.kind.localeCompare(b.kind))});
      assert.deepEqual(occurrence(result), occurrence(retried.first));
      const rental = result.lines.find(line => line.kind === 'RENTAL'), previousRental = retried.first.lines.find(line => line.kind === 'RENTAL');
      assert.ok(Date.parse(rental.contractSnapshot.contractedAt) >= Date.parse(previousRental.contractSnapshot.contractedAt));
      assert.equal(rental.contractSnapshot.policySnapshot.contractedAt, rental.contractSnapshot.contractedAt);
      assert.equal(rental.contractHash, f.load('store/store-checkout-contract.js').storeContractHash(rental.contractSnapshot));
      const [nativeRental] = await db.$queryRaw`SELECT "reservedAt" FROM "EquipmentRental" WHERE id=${rental.sourceId}`;
      assert.equal(nativeRental.reservedAt.toISOString(), rental.contractSnapshot.contractedAt);
      const after = await snapshot(offer);
      assert.equal(after.orders, before.orders + 1); assert.equal(after.lines, before.lines + 4);
      assert.equal(after.stock, 18); assert.equal(after.bookings, 1); assert.equal(after.courses, 1); assert.equal(after.rentals, 1);
      for (const key of ['payments', 'checkouts', 'collection', 'refunds', 'ledger', 'providerWrites']) assert.equal(after[key], before[key], key);
      assert.equal(await db.auditEvent.count({where: {action: 'UNIFIED_STORE_ORDER_CREATED', resourceId: result.id}}), 1);
    });
    await check('every source rechecks current catalog price after serialization rollback before committing original consent', async () => {
      for (const kind of ['GOODS', 'TRIP', 'COURSE', 'RENTAL']) {
        const offer = await f.offerings('retry-price-' + kind.toLowerCase()), before = await snapshot(offer);
        const retried = await retryOnce(offer.input, async () => {
          if (kind === 'GOODS') await db.storeProduct.update({where: {id: offer.goods.id}, data: {priceMinor: 1201}});
          else if (kind === 'TRIP') await db.operationalSetting.update({where: {key: 'trip-price:' + offer.trip.id}, data: {value: {pricePerSeatMinor: 2301, currency: 'SAR'}}});
          else if (kind === 'COURSE') await db.storeCourseOffer.update({where: {id: offer.course.id}, data: {priceMinor: 3401}});
          else await db.operationalSetting.update({where: {key: 'store-rental-rate:' + offer.equipment.id},
            data: {value: {organizationId: center.id, published: true, baseMinor: 4501, currency: 'SAR'}}});
        });
        denied(retried.response, 409); assert.equal(retried.completedAttempts, 1); assert.equal(retried.retried, true);
        assert.deepEqual(await snapshot(offer), before, kind);
        assert.equal(await db.unifiedStoreOrder.count({where: {id: retried.first.id}}), 0);
        assert.equal(await db.auditEvent.count({where: {action: 'UNIFIED_STORE_ORDER_CREATED', resourceId: retried.first.id}}), 0);
      }
    });
    await check('simultaneous identical requests create one grouped order and one of every native source', async () => {
      main = await f.offerings('main');
      const before = await snapshot(main);
      const results = await Promise.all([call(buyer, '/store/unified-orders', 'POST', main.input), call(buyer, '/store/unified-orders', 'POST', main.input)]);
      order = ok(results[0]); const other = ok(results[1]); assert.equal(order.id, other.id);
      assert.equal(order.paymentMode, 'PER_SOURCE'); assert.equal(order.financialActionExecuted, false);
      assert.equal(order.currency, 'SAR'); assert.equal(order.totalMinor, 12_600);
      assert.equal(order.lines.length, 4); assert.deepEqual(order.lines.map(line => line.kind).sort(), ['COURSE', 'GOODS', 'RENTAL', 'TRIP']);
      assert.equal(order.lines.reduce((sum, line) => sum + line.amountMinor, 0), order.totalMinor);
      const after = await snapshot(main);
      assert.equal(after.orders, before.orders + 1); assert.equal(after.lines, before.lines + 4);
      assert.equal(after.stock, 18); assert.equal(after.bookings, 1); assert.equal(after.courses, 1); assert.equal(after.rentals, 1);
      for (const key of ['payments', 'checkouts', 'collection', 'refunds', 'ledger', 'providerWrites']) assert.equal(after[key], before[key], key);
    });
    await check('replay is exact and a changed request key payload has no side effects', async () => {
      const before = await snapshot(main);
      const replay = ok(await call(buyer, '/store/unified-orders', 'POST', {...main.input, items: [...main.input.items].reverse()}));
      assert.equal(replay.id, order.id);
      const changed = structuredClone(main.input); changed.items.find(row => row.kind === 'GOODS').quantity = 1;
      denied(await call(buyer, '/store/unified-orders', 'POST', changed), 409);
      assert.deepEqual(await snapshot(main), before);
    });
    await check('cross-customer reads, forged authority and duplicate line inputs are rejected', async () => {
      const before = await snapshot(main);
      denied(await call(stranger, '/store/unified-orders/' + order.id), 404);
      const mine = ok(await call(stranger, '/store/unified-orders')); assert.ok(!mine.items.some(item => item.id === order.id));
      denied(await call(buyer, '/store/unified-orders', 'POST', {...main.input, requestId: randomUUID(), accountId: stranger.id}), 400);
      denied(await call(buyer, '/store/unified-orders', 'POST', {...main.input, requestId: randomUUID(), items: [main.input.items[0], main.input.items[0]]}), 400);
      assert.deepEqual(await snapshot(main), before);
    });
    await check('different concurrent requests cannot consume the same course, trip or equipment twice', async () => {
      const offer = await f.offerings('different-request-race');
      const before = await snapshot(offer);
      const results = await Promise.all([call(buyer, '/store/unified-orders', 'POST', offer.input),
        call(buyer, '/store/unified-orders', 'POST', {...offer.input, requestId: randomUUID()})]);
      assert.equal(results.filter(row => row.status >= 200 && row.status < 300).length, 1, JSON.stringify(results));
      assert.equal(results.filter(row => row.status === 409).length, 1, JSON.stringify(results));
      const after = await snapshot(offer);
      assert.equal(after.orders, before.orders + 1); assert.equal(after.lines, before.lines + 4);
      assert.equal(after.stock, 18); assert.equal(after.bookings, 1); assert.equal(after.courses, 1); assert.equal(after.rentals, 1);
      assert.equal(after.providerWrites, before.providerWrites);
    });
    await check('each grouped line preserves its original source, issuer, price, schedule and policy', async () => {
      for (const line of order.lines) {
        assert.equal(line.organizationId, center.id); assert.equal(line.currency, 'SAR');
        const s = line.contractSnapshot; assert.equal(s.customerAccountId, buyer.id); assert.equal(s.issuer.organizationId, center.id);
        assert.equal(s.amountMinor, line.amountMinor); assert.match(line.contractHash, /^[a-f0-9]{64}$/);
        if (line.kind === 'GOODS') {
          const native = await db.storeOrder.findUniqueOrThrow({where: {id: line.sourceId}, include: {items: true}});
          assert.equal(native.accountId, buyer.id); assert.deepEqual(s.lines, native.items.map(item => item.contractSnapshot));
          assert.equal(s.lines[0].kind, 'PHYSICAL_GOOD'); assert.equal(s.lines[0].refundPolicy.snapshot.lineId, native.items[0].id);
        } else if (line.kind === 'TRIP') {
          const native = await db.booking.findUniqueOrThrow({where: {id: line.sourceId}});
          assert.deepEqual(s, native.contractSnapshot); assert.equal(s.kind, 'TRIP'); assert.equal(s.source.id, native.id);
          assert.equal(s.originalSchedule.startsAt, main.trip.startsAt.toISOString());
        } else if (line.kind === 'COURSE') {
          const native = await db.trainingEnrollment.findUniqueOrThrow({where: {id: line.sourceId}});
          assert.deepEqual(s, native.metadata.contractSnapshot); assert.equal(s.kind, 'COURSE');
          assert.equal(s.originalSchedule.startsAt, main.course.startsAt.toISOString());
        } else {
          const [native] = await db.$queryRaw`SELECT "contractSnapshot" FROM "EquipmentRental" WHERE id=${line.sourceId}`;
          assert.deepEqual(s, native.contractSnapshot); assert.equal(s.sourceType, 'EQUIPMENT_RENTAL');
          assert.equal(s.scheduledHandoverAt, main.scheduledHandoverAt); assert.equal(s.originalDueAt, main.dueAt);
          assert.equal(s.policySnapshot.kind, 'RENTAL'); assert.equal(s.damagePolicy.upfrontDepositMinor, 0);
        }
      }
      await db.storeProduct.update({where: {id: main.goods.id}, data: {priceMinor: 9900}});
      await db.storeCourseOffer.update({where: {id: main.course.id}, data: {priceMinor: 9800}});
      await db.operationalSetting.update({where: {key: 'trip-price:' + main.trip.id}, data: {value: {pricePerSeatMinor: 9700, currency: 'SAR'}}});
      await db.operationalSetting.update({where: {key: 'store-rental-rate:' + main.equipment.id}, data: {value: {organizationId: center.id, published: true, baseMinor: 9600, currency: 'SAR'}}});
      const reloaded = ok(await call(buyer, '/store/unified-orders/' + order.id));
      assert.equal(reloaded.totalMinor, order.totalMinor);
      for (const line of order.lines) {
        const read = reloaded.lines.find(item => item.id === line.id);
        assert.equal(read.contractHash, line.contractHash); assert.deepEqual(read.contractSnapshot, line.contractSnapshot);
      }
    });
    await check('forged consent is refused before any native provider invoice is created', async () => {
      const before = requests.filter(row => row.method === 'POST').length;
      for (const line of order.lines) {
        const path = line.kind === 'TRIP' ? `/payments/bookings/${line.sourceId}` : f.sourcePath(line);
        denied(await call(stranger, path + '/quote'), 404);
        const quote = ok(await call(buyer, path + '/quote'));
        const result = line.kind === 'TRIP'
          ? await call(buyer, '/payments', 'POST', {bookingId: line.sourceId, idempotencyKey: randomUUID(), policyAcceptance: {version: quote.policyVersion, quoteHash: '0'.repeat(64)}})
          : await call(buyer, path + '/checkout', 'POST', {quoteHash: '0'.repeat(64), acceptedPolicyVersion: quote.policyVersion, idempotencyKey: randomUUID()});
        denied(result, 409);
      }
      assert.equal(requests.filter(row => row.method === 'POST').length, before);
    });
    await check('the same four sources collect through native HTTP adapters with exact separate totals and posted ledgers', async () => {
      collected = [];
      for (const line of order.lines) collected.push(await f.collectLine(line));
      assert.equal(new Set(collected.map(item => item.providerPayment.id)).size, 4);
      assert.equal(collected.reduce((sum, item) => sum + item.providerPayment.amount, 0), order.totalMinor);
      const entries = await db.financeEntry.findMany({where: {id: {in: collected.map(item => item.revenue.id)}}});
      assert.equal(entries.length, 4); assert.ok(entries.every(entry => entry.status === 'POSTED' && entry.type === 'REVENUE'));
      assert.equal(entries.reduce((sum, entry) => sum + entry.amountMinor, 0), order.totalMinor);
      const reloaded = ok(await call(buyer, '/store/unified-orders/' + order.id));
      assert.equal(reloaded.paymentMode, 'PER_SOURCE'); assert.equal(reloaded.totalMinor, 12_600);
      for (const line of reloaded.lines) assert.ok(['CAPTURED', 'PAID', 'CONFIRMED'].includes(line.paymentStatus), JSON.stringify(line));
    });
    // Financial source lifecycle checks are kept in the same process and receive
    // these exact order/source identifiers; they must not create replacement sales.
    if (process.env.B08_ACCEPTANCE_STAGE !== 'CREATION') {
      const {verifyFinancialLifecycle} = require('./mixed-commerce-finance-checks.cjs');
      financial = await verifyFinancialLifecycle(f, {main, order, collected, check});
    }
    console.log(JSON.stringify({suite: 'B08_MIXED_NATIVE_ORDER', passed: passed.length, orderId: order.id, kinds: order.lines.map(row => row.kind),
      totalMinor: order.totalMinor, paymentMode: order.paymentMode, provider: 'SYNTHETIC_LOOPBACK', database: 'DISPOSABLE_LOOPBACK', financial, checks: passed}, null, 2));
  } finally {await f.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
