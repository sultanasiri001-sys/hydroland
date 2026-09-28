import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const base = process.env.PHASE12_E2E_BASE_URL || 'http://127.0.0.1:3112/api/v1';
const suffix = Date.now().toString();
const email = `phase12-${suffix}@example.invalid`;
const password = 'Phase12-E2E-2026!StrongPassword';
const created = { personId: null, accountId: null, tripId: null, bookingId: null, paymentId: null };

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

const jsonHeaders = { 'content-type': 'application/json' };
const auth = token => ({ ...jsonHeaders, authorization: `Bearer ${token}` });

try {
  let result = await request('/auth/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (!result.response.ok || result.body?.status !== 'PENDING_VERIFICATION' || result.body?.requiresEmailVerification !== true) {
    throw new Error(`Registration release path failed: HTTP ${result.response.status} ${JSON.stringify(result.body)}`);
  }

  const account = await db.account.findUnique({ where: { email }, include: { person: true } });
  if (!account) throw new Error('Registration did not persist the account.');
  created.accountId = account.id;
  created.personId = account.personId;

  result = await request('/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (result.response.status !== 401) throw new Error(`Unverified login expected 401, got ${result.response.status}`);

  await db.account.update({
    where: { id: account.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  });

  result = await request('/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (result.response.status !== 200 || !result.body?.accessToken) {
    throw new Error(`Verified login failed: HTTP ${result.response.status} ${JSON.stringify(result.body)}`);
  }
  const token = result.body.accessToken;

  result = await request('/me');
  if (result.response.status !== 401) throw new Error(`Anonymous protected route expected 401, got ${result.response.status}`);
  result = await request('/me', { headers: auth(token) });
  if (result.response.status !== 200 || result.body?.id !== account.id) {
    throw new Error(`Authenticated protected route failed: HTTP ${result.response.status}`);
  }

  result = await request('/trips/admin', { headers: auth(token) });
  if (result.response.status !== 403) throw new Error(`Non-admin role scope expected 403, got ${result.response.status}`);

  const trip = await db.trip.create({
    data: {
      title: `Phase 12 duplicate booking ${suffix}`,
      type: 'SHORE_DIVE',
      startsAt: new Date(Date.now() + 2 * 86400000),
      endsAt: new Date(Date.now() + 2 * 86400000 + 3 * 3600000),
      capacity: 4,
      status: 'OPEN',
    },
  });
  created.tripId = trip.id;
  const booking = await db.booking.create({
    data: { tripId: trip.id, accountId: account.id, seats: 1, status: 'PENDING' },
  });
  created.bookingId = booking.id;

  result = await request(`/trips/${trip.id}/bookings`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ seats: 1 }),
  });
  if (result.response.status !== 409) throw new Error(`Duplicate active booking expected 409, got ${result.response.status}`);
  const activeBookings = await db.booking.count({ where: { tripId: trip.id, accountId: account.id, status: { in: ['PENDING', 'CONFIRMED'] } } });
  if (activeBookings !== 1) throw new Error(`Duplicate booking protection mutated persistence: ${activeBookings} active rows`);

  const payment = await db.payment.create({
    data: {
      bookingId: booking.id,
      accountId: account.id,
      amountMinor: 15000,
      currency: 'SAR',
      status: 'CAPTURED',
      idempotencyKey: `phase12-refund-${suffix}`,
    },
  });
  created.paymentId = payment.id;

  result = await request(`/payments/${payment.id}/refund-request`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ reason: 'Phase 12 release acceptance refund review request' }),
  });
  if (!result.response.ok || result.body?.status !== 'REFUND_REQUESTED' || result.body?.financialActionExecuted !== false) {
    throw new Error(`Refund request path failed: HTTP ${result.response.status} ${JSON.stringify(result.body)}`);
  }
  const refundAudit = await db.auditEvent.findFirst({
    where: { resource: 'Payment', resourceId: payment.id, action: 'PAYMENT_REFUND_REQUESTED' },
    orderBy: { occurredAt: 'desc' },
  });
  if (!refundAudit) throw new Error('Refund request audit evidence was not persisted.');
  if (refundAudit.metadata?.financialActionExecuted !== false) throw new Error('Refund request incorrectly claims a financial action was executed.');

  result = await request(`/payments/${payment.id}/refund-request`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ reason: 'Repeated Phase 12 release acceptance refund request' }),
  });
  if (result.response.status !== 409) throw new Error(`Duplicate refund request expected 409, got ${result.response.status}`);

  console.log('Phase 12 release HTTP/DB E2E passed: registration, verification-gated login, protected routes, role scoping, duplicate booking prevention, refund review path, duplicate refund denial and audit evidence.');
} finally {
  const resourceIds = [created.paymentId, created.bookingId, created.tripId, created.accountId].filter(Boolean);
  if (resourceIds.length) await db.auditEvent.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
  if (created.personId) await db.auditEvent.deleteMany({ where: { actorId: created.personId } }).catch(() => {});
  if (created.paymentId) await db.invoice.deleteMany({ where: { paymentId: created.paymentId } }).catch(() => {});
  if (created.bookingId) await db.payment.deleteMany({ where: { bookingId: created.bookingId } }).catch(() => {});
  if (created.bookingId) await db.bookingParticipant.deleteMany({ where: { bookingId: created.bookingId } }).catch(() => {});
  if (created.bookingId) await db.booking.deleteMany({ where: { id: created.bookingId } }).catch(() => {});
  if (created.tripId) {
    await db.safetyChecklist.deleteMany({ where: { tripId: created.tripId } }).catch(() => {});
    await db.trip.deleteMany({ where: { id: created.tripId } }).catch(() => {});
  }
  if (created.accountId) {
    await db.notification.deleteMany({ where: { accountId: created.accountId } }).catch(() => {});
    await db.session.deleteMany({ where: { accountId: created.accountId } }).catch(() => {});
    await db.roleAssignment.deleteMany({ where: { accountId: created.accountId } }).catch(() => {});
    await db.account.deleteMany({ where: { id: created.accountId } }).catch(() => {});
  }
  if (created.personId) await db.person.deleteMany({ where: { id: created.personId } }).catch(() => {});
  await db.operationalSetting.deleteMany({ where: { key: { startsWith: 'hydroland-auth-challenge.' } } }).catch(() => {});
  await db.$disconnect();
}
