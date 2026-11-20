import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { createServer } from 'node:http';
import { summarizeAudit } from '../../../scripts/d12-audit-summary.mjs';

const db = new PrismaClient();
const base = process.env.ORGANIZATION_BOOKING_E2E_BASE_URL || 'http://127.0.0.1:3101/api/v1';
const databaseUrl = new URL(process.env.DATABASE_URL);
if (process.env.CI !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname) || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Organization booking checks require CI loopback API and PostgreSQL');
if (!process.env.MOYASAR_API_BASE_URL) throw new Error('MOYASAR_API_BASE_URL must identify this test run\'s loopback provider fixture');
const providerUrl = new URL(process.env.MOYASAR_API_BASE_URL);
if (providerUrl.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(providerUrl.hostname) || !providerUrl.port) throw new Error('Organization payment isolation checks require a loopback provider fixture');
const password = randomBytes(24).toString('hex');
const salt = randomBytes(16).toString('hex');
const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
const suffix = randomUUID(), people = [], accounts = [], organizations = [], bookingIds = [];
const policySnapshots = [], caseIds = [];
let trip;
const call = (account, path, method = 'GET', body) => fetch(base + path, { method, headers: { authorization: 'Bearer ' + account.accessToken, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
const ok = async response => { const body = await response.json(); assert.ok(response.ok, JSON.stringify(body)); return body; };
try {
  for (const label of ['contact', 'foreign']) {
    const person = await db.person.create({ data: { firstName: label, lastName: 'OrganizationBookingE2E' } }); people.push(person);
    const account = await db.account.create({ data: { personId: person.id, email: `${label}-${suffix}@example.invalid`, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() } });
    accounts.push(account);
    const login = await fetch(base + '/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: account.email, password }),
    });
    assert.equal(login.status, 200, 'Synthetic organization contact must be able to sign in');
    account.accessToken = (await login.json()).accessToken;
    assert.ok(account.accessToken, 'Login must issue a session access token');
    const organization = await db.organization.create({ data: { displayName: `Booking boundary ${label} ${suffix}`, kind: 'COMPANY', status: 'ACTIVE', ownerId: account.id } }); organizations.push(organization);
    await db.organizationMember.create({ data: { organizationId: organization.id, accountId: account.id, role: 'OPERATOR', status: 'ACTIVE' } });
  }
  const [contact, foreign] = accounts, [organization, otherOrganization] = organizations;
  const profilePath = `/organizations/${organization.id}/financial-profile`;
  const declaration = {currency:'SAR', taxStatus:'EXEMPT', registrationStatus:'UNDECLARED', expectedRevision:0};
  assert.equal((await call(contact, profilePath, 'PATCH', declaration)).status, 403);
  assert.equal((await call(foreign, profilePath)).status, 403);
  trip = await db.trip.create({ data: { title: 'Organization booking boundary ' + suffix, type: 'SHORE_DIVE', status: 'OPEN', capacity: 8, startsAt: new Date(Date.now() + 7 * 86400000), endsAt: new Date(Date.now() + 7 * 86400000 + 3600000) } });
  const booking = await db.booking.create({ data: { tripId: trip.id, accountId: contact.id, organizationId: organization.id, seats: 1, status: 'PENDING' } }); bookingIds.push(booking.id);
  const personal = await db.booking.create({ data: { tripId: trip.id, accountId: contact.id, seats: 1, status: 'PENDING' } }); bookingIds.push(personal.id);
  const participant = await db.bookingParticipant.create({ data: { bookingId: booking.id, fullName: 'Original roster name', accountId: null, eligibilityStatus: 'ELIGIBLE' } });
  const scoped = `/organizations/${organization.id}/bookings`;
  const rosterPath = `${scoped}/${booking.id}/participants/${participant.id}`;
  const edits = { expectedUpdatedAt: booking.updatedAt.toISOString(), fullName: 'Updated roster name', certificationTitle: 'Open Water Diver' };
  const roster = await ok(await call(contact, rosterPath, 'PATCH', edits));
  assert.equal(roster[0].fullName, edits.fullName); assert.equal(roster[0].eligibilityStatus, 'PENDING');
  assert.equal((await call(contact, rosterPath, 'PATCH', { ...edits, fullName: 'Stale overwrite' })).status, 409);
  assert.equal((await call(foreign, `/organizations/${otherOrganization.id}/bookings/${booking.id}/participants/${participant.id}`, 'PATCH', edits)).status, 404);
  const mine = await ok(await call(contact, '/trips/bookings/mine'));
  assert.ok(mine.some(row => row.id === personal.id)); assert.ok(!mine.some(row => row.id === booking.id));
  for (const membershipStatus of ['ACTIVE', 'SUSPENDED']) {
    await db.organizationMember.updateMany({ where: { organizationId: organization.id, accountId: contact.id }, data: { role: 'VIEWER', status: membershipStatus } });
    assert.equal((await call(contact, `/trips/bookings/${booking.id}/participants`)).status, 404);
    assert.equal((await call(contact, `/trips/bookings/${booking.id}/participants/${participant.id}`, 'PATCH', { fullName: 'Personal endpoint bypass' })).status, 404);
    assert.equal((await call(contact, `/trips/bookings/${booking.id}/cancel`, 'PATCH')).status, 404);
    assert.equal((await call(contact, '/payments', 'POST', { bookingId: booking.id, idempotencyKey: randomUUID() })).status, 404);
    const current = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    assert.equal((await call(contact, rosterPath, 'PATCH', { ...edits, expectedUpdatedAt: current.updatedAt.toISOString() })).status, 403);
    const listed = await call(contact, scoped);
    if (membershipStatus === 'ACTIVE') assert.ok((await ok(listed)).items.some(row => row.id === booking.id));
    else assert.equal(listed.status, 403);
  }
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status, 'PENDING');
  assert.equal((await db.bookingParticipant.findUniqueOrThrow({ where: { id: participant.id } })).fullName, edits.fullName);
  assert.equal(await db.payment.count({ where: { bookingId: booking.id } }), 0);
  assert.equal(await db.auditEvent.count({ where: { action: 'organization.booking.participant.updated', resourceId: participant.id } }), 1);
  await db.organizationMember.updateMany({ where: { organizationId: organization.id, accountId: contact.id }, data: { role: 'OWNER', status: 'ACTIVE' } });
  assert.deepEqual(await ok(await call(contact, profilePath)), {currency:'SAR', taxStatus:'UNDECLARED', registrationStatus:'UNDECLARED', revision:0});
  for (const invalid of [{currency:'USD'}, {taxStatus:'VERIFIED'}, {registrationStatus:true}, {expectedRevision:-1}, {organizationId:otherOrganization.id}]) {
    assert.equal((await call(contact, profilePath, 'PATCH', {...declaration, ...invalid})).status, 400);
  }
  const savedProfile = await ok(await call(contact, profilePath, 'PATCH', declaration));
  assert.deepEqual(savedProfile, {currency:'SAR', taxStatus:'EXEMPT', registrationStatus:'UNDECLARED', revision:1});
  assert.deepEqual(await ok(await call(contact, profilePath)), savedProfile);
  assert.deepEqual(await ok(await call(contact, profilePath, 'PATCH', declaration)), savedProfile);
  assert.equal((await call(contact, profilePath, 'PATCH', {...declaration, registrationStatus:'REGISTERED'})).status, 409);
  assert.equal((await ok(await call(contact, profilePath, 'PATCH', {...declaration, expectedRevision:1, registrationStatus:'IN_PROGRESS'}))).revision, 2);
  assert.equal(await db.auditEvent.count({where:{action:'organization.financial-profile.declared',resourceId:organization.id,actorId:contact.personId}}), 2);
  assert.equal(await db.operationalSetting.count({where:{key:'organization-financial-profile:'+otherOrganization.id}}), 0);
  const preview = await ok(await call(contact, `${scoped}/${booking.id}`));
  const cancellation = { requestId: randomUUID(), expectedState: preview.stateToken, reason: 'إلغاء بطلب الجهة قبل موعد الرحلة' };
  // A competing roster edit invalidates the reviewed cancellation snapshot.
  await ok(await call(contact, rosterPath, 'PATCH', { expectedUpdatedAt: (await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).updatedAt.toISOString(), fullName: 'Concurrent roster change' }));
  assert.equal((await call(contact, `${scoped}/${booking.id}/cancel`, 'POST', cancellation)).status, 409);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status, 'PENDING');
  assert.equal(await db.auditEvent.count({ where: { action: 'BOOKING_CANCELLED', resourceId: booking.id } }), 0);
  assert.equal(await db.notification.count({ where: { accountId: contact.id, type: 'BOOKING_CANCELLED' } }), 0);
  const fresh = await ok(await call(contact, `${scoped}/${booking.id}`));
  const command = { ...cancellation, requestId: randomUUID(), expectedState: fresh.stateToken };
  const cancelled = await ok(await call(contact, `${scoped}/${booking.id}/cancel`, 'POST', command));
  assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.financialActionExecuted, false); assert.equal(cancelled.alreadyApplied, false);
  const replay = await ok(await call(contact, `${scoped}/${booking.id}/cancel`, 'POST', command));
  assert.equal(replay.alreadyApplied, true); assert.equal(replay.financialActionExecuted, false);
  assert.equal((await call(foreign, `/organizations/${otherOrganization.id}/bookings/${booking.id}/cancel`, 'POST', command)).status, 404);
  for (const status of ['ACTIVE', 'SUSPENDED']) {
    await db.organizationMember.updateMany({ where: { organizationId: organization.id, accountId: contact.id }, data: { role: 'VIEWER', status } });
    assert.equal((await call(contact, `${scoped}/${booking.id}/cancel`, 'POST', command)).status, 403);
  }
  await db.organizationMember.updateMany({ where: { organizationId: organization.id, accountId: contact.id }, data: { role: 'OWNER', status: 'ACTIVE' } });
  assert.equal((await call(contact, `${scoped}/${booking.id}/cancel`, 'POST', { ...command, reason: 'سبب مختلف لنفس مفتاح الطلب' })).status, 409);
  assert.equal(await db.auditEvent.count({ where: { action: 'BOOKING_CANCELLED', resourceId: booking.id } }), 1);
  assert.equal(await db.notification.count({ where: { accountId: contact.id, type: 'BOOKING_CANCELLED' } }), 1);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: personal.id } })).status, 'PENDING');
  assert.equal(await db.payment.count({ where: { bookingId: booking.id } }), 0);
  // An explicit safety deferral remains authoritative when the optional approval gate is off.
  for (const [category, ruleKey] of [['BOOKING', 'SAFETY_APPROVAL'], ['WEATHER', 'WEATHER_GATE']]) {
    const where = { category_ruleKey: { category, ruleKey } };
    policySnapshots.push({ where, row: await db.policyControl.findUnique({ where }) });
    await db.policyControl.upsert({ where, create: { category, ruleKey, labelAr: 'Isolated organization test', state: 'DISABLED' }, update: { state: 'DISABLED' } });
  }
  const safety = await db.safetyChecklist.create({ data: { tripId: trip.id, decision: 'DEFERRED', items: [] } });
  const request = { tripId: trip.id, seats: 2, requestKey: randomUUID(), participantNames: ['مشارك تجريبي أول', 'مشارك تجريبي ثان'] };
  const deferred = await call(contact, scoped, 'POST', request);
  assert.equal(deferred.status, 409); assert.match(JSON.stringify(await deferred.json()), /تأجيل/);
  assert.equal(await db.booking.count({ where: { bookingRequestKey: request.requestKey } }), 0);
  await db.safetyChecklist.update({ where: { id: safety.id }, data: { decision: 'REVIEW_REQUIRED' } });
  await db.policyControl.update({ where: { category_ruleKey: { category: 'BOOKING', ruleKey: 'SAFETY_APPROVAL' } }, data: { state: 'ENABLED' } });
  const gateOn = await call(contact, scoped, 'POST', request);
  assert.equal(gateOn.status, 409); assert.match(JSON.stringify(await gateOn.json()), /اعتماد السلامة/);
  await db.policyControl.update({ where: { category_ruleKey: { category: 'BOOKING', ruleKey: 'SAFETY_APPROVAL' } }, data: { state: 'DISABLED' } });
  const created = await ok(await call(contact, scoped, 'POST', request)); bookingIds.push(created.id);
  assert.equal(created.status, 'PENDING'); assert.equal(created.participants.length, 2);
  const createReplay = await ok(await call(contact, scoped, 'POST', request));
  assert.equal(createReplay.id, created.id); assert.equal(createReplay.alreadyApplied, true);
  assert.equal((await call(contact, scoped, 'POST', { ...request, seats: 1, participantNames: [request.participantNames[0]] })).status, 409);
  assert.equal(await db.auditEvent.count({ where: { action: 'organization.booking.requested', resourceId: created.id } }), 1);
  assert.equal(await db.payment.count({ where: { bookingId: created.id } }), 0);

  // A historical initiating account is not the customer for an organization
  // payment. Personal routes must reject even existing records, before any
  // provider request or refund-review audit, regardless of current membership.
  const fixturePaymentIds = [], fixtureInvoiceIds = [];
  let observedProviderCalls = 0;
  const providerTrap = createServer((_request, response) => {
    observedProviderCalls++;
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end('{"message":"Unexpected organization payment provider request"}');
  });
  try {
    await new Promise((resolve, reject) => {
      providerTrap.once('error', reject);
      providerTrap.listen(Number(providerUrl.port), providerUrl.hostname === '[::1]' ? '::1' : '127.0.0.1', resolve);
    });
    const organizationPayments = [];
    for (const withProvider of [true, false]) {
      const fixture = await db.payment.create({ data: {
        bookingId: created.id, accountId: contact.id, amountMinor: 13500, currency: 'SAR',
        status: 'CAPTURED', idempotencyKey: 'organization-boundary-' + randomUUID(),
        ...(withProvider ? { providerReference: randomUUID() } : {}),
      } });
      fixturePaymentIds.push(fixture.id); organizationPayments.push(fixture);
      const invoice = await db.invoice.create({ data: { paymentId: fixture.id, number: 'ORG-BOUNDARY-' + randomUUID(), status: 'DRAFT' } });
      fixtureInvoiceIds.push(invoice.id);
    }
    const personalPayment = await db.payment.create({ data: {
      bookingId: personal.id, accountId: contact.id, amountMinor: 7800, currency: 'SAR',
      status: 'CAPTURED', idempotencyKey: 'personal-boundary-' + randomUUID(),
    } });
    fixturePaymentIds.push(personalPayment.id);
    const review = { reason: 'Synthetic review must respect the actual payment customer', amountMinor: 3500, currency: 'SAR' };
    for (const [role, status] of [['OWNER', 'ACTIVE'], ['VIEWER', 'ACTIVE'], ['OWNER', 'SUSPENDED']]) {
      await db.organizationMember.updateMany({ where: { organizationId: organization.id, accountId: contact.id }, data: { role, status } });
      const listedPayments = await ok(await call(contact, '/payments/mine'));
      assert.ok(listedPayments.some(row => row.id === personalPayment.id), 'Personal payment must remain visible after organization membership changes');
      for (const fixture of organizationPayments) {
        const beforeProvider = observedProviderCalls;
        const refresh = await call(contact, `/payments/${fixture.id}/refresh`, 'POST');
        const refund = await call(contact, `/payments/${fixture.id}/refund-request`, 'POST', review);
        assert.deepEqual({ visible: listedPayments.some(row => row.id === fixture.id), refresh: refresh.status,
          refundReview: refund.status, providerCalls: observedProviderCalls - beforeProvider },
        { visible: false, refresh: 404, refundReview: 404, providerCalls: 0 },
        'Personal routes must reject organization payment access before provider calls or refund review');
        assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: fixture.id } }), fixture, 'Rejected access must preserve the complete organization payment');
        assert.equal(await db.auditEvent.count({ where: { resource: 'Payment', resourceId: fixture.id } }), 0, 'Rejected access must not create payment or refund-review evidence');
      }
    }
    const personalRefresh = await ok(await call(contact, `/payments/${personalPayment.id}/refresh`, 'POST'));
    assert.equal(personalRefresh.id, personalPayment.id); assert.equal(personalRefresh.checkoutReady, false);
    const personalReview = await ok(await call(contact, `/payments/${personalPayment.id}/refund-request`, 'POST', review));
    assert.equal(personalReview.paymentId, personalPayment.id); assert.equal(personalReview.financialActionExecuted, false);
    assert.equal(await db.auditEvent.count({ where: { resource: 'Payment', resourceId: personalPayment.id, action: 'PAYMENT_REFUND_REQUESTED' } }), 1);
    assert.equal((await call(foreign, `/payments/${personalPayment.id}/refresh`, 'POST')).status, 404);
    assert.equal((await call(foreign, `/payments/${personalPayment.id}/refund-request`, 'POST', review)).status, 404);
    assert.equal(observedProviderCalls, 0, 'No organization or unbound personal payment check may call the provider');
    assert.deepEqual(await db.payment.findUniqueOrThrow({ where: { id: personalPayment.id } }), personalPayment);
    console.log('PASS B12: personal payment history, refresh and refund review exclude organization records for active owners, viewers and revoked members; personal access preserved; zero provider calls and rejected mutations.');
  } finally {
    await new Promise(resolve => providerTrap.close(() => resolve()));
    if (fixturePaymentIds.length) await db.auditEvent.deleteMany({ where: { resource: 'Payment', resourceId: { in: fixturePaymentIds } } });
    if (fixtureInvoiceIds.length) await db.invoice.deleteMany({ where: { id: { in: fixtureInvoiceIds } } });
    if (fixturePaymentIds.length) await db.payment.deleteMany({ where: { id: { in: fixturePaymentIds } } });
    await db.organizationMember.updateMany({ where: { organizationId: organization.id, accountId: contact.id }, data: { role: 'OWNER', status: 'ACTIVE' } });
  }

  // Organization cases must never leak through the submitting contact's personal routes.
  const requestsPath = `/organizations/${organization.id}/requests`;
  const orgCase = await ok(await call(contact, requestsPath, 'POST', { type: 'QUESTION', subject: 'طلب خاص بالجهة', description: 'بيانات اختبار معزولة للجهة' })); caseIds.push(orgCase.id);
  const personalCase = await ok(await call(contact, '/customer-service/cases', 'POST', { type: 'QUESTION', subject: 'طلب شخصي', description: 'طلب حساب فردي للاختبار' })); caseIds.push(personalCase.id);
  const scopeEvents = await db.auditEvent.findMany({ where: { resourceId: { in: [created.id, participant.id, orgCase.id, personalCase.id] } } });
  const times = scopeEvents.map(row => row.occurredAt.getTime());
  const scope = { organization: organization.id, from: new Date(Math.min(...times)), until: new Date(Math.max(...times) + 1) };
  const report = await summarizeAudit([...scopeEvents, ...scopeEvents], scope);
  // Both successful edits above belong to the same participant. Retrying delivery adds no new event.
  for (const [key, expectedEvents] of Object.entries({ booking: 1, eligibility: 2, case: 1 })) {
    assert.equal(report.categories[key].events, expectedEvents, key + ' source events');
    assert.equal(report.categories[key].distinctSubjects, 1, key + ' distinct subjects');
  }
  assert.equal(report.sourceDigest, (await summarizeAudit(scopeEvents.toReversed(), scope)).sourceDigest);
  assert(!JSON.stringify(report).includes(personalCase.id));
  console.log('PASS D12: one booking, two updates to one participant, and one organization case; duplicate export delivery and personal cases add no counts');
  // Personal input boundaries and both audit writes use the real loopback API/database.
  const validCase = { type: 'QUESTION', subject: 'Personal integrity check', description: 'Private synthetic description' };
  const personalCount = await db.customerCase.count({ where: { customerId: contact.id, organizationId: null } });
  for (const invalid of [[], { ...validCase, subject: 123 }, { ...validCase, description: false }, { ...validCase, subject: 'x'.repeat(181) }, { ...validCase, description: 'x'.repeat(10001) }, { ...validCase, type: 'UNKNOWN' }, { ...validCase, priority: 'UNKNOWN' }, { ...validCase, referenceType: 123 }, { ...validCase, referenceId: null }, { ...validCase, referenceId: 'x'.repeat(201) }, { ...validCase, organizationId: organization.id }, { ...validCase, customerId: foreign.id }]) {
    assert.equal((await call(contact, '/customer-service/cases', 'POST', invalid)).status, 400);
  }
  assert.equal(await db.customerCase.count({ where: { customerId: contact.id, organizationId: null } }), personalCount);
  for (const message of [123, false, null, '', 'x'.repeat(10001)]) assert.equal((await call(contact, `/customer-service/cases/${personalCase.id}/replies`, 'POST', { message })).status, 400);
  assert.equal((await call(foreign, `/customer-service/cases/${personalCase.id}/replies`, 'POST', { message: 'Foreign bypass' })).status, 404);
  assert.equal((await call(contact, `/customer-service/cases/${personalCase.id}/replies`, 'POST', {})).status, 400);
  const reply = await ok(await call(contact, `/customer-service/cases/${personalCase.id}/replies`, 'POST', { message: '  Private synthetic reply  ' }));
  assert.equal(reply.message, 'Private synthetic reply');
  const createdAudit = await db.auditEvent.findFirstOrThrow({ where: { action: 'customer_case.created', resourceId: personalCase.id } });
  const repliedAudit = await db.auditEvent.findFirstOrThrow({ where: { action: 'customer_case.replied', resourceId: personalCase.id } });
  assert.equal(createdAudit.actorId, contact.personId); assert.deepEqual(createdAudit.metadata, { type: 'QUESTION' });
  assert.equal(repliedAudit.actorId, contact.personId); assert.deepEqual(repliedAudit.metadata, { interactionId: reply.id });
  const beforeFailure = { cases: personalCount, interactions: await db.customerInteraction.count({ where: { caseId: personalCase.id } }), audits: await db.auditEvent.count({ where: { actorId: contact.personId } }) };
  const trigger = 'c04_audit_' + randomUUID().replaceAll('-', '');
  await db.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."actorId"='${contact.personId}' AND NEW.action IN ('customer_case.created','customer_case.replied') THEN RAISE EXCEPTION 'synthetic customer case audit failure'; END IF; RETURN NEW; END $$`);
  try {
    await db.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`);
    assert.equal((await call(contact, '/customer-service/cases', 'POST', validCase)).status, 500);
    assert.equal((await call(contact, `/customer-service/cases/${personalCase.id}/replies`, 'POST', { message: 'Must roll back with failed audit' })).status, 500);
    assert.equal(await db.customerCase.count({ where: { customerId: contact.id, organizationId: null } }), beforeFailure.cases);
    assert.equal(await db.customerInteraction.count({ where: { caseId: personalCase.id } }), beforeFailure.interactions);
    assert.equal(await db.auditEvent.count({ where: { actorId: contact.personId } }), beforeFailure.audits);
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${trigger}" ON "AuditEvent"`);
    await db.$executeRawUnsafe(`DROP FUNCTION "${trigger}"()`);
  }
  assert.equal((await call(contact, requestsPath, 'POST', { type: 'QUESTION', subject: 123, description: 'invalid' })).status, 400);
  assert.equal((await call(foreign, `/organizations/${otherOrganization.id}/requests/${orgCase.id}`)).status, 404);
  for (const membershipStatus of ['ACTIVE', 'SUSPENDED']) {
    await db.organizationMember.updateMany({ where: { organizationId: organization.id, accountId: contact.id }, data: { status: membershipStatus } });
    const personalCases = await ok(await call(contact, '/customer-service/cases/mine'));
    assert.ok(personalCases.some(row => row.id === personalCase.id)); assert.ok(!personalCases.some(row => row.id === orgCase.id));
    assert.equal((await call(contact, `/customer-service/cases/${orgCase.id}/replies`, 'POST', { message: 'Personal bypass attempt' })).status, 404);
    if (membershipStatus === 'SUSPENDED') {
      assert.equal((await call(contact, `${requestsPath}/${orgCase.id}`)).status, 403);
      assert.equal((await call(contact, `${requestsPath}/${orgCase.id}/replies`, 'POST', { message: 'Revoked member' })).status, 403);
      assert.equal((await call(contact, scoped, 'POST', request)).status, 403);
    } else assert.equal((await ok(await call(contact, `${requestsPath}/${orgCase.id}`))).id, orgCase.id);
  }
  assert.equal(await db.customerInteraction.count({ where: { caseId: orgCase.id } }), 1);
  console.log('Organization HTTP/DB checks passed: scoped roster/cancellation, tenant and personal-route isolation for bookings/cases, revoked-member denial, optional approval gate ON/OFF with explicit deferral preserved, idempotent creation, single audit/notification, personal-case input boundaries, attributed audit and real rollback on audit failure, and no financial action.');
} finally {
  // Only synthetic actors in the guarded ephemeral CI database are removed.
  for (const { where, row } of policySnapshots) {
    if (row) await db.policyControl.update({ where, data: { state: row.state } });
    else await db.policyControl.deleteMany({ where: where.category_ruleKey });
  }
  await db.auditEvent.deleteMany({ where: { actorId: { in: people.map(person => person.id) } } });
  await db.notification.deleteMany({ where: { accountId: { in: accounts.map(account => account.id) } } });
  await db.operationalSetting.deleteMany({where:{key:{in:organizations.map(organization=>'organization-financial-profile:'+organization.id)}}});
  if (caseIds.length) await db.customerCase.deleteMany({ where: { id: { in: caseIds } } });
  if (bookingIds.length) { await db.bookingParticipant.deleteMany({ where: { bookingId: { in: bookingIds } } }); await db.booking.deleteMany({ where: { id: { in: bookingIds } } }); }
  if (trip) { await db.safetyChecklist.deleteMany({ where: { tripId: trip.id } }); await db.trip.delete({ where: { id: trip.id } }); }
  for (const organization of organizations) { await db.organizationMember.deleteMany({ where: { organizationId: organization.id } }); await db.organization.delete({ where: { id: organization.id } }); }
  for (const account of accounts) { await db.session.deleteMany({ where: { accountId: account.id } }); await db.account.delete({ where: { id: account.id } }); }
  for (const person of people) await db.person.delete({ where: { id: person.id } });
  await db.$disconnect();
}
