// Actual PostgreSQL orchestration plus the actual Moyasar adapter against a
// synthetic loopback HTTP server. Never accepts a production database/provider.
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const { resolve } = require('node:path');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const build = process.env.COMMERCE_BUILD_DIR || resolve(__dirname, '../dist');
const { DatabaseService } = require(resolve(build, 'database/database.service.js'));
const { PaymentRefundExecutionService } = require(resolve(build, 'payments/payment-refund-execution.service.js'));
const { MoyasarPaymentProviderService } = require(resolve(build, 'payments/moyasar-payment-provider.service.js'));
const { PaymentContractService } = require(resolve(build, 'commerce/payment-contract.service.js'));
const { FinanceOperationGrantService } = require(resolve(build, 'finance/finance-operation-grant.service.js'));
const { FinancePersistenceService } = require(resolve(build, 'finance/finance-persistence.service.js'));
const { createCommerceContractSnapshot } = require(resolve(build, 'commerce/commerce-contract-snapshot.js'));
const db = new DatabaseService();
const contracts = new PaymentContractService(db), grants = new FinanceOperationGrantService(db), finance = new FinancePersistenceService(db);
const providerPayments = new Map(), signals = [];
const integration = { requireOperational: () => ({ status: 'SANDBOX' }), recordProviderSignal: async (...signal) => { signals.push(signal); } };
const provider = new MoyasarPaymentProviderService(integration), refunds = new PaymentRefundExecutionService(db, provider, contracts);
const originalFetch = global.fetch;
let providerOrigin, passed = 0, owner;
const outcomes = [];
const status = code => error => error.getStatus?.() === code;
const check = async (name, run) => { await run(); passed++; outcomes.push(name); console.log('PASS', name); };
const server = createServer(async (request, response) => {
  try {
    const match = /^\/v1\/payments\/([0-9a-f-]+)(\/refund)?$/.exec(request.url || '');
    const row = match && providerPayments.get(match[1]);
    if (!row) { response.writeHead(404).end(); return; }
    if (request.method === 'GET' && !match[2]) row.gets++;
    else if (request.method === 'POST' && match[2]) {
      row.posts++;
      let body = ''; for await (const part of request) body += part;
      const command = JSON.parse(body);
      assert.deepEqual(Object.keys(command), ['amount']);
      assert.ok(Number.isSafeInteger(command.amount) && command.amount > 0 && command.amount <= row.payload.amount - row.payload.refunded);
      row.payload.refunded += command.amount;
      row.payload.status = row.payload.refunded === row.payload.amount ? 'refunded' : 'paid';
      row.payload.refunded_at = new Date().toISOString(); row.payload.updated_at = row.payload.refunded_at;
      if (row.afterApply) await row.afterApply();
      if (row.mode === 'TIMEOUT_AFTER_APPLY') { const timer = setTimeout(() => response.destroy(), 9000); timer.unref(); return; }
      if (row.mode === 'DROP_AFTER_APPLY') { request.socket.destroy(); return; }
    } else { response.writeHead(405).end(); return; }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(row.payload));
  } catch (error) { response.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Synthetic fixture rejected request' })); }
});

async function account(label) {
  const person = await db.person.create({ data: { firstName: label, lastName: 'Synthetic refund acceptance' } });
  return db.account.create({ data: { personId: person.id, email: `refund-${label}-${randomUUID()}@example.invalid`, passwordHash: 'not-a-login', status: 'ACTIVE', emailVerifiedAt: new Date() } });
}

async function approvedEntry(fixture, amountMinor) {
  const entry = await finance.createEntry({ organizationId: fixture.center.id, financeAccountId: fixture.financeAccount.id, type: 'REFUND', amountMinor, currency: 'SAR', referenceType: 'PAYMENT_REFUND', referenceId: fixture.payment.id, requestedByAccountId: fixture.preparer.id });
  await finance.decideEntry(entry.id, fixture.approver.id, true, 'Synthetic local approval');
  return db.financeEntry.findUniqueOrThrow({ where: { id: entry.id } });
}

