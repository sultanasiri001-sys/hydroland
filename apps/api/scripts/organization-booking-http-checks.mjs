import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createHmac, randomUUID } from 'node:crypto';

const db = new PrismaClient();
const base = process.env.ORGANIZATION_BOOKING_E2E_BASE_URL || 'http://127.0.0.1:3101/api/v1';
const databaseUrl = new URL(process.env.DATABASE_URL);
if (process.env.CI !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname) || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Organization booking checks require CI loopback API and PostgreSQL');
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET required');
const suffix = randomUUID(), people = [], accounts = [], organizations = [], bookingIds = [];
const policySnapshots = [], caseIds = [];
let trip;
const tokenFor = id => {
  const now = Math.floor(Date.now() / 1000), encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: id, iat: now, exp: now + 900 });
  return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
};
const call = (account, path, method = 'GET', body) => fetch(base + path, { method, headers: { authorization: 'Bearer ' + tokenFor(account.id), 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
const ok = async response => { const body = await response.json(); assert.ok(response.ok, JSON.stringify(body)); return body; };
try {
  for (const label of ['contact', 'foreign']) {
    const person = await db.person.create({ data: { firstName: label, lastName: 'OrganizationBookingE2E' } }); people.push(person);
    const account = await db.account.create({ data: { personId: person.id, email: `${label}-${suffix}@example.invalid`, passwordHash: 'e2e', status: 'ACTIVE', emailVerifiedAt: new Date() } }); accounts.push(account);
    const organization = await db.organization.create({ data: { displayName: `Booking boundary ${label} ${suffix}`, kind: 'COMPANY', status: 'ACTIVE', ownerId: account.id } }); organizations.push(organization);
    await db.organizationMember.create({ data: { organizationId: organization.id, accountId: account.id, role: 'OPERATOR', status: 'ACTIVE' } });
  }
  const [contact, foreign] = accounts, [organization, otherOrganization] = organizations;
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

  // Organization cases must never leak through the submitting contact's personal routes.
  const requestsPath = `/organizations/${organization.id}/requests`;
  const orgCase = await ok(await call(contact, requestsPath, 'POST', { type: 'QUESTION', subject: 'طلب خاص بالجهة', description: 'بيانات اختبار معزولة للجهة' })); caseIds.push(orgCase.id);
  const personalCase = await ok(await call(contact, '/customer-service/cases', 'POST', { type: 'QUESTION', subject: 'طلب شخصي', description: 'طلب حساب فردي للاختبار' })); caseIds.push(personalCase.id);
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
  console.log('Organization HTTP/DB checks passed: scoped roster/cancellation, tenant and personal-route isolation for bookings/cases, revoked-member denial, optional approval gate ON/OFF with explicit deferral preserved, idempotent creation, single audit/notification and no financial action.');
} finally {
  // Only synthetic actors in the guarded ephemeral CI database are removed.
  for (const { where, row } of policySnapshots) {
    if (row) await db.policyControl.update({ where, data: { state: row.state } });
    else await db.policyControl.deleteMany({ where: where.category_ruleKey });
  }
  await db.auditEvent.deleteMany({ where: { actorId: { in: people.map(person => person.id) } } });
  await db.notification.deleteMany({ where: { accountId: { in: accounts.map(account => account.id) } } });
  if (caseIds.length) await db.customerCase.deleteMany({ where: { id: { in: caseIds } } });
  if (bookingIds.length) { await db.bookingParticipant.deleteMany({ where: { bookingId: { in: bookingIds } } }); await db.booking.deleteMany({ where: { id: { in: bookingIds } } }); }
  if (trip) { await db.safetyChecklist.deleteMany({ where: { tripId: trip.id } }); await db.trip.delete({ where: { id: trip.id } }); }
  for (const organization of organizations) { await db.organizationMember.deleteMany({ where: { organizationId: organization.id } }); await db.organization.delete({ where: { id: organization.id } }); }
  for (const account of accounts) { await db.session.deleteMany({ where: { accountId: account.id } }); await db.account.delete({ where: { id: account.id } }); }
  for (const person of people) await db.person.delete({ where: { id: person.id } });
  await db.$disconnect();
}
