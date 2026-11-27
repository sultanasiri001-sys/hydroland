// Actual mobile client contracts against real Nest controllers/guards + PostgreSQL.
// All accounts, catalog entries and operational approvals below are synthetic.
// Only provider HTTP boundaries are intercepted; no payment, message or upload leaves this process.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomBytes, randomUUID, scryptSync} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const databaseUrl = new URL(process.env.DATABASE_URL || 'postgresql://missing');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(databaseUrl.hostname) && databaseUrl.pathname === '/mobile_product_test'
  && process.env.MOBILE_PRODUCT_DB_TEST_CONFIRM === 'DISPOSABLE_LOOPBACK_ONLY', 'Requires disposable loopback mobile_product_test');
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../../', import.meta.url));
Object.assign(process.env, {NODE_ENV: 'test', JWT_SECRET: 'synthetic-d05-mobile-auth-only-long-32', MFA_ENCRYPTION_KEY: 'synthetic-d05-mobile-encryption-only-long-32',
  HYDROLAND_PAYMENT_PROVIDER: 'MOYASAR', MOYASAR_SECRET_KEY: 'sk_test_synthetic_not_real', MOYASAR_API_BASE_URL: 'https://payments.d05.example.test/v1/',
  HYDROLAND_PUBLIC_WEB_ORIGIN: 'https://web.d05.example.test', HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS: 'SANDBOX',
  HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS: 'SANDBOX', HYDROLAND_OBJECT_STORAGE_ENDPOINT: 'https://objects.d05.example.test',
  HYDROLAND_OBJECT_STORAGE_BUCKET: 'synthetic-mobile-private', HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID: 'synthetic-access',
  HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'synthetic-secret', HYDROLAND_OBJECT_STORAGE_REGION: 'us-east-1'});