async function fixture(options = {}) {
  const [preparer, approver, executor, buyer, outsider] = await Promise.all(['preparer','approver','executor','buyer','outsider'].map(account));
  const center = await db.organization.create({ data: { displayName: 'Synthetic supplier', legalName: 'Synthetic supplier legal', registrationNumber: `TEST-${randomUUID()}`, address: 'Loopback only', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: owner.id } });
  const recordedAt = new Date(Date.now() - 12 * 86400000), startsAt = new Date(Date.now() + (options.halfPolicy ? 12 : 72) * 3600000), endsAt = new Date(startsAt.getTime() + 3600000);
  const trip = await db.trip.create({ data: { organizationId: center.id, title: 'Synthetic no real trip', type: 'BOAT_DIVE', startsAt, endsAt, capacity: 2, status: 'OPEN' } });
  const bookingId = randomUUID();
  const contract = createCommerceContractSnapshot({ sourceKind: 'TRIP_BOOKING', sourceId: bookingId, parentId: null, offeringId: trip.id, customerAccountId: buyer.id, organizationId: center.id, organization: center, kind: 'TRIP', title: trip.title, quantity: 1, unitPriceMinor: 10000, currency: 'SAR', recordedAt: recordedAt.toISOString(), originalStartsAt: startsAt.toISOString(), originalEndsAt: endsAt.toISOString() });
  const accepted = { ...contract, termsAcceptanceStatus: 'ACCEPTED', termsAcceptedAt: recordedAt.toISOString() };
  const booking = await db.booking.create({ data: { id: bookingId, tripId: trip.id, accountId: buyer.id, seats: 1, status: 'CONFIRMED', createdAt: recordedAt, contractSnapshot: contract } });
  const providerPaymentId = randomUUID(), invoiceId = randomUUID();
  const payment = await db.payment.create({ data: { bookingId: booking.id, accountId: buyer.id, amountMinor: 10000, currency: 'SAR', status: 'CAPTURED', idempotencyKey: randomUUID(), providerReference: invoiceId, moyasarPaymentId: providerPaymentId, contractSnapshot: accepted } });
  const requestedAt = new Date(Date.now() - 1000);
  const request = await db.auditEvent.create({ data: { actorId: buyer.personId, action: 'PAYMENT_REFUND_REQUESTED', resource: 'Payment', resourceId: payment.id, occurredAt: requestedAt, metadata: { accountId: buyer.id, bookingId: booking.id, amountMinor: 10000, requestedAmountMinor: options.requestedAmountMinor ?? 10000, currency: 'SAR', reason: 'Synthetic local cancellation', financialActionExecuted: false } } });
  if (options.halfPolicy) await db.operationalSetting.create({ data: { key: `commerce-legal-classification:TRIP:${trip.id}`, value: { sourceId: trip.id, sourceType: 'TRIP', classification: 'EXEMPT', exception: 'TRANSPORT', evidenceReference: 'SYNTHETIC_CLASSIFICATION_NOT_A_LEGAL_ADOPTION' } } });
  const financeAccount = await finance.createAccount({ organizationId: center.id, name: 'Synthetic collection ledger', currency: 'SAR' });
  const result = { preparer, approver, executor, buyer, outsider, center, trip, booking, contract, payment, request, financeAccount };
  const validFrom = new Date(Date.now() - 86400000).toISOString(), validUntil = new Date(Date.now() + 86400000).toISOString();
  result.approvalGrant = await grants.create(owner.id, { accountId: approver.id, organizationId: center.id, operation: 'APPROVE_REFUND', currency: 'SAR', limitMinor: 20000, validFrom, validUntil });
  if (!options.noExecuteGrant) result.executionGrant = await grants.create(owner.id, { accountId: executor.id, organizationId: center.id, operation: 'EXECUTE_REFUND', currency: 'SAR', limitMinor: options.limitMinor || 20000, validFrom, validUntil });
  result.entry = await approvedEntry(result, options.amountMinor || 1000);
  result.command = { paymentId: payment.id, requestAuditEventId: request.id, financeEntryId: result.entry.id, idempotencyKey: randomUUID() };
  result.provider = { gets: 0, posts: 0, mode: 'NORMAL', payload: { id: providerPaymentId, invoice_id: invoiceId, amount: 10000, currency: 'SAR', status: 'paid', captured: 0, refunded: 0, updated_at: new Date(Date.now() - 10000).toISOString(), refunded_at: null } };
  providerPayments.set(providerPaymentId, result.provider);
  return result;
}

