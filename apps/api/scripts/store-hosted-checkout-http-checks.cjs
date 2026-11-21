// Real Nest routes, authentication/session guard, PostgreSQL and Moyasar HTTP
// adapter. All fixtures are synthetic. No production or external network access.
const assert = require('node:assert/strict');
const {randomBytes, randomUUID, scryptSync} = require('node:crypto');
const {createServer} = require('node:http');
const {resolve} = require('node:path');
require('reflect-metadata');
const {Module} = require('@nestjs/common');
const {NestFactory} = require('@nestjs/core');

assert.equal(process.env.CI, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const databaseUrl = new URL(process.env.DATABASE_URL || 'invalid:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(databaseUrl.hostname));
assert.match(databaseUrl.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const dist = process.env.STORE_CHECKOUT_TEST_DIST || resolve(__dirname, '../dist');
const load = file => require(resolve(dist, file));
const {DatabaseService} = load('database/database.service.js');
const {AuditService} = load('audit/audit.service.js');
const {AuthService} = load('auth/auth.service.js');
const {AuthController} = load('auth/auth.controller.js');
const {MfaService} = load('auth/mfa.service.js');
const {GoogleIdentityService} = load('auth/google-identity.service.js');
const {AccessTokenGuard} = load('auth/access-token.guard.js');
const {AdminGuard} = load('admin/admin.guard.js');
const {StoreService} = load('store/store.service.js');
const {StoreController} = load('store/store.controller.js');
const {StoreCheckoutService} = load('store/store-checkout.service.js');
const {StoreCheckoutController} = load('store/store-checkout.controller.js');
const {IntegrationService} = load('integrations/integration.service.js');
const {MoyasarPaymentProviderService} = load('payments/moyasar-payment-provider.service.js');
const {FinancePersistenceService} = load('finance/finance-persistence.service.js');

const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
const invoices = new Map(), payments = new Map(), requests = [], fixtureErrors = [], passed = [];
let dropNext = false, holdNextRead = null, invoiceMutator = null, base, app, db, providerServer;
const nativeFetch = global.fetch;
const providerSecret = 'sk_test_SYNTHETIC_store_checkout_only', webhookSecret = 'whsec_SYNTHETIC_store_only';
process.env.JWT_SECRET = 'SYNTHETIC_store_http_isolated_session_secret_20261121';
process.env.HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS = 'SANDBOX';
process.env.HYDROLAND_PAYMENT_PROVIDER = 'MOYASAR';
process.env.MOYASAR_SECRET_KEY = providerSecret;
process.env.MOYASAR_WEBHOOK_SECRET = webhookSecret;
process.env.HYDROLAND_PUBLIC_WEB_ORIGIN = 'https://store-checkout.example.invalid';
const postCount = () => requests.filter(row => row.method === 'POST').length;
const body = async response => ({status: response.status, data: await response.json()});
const ok = async response => {const result = await body(response); assert.ok(result.status >= 200 && result.status < 300, JSON.stringify(result)); return result.data;};
const reject = async (response, status, code) => {const result = await body(response); assert.equal(result.status, status, JSON.stringify(result)); if (code) assert.equal(result.data.code, code, JSON.stringify(result)); return result.data;};
const call = (actor, path, method = 'GET', data) => fetch(base + path, {method,
  headers: {'content-type': 'application/json', ...(actor ? {authorization: 'Bearer ' + actor.token} : {})},
  ...(data === undefined ? {} : {body: JSON.stringify(data)})});
const route = (order, action) => '/store/orders/' + order.id + '/' + action;
const check = async (name, work) => {await work(); assert.deepEqual(fixtureErrors, []); passed.push(name); console.log('PASS ' + name);};
const jsonClone = value => JSON.parse(JSON.stringify(value));
let owner, customer, foreign, accountant, otherAccountant, approver, poster, center, otherCenter, employment, store, checkout, audit, provider, ledger;
const account = async name => {
  const person = await db.person.create({data: {firstName: name, lastName: 'SyntheticStoreCheckout'}});
  const row = await db.account.create({data: {personId: person.id, email: `${name}-${randomUUID()}@example.invalid`, passwordHash,
    status: 'ACTIVE', emailVerifiedAt: new Date()}});
  const login = await ok(await call(null, '/auth/login', 'POST', {email: row.email, password}));
  assert.ok(login.accessToken);
  assert.equal(await db.session.count({where: {accountId: row.id, revokedAt: null}}), 1);
  return {...row, token: login.accessToken};
};
const makeCenter = ownerId => db.organization.create({data: {ownerId, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: 'Synthetic Store Center',
  legalName: 'Synthetic Legal Center', registrationNumber: 'SYN-' + randomUUID(), address: 'Synthetic disposable center address'}});
const bindAccountant = async (actor, organization) => {
  const unit = await db.orgUnit.create({data: {organizationId: organization.id, type: 'CENTER', code: 'SYN-' + randomUUID(), nameAr: 'مركز اصطناعي'}});
  const position = await db.position.create({data: {orgUnitId: unit.id, code: 'CENTER_ACCOUNTANT', titleAr: 'محاسب اصطناعي'}});
  return db.employment.create({data: {accountId: actor.id, organizationId: organization.id, orgUnitId: unit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE'}});
};
const product = (extra = {}) => db.storeProduct.create({data: {organizationId: center.id, sku: 'SYN-' + randomUUID(), nameAr: 'سلعة اصطناعية',
  priceMinor: 12_345, currency: 'SAR', stockQuantity: 50, status: 'ACTIVE', kind: 'GOODS', ...extra}});
const order = async (extra = {}) => {
  const item = await product(extra);
  const row = await ok(await call(customer, '/store/orders', 'POST', {items: [{productId: item.id, quantity: 2}]}));
  return {...row, product: item};
};
const quoteFor = row => call(customer, route(row, 'quote')).then(ok);
const acceptance = quote => ({quoteHash: quote.quoteHash, acceptedPolicyVersion: quote.policyVersion, idempotencyKey: 'store-test:' + randomUUID()});
const start = async row => {const quote = await quoteFor(row), input = acceptance(quote); const state = await ok(await call(customer, route(row, 'checkout'), 'POST', input)); return {quote, input, state};};
const journal = row => db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'STORE_ORDER', sourceId: row.id}}});
const capture = async row => {
  const current = await journal(row), invoice = invoices.get(current.providerInvoiceId);
  assert.ok(invoice);
  const payment = {id: randomUUID(), invoice_id: invoice.id, status: 'paid', amount: invoice.amount, currency: 'SAR', captured: 0, refunded: 0,
    updated_at: new Date().toISOString(), refunded_at: null, source: {token: 'MUST-NOT-PERSIST', number: 'MUST-NOT-PERSIST'}};
  payments.set(payment.id, payment); invoice.status = 'paid'; invoice.payments = [payment];
  return {invoice, payment};
};
const entry = async (row, options = {}) => {
  const organization = options.organization || center;
  const account = await ledger.createAccount({organizationId: organization.id, name: 'Synthetic collection ' + randomUUID(), currency: 'SAR'});
  const created = await ledger.createEntry({organizationId: organization.id, financeAccountId: account.id, type: 'REVENUE',
    amountMinor: options.amountMinor || row.totalMinor, currency: 'SAR', referenceType: 'STORE_ORDER_COLLECTION',
    referenceId: options.referenceId || row.id, requestedByAccountId: owner.id});
  if (options.post !== false) {await ledger.decideEntry(created.id, approver.id, true, 'Synthetic approval'); await ledger.postEntry(created.id, poster.id);}
  return created;
};
const fulfill = row => call(owner, '/store/admin/orders/' + row.id + '/status', 'PATCH', {status: 'FULFILLED'});
const confirm = row => call(owner, '/store/admin/orders/' + row.id + '/status', 'PATCH', {status: 'CONFIRMED'}).then(ok);
const cancel = row => call(owner, '/store/admin/orders/' + row.id + '/status', 'PATCH', {status: 'CANCELLED'});

(async () => {
  try {
    providerServer = createServer(async (req, res) => {
      const send = (status, value) => {res.writeHead(status, {'content-type': 'application/json'}); res.end(JSON.stringify(value));};
      try {
        assert.equal(req.headers.authorization, 'Basic ' + Buffer.from(providerSecret + ':').toString('base64'));
        let raw = ''; for await (const chunk of req) {raw += chunk; assert.ok(raw.length < 100_000);}
        const input = raw ? JSON.parse(raw) : null;
        requests.push({method: req.method, path: req.url, input});
        if (req.method === 'POST' && req.url === '/v1/invoices') {
          assert.equal(input.currency, 'SAR'); assert.ok(input.amount >= 100 && Number.isSafeInteger(input.amount));
          assert.equal(input.metadata.hydroland_source_type, 'STORE_ORDER');
          assert.equal(new URL(input.success_url).searchParams.get('store_order_id'), input.metadata.hydroland_source_id);
          assert.equal(new URL(input.success_url).searchParams.get('store_payment'), 'returned');
          assert.equal(new URL(input.back_url).searchParams.get('store_payment'), 'back');
          const id = randomUUID(), invoice = {...input, id, status: 'initiated', url: `https://checkout.moyasar.com/invoices/${id}`, payments: []};
          invoices.set(id, invoice);
          if (dropNext) {dropNext = false; req.socket.destroy(); return;}
          send(201, invoice); return;
        }
        const invoiceMatch = /^\/v1\/invoices\/([0-9a-f-]+)$/.exec(req.url);
        if (req.method === 'GET' && invoiceMatch) {
          assert.ok(invoices.has(invoiceMatch[1]));
          const observation = jsonClone(invoices.get(invoiceMatch[1]));
          if (invoiceMutator) invoiceMutator(observation);
          send(200, observation); return;
        }
        const paymentMatch = /^\/v1\/payments\/([0-9a-f-]+)$/.exec(req.url);
        if (req.method === 'GET' && paymentMatch) {
          assert.ok(payments.has(paymentMatch[1])); const observation = jsonClone(payments.get(paymentMatch[1]));
          if (holdNextRead?.id === paymentMatch[1]) {const hold = holdNextRead; holdNextRead = null; hold.seen(); await hold.release;}
          send(200, observation); return;
        }
        throw new Error('Unexpected provider operation: ' + req.method + ' ' + req.url);
      } catch (error) {fixtureErrors.push(error.message); send(500, {message: 'Synthetic provider assertion failed'});}
    });
    await new Promise(resolve => providerServer.listen(0, '127.0.0.1', resolve));
    process.env.MOYASAR_API_BASE_URL = `http://127.0.0.1:${providerServer.address().port}/v1/`;
    class FixtureModule {}
    Module({controllers: [AuthController, StoreController, StoreCheckoutController], providers: [DatabaseService, AuditService, AuthService, MfaService,
      GoogleIdentityService, AccessTokenGuard, AdminGuard, IntegrationService, MoyasarPaymentProviderService, StoreService, StoreCheckoutService]})(FixtureModule);
    app = await NestFactory.create(FixtureModule, {logger: false});
    await app.listen(0, '127.0.0.1'); base = await app.getUrl();
    global.fetch = (input, options) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      assert.ok([new URL(base).origin, new URL(process.env.MOYASAR_API_BASE_URL).origin].includes(url.origin), 'External network calls are forbidden');
      return nativeFetch(input, {...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(15_000)});
    };
    db = app.get(DatabaseService); store = app.get(StoreService); checkout = app.get(StoreCheckoutService); audit = app.get(AuditService);
    provider = app.get(MoyasarPaymentProviderService); ledger = new FinancePersistenceService(db);
    [owner, customer, foreign, accountant, otherAccountant, approver, poster] = await Promise.all(['owner', 'customer', 'foreign', 'accountant', 'other-accountant', 'approver', 'poster'].map(account));
    await db.roleAssignment.create({data: {accountId: owner.id, role: 'ADMIN', status: 'ACTIVE'}});
    center = await makeCenter(owner.id); otherCenter = await makeCenter(owner.id);
    employment = await bindAccountant(accountant, center); await bindAccountant(otherAccountant, otherCenter);

    await check('native authentication and ownership guard quote without provider calls', async () => {
      const row = await order(), before = requests.length;
      await reject(await call(null, route(row, 'quote')), 401);
      await reject(await call(foreign, route(row, 'quote')), 404);
      const quote = await quoteFor(row);
      assert.equal(quote.snapshot.organizationId, center.id); assert.equal(quote.snapshot.customerAccountId, customer.id);
      assert.equal(quote.snapshot.lines[0].kind, 'PHYSICAL_GOOD'); assert.equal(quote.invoiceReadiness, 'REVIEW_REQUIRED');
      assert.equal(requests.length, before);
    });
    await check('original line prices and issuer survive catalog changes; forged consent is denied', async () => {
      const row = await order(), before = postCount(), quote = await quoteFor(row);
      await db.storeProduct.update({where: {id: row.product.id}, data: {priceMinor: 123, nameAr: 'changed current catalog'}});
      assert.equal((await quoteFor(row)).quoteHash, quote.quoteHash);
      await reject(await call(customer, route(row, 'checkout'), 'POST', {idempotencyKey: randomUUID()}), 409, 'STORE_TERMS_CHANGED');
      await reject(await call(customer, route(row, 'checkout'), 'POST', {...acceptance(quote), quoteHash: 'forged'}), 409, 'STORE_TERMS_CHANGED');
      assert.equal(postCount(), before);
      const started = await ok(await call(customer, route(row, 'checkout'), 'POST', {...acceptance(quote), amountMinor: 1, accountId: foreign.id}));
      assert.equal(started.amountMinor, row.totalMinor); assert.ok(started.checkoutUrl); assert.equal(started.financialActionExecuted, false);
      assert.equal((await journal(row)).customerAccountId, customer.id);
    });
    await check('legacy, unknown issuer, unclassified services and mixed centers require review', async () => {
      const before = postCount();
      for (const extra of [{organizationId: null}, {kind: 'SERVICE'}]) {const row = await order(extra); await reject(await call(customer, route(row, 'quote')), 409, 'STORE_CHECKOUT_REVIEW_REQUIRED');}
      const row = await order(); await db.storeOrderItem.updateMany({where: {orderId: row.id}, data: {contractSnapshot: require('@prisma/client').Prisma.DbNull}});
      await reject(await call(customer, route(row, 'quote')), 409, 'STORE_CHECKOUT_REVIEW_REQUIRED');
      const [left, right] = await Promise.all([product(), product({organizationId: otherCenter.id})]);
      const mixed = await ok(await call(customer, '/store/orders', 'POST', {items: [{productId: left.id, quantity: 1}, {productId: right.id, quantity: 1}]}));
      await reject(await call(customer, route(mixed, 'quote')), 409, 'STORE_CHECKOUT_REVIEW_REQUIRED');
      assert.equal(postCount(), before);
    });
    await check('eight concurrent exact requests create one durable journal and one provider invoice', async () => {
      const row = await order(), quote = await quoteFor(row), input = acceptance(quote), before = postCount();
      const results = await Promise.all(Array.from({length: 8}, () => call(customer, route(row, 'checkout'), 'POST', input).then(ok)));
      assert.equal(new Set(results.map(result => result.checkoutId)).size, 1); assert.equal(postCount(), before + 1);
      const current = await journal(row);
      assert.equal(await db.storePayment.count({where: {orderId: row.id}}), 1);
      assert.equal(await db.auditEvent.count({where: {action: 'STORE_CHECKOUT_DISPATCHED', resourceId: current.id}}), 1);
      await reject(await call(customer, route(row, 'checkout'), 'POST', {...input, idempotencyKey: randomUUID()}), 409);
      await reject(await call(foreign, route(row, 'checkout'), 'POST', input), 404);
      await reject(await call(customer, '/store/orders/' + row.id + '/payment', 'POST', {idempotencyKey: randomUUID()}), 409, 'STORE_HOSTED_CHECKOUT_EXISTS');
      assert.equal(postCount(), before + 1);
    });
    await check('audit rollback makes no provider call and exact retry safely creates the checkout', async () => {
      const row = await order(), quote = await quoteFor(row), input = acceptance(quote), before = postCount();
      const original = audit.record.bind(audit);
      audit.record = (event, tx) => event.action === 'STORE_CHECKOUT_DISPATCHED' ? Promise.reject(new Error('Injected audit failure')) : original(event, tx);
      try {await reject(await call(customer, route(row, 'checkout'), 'POST', input), 500);} finally {audit.record = original;}
      assert.equal(postCount(), before); assert.equal(await db.commerceCheckout.count({where: {sourceId: row.id}}), 0);
      assert.equal(await db.storePayment.count({where: {orderId: row.id}}), 0);
      await ok(await call(customer, route(row, 'checkout'), 'POST', input)); assert.equal(postCount(), before + 1);
    });
    await check('suspended supplying center cannot replay a payment link; refresh preserves financial observation', async () => {
      const row = await order(), first = await start(row), before = postCount();
      await db.organization.update({where: {id: center.id}, data: {status: 'SUSPENDED'}});
      try {
        await reject(await call(customer, route(row, 'checkout'), 'POST', first.input), 409, 'STORE_CHECKOUT_REVIEW_REQUIRED');
        await reject(await call(customer, route(row, 'quote')), 409, 'STORE_CHECKOUT_REVIEW_REQUIRED');
        const refreshed = await ok(await call(customer, route(row, 'refresh'), 'POST'));
        assert.equal(refreshed.checkoutUrl, null); assert.equal(refreshed.sourceReadiness, 'REVIEW_REQUIRED');
        assert.equal(postCount(), before);
      } finally {await db.organization.update({where: {id: center.id}, data: {status: 'ACTIVE'}});}
    });
    await check('pending checkout blocks cancellation and stock release until verified provider closure', async () => {
      const row = await order(); await start(row);
      const stock = (await db.storeProduct.findUniqueOrThrow({where: {id: row.product.id}})).stockQuantity;
      await reject(await cancel(row), 409, 'STORE_CHECKOUT_RECONCILIATION_REQUIRED');
      assert.equal((await db.storeProduct.findUniqueOrThrow({where: {id: row.product.id}})).stockQuantity, stock);
      const current = await journal(row); invoices.get(current.providerInvoiceId).status = 'canceled';
      assert.equal((await ok(await call(customer, route(row, 'refresh'), 'POST'))).status, 'CANCELLED');
      await ok(await cancel(row)); assert.equal((await db.storeProduct.findUniqueOrThrow({where: {id: row.product.id}})).stockQuantity, stock + 2);
      await reject(await call(customer, route(row, 'quote')), 409, 'STORE_CHECKOUT_CLOSED');
    });
    await check('canceled invoice with unresolved authorization never releases reserved inventory', async () => {
      const row = await order(); await start(row);
      const current = await journal(row), invoice = invoices.get(current.providerInvoiceId);
      invoice.status = 'canceled'; invoice.payments = [{id: randomUUID(), status: 'authorized', amount: row.totalMinor, currency: 'SAR'}];
      await reject(await call(customer, route(row, 'refresh'), 'POST'), 503, 'STORE_CHECKOUT_RECONCILIATION_REQUIRED');
      await reject(await cancel(row), 409, 'STORE_CHECKOUT_RECONCILIATION_REQUIRED');
      assert.equal((await db.storeProduct.findUniqueOrThrow({where: {id: row.product.id}})).stockQuantity, 48);
    });
    await check('lost provider create response never resends and only source accountant recovers it', async () => {
      const row = await order(), quote = await quoteFor(row), input = acceptance(quote), before = postCount();
      dropNext = true; await reject(await call(customer, route(row, 'checkout'), 'POST', input), 503, 'STORE_CHECKOUT_RECONCILIATION_REQUIRED');
      const held = await ok(await call(customer, route(row, 'checkout'), 'POST', input)); assert.equal(held.financialOutcome, 'UNKNOWN'); assert.equal(held.checkoutUrl, null);
      assert.equal(postCount(), before + 1);
      const invoice = [...invoices.values()].find(value => value.metadata.hydroland_source_id === row.id); assert.ok(invoice);
      await reject(await call(otherAccountant, route(row, 'reconcile-invoice'), 'POST', {providerInvoiceId: invoice.id}), 403);
      await reject(await call(customer, route(row, 'reconcile-invoice'), 'POST', {providerInvoiceId: invoice.id}), 403);
      const recovered = await ok(await call(accountant, route(row, 'reconcile-invoice'), 'POST', {providerInvoiceId: invoice.id}));
      assert.equal(recovered.status, 'PENDING'); assert.ok(recovered.checkoutUrl); assert.equal(postCount(), before + 1);
    });
    let paidOrder, paidProvider, collectionEntry;
    await check('provider capture alone and fabricated local CAPTURED cannot fulfill an order', async () => {
      const fabricated = await order(); await confirm(fabricated);
      const localPayment = await store.createPayment(customer.id, fabricated.id, randomUUID());
      await db.storePayment.update({where: {id: localPayment.id}, data: {status: 'CAPTURED'}});
      await reject(await fulfill(fabricated), 409, 'STORE_COLLECTION_EVIDENCE_REQUIRED');
      paidOrder = await order(); await start(paidOrder); paidProvider = await capture(paidOrder);
      const observed = await ok(await call(customer, route(paidOrder, 'refresh'), 'POST'));
      assert.equal(observed.status, 'CAPTURED'); assert.equal(observed.collectionVerified, false); assert.equal(observed.financialOutcome, 'CONFIRMED');
      await confirm(paidOrder); await reject(await fulfill(paidOrder), 409, 'STORE_COLLECTION_EVIDENCE_REQUIRED');
      assert.equal(JSON.stringify((await journal(paidOrder)).providerResult).includes('MUST-NOT-PERSIST'), false);
    });
    await check('collection validates accountant scope, amount, source, currency and posted independent approval', async () => {
      collectionEntry = await entry(paidOrder);
      const callsBefore = requests.length;
      await reject(await call(otherAccountant, route(paidOrder, 'collection'), 'POST', {financeEntryId: collectionEntry.id}), 403);
      assert.equal(requests.length, callsBefore);
      for (const options of [{amountMinor: paidOrder.totalMinor - 1}, {referenceId: randomUUID()}, {organization: otherCenter}, {post: false}]) {
        const invalid = await entry(paidOrder, options);
        await reject(await call(accountant, route(paidOrder, 'collection'), 'POST', {financeEntryId: invalid.id}), 409, 'STORE_COLLECTION_EVIDENCE_REQUIRED');
      }
      const usdAccount = await ledger.createAccount({organizationId: center.id, name: 'Synthetic USD', currency: 'USD'});
      const usdEntry = await ledger.createEntry({organizationId: center.id, financeAccountId: usdAccount.id, type: 'REVENUE', amountMinor: paidOrder.totalMinor,
        currency: 'USD', referenceType: 'STORE_ORDER_COLLECTION', referenceId: paidOrder.id, requestedByAccountId: owner.id});
      await ledger.decideEntry(usdEntry.id, approver.id, true); await ledger.postEntry(usdEntry.id, poster.id);
      await reject(await call(accountant, route(paidOrder, 'collection'), 'POST', {financeEntryId: usdEntry.id}), 409, 'STORE_COLLECTION_EVIDENCE_REQUIRED');
      assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: paidOrder.id}}), 0);
    });
    await check('collection audit failure rolls back proof and exact retry records one evidence and permits fulfillment', async () => {
      const original = audit.record.bind(audit);
      audit.record = (event, tx) => event.action === 'STORE_COLLECTION_VERIFIED' ? Promise.reject(new Error('Injected proof audit failure')) : original(event, tx);
      try {await reject(await call(accountant, route(paidOrder, 'collection'), 'POST', {financeEntryId: collectionEntry.id}), 500);} finally {audit.record = original;}
      assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: paidOrder.id}}), 0);
      const results = await Promise.all(Array.from({length: 4}, () => call(accountant, route(paidOrder, 'collection'), 'POST', {financeEntryId: collectionEntry.id}).then(ok)));
      assert.equal(new Set(results.map(value => value.collectionEvidenceId)).size, 1);
      assert.equal(await db.auditEvent.count({where: {action: 'STORE_COLLECTION_VERIFIED', resourceId: paidOrder.id}}), 1);
      await ok(await fulfill(paidOrder)); assert.equal((await db.storeOrder.findUniqueOrThrow({where: {id: paidOrder.id}})).status, 'FULFILLED');
    });
    await check('refund observation blocks fulfillment and stale later capture cannot restore it', async () => {
      const row = await order(); await start(row); const observed = await capture(row); await ok(await call(customer, route(row, 'refresh'), 'POST'));
      const revenue = await entry(row); await ok(await call(accountant, route(row, 'collection'), 'POST', {financeEntryId: revenue.id})); await confirm(row);
      const earlier = jsonClone(observed.payment);
      observed.payment.refunded = 100; observed.payment.refunded_at = new Date().toISOString(); observed.payment.updated_at = observed.payment.refunded_at;
      assert.equal((await ok(await call(customer, route(row, 'refresh'), 'POST'))).status, 'RECONCILIATION_REQUIRED');
      await reject(await fulfill(row), 409, 'STORE_COLLECTION_EVIDENCE_REQUIRED');
      payments.set(observed.payment.id, earlier); observed.invoice.payments = [earlier];
      assert.equal((await ok(await call(customer, route(row, 'refresh'), 'POST'))).status, 'RECONCILIATION_REQUIRED');
      assert.equal((await journal(row)).providerResult.payment.refundedMinor, 100);
    });
    await check('amount and source metadata mismatch remain reconciliation without false collection', async () => {
      const row = await order(); await start(row); await capture(row);
      invoiceMutator = value => {value.metadata.hydroland_source_id = randomUUID();};
      try {await reject(await call(customer, route(row, 'refresh'), 'POST'), 503, 'STORE_CHECKOUT_RECONCILIATION_REQUIRED');} finally {invoiceMutator = null;}
      assert.equal((await journal(row)).status, 'RECONCILIATION_REQUIRED');
      invoiceMutator = value => {value.amount = 1;};
      try {await reject(await call(customer, route(row, 'refresh'), 'POST'), 503);} finally {invoiceMutator = null;}
      assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: row.id}}), 0);
    });
    await check('accountant revocation during provider I/O is rechecked before saving collection', async () => {
      const row = await order(); await start(row); const observed = await capture(row); const revenue = await entry(row);
      let seen, release; const waiting = new Promise(resolve => {seen = resolve;}), barrier = new Promise(resolve => {release = resolve;});
      holdNextRead = {id: observed.payment.id, seen, release: barrier};
      const pending = call(accountant, route(row, 'collection'), 'POST', {financeEntryId: revenue.id});
      await waiting; await db.employment.update({where: {id: employment.id}, data: {status: 'SUSPENDED'}}); release();
      await reject(await pending, 403); assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: row.id}}), 0);
      await db.employment.update({where: {id: employment.id}, data: {status: 'ACTIVE'}});
    });
    await check('a delayed capture observation cannot overwrite a newer verified refund observation', async () => {
      const row = await order(); await start(row); const observed = await capture(row);
      let seen, release; const waiting = new Promise(resolve => {seen = resolve;}), barrier = new Promise(resolve => {release = resolve;});
      holdNextRead = {id: observed.payment.id, seen, release: barrier};
      const pending = call(customer, route(row, 'refresh'), 'POST'); await waiting;
      observed.payment.refunded = observed.payment.amount; observed.payment.status = 'refunded'; observed.payment.refunded_at = new Date().toISOString(); observed.payment.updated_at = observed.payment.refunded_at;
      assert.equal((await ok(await call(customer, route(row, 'refresh'), 'POST'))).status, 'RECONCILIATION_REQUIRED');
      release(); assert.equal((await ok(await pending)).status, 'RECONCILIATION_REQUIRED');
      assert.equal((await journal(row)).providerResult.payment.refundedMinor, observed.payment.amount);
    });
    await check('verified webhook ignores supplied amount and never accepts an unsigned payload', async () => {
      const row = await order(); await start(row); const observed = await capture(row);
      const event = {id: randomUUID(), type: 'payment_paid', secret_token: webhookSecret, live: false,
        data: {invoice_id: observed.invoice.id, amount: 1, currency: 'USD'}};
      assert.throws(() => provider.verifyWebhook({...event, secret_token: 'invalid'}), error => error.getStatus() === 401);
      const result = await checkout.handleVerifiedProviderEvent(provider.verifyWebhook(event));
      assert.equal(result.handled, true); assert.equal(result.status, 'CAPTURED'); assert.equal((await journal(row)).amountMinor, row.totalMinor);
    });
    await check('collection does not issue tax invoices, rewards, refunds or bank payouts', async () => {
      assert.equal(await db.storeInvoice.count(), 0); assert.equal(await db.walletEntry.count(), 0); assert.equal(await db.rewardEntry.count(), 0);
      assert.equal(await db.commerceRefundOperation.count(), 0);
      assert.ok(requests.every(row => row.method === 'POST' && row.path === '/v1/invoices' || row.method === 'GET' && /^\/v1\/(invoices|payments)\//.test(row.path)));
    });
    console.log(JSON.stringify({suite: 'store-hosted-checkout-http-postgresql', passed: passed.length, failed: 0, cases: passed,
      realDatabase: true, realAuthentication: true, nativeHttpRoutes: true, realProviderAdapter: true, syntheticProviderPosts: postCount(),
      actualMoneyTransfers: 0, productionWrites: 0, externalProviderCalls: 0}));
  } finally {
    global.fetch = nativeFetch;
    if (app) await app.close();
    if (providerServer) await new Promise(resolve => providerServer.close(resolve));
  }
})().catch(error => {console.error(error.stack || error); process.exitCode = 1;});
