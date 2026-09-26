import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const base = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.E2E_ADMIN_PASSWORD;

if (!base?.startsWith('https://')) throw new Error('E2E_BASE_URL must use HTTPS.');
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!adminEmail?.endsWith('@hydroland.test')) throw new Error('E2E_ADMIN_EMAIL must use @hydroland.test.');
if (!password || password.length < 12) throw new Error('E2E_ADMIN_PASSWORD must be at least 12 characters.');

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const renterEmail = `op-renter-${suffix}@hydroland.test`;
const reviewerEmail = `op-reviewer-${suffix}@hydroland.test`;
const api = `${base}/api/v1`;
const tempAccounts = [];
const tempPeople = [];
let trip = null;
let bookingId = null;

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function auth(token) {
  return { authorization: `Bearer ${token}` };
}

async function expectOk(result, label) {
  if (!result.response.ok) {
    throw new Error(`${label} failed: HTTP ${result.response.status} ${JSON.stringify(result.body).slice(0, 700)}`);
  }
  return result.body;
}

async function registerTemporaryAccount(email) {
  const registered = await request('/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!registered.response.ok) {
    throw new Error(`Temporary account registration failed for ${email}: HTTP ${registered.response.status}`);
  }
  const account = await db.account.findUnique({
    where: { email },
    select: { id: true, personId: true },
  });
  if (!account) throw new Error(`Registered temporary account ${email} was not persisted.`);
  tempAccounts.push(account.id);
  tempPeople.push(account.personId);
  await db.account.update({
    where: { id: account.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  return account;
}

async function login(email) {
  const result = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await expectOk(result, `Login for ${email}`);
  if (!body?.accessToken) throw new Error(`Login for ${email} did not return an access token.`);
  return body.accessToken;
}

try {
  const weatherGate = await db.operationalSetting.findUnique({ where: { key: 'WEATHER_GATE' } });
  if (weatherGate?.value?.enabled !== true || weatherGate?.value?.mode !== 'ENFORCE') {
    throw new Error('Production WEATHER_GATE must already be enabled in ENFORCE mode before operational E2E can run.');
  }

  const adminAccount = await db.account.findUnique({
    where: { email: adminEmail },
    select: { id: true, personId: true },
  });
  if (!adminAccount) throw new Error(`E2E admin ${adminEmail} does not exist.`);

  const renter = await registerTemporaryAccount(renterEmail);
  const reviewer = await registerTemporaryAccount(reviewerEmail);

  await db.$transaction([
    db.credential.create({
      data: {
        personId: renter.personId,
        issuer: 'HYDROLAND Production E2E',
        title: 'Open Water Diver',
        credentialNumber: `PROD-E2E-${suffix}`,
        issuedAt: new Date(),
        verificationStatus: 'VERIFIED',
      },
    }),
    db.diverProfile.create({
      data: {
        accountId: renter.id,
        medicalFitnessStatus: 'FIT',
        medicalClearanceExpiresAt: new Date(Date.now() + 30 * 86400000),
      },
    }),
    db.roleAssignment.upsert({
      where: { accountId_role: { accountId: reviewer.id, role: 'REVIEWER' } },
      create: {
        accountId: reviewer.id,
        role: 'REVIEWER',
        status: 'ACTIVE',
        activeAt: new Date(),
        scope: { purpose: 'PRODUCTION_OPERATIONAL_E2E' },
      },
      update: {
        status: 'ACTIVE',
        activeAt: new Date(),
        endedAt: null,
        scope: { purpose: 'PRODUCTION_OPERATIONAL_E2E' },
      },
    }),
  ]);

  const adminToken = await login(adminEmail);
  const renterToken = await login(renterEmail);
  const reviewerToken = await login(reviewerEmail);

  const startsAt = new Date(Date.now() + 48 * 3600000);
  startsAt.setUTCMinutes(0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 3 * 3600000);

  trip = await expectOk(await request('/trips/admin', {
    method: 'POST',
    headers: { ...auth(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({
      title: `HYDROLAND Production Operational E2E ${suffix}`,
      type: 'SHORE_DIVE',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      capacity: 2,
      status: 'DRAFT',
      locationName: 'Asir Production E2E Dive Site',
      latitude: 18.0185,
      longitude: 41.4582,
    }),
  }), 'Create production E2E trip');
  if (!trip?.id) throw new Error('Production E2E trip did not return an id.');

  const price = await expectOk(await request(`/trips/admin/${trip.id}/price`, {
    method: 'PATCH',
    headers: { ...auth(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({ pricePerSeatMinor: 0 }),
  }), 'Configure zero-value E2E trip price');
  if (price?.configured !== true || price?.pricePerSeatMinor !== 0) {
    throw new Error('Production E2E trip zero-value pricing was not persisted.');
  }

  const opened = await expectOk(await request(`/trips/admin/${trip.id}/status`, {
    method: 'PATCH',
    headers: { ...auth(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'OPEN' }),
  }), 'Open production E2E trip');
  if (opened?.status !== 'OPEN') throw new Error('Production E2E trip did not open.');

  const checklistItems = {
    diver_credentials: true,
    equipment_ready: true,
    oxygen_first_aid: true,
    boat_fuel: true,
    weather_review: true,
    emergency_plan: true,
  };
  const checklist = await expectOk(await request(`/trips/${trip.id}/safety`, {
    method: 'POST',
    headers: { ...auth(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({ items: checklistItems, notes: 'Production E2E isolated operational safety assessment' }),
  }), 'Submit production safety checklist');
  if (checklist?.decision !== 'REVIEW_REQUIRED') {
    throw new Error(`Expected safety REVIEW_REQUIRED, got ${checklist?.decision}`);
  }

  const allowed = await expectOk(await request(`/trips/${trip.id}/safety/checklists/${checklist.id}/decision`, {
    method: 'PATCH',
    headers: { ...auth(reviewerToken), 'content-type': 'application/json' },
    body: JSON.stringify({ decision: 'ALLOWED', notes: 'Production E2E safety review approved' }),
  }), 'Approve production safety checklist');
  if (allowed?.decision !== 'ALLOWED' || !allowed?.decidedAt) {
    throw new Error('Production safety decision was not persisted as ALLOWED.');
  }

  const blockedBeforeWeather = await request(`/trips/${trip.id}/bookings`, {
    method: 'POST',
    headers: { ...auth(renterToken), 'content-type': 'application/json' },
    body: JSON.stringify({ seats: 1 }),
  });
  if (blockedBeforeWeather.response.status !== 409) {
    throw new Error(`Booking before weather approval expected HTTP 409, got ${blockedBeforeWeather.response.status}.`);
  }

  const weather = await expectOk(await request(`/trips/admin/weather-gate/trips/${trip.id}/refresh`, {
    method: 'POST',
    headers: auth(adminToken),
  }), 'Refresh production marine weather');
  if (weather?.review?.status !== 'PENDING') {
    throw new Error(`Expected production weather review PENDING, got ${weather?.review?.status}.`);
  }
  if (typeof weather?.review?.snapshot?.waveHeightM !== 'number') {
    throw new Error('Production marine weather snapshot did not contain waveHeightM.');
  }

  const approvedWeather = await expectOk(await request(`/trips/admin/weather-gate/trips/${trip.id}/decision`, {
    method: 'POST',
    headers: { ...auth(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'APPROVED', notes: 'Production E2E operator approval' }),
  }), 'Approve production marine weather');
  if (approvedWeather?.review?.status !== 'APPROVED') {
    throw new Error('Production weather approval was not persisted.');
  }

  const booking = await expectOk(await request(`/trips/${trip.id}/bookings`, {
    method: 'POST',
    headers: { ...auth(renterToken), 'content-type': 'application/json' },
    body: JSON.stringify({ seats: 1 }),
  }), 'Create production E2E booking');
  bookingId = booking?.id;
  if (!bookingId || booking?.status !== 'PENDING') {
    throw new Error('Production E2E booking was not created in PENDING state.');
  }
  if (booking?.policyReview?.weatherGate?.reviewStatus !== 'APPROVED') {
    throw new Error('Production booking did not preserve approved weather evidence.');
  }

  const confirmed = await expectOk(await request(`/trips/admin/${trip.id}/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    headers: auth(adminToken),
  }), 'Confirm production E2E booking');
  if (confirmed?.status !== 'CONFIRMED') {
    throw new Error('Production E2E booking did not reach CONFIRMED state.');
  }

  const mine = await expectOk(await request('/trips/bookings/mine', {
    headers: auth(renterToken),
  }), 'Read renter production bookings');
  if (!Array.isArray(mine) || !mine.some(row => row.id === bookingId && row.status === 'CONFIRMED')) {
    throw new Error('Confirmed production booking was not visible to its owner.');
  }

  const auditCount = await db.auditEvent.count({
    where: { resourceId: { in: [trip.id, bookingId] } },
  });
  if (auditCount < 1) {
    throw new Error('Production operational journey produced no audit evidence for trip/booking resources.');
  }

  const cancelled = await expectOk(await request(`/trips/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    headers: auth(renterToken),
  }), 'Cancel production E2E booking');
  if (cancelled?.status !== 'CANCELLED') {
    throw new Error('Production E2E booking cleanup cancellation did not persist.');
  }

  const cancelledTrip = await expectOk(await request(`/trips/admin/${trip.id}/status`, {
    method: 'PATCH',
    headers: { ...auth(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  }), 'Cancel production E2E trip');
  if (cancelledTrip?.status !== 'CANCELLED') {
    throw new Error('Production E2E trip cleanup cancellation did not persist.');
  }

  console.log(`Production operational E2E passed: trip=${trip.id}, booking=${bookingId}, audits=${auditCount}, waveHeightM=${weather.review.snapshot.waveHeightM}.`);
} finally {
  const resourceIds = [trip?.id, bookingId].filter(Boolean);
  if (resourceIds.length) {
    await db.auditEvent.deleteMany({ where: { resourceId: { in: resourceIds } } }).catch(() => {});
  }
  if (tempPeople.length) {
    await db.auditEvent.deleteMany({ where: { actorId: { in: tempPeople } } }).catch(() => {});
  }
  if (tempAccounts.length) {
    await db.notification.deleteMany({ where: { accountId: { in: tempAccounts } } }).catch(() => {});
  }
  if (bookingId) {
    await db.bookingParticipant.deleteMany({ where: { bookingId } }).catch(() => {});
    await db.payment.deleteMany({ where: { bookingId } }).catch(() => {});
    await db.booking.deleteMany({ where: { id: bookingId } }).catch(() => {});
  }
  if (trip?.id) {
    await db.crewAssignment.deleteMany({ where: { tripId: trip.id } }).catch(() => {});
    await db.safetyChecklist.deleteMany({ where: { tripId: trip.id } }).catch(() => {});
    await db.$executeRaw`DELETE FROM "TripWeatherReview" WHERE "tripId"::text=${trip.id}`.catch(() => {});
    await db.$executeRaw`DELETE FROM "TripOperationalLocation" WHERE "tripId"::text=${trip.id}`.catch(() => {});
    await db.operationalSetting.delete({ where: { key: `trip-price:${trip.id}` } }).catch(() => {});
    await db.trip.deleteMany({ where: { id: trip.id } }).catch(() => {});
  }
  for (const accountId of tempAccounts) {
    await db.bookingParticipant.deleteMany({ where: { accountId } }).catch(() => {});
    await db.payment.deleteMany({ where: { accountId } }).catch(() => {});
    await db.booking.deleteMany({ where: { accountId } }).catch(() => {});
    await db.diverEquipment.deleteMany({ where: { accountId } }).catch(() => {});
    await db.diverProfile.deleteMany({ where: { accountId } }).catch(() => {});
    await db.roleAssignment.deleteMany({ where: { accountId } }).catch(() => {});
    await db.session.deleteMany({ where: { accountId } }).catch(() => {});
  }
  for (const personId of tempPeople) {
    await db.credential.deleteMany({ where: { personId } }).catch(() => {});
  }
  if (tempAccounts.length) {
    await db.account.deleteMany({ where: { id: { in: tempAccounts } } }).catch(() => {});
  }
  if (tempPeople.length) {
    await db.person.deleteMany({ where: { id: { in: tempPeople } } }).catch(() => {});
  }
  await db.$disconnect();
}
