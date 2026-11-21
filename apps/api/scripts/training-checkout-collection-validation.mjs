import 'reflect-metadata';
import assert from 'node:assert/strict';
import refundGrants from './checkout-refund-grants.cjs';
import {createServer} from 'node:http';
import {randomUUID, randomBytes, scryptSync} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';

assert.notEqual(process.env.NODE_ENV, 'production');
assert.equal(process.env.COURSE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const database = new URL(process.env.DATABASE_URL || 'invalid:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname));
assert.match(database.pathname, /^\/course_checkout_test[a-z0-9_]*$/);
const dist = process.env.COURSE_COLLECTION_TEST_DIST || fileURLToPath(new URL('../dist/', import.meta.url));
const load = file => import(pathToFileURL(join(dist, file)));
const {DatabaseService} = await load('database/database.service.js');
const {AuditService} = await load('audit/audit.service.js');
const {AuthService} = await load('auth/auth.service.js');
const {MfaService} = await load('auth/mfa.service.js');
const {AccessTokenGuard} = await load('auth/access-token.guard.js');
const {MoyasarPaymentProviderService} = await load('payments/moyasar-payment-provider.service.js');
const {TrainingCheckoutService} = await load('payments/training-checkout.service.js');
const {CheckoutRefundController}=await load('payments/checkout-refund.controller.js');
const {CheckoutRefundService}=await load('payments/checkout-refund.service.js');
const {FinanceOperationGrantService}=await load('finance/finance-operation-grant.service.js');
const {TrainingCheckoutController} = await load('payments/training-checkout.controller.js');
const {StoreOfferingsService} = await load('store/store-offerings.service.js');
const {FinancePersistenceService} = await load('finance/finance-persistence.service.js');
const {TrainingRepositoryService} = await load('governance/training-repository.service.js');
const {TrainingSessionService} = await load('governance/training-session.service.js');
const {TrainingAuthorizationService} = await load('governance/training-authorization.service.js');
const {assertTrainingStandardCompletion} = await load('governance/training-standard-store.js');
const {requireCourseCollection} = await load('commerce/course-collection.js');

const db = new DatabaseService(), audit = new AuditService(db), ledger = new FinancePersistenceService(db), offers = new StoreOfferingsService(db);
process.env.JWT_SECRET = 'SYNTHETIC_course_checkout_session_key_20261121';
const auth = new AuthService(db, new MfaService(db), {});
const invoices = new Map(), payments = new Map(), requests = [];
let dropNextInvoice = false, heldPaymentRead = null;
const providerServer = createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
  requests.push({method: req.method, url: req.url, body});
  const reply = (status, value) => { res.writeHead(status, {'content-type': 'application/json'}); res.end(JSON.stringify(value)); };
  assert.equal(req.headers.authorization, 'Basic ' + Buffer.from('synthetic_course_checkout_provider:').toString('base64'));
  if (req.method === 'POST' && req.url === '/v1/invoices') {
    const id = randomUUID(), invoice = {...body, id, status: 'initiated', url: `https://checkout.moyasar.com/invoices/${id}`, payments: []};
    invoices.set(id, invoice);
    if (dropNextInvoice) { dropNextInvoice = false; req.socket.destroy(); return; }
    reply(201, invoice); return;
  }
  const invoiceMatch = /^\/v1\/invoices\/([a-f0-9-]+)$/.exec(req.url);
  if (req.method === 'GET' && invoiceMatch && invoices.has(invoiceMatch[1])) { reply(200, invoices.get(invoiceMatch[1])); return; }
  const refund=/^\/v1\/payments\/([a-f0-9-]+)\/refund$/.exec(req.url);
  if(refund && req.method==='POST'){
    const payment=payments.get(refund[1]);assert.ok(payment);
    assert.ok(body.amount>0 && body.amount<=payment.amount-payment.refunded);
    payment.refunded+=body.amount;payment.updated_at=new Date().toISOString();payment.refunded_at=payment.updated_at;
    if(payment.amount===payment.refunded)payment.status='refunded';
    reply(200,payment);return;
  }
  const paymentMatch = /^\/v1\/payments\/([a-f0-9-]+)$/.exec(req.url);
  if (req.method === 'GET' && paymentMatch && payments.has(paymentMatch[1])) {
    const snapshot = structuredClone(payments.get(paymentMatch[1]));
    if (heldPaymentRead?.id === paymentMatch[1]) { const held = heldPaymentRead; heldPaymentRead = null; held.seen(); await held.release; }
    reply(200, snapshot); return;
  }
  reply(404, {message: 'Synthetic fixture missing'});
});
await new Promise(resolve => providerServer.listen(0, '127.0.0.1', resolve));
process.env.HYDROLAND_PAYMENT_PROVIDER = 'MOYASAR';
process.env.MOYASAR_SECRET_KEY = 'synthetic_course_checkout_provider';
process.env.MOYASAR_API_BASE_URL = `http://127.0.0.1:${providerServer.address().port}/v1/`;
process.env.HYDROLAND_PUBLIC_WEB_ORIGIN = 'https://synthetic-course.example.invalid';
const provider = new MoyasarPaymentProviderService({requireOperational() { return {status: 'SANDBOX'}; }, async recordProviderSignal() {}});
const checkout = new TrainingCheckoutService(db, audit, provider), repository = new TrainingRepositoryService(db, {}, {}, {}, {});
const trainingSessions = new TrainingSessionService(db, audit, new TrainingAuthorizationService(db));
class CourseAcceptanceModule {}
Module({controllers: [TrainingCheckoutController,CheckoutRefundController], providers: [AccessTokenGuard,{provide:CheckoutRefundService,useValue:new CheckoutRefundService(db,provider)},
  {provide: TrainingCheckoutService, useValue: checkout}, {provide: AuthService, useValue: auth}]})(CourseAcceptanceModule);