// The real notification workers stay disabled. A test cannot inherit production delivery configuration.
for (const key of Object.keys(process.env)) if (/^HYDROLAND_CUSTOMER_(?:CHANNEL|NOTICE|PHONE)/.test(key)) delete process.env[key];
delete process.env.RESEND_API_KEY; delete process.env.EXPO_ACCESS_TOKEN;
const {NestFactory} = require('@nestjs/core');
const {AppModule} = require(path.join(root, 'api/dist/app.module.js'));
const {DatabaseService} = require(path.join(root, 'api/dist/database/database.service.js'));
const {PDFDocument} = require('pdf-lib');
const modules = new Map();
function mobile(relative) {
  const file = path.resolve(root, 'mobile/src', relative);
  if (modules.has(file)) return modules.get(file).exports;
  const module = {exports: {}}; modules.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (name === './api') return {apiFetch() {throw Error('Explicit HTTP transport required');}, authorizedFetch() {throw Error('Explicit HTTP transport required');}, authorizedBinaryFetch() {throw Error('Explicit binary transport required');}};
    if (name.startsWith('.')) return mobile(path.relative(path.join(root, 'mobile/src'), path.resolve(path.dirname(file), name + '.ts')));
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const {createProductClient} = mobile('product-client.ts');
const nativeFetch = globalThis.fetch, objects = new Map(), invoices = new Map(), providerCalls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return nativeFetch(input, init);
  if (url.origin === 'https://objects.d05.example.test') {
    providerCalls.push({provider: 'OBJECT_STORAGE', method: init.method || 'GET'});
    assert.match(url.pathname, /^\/synthetic-mobile-private\/credentials\//);
    if (init.method === 'PUT') {assert.match(init.headers.Authorization, /^AWS4-HMAC-SHA256 /); objects.set(url.pathname, Buffer.from(init.body)); return new Response(null, {status: 200});}
    if (init.method === 'HEAD') return new Response(null, {status: objects.has(url.pathname) ? 200 : 404});
    if (init.method === 'DELETE') {objects.delete(url.pathname); return new Response(null, {status: 204});}
  }
  if (url.origin === 'https://payments.d05.example.test') {
    providerCalls.push({provider: 'PAYMENT', method: init.method || 'GET'});
    if (url.pathname === '/v1/invoices' && init.method === 'POST') {
      const payload = JSON.parse(init.body), id = randomUUID();
      const invoice = {id, status: 'initiated', amount: payload.amount, currency: payload.currency,
        url: 'https://checkout.d05.example.test/' + id, metadata: payload.metadata, expired_at: payload.expired_at, payments: []};
      invoices.set(id, invoice); return Response.json(invoice);
    }
    const match = url.pathname.match(/^\/v1\/invoices\/([0-9a-f-]+)$/);
    if (match && (!init.method || init.method === 'GET')) {assert(invoices.has(match[1])); return Response.json(invoices.get(match[1]));}
    const paymentMatch = url.pathname.match(/^\/v1\/payments\/([0-9a-f-]+)$/);
    if (paymentMatch && (!init.method || init.method === 'GET')) {
      const invoice = [...invoices.values()].find(row => row.payments.some(payment => payment.id === paymentMatch[1]));
      assert(invoice, 'Provider receipt must belong to the exact created invoice.');
      return Response.json({id: paymentMatch[1], invoice_id: invoice.id, status: 'paid', amount: invoice.amount,
        currency: invoice.currency, captured: invoice.amount, refunded: 0, updated_at: new Date().toISOString(), refunded_at: null});
    }
  }
  throw Error('D05 contract test denied an unexpected non-loopback provider request');
};
let app, db, base, passed = 0;
const group = async (label, run) => {await run(); passed++; console.log('PASS ' + label);};
const list = value => Array.isArray(value) ? value : value.items;
const rejectStatus = (promise, ...statuses) => assert.rejects(promise, error => statuses.includes(error.status));
async function http(pathname, init = {}, token, binary = false) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', 'Bearer ' + token);
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  const response = await fetch(base + pathname, {...init, headers});
  if (!response.ok) {const body = await response.text(); const error = new Error(pathname + ' HTTP ' + response.status + ': ' + body); error.status = response.status; throw error;}
  return binary ? response.arrayBuffer() : response.status === 204 ? null : response.json();
}
async function account(label) {
  const person = await db.person.create({data: {firstName: 'Synthetic', lastName: label}}), password = randomBytes(20).toString('base64url'), salt = randomBytes(16).toString('hex');
  const row = await db.account.create({data: {personId: person.id, email: 'd05-' + label.toLowerCase() + '@example.test', status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: salt + ':' + scryptSync(password, salt, 64).toString('hex')}});
  const session = await http('/auth/login', {method: 'POST', body: JSON.stringify({email: row.email, password})});
  assert(session.accessToken && session.refreshToken);
  return {...row, person, session, api: createProductClient((pathname, init) => http(pathname, init, session.accessToken), http,
    (pathname, signal) => http(pathname, {signal}, session.accessToken, true))};
}
const paid = id => {const invoice = invoices.get(id); assert(invoice); invoice.status = 'paid'; invoice.payments = [{id: randomUUID(), status: 'paid', amount: invoice.amount, currency: invoice.currency}];};
try {
  app = await NestFactory.create(AppModule, {logger: ['error'], abortOnError: false});
  app.setGlobalPrefix('api/v1'); await app.listen(0, '127.0.0.1'); base = await app.getUrl() + '/api/v1'; db = app.get(DatabaseService);
  const owner = await account('Customer'), other = await account('Other'), centerOwner = await account('Center');
  const center = await db.organization.create({data: {displayName: 'Synthetic D05 center', legalName: 'Synthetic test organization', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: centerOwner.id, registrationNumber: 'D05-SYNTHETIC-ONLY', address: 'Synthetic test address'}});
  await db.roleAssignment.create({data: {accountId: centerOwner.id, role: 'DIVE_CENTER', status: 'ACTIVE'}});
  await db.organizationMember.create({data: {accountId: centerOwner.id, organizationId: center.id, role: 'OWNER', status: 'ACTIVE'}});
  const start = new Date(Date.now() + 10 * 86400000), end = new Date(start.getTime() + 7200000);
  const trip = await db.trip.create({data: {title: 'Synthetic D05 shore dive', type: 'SHORE_DIVE', startsAt: start, endsAt: end, capacity: 5, status: 'OPEN', organizationId: center.id}});
  await db.safetyChecklist.create({data: {tripId: trip.id, decision: 'ALLOWED', items: {syntheticFixture: true}, notes: 'Isolated contract test only; not a real safety decision', decidedAt: new Date()}});
  await db.operationalSetting.create({data: {key: 'trip-price:' + trip.id, value: {pricePerSeatMinor: 12345, currency: 'SAR'}}});
  const course = await db.storeCourseOffer.create({data: {organizationId: center.id, courseCode: 'D05-SYNTHETIC', title: 'Synthetic D05 course', description: 'Isolated contract fixture', locationName: 'Test pool', startsAt: start, endsAt: end, capacity: 5, priceMinor: 45000, status: 'ACTIVE'}});
  const document = await PDFDocument.create(); document.addPage().drawText('D05 synthetic original document'); const pdf = Buffer.from(await document.save());
  let credential, attachment, booking, payment, enrollment, coursePayment;
  await group('account: real login, private profile correction and server-owned authority', async () => {
    assert.equal((await owner.api.me()).id, owner.id);
    await owner.api.updateProfile({firstName: 'Updated', lastName: '', phone: '', headline: '', bio: '', regionCode: ''});
    assert.equal((await db.person.findUniqueOrThrow({where: {id: owner.personId}})).firstName, 'Updated');
    await rejectStatus(owner.api.updateProfile({roleAssignments: [{role: 'ADMIN', status: 'ACTIVE'}]}), 400);
    assert.equal(await db.roleAssignment.count({where: {accountId: owner.id}}), 0);
    await rejectStatus(http('/me'), 401);
  });
  await group('account: diver and equipment mutations preserve ownership and partial fields', async () => {
    await owner.api.updateDiverProfile({identityLast4: '1234', emergencyName: 'Fixture contact', emergencyPhone: '+966500000001', notes: 'Preserve this field'});
    await owner.api.updateDiverProfile({nationality: 'Synthetic'});
    assert.equal((await owner.api.diverProfile()).profile.notes, 'Preserve this field');
    const state = await owner.api.addEquipment({category: 'MASK', ownership: 'OWNED', brand: 'Synthetic'}), equipment = state.equipment[0];
    await owner.api.updateEquipment(equipment.id, {status: 'INACTIVE'});
    assert.equal((await owner.api.diverProfile()).equipment[0].status, 'INACTIVE');
    await rejectStatus(other.api.updateEquipment(equipment.id, {status: 'ACTIVE'}), 404);
    assert.equal((await other.api.diverProfile()).equipment.length, 0);
  });
  await group('credentials: real selected bytes, immutable hash, private access and cross-user denial', async () => {
    credential = await owner.api.createCredential({issuer: 'Synthetic evidence', title: 'Synthetic diving qualification', credentialNumber: 'D05-ONLY'});
    attachment = await owner.api.attachCredential(credential.id, {originalName: 'd05-synthetic.pdf', mimeType: 'application/pdf', base64: pdf.toString('base64')});
    assert.equal(attachment.sha256, createHash('sha256').update(pdf).digest('hex')); assert.equal(attachment.byteSize, pdf.length); assert(!('storageKey' in attachment));
    assert.deepEqual([...objects.values()][0], pdf);
    const access = await owner.api.credentialAccess(credential.id, attachment.id); assert.match(access.url, /^https:\/\/objects\.d05\.example\.test\//); assert(Date.parse(access.expiresAt) > Date.now());
    await rejectStatus(other.api.credentialAccess(credential.id, attachment.id), 404);
    assert.equal((await other.api.credentials()).length, 0);
  });
  await group('credentials: submit remains pending and customer cannot impersonate reviewer', async () => {
    const submitted = await owner.api.submitCredential(credential.id); assert.equal(submitted.status, 'PENDING');
    assert.equal((await db.credential.findUniqueOrThrow({where: {id: credential.id}})).verificationStatus, 'PENDING');
    await rejectStatus(owner.api.pendingCredentials(), 403);
    await rejectStatus(owner.api.reviewCredential(credential.id, {decision: 'APPROVE', reviewerId: centerOwner.id}), 403);
  });
  await group('trip and booking: catalog, original snapshot, duplicate and capacity guards', async () => {
    const catalog = await owner.api.trips(); assert(catalog.some(row => row.id === trip.id));
    booking = await owner.api.bookTrip(trip.id, 2); assert.equal(booking.seats, 2); assert.equal(booking.status, 'PENDING'); assert.equal(booking.participants.length, 2);
    assert.equal(booking.contractSnapshot.amountMinor, 24690); assert.equal(booking.contractSnapshot.customerAccountId, owner.id);
    await rejectStatus(owner.api.bookTrip(trip.id, 1), 409); await rejectStatus(other.api.bookTrip(trip.id, 4), 409);
    assert.equal((await db.booking.findMany({where: {tripId: trip.id}})).length, 1);
    assert((await owner.api.bookings()).some(row => row.id === booking.id)); assert.equal((await other.api.bookings()).length, 0);
  });
  await group('booking: participant edit stays pending and rejects foreign booking access', async () => {
    const companion = booking.participants.find(row => !row.accountId);
    await owner.api.updateParticipant(booking.id, companion.id, {fullName: 'Synthetic companion', certificationTitle: 'Self-reported only', certificationIssuer: 'Synthetic issuer', certificationNumber: 'D05-COMPANION'});
    const persisted = await db.bookingParticipant.findUniqueOrThrow({where: {id: companion.id}}); assert.equal(persisted.fullName, 'Synthetic companion'); assert.equal(persisted.eligibilityStatus, 'PENDING');
    assert.equal(list(await owner.api.participants(booking.id)).length, 2);
    await rejectStatus(other.api.participants(booking.id), 404); await rejectStatus(other.api.updateParticipant(booking.id, companion.id, {fullName: 'Unauthorized'}), 404);
  });
  await group('trip finance: original accepted quote, stale refusal and provider-bound checkout', async () => {
    await db.operationalSetting.update({where: {key: 'trip-price:' + trip.id}, data: {value: {pricePerSeatMinor: 99999, currency: 'SAR'}}});
    const quote = await owner.api.tripQuote(booking.id); assert.equal(quote.snapshot.amountMinor, 24690); assert.equal(quote.snapshot.source.id, booking.id);
    const before = providerCalls.length;
    await rejectStatus(owner.api.tripCheckout(booking.id, 'booking:' + booking.id, {...quote, quoteHash: '0'.repeat(64)}), 409); assert.equal(providerCalls.length, before);
    payment = await owner.api.tripCheckout(booking.id, 'booking:' + booking.id, quote); assert.equal(payment.amountMinor, 24690); assert.match(payment.checkoutUrl, /^https:\/\/checkout\.d05\.example\.test\//);
    assert.equal((await owner.api.tripCheckout(booking.id, 'booking:' + booking.id, quote)).id, payment.id);
    assert.equal(providerCalls.filter(row => row.provider === 'PAYMENT' && row.method === 'POST').length, 1);
    await rejectStatus(other.api.tripQuote(booking.id), 404); await rejectStatus(other.api.refreshPayment(payment.id), 404);
  });
  await group('trip finance: refresh uses provider evidence and refund request performs no refund', async () => {
    paid(payment.providerReference); const refreshed = await owner.api.refreshPayment(payment.id); assert.equal(refreshed.status, 'CAPTURED');
    assert.equal((await db.payment.findUniqueOrThrow({where: {id: payment.id}})).status, 'CAPTURED');
    const before = providerCalls.length;
    const refund = await owner.api.requestRefund(payment.id, 'Synthetic customer request for review', 1234, 'SAR'); assert.equal(refund.financialActionExecuted, false);
    assert.equal(providerCalls.length, before); assert.equal((await db.payment.findUniqueOrThrow({where: {id: payment.id}})).refundedAmountMinor, 0);
    await rejectStatus(other.api.requestRefund(payment.id, 'Unauthorized refund request', 1234, 'SAR'), 404);
    assert((await owner.api.payments()).some(row => row.id === payment.id)); assert.equal((await other.api.payments()).length, 0);
  });
  await group('training: actual course enrollment, original price and student-only records', async () => {
    assert((await owner.api.courses()).some(row => row.id === course.id)); enrollment = await owner.api.enrollCourse(course.id);
    assert.equal(enrollment.status, 'PENDING'); assert.equal(enrollment.metadata.contractSnapshot.amountMinor, 45000);
    assert.equal((await owner.api.enrollCourse(course.id)).id, enrollment.id);
    assert((await owner.api.enrollments()).some(row => row.id === enrollment.id)); assert.equal((await owner.api.enrollment(enrollment.id)).id, enrollment.id);
    await rejectStatus(other.api.enrollment(enrollment.id), 403, 404); await rejectStatus(owner.api.professional('assignments'), 403);
    assert.equal(list(await owner.api.certificates()).length, 0);
  });
  await group('training finance: original course quote, provider collection and honest cancellation', async () => {
    await db.storeCourseOffer.update({where: {id: course.id}, data: {priceMinor: 99000}});
    const quote = await owner.api.courseQuote(enrollment.id); assert.equal(quote.snapshot.amountMinor, 45000);
    coursePayment = await owner.api.courseCheckout(enrollment.id, 'course:' + enrollment.id, quote);
    const checkout = await db.commerceCheckout.findFirstOrThrow({where: {sourceType: 'TRAINING_ENROLLMENT', sourceId: enrollment.id}});
    paid(checkout.providerInvoiceId); const refreshed = await owner.api.refreshCoursePayment(enrollment.id); assert.equal(refreshed.status, 'CAPTURED');
    // Collection alone must not bypass the separately posted accounting evidence.
    await rejectStatus(owner.api.cancelCourse(enrollment.id), 409);
    assert.equal((await db.trainingEnrollment.findUniqueOrThrow({where: {id: enrollment.id}})).status, 'PENDING');
    // Synthetic pre-existing ledger evidence supplies the independent accounting
    // boundary. This fixture does not exercise or claim a real human approval.
    const [requester, reviewer, poster] = await Promise.all([account('LedgerRequest'), account('LedgerReview'), account('LedgerPost')]);
    const financeAccount = await db.financeAccount.create({data: {organizationId: center.id, name: 'Synthetic D05 collection ledger'}}), approvedAt = new Date();
    const financeEntry = await db.financeEntry.create({data: {organizationId: center.id, financeAccountId: financeAccount.id, type: 'REVENUE', status: 'POSTED', amountMinor: 45000,
      referenceType: 'TRAINING_ENROLLMENT_COLLECTION', referenceId: enrollment.id, description: 'Synthetic pre-existing approval fixture only', requestedByAccountId: requester.id,
      approvedByAccountId: reviewer.id, approvedAt, postedByAccountId: poster.id, postedAt: approvedAt,
      approvals: {create: {status: 'APPROVED', requestedByAccountId: requester.id, decidedByAccountId: reviewer.id, decidedAt: approvedAt, decisionNote: 'Synthetic fixture; not real human acceptance'}}}});
    const captured = await db.commerceCheckout.findUniqueOrThrow({where: {id: checkout.id}});
    await db.commerceCollectionEvidence.create({data: {sourceType: 'TRAINING_ENROLLMENT', sourceId: enrollment.id, organizationId: center.id, customerAccountId: owner.id,
      amountMinor: 45000, currency: 'SAR', provider: 'MOYASAR', providerPaymentId: captured.providerPaymentId, providerInvoiceId: captured.providerInvoiceId,
      providerCapturedMinor: 45000, providerRefundedMinor: 0, providerVerifiedAt: new Date(captured.providerResult.verifiedAt), providerSnapshot: captured.providerResult.payment,
      financeEntryId: financeEntry.id, contractSnapshot: captured.contractSnapshot}});
    const before = providerCalls.length; const cancelled = await owner.api.cancelCourse(enrollment.id);
    assert.equal(cancelled.financialActionExecuted, false); assert.equal(providerCalls.length, before);
    assert.equal((await db.trainingEnrollment.findUniqueOrThrow({where: {id: enrollment.id}})).status, 'CANCELLED');
    await rejectStatus(other.api.courseQuote(enrollment.id), 404);
  });
  await group('finance: authenticated original invoice bytes and wallet isolation', async () => {
    const invoice = await db.invoice.findUniqueOrThrow({where: {paymentId: payment.id}});
    await db.accountInvoiceDocument.create({data: {sourceType: 'TRIP_PAYMENT', sourceId: payment.id, sellerId: center.id, number: invoice.number, sha256: createHash('sha256').update(pdf).digest('hex'), content: pdf, attachedBy: centerOwner.id}});
    const register = await owner.api.invoices('purchases', 0); assert(list(register).some(row => row.sourceId === payment.id));
    assert.deepEqual(Buffer.from(await owner.api.invoiceBytes('TRIP_PAYMENT', payment.id)), pdf);
    await rejectStatus(other.api.invoiceBytes('TRIP_PAYMENT', payment.id), 404, 403);
    assert.equal((await owner.api.wallet()).balanceMinor, 0); assert.equal((await owner.api.walletEntries()).length, 0);
    const exported = JSON.stringify(await owner.api.exportRecords('PAYMENTS')); assert(exported.includes(payment.id)); assert(!exported.includes(other.email));
  });
  await group('notifications: private inbox and read marking cannot mutate another account', async () => {
    const mine = await db.notification.create({data: {accountId: owner.id, type: 'BOOKING_CONFIRMED', payload: {title: 'Synthetic notification', bookingId: booking.id}}});
    const foreign = await db.notification.create({data: {accountId: other.id, type: 'TEST', payload: {title: 'Foreign notification'}}});
    assert((await owner.api.notifications()).some(row => row.id === mine.id)); assert(!(await owner.api.notifications()).some(row => row.id === foreign.id));
    await owner.api.readNotification(mine.id); await rejectStatus(owner.api.readNotification(foreign.id), 404);
    assert.equal((await db.notification.findUniqueOrThrow({where: {id: mine.id}})).status, 'READ'); assert.equal((await db.notification.findUniqueOrThrow({where: {id: foreign.id}})).status, 'PENDING');
  });
  await group('notifications: explicit preference revision, quiet hours and unavailable provider boundary', async () => {
    const preference = await owner.api.notificationPreferences(); assert.equal(preference.phoneVerificationAvailable, false); assert.equal(preference.canReview, false);
    const body = {expectedRevision: preference.revision, confirmed: true, email: false, sms: false, whatsapp: false, push: false, bookings: true, invoices: false, quietStart: 1320, quietEnd: 420, timeZone: 'Asia/Riyadh'};
    const saved = await owner.api.updateNotificationPreferences(body); assert.equal(saved.email, false); assert.equal(saved.quietStart, 1320);
    const latest = await owner.api.updateNotificationPreferences({...body, expectedRevision: saved.revision});
    await rejectStatus(owner.api.updateNotificationPreferences({...body, expectedRevision: saved.revision}), 409);
    assert.equal((await other.api.notificationPreferences()).email, true);
    const before = providerCalls.length; await rejectStatus(owner.api.phoneChallenge('+966500000002'), 503); assert.equal(providerCalls.length, before);
    await rejectStatus(owner.api.notificationReviews(), 403); assert.equal(list(await owner.api.notificationDeliveries()).length, 0); assert(latest.revision > saved.revision);
  });
  await group('booking: explicit owner cancellation keeps financial result and foreign guard intact', async () => {
    await rejectStatus(other.api.cancelBooking(booking.id), 404);
    const cancelled = await owner.api.cancelBooking(booking.id); assert.equal(cancelled.status, 'CANCELLED');
    assert.equal((await db.payment.findUniqueOrThrow({where: {id: payment.id}})).status, 'CAPTURED');
    assert.equal((await db.payment.findUniqueOrThrow({where: {id: payment.id}})).refundedAmountMinor, 0);
  });
  await group('seven private journey entry points reject a revoked native session', async () => {
    await http('/auth/logout', {method: 'POST', body: JSON.stringify({refreshToken: owner.session.refreshToken})}, owner.session.accessToken);
    for (const request of [() => owner.api.me(), () => owner.api.credentials(), () => owner.api.bookings(), () => owner.api.enrollments(), () => owner.api.payments(), () => owner.api.wallet(), () => owner.api.notifications()]) await rejectStatus(request(), 401);
  });
  console.log(`PASS ${passed} mobile product API/PostgreSQL contract groups; providers intercepted, no real approval/payment/device acceptance.`);
} finally {if (app) await app.close(); globalThis.fetch = nativeFetch;}
