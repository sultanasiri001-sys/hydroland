// Real Nest controller/auth/financial services, PostgreSQL, and Moyasar adapter.
// The only provider is an ephemeral loopback HTTP fixture; no merchant keys or money.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { randomUUID, randomBytes, scryptSync } = require('node:crypto');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const databaseUrl = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname));
assert.match(databaseUrl.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const build = resolve(process.env.COMMERCE_BUILD_DIR || resolve(__dirname, '../dist'));
process.env.RENTAL_COLLECTION_TEST_DIST = build;
const load = file => require(resolve(build, file + '.js'));
const { DatabaseService } = load('database/database.service');
const { AuditService } = load('audit/audit.service');
const { NotificationsService } = load('notifications/notifications.service');
const { EquipmentRentalService } = load('trips/equipment-rental.service');
const { EquipmentRentalHandoverService } = load('trips/equipment-rental-handover.service');
const { EquipmentInspectionService } = load('trips/equipment-inspection.service');
const { PolicyControlService } = load('trips/policy-control.service');
const { FinancePersistenceService } = load('finance/finance-persistence.service');
const { FinanceOperationGrantService } = load('finance/finance-operation-grant.service');
const { RentalRefundService } = load('payments/rental-refund.service');
const { RentalRefundController } = load('payments/rental-refund.controller');
const { RentalCheckoutService } = load('payments/rental-checkout.service');
const { MoyasarPaymentProviderService } = load('payments/moyasar-payment-provider.service');
const { AuthService } = load('auth/auth.service');
const { MfaService } = load('auth/mfa.service');
const { GoogleIdentityService } = load('auth/google-identity.service');
const { AccessTokenGuard } = load('auth/access-token.guard');
const { createRentalContract } = load('commerce/rental-contract');
const db = new DatabaseService(), audit = new AuditService(db), notifications = new NotificationsService(db);
const finance = new FinancePersistenceService(db), grants = new FinanceOperationGrantService(db);
const rentals = new EquipmentRentalService(db, audit, notifications);
const inspections = new EquipmentInspectionService(db, audit, new PolicyControlService(db, audit));
const handover = new EquipmentRentalHandoverService(db, audit, notifications, inspections);
const auth = new AuthService(db, new MfaService(db), new GoogleIdentityService());
const payments = new Map(), providerErrors = [], outcomes = [];
const provider = new MoyasarPaymentProviderService({ requireOperational: () => ({ status: 'SANDBOX' }), recordProviderSignal: async () => {} });
const refunds = new RentalRefundService(db, provider), checkout = new RentalCheckoutService(db, audit, provider, inspections);
let owner, providerServer, app, origin, providerOrigin, syntheticCollection;
const nativeFetch = global.fetch;
const status = code => error => error.getStatus?.() === code;
const check = async (name, work) => { await work(); assert.deepEqual(providerErrors, []); outcomes.push(name); console.log('PASS', name); };
const call = async (account, path, body, method = body === undefined ? 'GET' : 'POST') => {
  const response = await fetch(origin + '/payments/rentals/' + path, { method, headers: { 'content-type': 'application/json', ...(account ? { authorization: 'Bearer ' + account.accessToken } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
};
const ok = async promise => { const result = await promise; assert.ok(result.status >= 200 && result.status < 300, JSON.stringify(result)); return result.body; };
async function account(label) {
  const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
  const person = await db.person.create({ data: { firstName: label, lastName: 'SYNTHETIC Rental Refund' } });
  const row = await db.account.create({ data: { personId: person.id, email: `${label}-${randomUUID()}@example.invalid`, status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: salt + ':' + scryptSync(password, salt, 64).toString('hex') } });
  const session = await auth.login({ email: row.email, password });
  assert.ok(session.accessToken); return { ...row, accessToken: session.accessToken };
}
async function entry(f, amountMinor) {
  const row = await finance.createEntry({ organizationId: f.center.id, financeAccountId: f.financeAccountId, type: 'REFUND', amountMinor, currency: 'SAR', referenceType: 'EQUIPMENT_RENTAL_REFUND', referenceId: f.rental.id, requestedByAccountId: f.preparer.id });
  await finance.decideEntry(row.id, f.approver.id, true, 'Synthetic isolated approval');
  return row;
}
async function fixture(options = {}) {
  const [buyer, preparer, approver, executor, foreign, accountant] = await Promise.all(['buyer', 'preparer', 'approver', 'executor', 'foreign', 'accountant'].map(account));
  const center = await db.organization.create({ data: { ownerId: owner.id, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: 'SYNTHETIC Rental Center', legalName: 'Synthetic legal issuer', registrationNumber: 'SYN-' + randomUUID(), address: 'Loopback-only' } });
  const resource = await db.calendarResource.create({ data: { type: 'EQUIPMENT', name: 'SYNTHETIC equipment ' + randomUUID() } });
  const code = 'SYN-' + randomUUID();
  await db.$executeRaw`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","stockStatus","organizationId") VALUES(${randomUUID()},${resource.id},${code},${code},${'qr:' + code},'AVAILABLE',${center.id})`;
  await inspections.record(owner.id, resource.id, { status: 'PASS', serviceExpiresAt: new Date(Date.now() + 40 * 86400000).toISOString(), notes: 'Synthetic inspection' });
  let rental = await rentals.create(owner.id, { renterAccountId: buyer.id, scheduledHandoverAt: new Date(Date.now() + (options.within24 ? 12 : 72) * 3600000).toISOString(), dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), items: [{ resourceId: resource.id, unitPriceSar: 100 }] });
  if (options.within24) {
    // A deliberate historical test contract, created before any collection.
    const recordedAt = new Date(Date.now() - 12 * 86400000);
    const [stored] = await db.$queryRaw`SELECT * FROM "EquipmentRental" WHERE "id"=${rental.id}`;
    const lines = await db.$queryRaw`SELECT i.*,b."organizationId"::text AS "organizationId" FROM "EquipmentRentalItem" i JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId" WHERE i."rentalId"=${rental.id}`;
    const contract = createRentalContract({ rental: { ...stored, reservedAt: recordedAt }, issuer: center, lines });
    await db.$executeRaw`UPDATE "EquipmentRental" SET "reservedAt"=(${recordedAt}::timestamptz AT TIME ZONE 'UTC'),"contractSnapshot"=${JSON.stringify(contract)}::jsonb WHERE "id"=${rental.id}`;
    if (!options.noClassification) await db.operationalSetting.create({ data: { key: `commerce-legal-classification:RENTAL:${rental.id}`, value: { sourceType: 'RENTAL', sourceId: rental.id, classification: 'ELIGIBLE', evidenceReference: 'SYNTHETIC-NOT-A-LEGAL-ADOPTION' } } });
  }
  const receipt = await syntheticCollection(db, { rentalId: rental.id, centerId: center.id, requesterId: preparer.id, approverId: approver.id, posterId: executor.id });
  await handover.confirmPayment(owner.id, rental.id);
  const evidence = await db.commerceCollectionEvidence.findUniqueOrThrow({ where: { id: receipt.evidenceId } });
  const providerRow = { posts: 0, gets: 0, mode: 'NORMAL', payload: { id: evidence.providerPaymentId, invoice_id: evidence.providerInvoiceId, amount: 10000, currency: 'SAR', status: 'paid', captured: 0, refunded: 0, refunded_at: null, updated_at: evidence.providerVerifiedAt.toISOString() } };
  payments.set(evidence.providerPaymentId, providerRow);
  const validFrom = new Date(Date.now() - 3600000).toISOString(), validUntil = new Date(Date.now() + 86400000).toISOString();
  const approvalGrant = await grants.create(owner.id, { accountId: approver.id, organizationId: center.id, operation: 'APPROVE_REFUND', currency: 'SAR', limitMinor: 10000, validFrom, validUntil });
  const executionGrant = await grants.create(owner.id, { accountId: executor.id, organizationId: center.id, operation: 'EXECUTE_REFUND', currency: 'SAR', limitMinor: 10000, validFrom, validUntil });
  const unit = await db.orgUnit.create({ data: { organizationId: center.id, type: 'CENTER', code: 'SYN-CTR', nameAr: 'مركز تجريبي' } });
  const position = await db.position.create({ data: { orgUnitId: unit.id, code: 'CENTER_ACCOUNTANT', titleAr: 'محاسب تجريبي' } });
  await db.employment.create({ data: { accountId: accountant.id, organizationId: center.id, orgUnitId: unit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE' } });
  return { buyer, preparer, approver, executor, foreign, accountant, center, rental, resource, code, evidence, providerRow, approvalGrant, executionGrant, ...receipt };
}
async function request(f, changes = {}) {
  const body = { idempotencyKey: randomUUID(), requestedAmountMinor: 10000, cause: 'CUSTOMER_CANCELLATION', reason: 'Synthetic original customer cancellation', ...changes };
  const response = await ok(call(f.buyer, f.rental.id + '/refund-requests', body));
  return { ...response, input: body };
}
async function command(f, r, amountMinor) { return { requestId: r.requestId, financeEntryId: (await entry(f, amountMinor)).id, idempotencyKey: randomUUID() }; }
const execute = (f, command) => ok(call(f.executor, f.rental.id + '/refund-operations', command));
const executionGrant = (accountId, organizationId) => grants.create(owner.id, { accountId, organizationId, operation: 'EXECUTE_REFUND', currency: 'SAR', limitMinor: 10000,
  validFrom: new Date(Date.now() - 3600000).toISOString(), validUntil: new Date(Date.now() + 86400000).toISOString() });
async function reserveThenRevoke(f, command) {
  const original = db.serializable.bind(db); let revoked = false;
  db.serializable = async work => {
    const result = await original(work);
    if (!revoked && result?.rentalId === f.rental.id && result?.status === 'RESERVED') {
      revoked = true; await db.financeOperationGrant.update({ where: { id: f.executionGrant.id }, data: { revokedAt: new Date() } });
    }
    return result;
  };
  try { assert.equal((await call(f.executor, f.rental.id + '/refund-operations', command)).status, 403); }
  finally { db.serializable = original; }
  assert.ok(revoked); assert.equal(f.providerRow.posts, 0);
  const row = await db.rentalRefundOperation.findUniqueOrThrow({ where: { idempotencyKey: command.idempotencyKey } });
  assert.equal(row.status, 'RESERVED'); assert.equal(row.dispatchedAt, null); assert.equal(row.providerResult, null);
  return row;
}
async function unchanged(f) {
  assert.equal(f.providerRow.posts, 0);
  assert.equal(await db.rentalRefundOperation.count({ where: { rentalId: f.rental.id } }), 0);
  assert.equal((await db.commerceCollectionEvidence.findUniqueOrThrow({ where: { id: f.evidence.id } })).providerRefundedMinor, 0);
}

(async () => {
  try {
    syntheticCollection = (await import(pathToFileURL(resolve(__dirname, 'rental-collection-evidence-fixture.mjs')))).createSyntheticRentalCollection;
    providerServer = createServer(async (req, res) => {
      try {
        assert.equal(req.headers.authorization, 'Basic ' + Buffer.from('sk_test_SYNTHETIC_RENTAL_REFUND:').toString('base64'));
        const match = /^\/v1\/payments\/([a-f0-9-]+)(\/refund)?$/.exec(req.url || '');
        const row = match && payments.get(match[1]);
        assert.ok(row, 'Unknown synthetic provider payment');
        if (req.method === 'GET' && !match[2]) row.gets++;
        else if (req.method === 'POST' && match[2]) {
          let raw = ''; for await (const part of req) raw += part;
          const body = JSON.parse(raw); assert.deepEqual(Object.keys(body), ['amount']);
          assert.ok(Number.isSafeInteger(body.amount) && body.amount > 0 && body.amount <= row.payload.amount - row.payload.refunded);
          row.posts++; row.payload.refunded += body.amount; row.payload.status = row.payload.refunded === row.payload.amount ? 'refunded' : 'paid';
          row.payload.refunded_at = new Date().toISOString(); row.payload.updated_at = row.payload.refunded_at;
          if (row.afterApply) await row.afterApply();
          if (row.mode === 'DROP_AFTER_APPLY') { req.socket.destroy(); return; }
        } else throw new Error('Unexpected synthetic provider operation');
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(row.payload));
      } catch (error) { providerErrors.push(error.message); res.writeHead(500).end('{}'); }
    });
    await new Promise(resolve => providerServer.listen(0, '127.0.0.1', resolve));
    providerOrigin = `http://127.0.0.1:${providerServer.address().port}`;
    process.env.HYDROLAND_PAYMENT_PROVIDER = 'MOYASAR'; process.env.MOYASAR_SECRET_KEY = 'sk_test_SYNTHETIC_RENTAL_REFUND';
    process.env.MOYASAR_API_BASE_URL = providerOrigin + '/v1/'; process.env.JWT_SECRET = 'SYNTHETIC-rental-refund-http-acceptance-secret';
    owner = await account('owner'); process.env.D12_OWNER_EMAIL = owner.email;
    await db.roleAssignment.create({ data: { accountId: owner.id, role: 'ADMIN', status: 'ACTIVE' } });
    const platform = await db.organization.create({ data: { ownerId: owner.id, kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE', displayName: 'SYNTHETIC platform' } });
    await db.operationalSetting.upsert({ where: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1' }, create: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1', value: { organizationId: platform.id } }, update: { value: { organizationId: platform.id } } });
    class AcceptanceModule {}
    Module({ controllers: [RentalRefundController], providers: [{ provide: RentalRefundService, useValue: refunds }, { provide: AuthService, useValue: auth }, AccessTokenGuard] })(AcceptanceModule);
    app = await NestFactory.create(AcceptanceModule, { logger: false }); await app.listen(0, '127.0.0.1'); origin = await app.getUrl();
    global.fetch = (input, options) => { const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); assert.ok([origin, providerOrigin].includes(url.origin), 'Only loopback fixtures may be called'); return nativeFetch(input, { ...options, redirect: 'error' }); };

    await check('real HTTP customer authentication, ownership and amount boundaries reject without financial effects', async () => {
      const f = await fixture();
      assert.equal((await call(null, f.rental.id + '/refund-requests')).status, 401);
      assert.equal((await call(f.foreign, f.rental.id + '/refund-requests')).status, 404);
      assert.equal((await call(f.buyer, f.rental.id + '/refund-requests', { idempotencyKey: randomUUID(), requestedAmountMinor: '10000', cause: 'CUSTOMER_CANCELLATION', reason: 'bad' })).status, 400);
      assert.equal((await call(f.buyer, f.rental.id + '/refund-requests', { idempotencyKey: randomUUID(), requestedAmountMinor: 10001, cause: 'CUSTOMER_CANCELLATION', reason: 'bad' })).status, 409);
      await unchanged(f);
    });
    await check('customer cancellation freezes the original request and blocks handover before any money moves', async () => {
      const f = await fixture(), r = await request(f);
      assert.equal(r.decision.refundAmountMinor, 10000); assert.equal(r.cancellationRecorded, true); assert.equal(r.financialActionExecuted, false);
      await assert.rejects(handover.scan(owner.id, f.rental.id, { code: f.code }), status(409));
      const repeat = await ok(call(f.buyer, f.rental.id + '/refund-requests', r.input)); assert.equal(repeat.requestId, r.requestId);
      assert.equal((await call(f.buyer, f.rental.id + '/refund-requests', { ...r.input, requestedAmountMinor: 5000 })).status, 409);
      assert.equal(await db.auditEvent.count({ where: { action: 'RENTAL_REFUND_REQUESTED', resourceId: f.rental.id } }), 1);
      await unchanged(f);
    });
    await check('real HTTP partial then full provider refunds atomically post ledger and cumulative rental balance', async () => {
      const f = await fixture(), r = await request(f), first = await execute(f, await command(f, r, 3000));
      assert.equal(first.status, 'SUCCEEDED'); assert.equal(first.amountMinor, 3000);
      const second = await execute(f, await command(f, r, 7000)); assert.equal(second.status, 'SUCCEEDED');
      assert.equal((await db.commerceCollectionEvidence.findUniqueOrThrow({ where: { id: f.evidence.id } })).providerRefundedMinor, 10000);
      assert.equal((await rentals.get(f.rental.id)).paymentStatus, 'REFUNDED'); assert.equal(f.providerRow.posts, 2);
      const history = await ok(call(f.buyer, f.rental.id + '/refund-requests')); assert.equal(history.requests[0].operations.length, 2);
    });
    await check('six concurrent identical executions dispatch one provider POST and post one ledger entry', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 10000);
      const responses = await Promise.all(Array.from({ length: 6 }, () => execute(f, c)));
      assert.equal(new Set(responses.map(row => row.id)).size, 1); assert.equal(f.providerRow.posts, 1);
      assert.equal(await db.rentalRefundOperation.count({ where: { rentalId: f.rental.id } }), 1);
      assert.equal((await execute(f, c)).status, 'SUCCEEDED'); assert.equal(f.providerRow.posts, 1);
    });
    await check('75 percent late cancellation is cumulative across requests and cannot consume the retained quarter', async () => {
      const f = await fixture({ within24: true }), r = await request(f);
      assert.equal(r.decision.refundAmountMinor, 7500);
      await execute(f, await command(f, r, 2500));
      const r2 = await request(f, { requestedAmountMinor: 7500 });
      await execute(f, await command(f, r2, 5000));
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', await command(f, r2, 1))).status, 409);
      assert.equal(f.providerRow.payload.refunded, 7500); assert.equal(f.providerRow.posts, 2);
    });
    await check('unresolved statutory classification remains a review and cannot authorize a percentage deduction', async () => {
      const f = await fixture({ within24: true, noClassification: true }), r = await request(f);
      assert.equal(r.decision.status, 'REVIEW_REQUIRED');
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', await command(f, r, 7500))).status, 409); await unchanged(f);
    });
    await check('trusted center handover failure enables full refund while customer assertions do not', async () => {
      const f = await fixture({ within24: true }), unverified = await request(f, { cause: 'PROVIDER_CANCELLATION' });
      assert.equal(unverified.decision.status, 'REVIEW_REQUIRED');
      assert.equal((await call(f.buyer, f.rental.id + '/provider-handover-failure', { reason: 'claim', evidenceReference: 'untrusted' })).status, 403);
      await ok(call(f.accountant, f.rental.id + '/provider-handover-failure', { reason: 'Synthetic confirmed non-delivery', evidenceReference: 'SYNTHETIC-center-evidence' }));
      const verified = await request(f, { cause: 'PROVIDER_CANCELLATION' }); assert.equal(verified.decision.refundAmountMinor, 10000);
      assert.equal((await execute(f, await command(f, verified, 10000))).status, 'SUCCEEDED');
    });
    await check('handed-over equipment and defect requests never create an automatic ordinary refund', async () => {
      const f = await fixture(); await handover.scan(owner.id, f.rental.id, { code: f.code });
      const r = await request(f, { cause: 'DEFECT', reason: 'Synthetic defect allegation' });
      assert.equal(r.decision.status, 'REVIEW_REQUIRED'); assert.equal(r.cancellationRecorded, false);
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', await command(f, r, 10000))).status, 409);
      assert.equal((await rentals.get(f.rental.id)).status, 'ACTIVE'); await unchanged(f);
    });
    for (const mode of ['revoked', 'expired', 'wrong-currency', 'insufficient-limit', 'wrong-tenant']) await check('financial mandate ' + mode + ' denies before provider dispatch', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 10000);
      const changes = { revoked: { revokedAt: new Date() }, expired: { validUntil: new Date(Date.now() - 1000) }, 'wrong-currency': { currency: 'USD' }, 'insufficient-limit': { limitMinor: 100 }, 'wrong-tenant': { organizationId: randomUUID() } }[mode];
      await db.financeOperationGrant.update({ where: { id: f.executionGrant.id }, data: changes });
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', c)).status, 403); await unchanged(f);
    });
    await check('foreign request or approved ledger references cannot cross a center boundary', async () => {
      const f = await fixture(), foreign = await fixture(), r = await request(f), other = await request(foreign);
      const c = await command(f, r, 10000);
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', { ...c, requestId: other.requestId })).status, 409);
      const foreignEntry = await entry(foreign, 10000);
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', { ...c, financeEntryId: foreignEntry.id })).status, 409); await unchanged(f);
    });
    await check('generic finance posting cannot fake rental provider execution and account fields cannot spoof the actor', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 10000);
      await assert.rejects(finance.postEntry(c.financeEntryId, f.executor.id), status(400));
      assert.equal((await call(f.buyer, f.rental.id + '/refund-operations', { ...c, executor: f.executor.id, actorId: f.executor.id })).status, 403); await unchanged(f);
    });
    await check('lost provider response after applying money remains held; GET cannot attribute it or resend it', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000); f.providerRow.mode = 'DROP_AFTER_APPLY';
      const result = await execute(f, c); assert.equal(result.status, 'RECONCILIATION_REQUIRED'); assert.equal(result.financialActionExecuted, null);
      assert.equal((await execute(f, c)).status, 'RECONCILIATION_REQUIRED'); assert.equal(f.providerRow.posts, 1);
      const reconciled = await ok(call(f.executor, `${f.rental.id}/refund-operations/${result.id}/reconcile`, {}));
      assert.equal(reconciled.observedRefundedMinor, 5000); assert.equal(reconciled.reconciliation, 'ATTRIBUTION_REVIEW_REQUIRED');
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: c.financeEntryId } })).status, 'APPROVED');
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', await command(f, r, 1000))).status, 409); assert.equal(f.providerRow.posts, 1);
    });
    await check('posting rollback preserves original POST proof and reconciliation posts exactly once', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000);
      await db.$executeRawUnsafe(`CREATE FUNCTION rental_refund_test_reject_post() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."action"='RENTAL_REFUND_POSTED' THEN RAISE EXCEPTION 'synthetic audit outage'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe('CREATE TRIGGER rental_refund_test_reject_post BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION rental_refund_test_reject_post()');
      const result = await execute(f, c); assert.equal(result.status, 'RECONCILIATION_REQUIRED');
      const getsBeforeRecovery = f.providerRow.gets;
      assert.equal((await db.commerceCollectionEvidence.findUniqueOrThrow({ where: { id: f.evidence.id } })).providerRefundedMinor, 0);
      await db.$executeRawUnsafe('DROP TRIGGER rental_refund_test_reject_post ON "AuditEvent"');
      const reconciled = await ok(call(f.executor, `${f.rental.id}/refund-operations/${result.id}/reconcile`, {})); assert.equal(reconciled.status, 'SUCCEEDED');
      assert.equal((await ok(call(f.executor, `${f.rental.id}/refund-operations/${result.id}/reconcile`, {}))).status, 'SUCCEEDED');
      assert.equal(f.providerRow.posts, 1); assert.equal(f.providerRow.gets, getsBeforeRecovery);
    });
    await check('a matching concurrent provider observation does not block exact POST proof posting', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 4000);
      f.providerRow.afterApply = async () => {
        const row = await db.commerceCheckout.findUniqueOrThrow({ where: { sourceType_sourceId: { sourceType: 'EQUIPMENT_RENTAL', sourceId: f.rental.id } } });
        await db.commerceCheckout.update({ where: { id: row.id }, data: { providerResult: { ...row.providerResult, payment: { ...row.providerResult.payment, refundedMinor: 4000, refundedAt: f.providerRow.payload.refunded_at, updatedAt: f.providerRow.payload.updated_at } }, status: 'RECONCILIATION_REQUIRED' } });
      };
      assert.equal((await execute(f, c)).status, 'SUCCEEDED'); assert.equal(f.providerRow.posts, 1);
    });
    await check('two different concurrent ledger operations cannot exceed one original customer request', async () => {
      const f = await fixture(), r = await request(f, { requestedAmountMinor: 6000 });
      const a = await command(f, r, 4000), b = await command(f, r, 4000);
      const responses = await Promise.all([call(f.executor, f.rental.id + '/refund-operations', a), call(f.executor, f.rental.id + '/refund-operations', b)]);
      assert.equal(responses.filter(row => row.status === 201).length, 1); assert.equal(responses.filter(row => row.status === 409).length, 1);
      assert.equal(f.providerRow.posts, 1); assert.equal(f.providerRow.payload.refunded, 4000);
    });
    await check('grant revocation after reservation is rechecked before the durable provider dispatch', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000);
      await reserveThenRevoke(f, c);
    });
    await check('an authorized alternate executor releases a never-dispatched reservation and uses a new independent ledger', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000), operation = await reserveThenRevoke(f, c);
      await executionGrant(f.foreign.id, f.center.id);
      const endpoint = `${f.rental.id}/refund-operations/${operation.id}/cancel-reservation`;
      const reason = 'Synthetic original executor revoked before any provider dispatch';
      const cancelled = await ok(call(f.foreign, endpoint, { reason }));
      assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.financialActionExecuted, false); assert.equal(cancelled.automaticResendAllowed, false);
      assert.equal((await execute(f, c)).status, 'CANCELLED');
      assert.equal((await ok(call(f.foreign, endpoint, { reason }))).status, 'CANCELLED');
      assert.equal((await ok(call(f.foreign, `${f.rental.id}/refund-operations/${operation.id}/reconcile`, {}))).status, 'CANCELLED');
      assert.equal(f.providerRow.posts, 0); assert.equal(f.providerRow.gets, 0);
      const saved = await db.rentalRefundOperation.findUniqueOrThrow({ where: { id: operation.id } });
      for (const field of ['financeEntryId', 'requestAuditEventId', 'idempotencyKey', 'requestFingerprint', 'executedByAccountId']) assert.equal(saved[field], operation[field]);
      assert.equal(saved.dispatchedAt, null); assert.equal(saved.providerResult, null);
      const events = await db.auditEvent.findMany({ where: { resourceId: operation.id, action: 'RENTAL_REFUND_RESERVATION_CANCELLED' } });
      assert.equal(events.length, 1); assert.equal(events[0].actorId, f.foreign.personId); assert.equal(events[0].metadata.reason, reason);
      assert.equal(events[0].metadata.originalExecutorAccountId, f.executor.id);
      assert.equal((await call(f.foreign, f.rental.id + '/refund-operations', { ...c, idempotencyKey: randomUUID() })).status, 409);
      await assert.rejects(finance.postEntry(c.financeEntryId, f.foreign.id), status(400));
      const next = await command(f, r, 10000);
      const result = await ok(call(f.foreign, f.rental.id + '/refund-operations', next));
      assert.equal(result.status, 'SUCCEEDED'); assert.equal(f.providerRow.posts, 1); assert.equal(f.providerRow.payload.refunded, 10000);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: c.financeEntryId } })).status, 'APPROVED');
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: next.financeEntryId } })).status, 'POSTED');
      assert.equal((await db.rentalRefundOperation.findUniqueOrThrow({ where: { id: operation.id } })).status, 'CANCELLED');
    });
    await check('reservation cancellation rejects missing reasons and another center mandate without releasing the hold', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000), operation = await reserveThenRevoke(f, c);
      const anotherCenter = await db.organization.create({ data: { ownerId: owner.id, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: 'SYNTHETIC other cancellation center' } });
      await executionGrant(f.foreign.id, anotherCenter.id);
      const endpoint = `${f.rental.id}/refund-operations/${operation.id}/cancel-reservation`, body = { reason: 'Synthetic foreign center must not release this reservation' };
      assert.equal((await call(null, endpoint, body)).status, 401);
      assert.equal((await call(f.foreign, endpoint, {})).status, 400);
      assert.equal((await call(f.foreign, endpoint, body)).status, 403);
      assert.equal((await call(f.executor, endpoint, body)).status, 403);
      assert.equal((await call(f.foreign, `${randomUUID()}/refund-operations/${operation.id}/cancel-reservation`, body)).status, 404);
      assert.equal((await db.rentalRefundOperation.findUniqueOrThrow({ where: { id: operation.id } })).status, 'RESERVED');
      assert.equal(await db.auditEvent.count({ where: { resourceId: operation.id, action: 'RENTAL_REFUND_RESERVATION_CANCELLED' } }), 0);
      assert.equal(f.providerRow.posts, 0);
    });
    await check('a committed dispatch and a lost provider response can never be released as an unused reservation', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000); let checkedDispatch = false;
      f.providerRow.mode = 'DROP_AFTER_APPLY';
      f.providerRow.afterApply = async () => {
        const operation = await db.rentalRefundOperation.findUniqueOrThrow({ where: { idempotencyKey: c.idempotencyKey } });
        assert.equal(operation.status, 'DISPATCHED'); assert.ok(operation.dispatchedAt);
        assert.equal((await call(f.executor, `${f.rental.id}/refund-operations/${operation.id}/cancel-reservation`, { reason: 'Synthetic release must fail during a provider dispatch' })).status, 409);
        checkedDispatch = true;
      };
      const result = await execute(f, c); assert.ok(checkedDispatch); assert.equal(result.status, 'RECONCILIATION_REQUIRED');
      assert.equal((await call(f.executor, `${f.rental.id}/refund-operations/${result.id}/cancel-reservation`, { reason: 'Synthetic unknown payment outcome cannot release its hold' })).status, 409);
      assert.equal((await db.rentalRefundOperation.findUniqueOrThrow({ where: { id: result.id } })).status, 'RECONCILIATION_REQUIRED');
      assert.equal(f.providerRow.posts, 1);
    });
    await check('an unexpected provider proof prevents cancellation even when the journal still says reserved', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000), operation = await reserveThenRevoke(f, c);
      await executionGrant(f.foreign.id, f.center.id);
      await db.rentalRefundOperation.update({ where: { id: operation.id }, data: { providerResult: { source: 'REFUND_POST_RESPONSE', payment: { id: f.evidence.providerPaymentId } } } });
      assert.equal((await call(f.foreign, `${f.rental.id}/refund-operations/${operation.id}/cancel-reservation`, { reason: 'Synthetic contradictory provider evidence requires review' })).status, 409);
      assert.equal((await db.rentalRefundOperation.findUniqueOrThrow({ where: { id: operation.id } })).status, 'RESERVED'); assert.equal(f.providerRow.posts, 0);
    });
    await check('a reservation cancellation winning the rental lock prevents the original executor from dispatching', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000); await executionGrant(f.foreign.id, f.center.id);
      const original = db.serializable.bind(db); let cancelled = false;
      db.serializable = async work => {
        const result = await original(work);
        if (!cancelled && result?.rentalId === f.rental.id && result?.status === 'RESERVED') {
          cancelled = true;
          assert.equal((await ok(call(f.foreign, `${f.rental.id}/refund-operations/${result.id}/cancel-reservation`, { reason: 'Synthetic cancellation wins before original durable dispatch' }))).status, 'CANCELLED');
        }
        return result;
      };
      try { assert.equal((await execute(f, c)).status, 'CANCELLED'); }
      finally { db.serializable = original; }
      assert.ok(cancelled); assert.equal(f.providerRow.posts, 0);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: c.financeEntryId } })).status, 'APPROVED');
    });
    await check('a changed approved ledger reference after provider dispatch cannot post unrelated money', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 3000);
      f.providerRow.afterApply = () => db.financeEntry.update({ where: { id: c.financeEntryId }, data: { referenceId: randomUUID() } });
      const result = await execute(f, c); assert.equal(result.status, 'RECONCILIATION_REQUIRED');
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: c.financeEntryId } })).status, 'APPROVED');
      assert.equal((await db.commerceCollectionEvidence.findUniqueOrThrow({ where: { id: f.evidence.id } })).providerRefundedMinor, 0);
      assert.equal(f.providerRow.posts, 1);
    });
    await check('original-contract tampering is rejected before reserving or dispatching a refund', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 10000);
      await db.$executeRaw`UPDATE "EquipmentRental" SET "contractSnapshot"=jsonb_set("contractSnapshot",'{amountMinor}','1') WHERE "id"=${f.rental.id}`;
      assert.equal((await call(f.executor, f.rental.id + '/refund-operations', c)).status, 409); await unchanged(f);
      const history = await ok(call(f.buyer, f.rental.id + '/refund-requests')); assert.equal(history.requests[0].decision.status, 'REVIEW_REQUIRED');
    });
    await check('customer suspension after provider dispatch does not prevent posting actual refunded money', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000);
      f.providerRow.afterApply = () => db.account.update({ where: { id: f.buyer.id }, data: { status: 'SUSPENDED' } });
      const result = await execute(f, c); assert.equal(result.status, 'SUCCEEDED');
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: c.financeEntryId } })).status, 'POSTED');
      assert.equal((await db.commerceCollectionEvidence.findUniqueOrThrow({ where: { id: f.evidence.id } })).providerRefundedMinor, 5000);
      assert.equal((await call(f.buyer, f.rental.id + '/refund-requests')).status, 401);
      assert.equal(f.providerRow.posts, 1);
    });
    await check('authorized reconciliation can recover exact POST proof after customer suspension and posting failure', async () => {
      const f = await fixture(), r = await request(f), c = await command(f, r, 5000);
      f.providerRow.afterApply = () => db.account.update({ where: { id: f.buyer.id }, data: { status: 'SUSPENDED' } });
      await db.$executeRawUnsafe('CREATE TRIGGER rental_refund_test_reject_post BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION rental_refund_test_reject_post()');
      let result;
      try { result = await execute(f, c); assert.equal(result.status, 'RECONCILIATION_REQUIRED'); }
      finally { await db.$executeRawUnsafe('DROP TRIGGER rental_refund_test_reject_post ON "AuditEvent"'); }
      const reads = f.providerRow.gets;
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: c.financeEntryId } })).status, 'APPROVED');
      assert.equal((await call(f.buyer, `${f.rental.id}/refund-operations/${result.id}/reconcile`, {})).status, 401);
      const recovered = await ok(call(f.executor, `${f.rental.id}/refund-operations/${result.id}/reconcile`, {}));
      assert.equal(recovered.status, 'SUCCEEDED'); assert.equal(f.providerRow.posts, 1); assert.equal(f.providerRow.gets, reads);
      assert.equal((await db.financeEntry.findUniqueOrThrow({ where: { id: c.financeEntryId } })).status, 'POSTED');
    });
    console.log(JSON.stringify({ suite: 'rental-refund-postgresql-http', passed: outcomes.length, failed: 0, cases: outcomes, actualDatabase: true,
      actualHttpRoutes: true, actualAuthentication: true, syntheticProviderPosts: [...payments.values()].reduce((sum, row) => sum + row.posts, 0),
      externalProviderCalls: 0, productionWrites: 0, actualMoneyTransfers: 0 }));
  } finally {
    global.fetch = nativeFetch;
    if (app) await app.close();
    if (providerServer) await new Promise(resolve => { providerServer.close(resolve); providerServer.closeAllConnections(); });
    await db.$disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
