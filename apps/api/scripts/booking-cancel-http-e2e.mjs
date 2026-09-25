import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db = new PrismaClient();
const base = process.env.BOOKING_E2E_BASE_URL || 'http://127.0.0.1:3101/api/v1';
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET required');

const suffix = Date.now().toString();
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor = id => {
  const now = Math.floor(Date.now() / 1000);
  const body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: id, iat: now, exp: now + 900 })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
const auth = token => ({ authorization: `Bearer ${token}` });
const makeAccount = async label => {
  const person = await db.person.create({ data: { firstName: 'Booking', lastName: label } });
  const account = await db.account.create({ data: { personId: person.id, email: `booking-${label.toLowerCase()}-${suffix}@example.invalid`, passwordHash: 'e2e', status: 'ACTIVE', emailVerifiedAt: new Date() } });
  return { person, account };
};
const call = (path, token) => fetch(base + path, { method: 'DELETE', headers: token ? auth(token) : {} });

const owner = await makeAccount('Owner');
const outsider = await makeAccount('Outsider');
const ownerToken = tokenFor(owner.account.id);
const outsiderToken = tokenFor(outsider.account.id);
const future = new Date(Date.now() + 86_400_000);
const futureEnd = new Date(future.getTime() + 10_800_000);
const past = new Date(Date.now() - 3_600_000);
const pastEnd = new Date(Date.now() + 3_600_000);
let trip, booking, closedTrip, closedBooking, startedTrip, startedBooking;

try {
  trip = await db.trip.create({ data: { title: 'Booking cancellation E2E', type: 'DIVE', startsAt: future, endsAt: futureEnd, capacity: 8, status: 'OPEN' } });
  booking = await db.booking.create({ data: { tripId: trip.id, accountId: owner.account.id, seats: 2, status: 'PENDING' } });

  let r = await call(`/trips/bookings/${booking.id}`);
  if (r.status !== 401) throw new Error(`Anonymous cancellation expected 401, got ${r.status}`);

  r = await call(`/trips/bookings/${booking.id}`, outsiderToken);
  if (r.status !== 404) throw new Error(`Cross-account cancellation expected 404, got ${r.status}`);
  let persisted = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  if (persisted.status !== 'PENDING') throw new Error('Cross-account cancellation mutated booking');

  r = await call(`/trips/bookings/${booking.id}`, ownerToken);
  if (!r.ok) throw new Error(`Owner cancellation failed ${r.status}: ${await r.text()}`);
  const cancelled = await r.json();
  if (cancelled.status !== 'CANCELLED') throw new Error('Owner cancellation did not return CANCELLED');
  persisted = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  if (persisted.status !== 'CANCELLED') throw new Error('Owner cancellation did not persist CANCELLED');

  const audit = await db.auditEvent.findFirst({ where: { resource: 'Booking', resourceId: booking.id, action: 'BOOKING_SELF_CANCELLED' } });
  if (!audit || audit.actorId !== owner.person.id) throw new Error('Booking cancellation audit actor was not persisted correctly');

  r = await call(`/trips/bookings/${booking.id}`, ownerToken);
  if (!r.ok || (await r.json()).status !== 'CANCELLED') throw new Error('Repeated cancellation was not idempotent');
  const auditCount = await db.auditEvent.count({ where: { resource: 'Booking', resourceId: booking.id, action: 'BOOKING_SELF_CANCELLED' } });
  if (auditCount !== 1) throw new Error(`Idempotent cancellation created ${auditCount} audit rows`);

  closedTrip = await db.trip.create({ data: { title: 'Closed cancellation E2E', type: 'DIVE', startsAt: future, endsAt: futureEnd, capacity: 4, status: 'CLOSED' } });
  closedBooking = await db.booking.create({ data: { tripId: closedTrip.id, accountId: owner.account.id, seats: 1, status: 'PENDING' } });
  const closedFixture = await db.booking.findUniqueOrThrow({ where: { id: closedBooking.id }, include: { trip: true } });
  if (closedFixture.trip.status !== 'CLOSED') throw new Error(`Closed-trip fixture precondition failed: ${closedFixture.trip.status}`);
  r = await call(`/trips/bookings/${closedBooking.id}`, ownerToken);
  if (r.status !== 409) throw new Error(`Closed trip cancellation expected 409, got ${r.status}`);
  if ((await db.booking.findUniqueOrThrow({ where: { id: closedBooking.id } })).status !== 'PENDING') throw new Error('Closed-trip cancellation mutated booking');

  startedTrip = await db.trip.create({ data: { title: 'Started cancellation E2E', type: 'DIVE', startsAt: past, endsAt: pastEnd, capacity: 4, status: 'OPEN' } });
  startedBooking = await db.booking.create({ data: { tripId: startedTrip.id, accountId: owner.account.id, seats: 1, status: 'CONFIRMED' } });
  const startedFixture = await db.booking.findUniqueOrThrow({ where: { id: startedBooking.id }, include: { trip: true } });
  if (startedFixture.trip.status !== 'OPEN' || startedFixture.trip.startsAt > new Date()) throw new Error('Started-trip fixture precondition failed');
  r = await call(`/trips/bookings/${startedBooking.id}`, ownerToken);
  if (r.status !== 409) throw new Error(`Started trip cancellation expected 409, got ${r.status}`);
  if ((await db.booking.findUniqueOrThrow({ where: { id: startedBooking.id } })).status !== 'CONFIRMED') throw new Error('Started-trip cancellation mutated booking');

  console.log('Booking cancellation HTTP/DB E2E passed: auth, ownership isolation, canonical DELETE, persistence, audit, idempotency, closed/started trip protection.');
} finally {
  const bookingIds = [booking?.id, closedBooking?.id, startedBooking?.id].filter(Boolean);
  if (bookingIds.length) {
    await db.payment.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => {});
    await db.bookingParticipant.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => {});
    await db.auditEvent.deleteMany({ where: { resource: 'Booking', resourceId: { in: bookingIds } } }).catch(() => {});
    await db.booking.deleteMany({ where: { id: { in: bookingIds } } }).catch(() => {});
  }
  const tripIds = [trip?.id, closedTrip?.id, startedTrip?.id].filter(Boolean);
  if (tripIds.length) {
    await db.safetyChecklist.deleteMany({ where: { tripId: { in: tripIds } } }).catch(() => {});
    await db.trip.deleteMany({ where: { id: { in: tripIds } } }).catch(() => {});
  }
  for (const entry of [owner, outsider]) {
    await db.notification.deleteMany({ where: { accountId: entry.account.id } }).catch(() => {});
    await db.session.deleteMany({ where: { accountId: entry.account.id } }).catch(() => {});
    await db.roleAssignment.deleteMany({ where: { accountId: entry.account.id } }).catch(() => {});
    await db.account.delete({ where: { id: entry.account.id } }).catch(() => {});
    await db.person.delete({ where: { id: entry.person.id } }).catch(() => {});
  }
  await db.$disconnect();
}
