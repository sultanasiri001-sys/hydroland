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
  assert.equal((await call(contact, `${scoped}/${booking.id}/cancel`, 'POST', { ...command, reason: 'سبب مختلف لنفس مفتاح الطلب' })).status, 409);
  assert.equal(await db.auditEvent.count({ where: { action: 'BOOKING_CANCELLED', resourceId: booking.id } }), 1);
  assert.equal(await db.notification.count({ where: { accountId: contact.id, type: 'BOOKING_CANCELLED' } }), 1);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: personal.id } })).status, 'PENDING');
  assert.equal(await db.payment.count({ where: { bookingId: booking.id } }), 0);
  console.log('Organization booking HTTP/DB checks passed: scoped roster edits, stale revision, tenant isolation, viewer/revoked-member denial, personal-route isolation, payment denial, stale cancellation, exact cancellation replay, single audit/notification and no financial action.');
} finally {
  // Only synthetic actors in the guarded ephemeral CI database are removed.
  await db.auditEvent.deleteMany({ where: { actorId: { in: people.map(person => person.id) } } });
  await db.notification.deleteMany({ where: { accountId: { in: accounts.map(account => account.id) } } });
  if (bookingIds.length) { await db.bookingParticipant.deleteMany({ where: { bookingId: { in: bookingIds } } }); await db.booking.deleteMany({ where: { id: { in: bookingIds } } }); }
  if (trip) await db.trip.delete({ where: { id: trip.id } });
  for (const organization of organizations) { await db.organizationMember.deleteMany({ where: { organizationId: organization.id } }); await db.organization.delete({ where: { id: organization.id } }); }
  for (const account of accounts) { await db.session.deleteMany({ where: { accountId: account.id } }); await db.account.delete({ where: { id: account.id } }); }
  for (const person of people) await db.person.delete({ where: { id: person.id } });
  await db.$disconnect();
}