async function noMutation(f, operationCount = 0) {
  assert.equal(f.provider.posts, 0); assert.equal(f.provider.gets, 0);
  assert.equal(await db.commerceRefundOperation.count({ where: { paymentId: f.payment.id } }), operationCount);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 0);
  assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).status, 'APPROVED');
}

(async () => {
  try {
    await db.$connect();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    providerOrigin = `http://127.0.0.1:${server.address().port}`;
    global.fetch = (input, init) => { const target = new URL(typeof input === 'string' ? input : input.url || input); assert.equal(target.origin, providerOrigin, 'Only the synthetic loopback provider can be called'); return originalFetch(input, init); };
    process.env.HYDROLAND_PAYMENT_PROVIDER = 'MOYASAR';
    process.env.MOYASAR_SECRET_KEY = 'sk_test_SYNTHETIC_LOCAL_ONLY';
    process.env.MOYASAR_API_BASE_URL = `${providerOrigin}/v1/`;
    owner = await account('owner');
    process.env.D12_OWNER_EMAIL = owner.email;
    await db.roleAssignment.create({ data: { accountId: owner.id, role: 'ADMIN', status: 'ACTIVE' } });
    const platform = await db.organization.create({ data: { displayName: 'Synthetic platform', kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE', ownerId: owner.id } });
    await db.operationalSetting.upsert({ where: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1' }, create: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1', value: { organizationId: platform.id } }, update: { value: { organizationId: platform.id } } });

    await check('real provider HTTP partial then full refund posts the existing ledger and exact cumulative counter', async () => {
      const f = await fixture({ amountMinor: 3000 });
      const first = await refunds.execute(f.executor.id, f.command);
      assert.equal(first.status, 'SUCCEEDED'); assert.equal(first.amountMinor, 3000);
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 3000);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).status, 'POSTED');
      const secondEntry = await approvedEntry(f, 7000);
      const second = await refunds.execute(f.executor.id, { ...f.command, financeEntryId: secondEntry.id, idempotencyKey: randomUUID() });
      const payment = await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } });
      assert.equal(second.status, 'SUCCEEDED'); assert.equal(payment.refundedAmountMinor, 10000); assert.equal(payment.status, 'REFUNDED');
      assert.equal(f.provider.posts, 2); assert.equal(await db.commerceRefundOperation.count({ where: { paymentId: f.payment.id, status: 'SUCCEEDED' } }), 2);
    });
    await check('eight exact concurrent executions issue one POST and one posted operation', async () => {
      const f = await fixture({ amountMinor: 10000 });
      const results = await Promise.all(Array.from({ length: 8 }, () => refunds.execute(f.executor.id, f.command)));
      assert.equal(new Set(results.map(r => r.id)).size, 1); assert.equal(f.provider.posts, 1);
      const [operation] = await db.commerceRefundOperation.findMany({ where: { paymentId: f.payment.id } });
      assert.equal(operation.status, 'SUCCEEDED');
      assert.equal(await db.auditEvent.count({ where: { action: 'PAYMENT_REFUND_POSTED', resourceId: operation.id } }), 1);
      const replay = await refunds.execute(f.executor.id, f.command); assert.equal(replay.status, 'SUCCEEDED'); assert.equal(f.provider.posts, 1);
    });
    await check('concurrent different operations cannot over-refund one captured balance', async () => {
      const f = await fixture({ amountMinor: 6000 }), secondEntry = await approvedEntry(f, 6000);
      const results = await Promise.allSettled([refunds.execute(f.executor.id, f.command), refunds.execute(f.executor.id, { ...f.command, financeEntryId: secondEntry.id, idempotencyKey: randomUUID() })]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(results.filter(r => r.status === 'rejected').length, 1);
      assert.equal(f.provider.posts, 1); assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 6000);
    });
    await check('trip half-refund entitlement is cumulative across separate approved requests', async () => {
      const f = await fixture({ amountMinor: 2500, halfPolicy: true });
      assert.equal((await refunds.execute(f.executor.id, f.command)).status, 'SUCCEEDED');
      const secondEntry = await approvedEntry(f, 2500);
      assert.equal((await refunds.execute(f.executor.id, { ...f.command, financeEntryId: secondEntry.id, idempotencyKey: randomUUID() })).status, 'SUCCEEDED');
      const tooMuch = await approvedEntry(f, 1);
      await assert.rejects(() => refunds.execute(f.executor.id, { ...f.command, financeEntryId: tooMuch.id, idempotencyKey: randomUUID() }), status(409));
      assert.equal(f.provider.posts, 2); assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 5000);
    });
    await check('one partial customer request has a cumulative cap across approved entries and distinct idempotency keys', async () => {
      const f = await fixture({ amountMinor: 2000, requestedAmountMinor: 3500 });
      assert.equal((await refunds.execute(f.executor.id, f.command)).status, 'SUCCEEDED');
      const excessive = await approvedEntry(f, 2000);
      const callsBefore = { posts: f.provider.posts, gets: f.provider.gets };
      const limitError = error => error.getStatus?.() === 409 && error.getResponse?.().code === 'PAYMENT_REFUND_REQUEST_LIMIT_EXCEEDED';
      await assert.rejects(() => refunds.execute(f.executor.id, { ...f.command, financeEntryId: excessive.id, idempotencyKey: randomUUID() }), limitError);
      assert.deepEqual({ posts: f.provider.posts, gets: f.provider.gets }, callsBefore);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: excessive.id } })).status, 'APPROVED');
      assert.equal(await db.commerceRefundOperation.count({ where: { requestAuditEventId: f.request.id } }), 1);
      const remaining = await approvedEntry(f, 1500);
      const remainderCommand = { ...f.command, financeEntryId: remaining.id, idempotencyKey: randomUUID() };
      assert.equal((await refunds.execute(f.executor.id, remainderCommand)).status, 'SUCCEEDED');
      assert.equal((await refunds.execute(f.executor.id, remainderCommand)).status, 'SUCCEEDED');
      assert.equal(f.provider.posts, 2, 'Successful replay must not spend the partial request twice');
      const oneMore = await approvedEntry(f, 1);
      await assert.rejects(() => refunds.execute(f.executor.id, { ...f.command, financeEntryId: oneMore.id, idempotencyKey: randomUUID() }), limitError);
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 3500);
      // A separately recorded customer request may authorize the unspent payment
      // balance; the first request's cap does not become a global amount setting.
      const subsequent = await db.auditEvent.create({ data: { actorId: f.buyer.personId, action: 'PAYMENT_REFUND_REQUESTED', resource: 'Payment', resourceId: f.payment.id,
        metadata: { ...f.request.metadata, requestedAmountMinor: 6500, reason: 'Synthetic subsequent customer request for the remaining balance' } } });
      const finalEntry = await approvedEntry(f, 6500);
      assert.equal((await refunds.execute(f.executor.id, { ...f.command, requestAuditEventId: subsequent.id, financeEntryId: finalEntry.id, idempotencyKey: randomUUID() })).status, 'SUCCEEDED');
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 10000);
      const attributed = await db.commerceRefundOperation.aggregate({ where: { requestAuditEventId: f.request.id, status: 'SUCCEEDED' }, _sum: { amountMinor: true } });
      assert.equal(attributed._sum.amountMinor, 3500);
      assert.equal(f.provider.posts, 3);
    });
    await check('concurrent partial-request reuse stays within the customer cap after the pending operation completes', async () => {
      const f = await fixture({ amountMinor: 2000, requestedAmountMinor: 3500 });
      const otherEntry = await approvedEntry(f, 2000);
      const commands = [f.command, { ...f.command, financeEntryId: otherEntry.id, idempotencyKey: randomUUID() }];
      const results = await Promise.allSettled(commands.map(command => refunds.execute(f.executor.id, command)));
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(results.filter(result => result.status === 'rejected').length, 1);
      const rejectedIndex = results.findIndex(result => result.status === 'rejected');
      await assert.rejects(() => refunds.execute(f.executor.id, commands[rejectedIndex]), error => error.getStatus?.() === 409 && error.getResponse?.().code === 'PAYMENT_REFUND_REQUEST_LIMIT_EXCEEDED');
      assert.equal(f.provider.posts, 1);
      assert.equal(await db.commerceRefundOperation.count({ where: { requestAuditEventId: f.request.id } }), 1);
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 2000);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: commands[rejectedIndex].financeEntryId } })).status, 'APPROVED');
    });
    for (const variant of ['missing', 'expired', 'revoked', 'wrong-currency', 'insufficient-limit', 'unmatched-approval-evidence', 'wrong-tenant']) {
      await check(`financial mandate ${variant} denies before provider calls or reservation`, async () => {
        const f = await fixture({ noExecuteGrant: variant === 'missing', limitMinor: variant === 'insufficient-limit' ? 500 : undefined });
        if (variant === 'expired') await db.financeOperationGrant.update({ where: { id: f.executionGrant.id }, data: { validUntil: new Date(Date.now() - 1000) } });
        if (variant === 'revoked') await grants.revoke(owner.id, f.executionGrant.id);
        if (variant === 'wrong-currency') await db.financeOperationGrant.update({ where: { id: f.executionGrant.id }, data: { currency: 'USD' } });
        if (variant === 'wrong-tenant') await db.financeOperationGrant.update({ where: { id: f.executionGrant.id }, data: { organizationId: platform.id } });
        if (variant === 'unmatched-approval-evidence') await db.auditEvent.update({ where: { id: f.executionGrant.approvalEvidenceReference }, data: { metadata: { unrelated: true } } });
        await assert.rejects(() => refunds.execute(f.executor.id, f.command), status(403)); await noMutation(f);
      });
    }
    await check('payload actorId cannot spoof either initial authority or a successful replay', async () => {
      const f = await fixture();
      await assert.rejects(() => refunds.execute(f.outsider.id, { ...f.command, actorId: f.executor.id }), status(403)); await noMutation(f);
      const result = await refunds.execute(f.executor.id, f.command); assert.equal(result.status, 'SUCCEEDED');
      await assert.rejects(() => refunds.execute(f.outsider.id, { ...f.command, actorId: f.executor.id }), status(409));
      const secondEntry = await approvedEntry(f, 1000);
      await assert.rejects(() => refunds.execute(f.executor.id, { ...f.command, financeEntryId: secondEntry.id }), status(409));
      assert.equal(f.provider.posts, 1);
    });
    await check('ordinary ledger posting cannot manufacture provider refund execution', async () => {
      const f = await fixture();
      await assert.rejects(() => finance.postEntry(f.entry.id, f.executor.id), status(400)); await noMutation(f);
    });
    await check('former or inactive platform-owner authority cannot authorize an old grant at dispatch', async () => {
      const f = await fixture();
      await db.organization.update({ where: { id: platform.id }, data: { ownerId: f.outsider.id } });
      try { await assert.rejects(() => refunds.execute(f.executor.id, f.command), status(403)); await noMutation(f); }
      finally { await db.organization.update({ where: { id: platform.id }, data: { ownerId: owner.id } }); }
      await db.roleAssignment.update({ where: { accountId_role: { accountId: owner.id, role: 'ADMIN' } }, data: { status: 'SUSPENDED' } });
      try { await assert.rejects(() => refunds.execute(f.executor.id, f.command), status(403)); await noMutation(f); }
      finally { await db.roleAssignment.update({ where: { accountId_role: { accountId: owner.id, role: 'ADMIN' } }, data: { status: 'ACTIVE' } }); }
    });
    await check('provider timeout after applying money stays held and GET totals cannot attribute or resend it', async () => {
      const f = await fixture(); f.provider.mode = 'TIMEOUT_AFTER_APPLY';
      const result = await refunds.execute(f.executor.id, f.command);
      assert.equal(result.status, 'RECONCILIATION_REQUIRED'); assert.equal(result.financialActionExecuted, false); assert.equal(f.provider.posts, 1);
      assert.equal(f.provider.payload.refunded, 1000);
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 0);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).status, 'APPROVED');
      assert.equal((await refunds.execute(f.executor.id, f.command)).status, 'RECONCILIATION_REQUIRED');
      const secondEntry = await approvedEntry(f, 1000);
      await assert.rejects(() => refunds.execute(f.executor.id, { ...f.command, financeEntryId: secondEntry.id, idempotencyKey: randomUUID() }), status(409));
      const observed = await refunds.reconcile(f.executor.id, result.id);
      assert.equal(observed.reconciliation, 'ATTRIBUTION_REVIEW_REQUIRED'); assert.equal(observed.observedRefundedMinor, 1000);
      assert.equal(observed.status, 'RECONCILIATION_REQUIRED'); assert.equal(f.provider.posts, 1);
      assert.equal(await db.auditEvent.count({ where: { action: 'PAYMENT_REFUND_POSTED', resourceId: result.id } }), 0);
    });
    await check('failed posting transaction rolls back ledger/counter/audit and saved POST proof reconciles once', async () => {
      const f = await fixture(), serializable = db.serializable.bind(db); let injected = false;
      db.serializable = work => serializable(async tx => { const result = await work(tx); if (result?.status === 'SUCCEEDED' && result?.paymentId === f.payment.id) { injected = true; throw new Error('Injected posting rollback'); } return result; });
      let result; try { result = await refunds.execute(f.executor.id, f.command); } finally { db.serializable = serializable; }
      assert.equal(injected, true); assert.equal(result.status, 'RECONCILIATION_REQUIRED'); assert.equal(f.provider.posts, 1);
      const pending = await db.commerceRefundOperation.findUniqueOrThrow({ where: { id: result.id } });
      assert.equal(pending.providerResult.source, 'REFUND_POST_RESPONSE');
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 0);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).status, 'APPROVED');
      assert.equal(await db.auditEvent.count({ where: { action: 'PAYMENT_REFUND_POSTED', resourceId: result.id } }), 0);
      const gets = f.provider.gets;
      assert.equal((await refunds.reconcile(f.executor.id, result.id)).status, 'SUCCEEDED');
      assert.equal((await refunds.reconcile(f.executor.id, result.id)).status, 'SUCCEEDED');
      assert.equal(f.provider.posts, 1); assert.equal(f.provider.gets, gets);
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 1000);
      assert.equal(await db.auditEvent.count({ where: { action: 'PAYMENT_REFUND_POSTED', resourceId: result.id } }), 1);
    });
    await check('provider reference change after dispatch prevents a wrongly bound ledger posting', async () => {
      const f = await fixture(); f.provider.afterApply = () => db.payment.update({ where: { id: f.payment.id }, data: { providerReference: randomUUID() } });
      const result = await refunds.execute(f.executor.id, f.command);
      assert.equal(result.status, 'RECONCILIATION_REQUIRED'); assert.equal(f.provider.posts, 1);
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 0);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).status, 'APPROVED');
    });
    await check('ledger reference change after dispatch prevents false posting of an unrelated entry', async () => {
      const f = await fixture(); f.provider.afterApply = () => db.financeEntry.update({ where: { id: f.entry.id }, data: { referenceId: 'wrong-payment' } });
      const result = await refunds.execute(f.executor.id, f.command);
      assert.equal(result.status, 'RECONCILIATION_REQUIRED'); assert.equal(f.provider.posts, 1);
      assert.equal((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).refundedAmountMinor, 0);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).status, 'APPROVED');
    });
    await check('financial mandate creation requires the verified owner and prohibits self delegation', async () => {
      const f = await fixture(), before = await db.financeOperationGrant.count();
      const input = { accountId: f.executor.id, organizationId: f.center.id, operation: 'EXECUTE_REFUND', currency: 'SAR', limitMinor: 5000, validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 86400000).toISOString() };
      await assert.rejects(() => grants.create(f.outsider.id, input), status(403));
      await assert.rejects(() => grants.create(owner.id, { ...input, accountId: owner.id }), status(403));
      assert.equal(await db.financeOperationGrant.count(), before); await noMutation(f);
    });
    const providerPosts = [...providerPayments.values()].reduce((sum, row) => sum + row.posts, 0);
    console.log(JSON.stringify({ suite: 'commerce-refund-execution-postgresql-http', passed, failed: 0, cases: outcomes, syntheticProviderPosts: providerPosts, actualMoneyTransfers: 0, productionWrites: 0, externalProviderCalls: 0 }));
  } finally {
    global.fetch = originalFetch;
    await db.$disconnect();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error('FAIL', error.message); process.exitCode = 1; });