const app = await NestFactory.create(CourseAcceptanceModule, {logger: false});
app.setGlobalPrefix('api/v1');
await app.listen(0, '127.0.0.1');
const origin = await app.getUrl();
const cases = [], allAccountIds = [], allPersonIds = [], allOrganizationIds = [], allCourseIds = [], allEnrollmentIds = [], allFinanceIds = [], allFinanceAccountIds = [], allOrgUnitIds = [], allPositionIds = [];
const check = async (name, work) => { await work(); cases.push(name); console.log('PASS', name); };
const posts = () => requests.filter(row => row.method === 'POST').length;
const status = code => error => error.getStatus?.() === code;
const password = 'Synthetic-course-password!2026';
async function account(label) {
  const person = await db.person.create({data: {firstName: 'SYNTHETIC course', lastName: label}}); allPersonIds.push(person.id);
  const salt = randomBytes(16).toString('hex');
  const row = await db.account.create({data: {personId: person.id, email: `course-${randomUUID()}@example.invalid`,
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, status: 'ACTIVE', emailVerifiedAt: new Date()}}); allAccountIds.push(row.id);
  const session = await auth.login({email: row.email, password});
  return {...row, token: session.accessToken};
}
async function center(owner, label) {
  const row = await db.organization.create({data: {ownerId: owner.id, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: `SYNTHETIC ${label}`,
    legalName: `SYNTHETIC Legal ${label}`, registrationNumber: `SYN-${randomUUID()}`, address: 'SYNTHETIC isolated location'}}); allOrganizationIds.push(row.id);
  return row;
}
async function bindAccountant(actor, organization) {
  const unit = await db.orgUnit.create({data: {organizationId: organization.id, type: 'CENTER', code: 'SYN-CTR', nameAr: 'مركز اصطناعي'}}); allOrgUnitIds.push(unit.id);
  const position = await db.position.create({data: {orgUnitId: unit.id, code: 'CENTER_ACCOUNTANT', titleAr: 'محاسب اصطناعي'}}); allPositionIds.push(position.id);
  return db.employment.create({data: {accountId: actor.id, organizationId: organization.id, orgUnitId: unit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE'}});
}
let owner, buyer, other, approver, poster, accountant, otherAccountant, centerA, centerB, employment;
async function enrollment(options = {}) {
  const startsAt = options.startsAt || new Date(Date.now() + 86400000);
  const course = await db.storeCourseOffer.create({data: {organizationId: centerA.id, courseCode: 'SYN-COURSE', title: 'SYNTHETIC original course',
    description: 'No real training', locationName: 'SYNTHETIC location', startsAt, endsAt: new Date(startsAt.getTime() + 3600000),
    capacity: 10, priceMinor: 5000, currency: 'SAR', status: 'ACTIVE'}}); allCourseIds.push(course.id);
  const row = await offers.enroll(buyer.id, course.id); allEnrollmentIds.push(row.id);
  return {course, enrollment: row};
}
async function call(actor, id, action, method = 'POST', input) {
  const response = await fetch(`${origin}/api/v1/payments/courses/${id}/${action}`, {method,
    headers: {...(actor ? {authorization: `Bearer ${actor.token}`} : {}), 'content-type': 'application/json'},
    ...(input === undefined ? {} : {body: JSON.stringify(input)})});
  return {status: response.status, body: await response.json()};
}
async function start(fixture) {
  const quote = await call(buyer, fixture.enrollment.id, 'quote', 'GET'); assert.equal(quote.status, 200, JSON.stringify(quote.body));
  const input = {quoteHash: quote.body.quoteHash, acceptedPolicyVersion: quote.body.policyVersion, idempotencyKey: `course:${fixture.enrollment.id}`};
  const result = await call(buyer, fixture.enrollment.id, 'checkout', 'POST', input); assert.equal(result.status, 201, JSON.stringify(result.body));
  return {quote: quote.body, input, result: result.body};
}
async function capture(id) {
  const row = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'TRAINING_ENROLLMENT', sourceId: id}}});
  const invoice = invoices.get(row.providerInvoiceId); assert.ok(invoice);
  const payment = {id: randomUUID(), invoice_id: invoice.id, status: 'paid', amount: invoice.amount, currency: invoice.currency,
    captured: 0, refunded: 0, refunded_at: null, updated_at: new Date().toISOString(), source: {number: 'DO-NOT-PERSIST', token: 'DO-NOT-PERSIST'}};
  invoice.status = 'paid'; invoice.payments = [payment]; payments.set(payment.id, payment);
  return {invoice, payment};
}
async function revenue(id, options = {}) {
  const a = await ledger.createAccount({organizationId: centerA.id, name: 'SYNTHETIC course revenue', currency: 'SAR'}); allFinanceAccountIds.push(a.id);
  const entry = await ledger.createEntry({organizationId: centerA.id, financeAccountId: a.id, type: 'REVENUE', amountMinor: options.amountMinor ?? 5000,
    currency: 'SAR', referenceType: 'TRAINING_ENROLLMENT_COLLECTION', referenceId: options.referenceId ?? id, requestedByAccountId: owner.id}); allFinanceIds.push(entry.id);
  if (options.post !== false) { await ledger.decideEntry(entry.id, approver.id, true, 'SYNTHETIC approval'); await ledger.postEntry(entry.id, poster.id); }
  return entry;
}
async function failCollectionAudit(enabled) {
  if (enabled) {
    await db.$executeRawUnsafe(`CREATE FUNCTION course_checkout_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic collection audit failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER course_checkout_fail_audit BEFORE INSERT ON "AuditEvent" FOR EACH ROW WHEN (NEW.action='COURSE_COLLECTION_VERIFIED') EXECUTE FUNCTION course_checkout_fail_audit()`);
  } else {
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS course_checkout_fail_audit ON "AuditEvent"');
    await db.$executeRawUnsafe('DROP FUNCTION IF EXISTS course_checkout_fail_audit()');
  }
}
try {
  [owner, buyer, other, approver, poster, accountant, otherAccountant] = await Promise.all(['Owner', 'Buyer', 'Other', 'Approver', 'Poster', 'Accountant', 'Other accountant'].map(account));
  centerA = await center(owner, 'A'); centerB = await center(owner, 'B'); employment = await bindAccountant(accountant, centerA); await bindAccountant(otherAccountant, centerB);
  await db.roleAssignment.createMany({data: ['DIVE_CENTER', 'INSTRUCTOR'].map(role => ({accountId: owner.id, role, status: 'ACTIVE'}))});
  await db.organizationMember.create({data: {organizationId: centerA.id, accountId: owner.id, role: 'OWNER', status: 'ACTIVE'}});
  await check('generic enrollment metadata cannot fabricate a financial confirmation', async () => {
    const before = await db.trainingEnrollment.count({where: {studentAccountId: buyer.id}});
    assert.throws(() => repository.createEnrollment({studentAccountId: buyer.id, courseCode: 'SYN-COURSE',
      metadata: {financialConfirmation: {status: 'VERIFIED'}}}), status(400));
    assert.equal(await db.trainingEnrollment.count({where: {studentAccountId: buyer.id}}), before);
  });
  await check('purchased course scheduling, attendance, start, progress and completion all require original collection', async () => {
    const fixture = await enrollment(), enrollmentId = fixture.enrollment.id;
    const course = await db.trainingEnrollment.update({where: {id: enrollmentId}, data: {instructorAccountId: owner.id}});
    const record = await db.trainingRecord.create({data: {enrollmentId}});
    const originalAudits = await db.auditEvent.count({where: {resourceId: enrollmentId}});
    const blocked = error => error.getStatus?.() === 409 && error.getResponse?.().code === 'COURSE_COLLECTION_EVIDENCE_REQUIRED';
    await assert.rejects(repository.setEnrollmentStatus(enrollmentId, 'ACTIVE'), blocked);
    await assert.rejects(repository.setRecordProgress(record.id, 1, 'IN_PROGRESS'), blocked);
    await assert.rejects(repository.setRecordProgress(record.id, 100, 'COMPLETED'), blocked);
    await assert.rejects(db.serializable(tx => assertTrainingStandardCompletion(tx, enrollmentId)), blocked);
    const future = new Date(Date.now() + 10 * 60_000), end = new Date(Date.now() + 60 * 60_000);
    const scheduling = {instructorAccountId: owner.id, requestId: randomUUID(), startsAt: future.toISOString(), endsAt: end.toISOString(),
      expectedUpdatedAt: course.updatedAt.toISOString(), reason: 'Synthetic financial gate test', environment: 'POOL', plannedMaximumDepthMetres: 1};
    await assert.rejects(trainingSessions.create(owner.id, enrollmentId, scheduling), blocked);
    assert.equal(await db.trainingSession.count({where: {trainingRecordId: record.id}}), 0);
    for (const action of ['OPEN', 'INSTRUCTOR_CHECK_IN', 'STUDENT_CHECK_IN', 'START', 'COMPLETE']) {
      const started = ['START', 'COMPLETE'].includes(action), at = new Date(Date.now() - 60_000);
      const session = await db.trainingSession.create({data: {trainingRecordId: record.id, instructorAccountId: owner.id,
        status: action === 'OPEN' ? 'SCHEDULED' : action === 'COMPLETE' ? 'IN_PROGRESS' : 'CHECK_IN_OPEN',
        startsAt: started ? at : future, endsAt: end, evidence: started ? {instructorCheckInAt: at.toISOString(), studentCheckInAt: at.toISOString(), startedAt: at.toISOString()} : {}}});
      if (action === 'OPEN') await assert.rejects(trainingSessions.reschedule(owner.id, session.id, {
        startsAt: future.toISOString(), endsAt: end.toISOString(), expectedUpdatedAt: session.updatedAt.toISOString(), reason: 'Synthetic reschedule'}), blocked);
      await assert.rejects(trainingSessions.act(owner.id, session.id, {action, expectedUpdatedAt: session.updatedAt.toISOString(), reason: 'Synthetic financial gate test'}), blocked);
      assert.equal((await db.trainingSession.findUniqueOrThrow({where: {id: session.id}})).status, session.status);
    }
    assert.equal((await db.trainingEnrollment.findUniqueOrThrow({where: {id: enrollmentId}})).status, 'PENDING');
    assert.equal((await db.trainingRecord.findUniqueOrThrow({where: {id: record.id}})).progressPercent, 0);
    assert.equal(await db.auditEvent.count({where: {resourceId: enrollmentId}}), originalAudits);
  });
  const first = await enrollment(), id = first.enrollment.id;
  await check('real session guard rejects missing tokens and another student before disclosing the quote', async () => {
    assert.equal((await call(null, id, 'quote', 'GET')).status, 401);
    assert.equal((await call(other, id, 'quote', 'GET')).status, 404);
    assert.equal(posts(), 0);
  });
  const quote = (await call(buyer, id, 'quote', 'GET')).body;
  const input = {quoteHash: quote.quoteHash, acceptedPolicyVersion: quote.policyVersion, idempotencyKey: `course:${id}`};
  await check('original enrollment price and schedule survive later catalog edits and require explicit consent', async () => {
    await db.storeCourseOffer.update({where: {id: first.course.id}, data: {priceMinor: 99999, title: 'CHANGED CATALOG', startsAt: new Date(Date.now() + 10 * 86400000)}});
    const unchanged = (await call(buyer, id, 'quote', 'GET')).body;
    assert.equal(unchanged.snapshot.amountMinor, 5000); assert.equal(unchanged.quoteHash, quote.quoteHash);
    assert.equal(unchanged.snapshot.originalSchedule.startsAt, first.course.startsAt.toISOString());
    assert.equal((await call(buyer, id, 'checkout', 'POST', {...input, acceptedPolicyVersion: undefined})).status, 409);
    assert.equal((await call(buyer, id, 'checkout', 'POST', {...input, quoteHash: 'changed'})).status, 409);
    assert.equal(posts(), 0);
  });
  await check('eight concurrent exact HTTP checkouts send one provider POST and retain the accepted original terms', async () => {
    const outcomes = await Promise.all(Array.from({length: 8}, () => call(buyer, id, 'checkout', 'POST', input)));
    assert.ok(outcomes.every(row => row.status === 201), JSON.stringify(outcomes)); assert.equal(posts(), 1);
    const journal = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'TRAINING_ENROLLMENT', sourceId: id}}});
    const invoice = invoices.get(journal.providerInvoiceId);
    assert.equal(invoice.amount, 5000); assert.equal(invoice.metadata.hydroland_source_type, 'TRAINING_ENROLLMENT');
    assert.equal(invoice.metadata.hydroland_source_id, id); assert.equal(invoice.metadata.hydroland_customer_account_id, buyer.id);
    assert.equal(Date.parse(invoice.expired_at) - journal.dispatchedAt.getTime(), 30 * 60_000);
    assert.equal(journal.contractSnapshot.termsAcceptanceStatus, 'ACCEPTED');
    assert.equal((await call(buyer, id, 'checkout', 'POST', {...input, idempotencyKey: `other:${id}`})).status, 409);
    assert.equal(posts(), 1);
  });
  await check('suspending the supplying center removes an existing payment link and requires review', async () => {
    await db.organization.update({where: {id: centerA.id}, data: {status: 'SUSPENDED'}});
    try {
      const response = await call(buyer, id, 'refresh');
      assert.equal(response.status, 201); assert.equal(response.body.status, 'RECONCILIATION_REQUIRED');
      assert.equal(response.body.checkoutUrl, null); assert.equal(response.body.collectionVerified, false);
      assert.equal((await call(buyer, id, 'checkout', 'POST', input)).status, 409);
    } finally { await db.organization.update({where: {id: centerA.id}, data: {status: 'ACTIVE'}}); }
  });
  await check('capture alone does not confirm finance, activate training, complete a course or issue a certificate', async () => {
    await assert.rejects(repository.setEnrollmentStatus(id, 'ACTIVE'), status(409));
    await capture(id);
    const refreshed = await call(buyer, id, 'refresh'); assert.equal(refreshed.status, 201); assert.equal(refreshed.body.status, 'CAPTURED');
    assert.equal(refreshed.body.collectionVerified, false);
    const row = await db.trainingEnrollment.findUniqueOrThrow({where: {id}}); assert.equal(row.status, 'PENDING'); assert.equal(row.completedAt, null);
    assert.equal(row.metadata.financialConfirmation, undefined); assert.equal(await db.trainingRecord.count({where: {enrollmentId: id}}), 0);
    await assert.rejects(repository.setEnrollmentStatus(id, 'ACTIVE'), status(409));
  });
  const good = await revenue(id);
  await check('center accountant authorization and independent posted ledger approval are enforced over HTTP', async () => {
    for (const actor of [owner, buyer, otherAccountant]) assert.equal((await call(actor, id, 'collection', 'POST', {financeEntryId: good.id})).status, 403);
    assert.equal((await call(other, id, 'refresh')).status, 404);
    const wrong = await revenue(id, {referenceId: randomUUID()}), unposted = await revenue(id, {post: false});
    for (const row of [wrong, unposted]) assert.equal((await call(accountant, id, 'collection', 'POST', {financeEntryId: row.id})).status, 409);
    assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: id}}), 0);
  });
  await check('collection evidence, financial confirmation and audit roll back together when the real database audit insert fails', async () => {
    await failCollectionAudit(true);
    const failed = await call(accountant, id, 'collection', 'POST', {financeEntryId: good.id}); assert.equal(failed.status, 500);
    assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: id}}), 0);
    assert.equal((await db.trainingEnrollment.findUniqueOrThrow({where: {id}})).metadata.financialConfirmation, undefined);
    await failCollectionAudit(false);
  });
  await check('successful replay creates one proof and confirms finance without changing training readiness', async () => {
    const accepted = await call(accountant, id, 'collection', 'POST', {financeEntryId: good.id}); assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
    const replay = await call(accountant, id, 'collection', 'POST', {financeEntryId: good.id}); assert.equal(replay.body.collectionEvidenceId, accepted.body.collectionEvidenceId);
    assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: id}}), 1);
    assert.equal(await db.auditEvent.count({where: {action: 'COURSE_COLLECTION_VERIFIED', resourceId: id}}), 1);
    const row = await db.trainingEnrollment.findUniqueOrThrow({where: {id}});
    assert.equal(row.status, 'PENDING'); assert.equal(row.metadata.financialConfirmation.status, 'VERIFIED');
    const evidence = await db.serializable(tx => requireCourseCollection(tx, row)); assert.equal(evidence.financeEntryId, good.id);
    assert.ok(!JSON.stringify(evidence).includes('DO-NOT-PERSIST'));
    await assert.rejects(repository.setEnrollmentStatus(id, 'ACTIVE'), error => error.getStatus?.() === 409 && error.getResponse?.().code !== 'COURSE_COLLECTION_EVIDENCE_REQUIRED');
    assert.equal((await db.trainingEnrollment.findUniqueOrThrow({where: {id}})).status, 'PENDING');
  });
  await check('a lost provider response stays reviewable and cannot repeat the invoice POST; scoped reconciliation recovers it', async () => {
    const f = await enrollment(), q = (await call(buyer, f.enrollment.id, 'quote', 'GET')).body;
    const request = {quoteHash: q.quoteHash, acceptedPolicyVersion: q.policyVersion, idempotencyKey: `lost:${f.enrollment.id}`};
    dropNextInvoice = true; const before = posts();
    assert.equal((await call(buyer, f.enrollment.id, 'checkout', 'POST', request)).status, 503);
    const replay = await call(buyer, f.enrollment.id, 'checkout', 'POST', request); assert.equal(replay.body.status, 'RECONCILIATION_REQUIRED'); assert.equal(posts(), before + 1);
    const invoice = [...invoices.values()].find(row => row.metadata.hydroland_source_id === f.enrollment.id);
    assert.equal((await call(otherAccountant, f.enrollment.id, 'reconcile-invoice', 'POST', {providerInvoiceId: invoice.id})).status, 403);
    const reconciled = await call(accountant, f.enrollment.id, 'reconcile-invoice', 'POST', {providerInvoiceId: invoice.id}); assert.equal(reconciled.body.status, 'PENDING'); assert.equal(posts(), before + 1);
  });
  await check('provider metadata mismatch cannot publish collection or manufacture a paid enrollment', async () => {
    const f = await enrollment(); await start(f); const p = await capture(f.enrollment.id); p.invoice.metadata.hydroland_source_id = id;
    assert.equal((await call(buyer, f.enrollment.id, 'refresh')).status, 503);
    assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: f.enrollment.id}}), 0);
    assert.equal((await db.trainingEnrollment.findUniqueOrThrow({where: {id: f.enrollment.id}})).status, 'PENDING');
  });
  await check('authorized and verified attempts keep cancelled or failed invoices under reconciliation over HTTP', async () => {
    for (const paymentStatus of ['authorized', 'verified']) {
      const f = await enrollment(); await start(f);
      const journal = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'TRAINING_ENROLLMENT', sourceId: f.enrollment.id}}});
      const invoice = invoices.get(journal.providerInvoiceId), before = posts();
      invoice.payments = [{id: randomUUID(), status: paymentStatus, amount: invoice.amount, currency: 'SAR'}];
      for (const invoiceStatus of ['canceled', 'expired', 'voided', 'failed']) {
        invoice.status = invoiceStatus;
        const result = await call(buyer, f.enrollment.id, 'refresh');
        assert.equal(result.status, 503, `${invoiceStatus}/${paymentStatus}: ${JSON.stringify(result.body)}`);
        assert.equal(result.body.code, 'COURSE_CHECKOUT_RECONCILIATION_REQUIRED');
        const saved = await db.commerceCheckout.findUniqueOrThrow({where: {id: journal.id}});
        assert.equal(saved.status, 'RECONCILIATION_REQUIRED'); assert.equal(saved.providerPaymentId, null);
      }
      assert.equal(posts(), before); assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: f.enrollment.id}}), 0);
      const row = await db.trainingEnrollment.findUniqueOrThrow({where: {id: f.enrollment.id}});
      assert.equal(row.status, 'PENDING'); assert.equal(row.metadata.financialConfirmation, undefined);
    }
  });
  await check('one paid candidate with another authorized or verified attempt cannot capture or publish collection over HTTP', async () => {
    for (const paymentStatus of ['authorized', 'verified']) {
      const f = await enrollment(); await start(f); const p = await capture(f.enrollment.id), entry = await revenue(f.enrollment.id);
      p.invoice.payments.push({id: randomUUID(), status: paymentStatus, amount: p.invoice.amount, currency: 'SAR'});
      const before = posts(), paymentReads = requests.filter(row => row.url === `/v1/payments/${p.payment.id}`).length;
      for (const action of ['refresh', 'collection']) {
        const result = await call(action === 'collection' ? accountant : buyer, f.enrollment.id, action, 'POST', action === 'collection' ? {financeEntryId: entry.id} : undefined);
        assert.equal(result.status, 503, `${action}/${paymentStatus}: ${JSON.stringify(result.body)}`);
        assert.equal(result.body.code, 'COURSE_CHECKOUT_RECONCILIATION_REQUIRED');
      }
      const journal = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'TRAINING_ENROLLMENT', sourceId: f.enrollment.id}}});
      assert.equal(journal.status, 'RECONCILIATION_REQUIRED'); assert.equal(journal.providerPaymentId, null);
      assert.equal(requests.filter(row => row.url === `/v1/payments/${p.payment.id}`).length, paymentReads);
      assert.equal(posts(), before); assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: f.enrollment.id}}), 0);
      const row = await db.trainingEnrollment.findUniqueOrThrow({where: {id: f.enrollment.id}});
      assert.equal(row.status, 'PENDING'); assert.equal(row.metadata.financialConfirmation, undefined);
    }
  });
  await check('terminal invoice outcomes require every payment attempt to be failed, voided or expired over HTTP', async () => {
    const f = await enrollment(); await start(f);
    const journal = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'TRAINING_ENROLLMENT', sourceId: f.enrollment.id}}});
    const invoice = invoices.get(journal.providerInvoiceId), before = posts();
    for (const terminal of [false, true]) {
      invoice.payments = (terminal ? ['failed', 'voided', 'expired'] : ['initiated']).map(paymentStatus => ({id: randomUUID(), status: paymentStatus, amount: invoice.amount, currency: 'SAR'}));
      for (const invoiceStatus of ['canceled', 'expired', 'voided', 'failed']) {
        invoice.status = invoiceStatus;
        const result = await call(buyer, f.enrollment.id, 'refresh');
        assert.equal(result.status, 201, JSON.stringify(result.body));
        assert.equal(result.body.status, terminal ? invoiceStatus === 'failed' ? 'FAILED' : 'CANCELLED' : 'RECONCILIATION_REQUIRED');
        assert.equal(result.body.collectionVerified, false); assert.equal(result.body.checkoutUrl, null);
      }
    }
    assert.equal(posts(), before); assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: f.enrollment.id}}), 0);
  });
  await check('financial authority revoked during provider I/O cannot finish reconciliation', async () => {
    const f = await enrollment(); await start(f); const p = await capture(f.enrollment.id);
    let seen, release; const observed = new Promise(resolve => {seen = resolve;});
    heldPaymentRead = {id: p.payment.id, seen, release: new Promise(resolve => {release = resolve;})};
    const pending = call(accountant, f.enrollment.id, 'reconcile-invoice', 'POST', {providerInvoiceId: p.invoice.id});
    await observed; await db.employment.update({where: {id: employment.id}, data: {status: 'SUSPENDED'}}); release();
    assert.equal((await pending).status, 403);
    const row = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'TRAINING_ENROLLMENT', sourceId: f.enrollment.id}}});
    assert.equal(row.status, 'PENDING'); assert.equal(row.providerPaymentId, null);
    await db.employment.update({where: {id: employment.id}, data: {status: 'ACTIVE'}});
  });
  await check('a late old captured response and a regressed balance cannot erase an observed refund', async () => {
    const journal = await db.commerceCheckout.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: 'TRAINING_ENROLLMENT', sourceId: id}}});
    const invoice = invoices.get(journal.providerInvoiceId), payment = payments.get(journal.providerPaymentId);
    let seen, release; const observed = new Promise(resolve => {seen = resolve;});
    heldPaymentRead = {id: payment.id, seen, release: new Promise(resolve => {release = resolve;})};
    const old = call(buyer, id, 'refresh'); await observed;
    payment.status = 'refunded'; payment.refunded = 1000; payment.refunded_at = new Date().toISOString(); payment.updated_at = payment.refunded_at; invoice.status = 'refunded';
    const refunded = await call(buyer, id, 'refresh'); assert.equal(refunded.body.status, 'RECONCILIATION_REQUIRED'); release();
    assert.equal((await old).body.status, 'RECONCILIATION_REQUIRED');
    payment.status = 'paid'; payment.refunded = 0; payment.refunded_at = null; payment.updated_at = new Date().toISOString(); invoice.status = 'paid';
    assert.equal((await call(buyer, id, 'refresh')).body.status, 'RECONCILIATION_REQUIRED');
    await assert.rejects(db.serializable(async tx => requireCourseCollection(tx, await tx.trainingEnrollment.findUniqueOrThrow({where: {id}}))), status(409));
  });
  await check('historical or altered contract metadata stays REVIEW_REQUIRED without catalog backfill', async () => {
    for (const kind of ['missing', 'price', 'center', 'policy']) {
      const f = await enrollment(), metadata = structuredClone(f.enrollment.metadata);
      if (kind === 'missing') delete metadata.contractSnapshot;
      if (kind === 'price') metadata.priceMinor = 12345;
      if (kind === 'center') metadata.contractSnapshot.issuer.organizationId = centerB.id;
      if (kind === 'policy') metadata.contractSnapshot.refundPolicy.snapshot.version = 'made-up';
      await db.trainingEnrollment.update({where: {id: f.enrollment.id}, data: {metadata}});
      const response = await call(buyer, f.enrollment.id, 'quote', 'GET'); assert.equal(response.status, 409); assert.equal(response.body.status, 'REVIEW_REQUIRED');
    }
  });
  await check('cancelled original enrollments cannot acquire fresh collection evidence', async () => {
    const f = await enrollment(); await start(f); await capture(f.enrollment.id); const entry = await revenue(f.enrollment.id);
    await db.trainingEnrollment.update({where: {id: f.enrollment.id}, data: {status: 'CANCELLED'}});
    assert.equal((await call(buyer, f.enrollment.id, 'quote', 'GET')).status, 409);
    assert.equal((await call(accountant, f.enrollment.id, 'collection', 'POST', {financeEntryId: entry.id})).status, 409);
    assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: f.enrollment.id}}), 0);
  });
  await check('the original start caps the provider link and blocks publication after that actual boundary', async () => {
    const f = await enrollment({startsAt: new Date(Date.now() + 2500)}); await start(f); const p = await capture(f.enrollment.id);
    assert.equal(p.invoice.expired_at, f.course.startsAt.toISOString());
    const entry = await revenue(f.enrollment.id);
    await new Promise(resolve => setTimeout(resolve, Math.max(0, f.course.startsAt.getTime() - Date.now() + 50)));
    assert.equal((await call(buyer, f.enrollment.id, 'quote', 'GET')).status, 409);
    assert.equal((await call(accountant, f.enrollment.id, 'collection', 'POST', {financeEntryId: entry.id})).status, 409);
    assert.equal(await db.commerceCollectionEvidence.count({where: {sourceId: f.enrollment.id}}), 0);
    const row = await db.trainingEnrollment.findUniqueOrThrow({where: {id: f.enrollment.id}});
    assert.equal(row.status, 'PENDING'); assert.equal(row.completedAt, null);
  });
  await check('course cancellation uses server receipt time, verified original money and evidence, and replays once', async () => {
    for(const [hours,expected] of [[49,3750],[47,0]]) {
      const f=await enrollment({startsAt:new Date(Date.now()+hours*3600000)}), source=f.enrollment.id;
      await start(f);
      assert.equal((await call(buyer,source,'cancellation')).status,409);
      await capture(source); const entry=await revenue(source);
      assert.equal((await call(accountant,source,'collection','POST',{financeEntryId:entry.id})).status,201);
      await db.operationalSetting.create({data:{key:'commerce-legal-classification:COURSE:'+source,value:{
        sourceId:source,sourceType:'COURSE',classification:'EXEMPT',exception:'EVENT_ORGANIZATION',evidenceReference:'synthetic-reviewed-case'}}});
      const requestsBefore=requests.length;
      assert.equal((await call(other,source,'cancellation')).status,404);
      const answers=await Promise.all(Array.from({length:3},()=>call(buyer,source,'cancellation','POST',{requestedAt:'2099-01-01',refundAmountMinor:4999})));
      assert.ok(answers.every(r=>r.status===201),JSON.stringify(answers));
      assert.equal(new Set(answers.map(r=>r.body.requestId)).size,1);
      assert.equal(answers[0].body.decision.refundAmountMinor,expected);
      assert.equal(answers[0].body.financialActionExecuted,false);
      assert.equal((await db.trainingEnrollment.findUniqueOrThrow({where:{id:source}})).status,'CANCELLED');
      assert.equal(await db.auditEvent.count({where:{resourceId:source,action:'COURSE_CUSTOMER_CANCELLATION_RECORDED'}}),1);
      await assert.rejects(repository.setEnrollmentStatus(source,'PENDING'),status(409));
      assert.equal(requests.length,requestsBefore);
      if(expected){
        await refundGrants(db,new FinanceOperationGrantService(db),owner,centerA.id,approver,poster);
        const receipt=answers[0].body.requestId;
        const approved=await ledger.createEntry({organizationId:centerA.id,financeAccountId:entry.financeAccountId,type:'REFUND',amountMinor:expected,
          currency:'SAR',referenceType:'COURSE_CANCELLATION_REFUND',referenceId:receipt,requestedByAccountId:buyer.id});
        await ledger.decideEntry(approved.id,approver.id,true);
        const path=receipt+'/refund', payload={financeEntryId:approved.id};
        assert.equal((await call(other,'cancellations',path,'POST',payload)).status,403);
        const sent=await call(poster,'cancellations',path,'POST',payload);
        assert.equal(sent.status,201,JSON.stringify(sent));assert.equal(sent.body.status,'POSTED');
        assert.equal((await call(poster,'cancellations',path,'POST',payload)).body.operationId,sent.body.operationId);
        assert.equal((await db.financeEntry.findUniqueOrThrow({where:{id:approved.id}})).status,'POSTED');
        assert.equal(requests.filter(r=>r.url.endsWith('/refund')).length,1);
        const {verifyPostedCheckoutRefund} = await import('./commerce-settlement-product-checks.mjs');
        await verifyPostedCheckoutRefund({db, load, accountantId: accountant.id, organizationId: centerA.id, financeEntryId: approved.id});
      }

    }
  });
  assert.equal(await db.financeEntry.count({where: {id: {in: allFinanceIds}}}), allFinanceIds.length);
  assert.ok(requests.filter(row => row.method === 'POST').every(row => row.url === '/v1/invoices' || /^\/v1\/payments\/[a-f0-9-]+\/refund$/.test(row.url)));
  console.log(JSON.stringify({result: 'PASS', suite: 'training-checkout-postgresql-http', passed: cases.length, failed: 0, cases,
    actualPostgresql: true, actualControllerAndSessionGuard: true, providerTransport: 'loopback HTTP only', providerInvoicePosts: posts(),
    externalProviderCalls: 0, actualMoneyTransfers: 0, productionWrites: 0, trainingActivatedOrCompleted: false}));
} finally {
  await failCollectionAudit(false);
  await app.close();
  await db.$disconnect();
  await new Promise(resolve => providerServer.close(resolve));
}
