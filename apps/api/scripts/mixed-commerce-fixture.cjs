// Actual application, PostgreSQL and HTTP payment adapter; all identities and
// provider responses are synthetic and confined to a disposable loopback DB.
const assert = require('node:assert/strict');
const {randomBytes, randomUUID, scryptSync} = require('node:crypto');
const {createServer} = require('node:http');
const {resolve} = require('node:path');

exports.openFixture = async function openFixture() {
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  assert.equal(process.env.B08_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  const database = new URL(process.env.DATABASE_URL || 'invalid:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname));
  assert.match(database.pathname, /^\/commerce_test_b08_[a-z0-9_]+$/);
  const nativeFetch = global.fetch, invoices = new Map(), payments = new Map(), requests = [], providerErrors = [];
  const secret = 'sk_test_SYNTHETIC_b08_loopback_only';
  const webhookSecret = 'whsec_SYNTHETIC_b08_loopback_only';
  Object.assign(process.env, {JWT_SECRET: 'SYNTHETIC_B08_local_session_secret_at_least_32_characters',
    HYDROLAND_AI_TEST_MANUAL_WORKER: '1', HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS: 'SANDBOX', HYDROLAND_PAYMENT_PROVIDER: 'MOYASAR',
    MOYASAR_SECRET_KEY: secret, MOYASAR_WEBHOOK_SECRET: webhookSecret,
    HYDROLAND_INTEGRATION_EMAIL_STATUS: 'DISABLED', HYDROLAND_EMAIL_PROVIDER: 'NONE',
    HYDROLAND_PUBLIC_WEB_ORIGIN: 'https://synthetic-b08.example.invalid'});
  let app, db, base;
  const provider = createServer(async (req, res) => {
    const send = (status, body) => {res.writeHead(status, {'content-type': 'application/json'}); res.end(JSON.stringify(body));};
    try {
      assert.equal(req.headers.authorization, 'Basic ' + Buffer.from(secret + ':').toString('base64'));
      let raw = ''; for await (const chunk of req) {raw += chunk; assert.ok(raw.length < 100_000);}
      const body = raw ? JSON.parse(raw) : null;
      requests.push({method: req.method, path: req.url, body});
      if (req.method === 'POST' && req.url === '/v1/invoices') {
        assert.equal(body.currency, 'SAR'); assert.ok(Number.isSafeInteger(body.amount) && body.amount >= 100);
        const metadata = body.metadata || {};
        assert.ok(metadata.hydroland_booking_id || ['STORE_ORDER', 'TRAINING_ENROLLMENT', 'EQUIPMENT_RENTAL'].includes(metadata.hydroland_source_type));
        const id = randomUUID(), invoice = {...body, id, status: 'initiated', url: `https://checkout.example.invalid/invoices/${id}`, payments: []};
        invoices.set(id, invoice); send(201, invoice); return;
      }
      const invoiceMatch = /^\/v1\/invoices\/([a-f0-9-]+)$/.exec(req.url);
      if (req.method === 'GET' && invoiceMatch) {assert.ok(invoices.has(invoiceMatch[1])); send(200, invoices.get(invoiceMatch[1])); return;}
      const refundMatch = /^\/v1\/payments\/([a-f0-9-]+)\/refund$/.exec(req.url);
      if (req.method === 'POST' && refundMatch) {
        const payment = payments.get(refundMatch[1]); assert.ok(payment);
        assert.ok(Number.isSafeInteger(body.amount) && body.amount > 0 && body.amount <= payment.amount - payment.refunded);
        payment.refunded += body.amount; payment.updated_at = new Date().toISOString(); payment.refunded_at = payment.updated_at;
        if (payment.refunded === payment.amount) payment.status = 'refunded';
        send(200, payment); return;
      }
      const paymentMatch = /^\/v1\/payments\/([a-f0-9-]+)$/.exec(req.url);
      if (req.method === 'GET' && paymentMatch) {assert.ok(payments.has(paymentMatch[1])); send(200, payments.get(paymentMatch[1])); return;}
      throw new Error('Unexpected synthetic provider request ' + req.method + ' ' + req.url);
    } catch (error) {providerErrors.push(error.message); send(500, {message: 'Synthetic B08 provider assertion failed'});}
  });
  await new Promise((resolve, reject) => {provider.once('error', reject); provider.listen(0, '127.0.0.1', resolve);});
  const providerOrigin = `http://127.0.0.1:${provider.address().port}`;
  process.env.MOYASAR_API_BASE_URL = providerOrigin + '/v1/';
  global.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    assert.ok([providerOrigin, base && new URL(base).origin].includes(url.origin), 'B08 fixture forbids external HTTP');
    return nativeFetch(input, {...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(20_000)});
  };
  const dist = process.env.B08_TEST_DIST || resolve(__dirname, '../dist');
  const load = file => require(resolve(dist, file));
  require('reflect-metadata');
  const {NestFactory} = require('@nestjs/core');
  const {AppModule} = load('app.module.js');
  try {
    app = await NestFactory.create(AppModule, {logger: false, abortOnError: false});
    app.setGlobalPrefix('api/v1'); app.useBodyParser('json', {limit: '15mb'});
    await app.listen(0, '127.0.0.1'); base = (await app.getUrl()) + '/api/v1';
    db = app.get(load('database/database.service.js').DatabaseService);
    const zone = await db.$queryRaw`SHOW TimeZone`;
    assert.ok(['UTC', 'Etc/UTC'].includes(zone[0]?.TimeZone), 'B08 canonical UTC-naive source schema requires a disposable PostgreSQL UTC session');
    console.log('B08 PostgreSQL session timezone=' + zone[0].TimeZone);
  } catch (error) {global.fetch = nativeFetch; await app?.close(); await new Promise(r => provider.close(r)); throw error;}
  const call = async (actor, path, method = 'GET', input) => {
    const response = await fetch(base + path, {method, headers: {'content-type': 'application/json', ...(actor ? {authorization: 'Bearer ' + actor.token} : {})},
      ...(input === undefined ? {} : {body: JSON.stringify(input)})});
    const text = await response.text();
    let data; try {data = JSON.parse(text);} catch {data = text;}
    return {status: response.status, data};
  };
  const ok = result => {assert.ok(result.status >= 200 && result.status < 300, JSON.stringify(result)); return result.data;};
  const denied = (result, status) => {assert.equal(result.status, status, JSON.stringify(result)); return result.data;};
  const password = randomBytes(20).toString('hex'), salt = randomBytes(16).toString('hex');
  const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  const account = async label => {
    const person = await db.person.create({data: {firstName: 'Synthetic B08', lastName: label}});
    const row = await db.account.create({data: {personId: person.id, email: `${label}-${randomUUID()}@example.invalid`, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date()}});
    const login = ok(await call(null, '/auth/login', 'POST', {email: row.email, password}));
    assert.ok(login.accessToken); return {...row, token: login.accessToken};
  };
  const [owner, buyer, stranger, accountant, approver, poster, receiver] = await Promise.all(
    ['owner', 'buyer', 'stranger', 'accountant', 'approver', 'poster', 'receiver'].map(account));
  for (const role of ['ADMIN', 'DIVE_CENTER']) await db.roleAssignment.create({data: {accountId: owner.id, role, status: 'ACTIVE'}});
  const center = await db.organization.create({data: {ownerId: owner.id, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: 'Synthetic B08 Center',
    legalName: 'Synthetic B08 Original Issuer', registrationNumber: 'SYNTHETIC-B08-REG', address: 'Loopback synthetic address'}});
  await db.organizationMember.create({data: {organizationId: center.id, accountId: owner.id, role: 'OWNER', status: 'ACTIVE'}});
  const unit = await db.orgUnit.create({data: {organizationId: center.id, type: 'CENTER', code: 'SYN-B08', nameAr: 'مركز اختبار B08'}});
  const position = await db.position.create({data: {orgUnitId: unit.id, code: 'CENTER_ACCOUNTANT', titleAr: 'محاسب اختبار'}});
  for (const actor of [accountant, receiver]) await db.employment.create({data: {accountId: actor.id, organizationId: center.id,
    orgUnitId: unit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE'}});
  const platform = await db.organization.create({data: {ownerId: owner.id, kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE', displayName: 'Synthetic B08 Platform'}});
  await db.operationalSetting.upsert({where: {key: 'PLATFORM_STAFFING_ORGANIZATION:v1'},
    create: {key: 'PLATFORM_STAFFING_ORGANIZATION:v1', value: {organizationId: platform.id}}, update: {value: {organizationId: platform.id}}});
  process.env.D12_OWNER_EMAIL = owner.email;
  for (const [category, ruleKey, state] of [['BOOKING', 'SAFETY_APPROVAL', 'DISABLED'], ['WEATHER', 'WEATHER_GATE', 'DISABLED'],
    ['BOOKING', 'CAPACITY_LIMIT', 'ENABLED'], ['BOOKING', 'PARTICIPANT_ELIGIBILITY', 'ENABLED'], ['PAYMENT', 'PAYMENT_REQUIRED', 'ENABLED'], ['PAYMENT', 'REFUND_REVIEW', 'ENABLED']]) {
    await db.policyControl.upsert({where: {category_ruleKey: {category, ruleKey}}, create: {category, ruleKey, state, labelAr: 'Synthetic isolated B08 policy'}, update: {state}});
  }
  const ledger = app.get(load('finance/finance-persistence.service.js').FinancePersistenceService);
  const financeAccount = await ledger.createAccount({organizationId: center.id, name: 'Synthetic B08 collection', currency: 'SAR'});
  const offerings = async (label = 'main', options = {}) => {
    const goods = await db.storeProduct.create({data: {organizationId: center.id, sku: 'SYN-' + randomUUID(), nameAr: 'Synthetic goods ' + label,
      priceMinor: 1200, currency: 'SAR', stockQuantity: 20, status: 'ACTIVE', kind: 'GOODS'}});
    const startsAt = new Date(Date.now() + (label === 'main' ? 40_000 : 120 * 3_600_000)), endsAt = new Date(startsAt.getTime() + 3_600_000);
    // A short, real wall-clock trip window lets the acceptance test execute the
    // original booking without changing its signed schedule or forging completion.
    const tripStartsAt = label === 'main' ? new Date(Date.now() + 45_000) : startsAt;
    const tripEndsAt = label === 'main' ? new Date(tripStartsAt.getTime() + 1000) : endsAt;
    const trip = await db.trip.create({data: {organizationId: center.id, title: 'Synthetic trip ' + label, type: 'SHORE_DIVE', capacity: 10,
      status: 'OPEN', startsAt: tripStartsAt, endsAt: tripEndsAt}});
    await db.operationalSetting.create({data: {key: 'trip-price:' + trip.id, value: {pricePerSeatMinor: 2300, currency: 'SAR'}}});
    const course = await db.storeCourseOffer.create({data: {organizationId: center.id, courseCode: 'SYN-B08', title: 'Synthetic course ' + label,
      description: 'No real training', locationName: 'Loopback only', startsAt, endsAt, capacity: 10, priceMinor: 3400, currency: 'SAR', status: 'ACTIVE'}});
    const equipment = await db.calendarResource.create({data: {type: 'EQUIPMENT', name: 'Synthetic equipment ' + label}});
    const assetCode = 'SYN-B08-' + randomUUID();
    await db.$executeRaw`INSERT INTO "EquipmentBarcode" ("id","resourceId","assetCode","barcodeValue","qrValue","stockStatus","organizationId")
      VALUES (${randomUUID()},${equipment.id},${assetCode},${assetCode},${'qr:' + assetCode},'AVAILABLE',${center.id})`;
    await db.operationalSetting.create({data: {key: 'store-rental-rate:' + equipment.id, value: {organizationId: center.id, published: true, baseMinor: 4500, currency: 'SAR'}}});
    ok(await call(owner, '/trips/admin/equipment/' + equipment.id + '/inspections', 'POST', {status: 'PASS', serviceExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), notes: 'Synthetic B08 inspection'}));
    const scheduledHandoverAt = new Date(Date.now() + 72 * 3_600_000).toISOString(), dueAt = new Date(Date.now() + 96 * 3_600_000).toISOString();
    return {goods, trip, course, equipment, assetCode, scheduledHandoverAt, dueAt, input: {requestId: randomUUID(), items: [
      {kind: 'GOODS', productId: goods.id, quantity: 2, expectedUnitPriceMinor: 1200},
      {kind: 'TRIP', tripId: trip.id, seats: 1, expectedUnitPriceMinor: 2300},
      {kind: 'COURSE', courseId: course.id, expectedUnitPriceMinor: 3400},
      {kind: 'RENTAL', resourceId: equipment.id, scheduledHandoverAt, dueAt, expectedUnitPriceMinor: 4500},
    ]}};
  };
  const capture = id => {
    const invoice = invoices.get(id); assert.ok(invoice, 'Invoice must have been created through the real adapter');
    if (invoice.payments.length) return invoice.payments[0];
    const payment = {id: randomUUID(), invoice_id: invoice.id, status: 'paid', amount: invoice.amount, currency: 'SAR', captured: 0,
      refunded: 0, updated_at: new Date().toISOString(), refunded_at: null, source: {token: 'MUST_NOT_PERSIST', number: 'MUST_NOT_PERSIST'}};
    invoice.status = 'paid'; invoice.payments = [payment]; payments.set(payment.id, payment); return payment;
  };
  const postRevenue = async (referenceType, referenceId, amountMinor) => {
    const entry = await ledger.createEntry({organizationId: center.id, financeAccountId: financeAccount.id, type: 'REVENUE',
      amountMinor, currency: 'SAR', referenceType, referenceId, requestedByAccountId: owner.id});
    await ledger.decideEntry(entry.id, approver.id, true, 'Synthetic B08 independent revenue approval');
    await ledger.postEntry(entry.id, poster.id); return entry;
  };
  const sourcePath = line => line.kind === 'GOODS' ? `/store/orders/${line.sourceId}` : line.kind === 'COURSE' ? `/payments/courses/${line.sourceId}` : `/payments/rentals/${line.sourceId}`;
  async function collectLine(line) {
    const before = requests.filter(r => r.method === 'POST' && r.path === '/v1/invoices').length;
    if (line.kind === 'TRIP') {
      const quote = ok(await call(buyer, `/payments/bookings/${line.sourceId}/quote`));
      const input = {bookingId: line.sourceId, idempotencyKey: 'b08:' + randomUUID(), policyAcceptance: {version: quote.policyVersion, quoteHash: quote.quoteHash}};
      const created = ok(await call(buyer, '/payments', 'POST', input));
      const repeated = ok(await call(buyer, '/payments', 'POST', input)); assert.equal(repeated.id, created.id);
      const saved = await db.payment.findUniqueOrThrow({where: {id: created.id}});
      assert.equal(saved.amountMinor, line.amountMinor); const providerPayment = capture(saved.providerReference);
      ok(await call(buyer, `/payments/${saved.id}/refresh`, 'POST'));
      assert.equal((await db.payment.findUniqueOrThrow({where: {id: saved.id}})).status, 'CAPTURED');
      const revenue = await postRevenue('TRIP_PAYMENT_COLLECTION', saved.id, line.amountMinor);
      assert.equal(requests.filter(r => r.method === 'POST' && r.path === '/v1/invoices').length, before + 1);
      return {line, quote, paymentId: saved.id, providerPayment, revenue};
    }
    const path = sourcePath(line), quote = ok(await call(buyer, path + '/quote'));
    const input = {quoteHash: quote.quoteHash, acceptedPolicyVersion: quote.policyVersion, idempotencyKey: 'b08:' + randomUUID()};
    const created = ok(await call(buyer, path + '/checkout', 'POST', input));
    const repeated = ok(await call(buyer, path + '/checkout', 'POST', input)); assert.equal(repeated.checkoutId, created.checkoutId);
    const checkout = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: line.sourceType, sourceId: line.sourceId}}});
    assert.equal(checkout.amountMinor, line.amountMinor); const providerPayment = capture(checkout.providerInvoiceId);
    ok(await call(buyer, path + '/refresh', 'POST'));
    const revenue = await postRevenue(line.sourceType + '_COLLECTION', line.sourceId, line.amountMinor);
    const receipt = ok(await call(accountant, path + '/collection', 'POST', {financeEntryId: revenue.id}));
    const repeatedReceipt = ok(await call(accountant, path + '/collection', 'POST', {financeEntryId: revenue.id}));
    assert.equal(repeatedReceipt.collectionEvidenceId, receipt.collectionEvidenceId);
    const evidence = await db.commerceCollectionEvidence.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: line.sourceType, sourceId: line.sourceId}}});
    assert.equal(evidence.amountMinor, line.amountMinor); assert.equal(evidence.financeEntryId, revenue.id);
    assert.equal(evidence.providerPaymentId, providerPayment.id); assert.equal(evidence.providerRefundedMinor, 0);
    assert.equal(requests.filter(r => r.method === 'POST' && r.path === '/v1/invoices').length, before + 1);
    return {line, quote, checkout, providerPayment, revenue, evidence};
  }
  return {app, db, base, load, call, ok, denied, invoices, payments, requests, providerErrors,
    owner, buyer, stranger, accountant, approver, poster, receiver, center, unit, financeAccount, ledger,
    offerings, capture, collectLine, sourcePath, postRevenue, account, platform,
    async close() {global.fetch = nativeFetch; await app.close(); await new Promise(r => provider.close(r)); await db.$disconnect();}};
};
