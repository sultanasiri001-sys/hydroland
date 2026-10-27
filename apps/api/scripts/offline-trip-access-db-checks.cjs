/* Synthetic-only HTTP + PostgreSQL authorization checks. No external providers. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHmac, randomUUID } = require('node:crypto');
const ts = require('typescript');
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.OFFLINE_ACCESS_DB_TEST_CONFIRM !== 'DISPOSABLE_LOOPBACK_ONLY' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !url.pathname.startsWith('/offline_access_test_')) {
  throw new Error('Requires an explicitly confirmed dedicated disposable loopback database.');
}
// Compile only in memory; use real controller, guard, auth and data-access code.
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { DatabaseService } = require('../src/database/database.service.ts');
const { AuthService } = require('../src/auth/auth.service.ts');
const { AccessTokenGuard } = require('../src/auth/access-token.guard.ts');
const { ReviewGuard } = require('../src/admin/review.guard.ts');
const { TripIntelligenceService } = require('../src/trip-intelligence/trip-intelligence.service.ts');
const { TripIntelligenceController } = require('../src/trip-intelligence/trip-intelligence.controller.ts');
const authorizationPath = path.join(__dirname, '../src/trip-intelligence/offline-trip-authorization.service.ts');
const Authorization = fs.existsSync(authorizationPath) ? require(authorizationPath).OfflineTripAuthorizationService : null;
const db = new DatabaseService();
const secret = 'synthetic-fixture-signing-key-not-a-real-secret';
process.env.JWT_SECRET = secret;
process.env.NODE_ENV = 'test';
process.env.HYDROLAND_ALLOW_SESSIONLESS_E2E_ACCESS = 'false';
let app, base, storageCalls = 0, protectedReads = 0, afterRead, afterDelivery, failDelivery = false;
const protectedModels = new Set(['tripBriefing', 'offlineTripPackage', 'briefingMedia', 'divePlan', 'emergencyPlan']);
const instrumented = new Proxy(db, { get(target, property) {
  const value = target[property];
  if (protectedModels.has(property)) return new Proxy(value, { get(model, operation) {
    const method = model[operation];
    if (typeof method !== 'function') return method;
    return async (...args) => {
      if (String(operation).startsWith('find')) protectedReads++;
      const result = await method.apply(model, args);
      if (property === 'tripBriefing' && operation === 'findFirst' && afterRead) {
        const callback = afterRead; afterRead = null; await callback();
      }
      return result;
    };
  } });
  return typeof value === 'function' ? value.bind(target) : value;
} });
const storage = { async delivery(descriptor) {
  storageCalls++;
  if (afterDelivery) { const callback = afterDelivery; afterDelivery = null; await callback(); }
  if (failDelivery) throw new Error('Synthetic private storage failure');
  // No URL generation, provider configuration, object lookup or network traffic.
  return { provider: 'SYNTHETIC_TEST_ONLY', checksum: descriptor.checksum,
    contentType: descriptor.contentType, sizeBytes: descriptor.sizeBytes };
} };
const service = new TripIntelligenceService(instrumented, { record: async () => {} }, {}, storage,
  Authorization ? new Authorization(instrumented) : undefined);
const auth = new AuthService(db, {}, {});
const accounts = {};
const token = (accountId, sessionId, expiresAt = Math.floor(Date.now()/1000)+3600) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: accountId, sid: sessionId, exp: expiresAt })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
};
async function account(name, roles = []) {
  const row = await db.account.create({ data: { email: `${name}@example.invalid`, status: 'ACTIVE',
    emailVerifiedAt: new Date(), passwordHash: 'synthetic-unusable',
    person: { create: { firstName: 'Synthetic', lastName: name } },
    roleAssignments: { create: roles.map(role => ({ role, status: 'ACTIVE' })) } } });
  const session = await db.session.create({ data: { accountId: row.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now()+3600000) } });
  return accounts[name] = { id: row.id, sessionId: session.id, token: token(row.id, session.id) };
}
async function organization(name, owner, kind = 'DIVE_CENTER') {
  return db.organization.create({ data: { displayName: `Synthetic ${name}`, ownerId: owner.id, kind, status: 'ACTIVE',
    members: { create: { accountId: owner.id, role: 'OWNER', status: 'ACTIVE' } } } });
}
async function packageTrip(organizationId, authorId) {
  const trip = await db.trip.create({ data: { organizationId, title: 'Synthetic private trip', type: 'BOAT',
    status: 'OPEN', startsAt: new Date(Date.now()+86400000), endsAt: new Date(Date.now()+90000000), capacity: 4 } });
  const briefing = await db.tripBriefing.create({ data: { tripId: trip.id, version: 1, status: 'PUBLISHED',
    createdByAccountId: authorId, title: 'Synthetic private briefing', summary: { testOnly: true },
    media: { create: { mediaKey: 'test-map', mediaType: 'MAP', storageKey: 'synthetic-only/no-object',
      checksum: 'a'.repeat(64), sizeBytes: 12, contentType: 'application/octet-stream' } } } });
  await db.divePlan.create({ data: { tripId: trip.id, version: 1, plan: { synthetic: true }, approvedAt: new Date() } });
  await db.emergencyPlan.create({ data: { tripId: trip.id, version: 1, plan: { synthetic: true }, approvedAt: new Date() } });
  await service.generateOfflinePackage(authorId, trip.id);
  return { ...trip, briefingId: briefing.id };
}
const routes = ['', '/content', '/payloads/test-map'];
async function request(reader, trip, suffix = '', query = '') {
  const response = await fetch(`${base}/trip-intelligence/${trip.id}/offline-package${suffix}${query}`, {
    headers: reader ? { authorization: `Bearer ${reader.token}` } : {},
  });
  return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
}
let passed = 0;
async function check(name, work) { await work(); passed++; console.log(`PASS ${name}`); }
async function allowed(reader, trip) {
  for (const suffix of routes) {
    const result = await request(reader, trip, suffix);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.match(result.cache, /no-store/);
  }
}
async function denied(reader, trip, status = 403, query = '') {
  for (const suffix of routes) {
    const reads = protectedReads, deliveries = storageCalls;
    const result = await request(reader, trip, suffix, query);
    assert.equal(result.status, status);
    assert.equal(protectedReads, reads, 'Denied reader fetched private metadata');
    assert.equal(storageCalls, deliveries, 'Denied reader reached payload storage');
    for (const key of ['tripId', 'briefingVersion', 'manifest', 'checksum', 'generatedAt', 'url', 'storageKey']) {
      assert.equal(key in result.body, false, `Denied response leaked ${key}`);
    }
  }
}
(async () => {
  try {
    assert.equal(await db.account.count(), 0, 'Disposable fixture database must be empty');
    if (process.argv.includes('--legacy-session-timestamptz')) {
      // Dedicated empty fixture only: reproduce the retained initial identity migration.
      await db.$executeRawUnsafe(`ALTER TABLE "Session" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC'`);
    }
    const [environment] = await db.$queryRaw`SELECT current_setting('TimeZone') AS timezone,
      (SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema()
        AND table_name='Session' AND column_name='expiresAt') AS session_expiry_type`;
    console.log('SYNTHETIC DATABASE', environment);
    assert.notEqual(environment.timezone, 'UTC', 'Run with a non-UTC database zone to cover timestamp coercion');
    const admin = await account('admin', ['ADMIN']);
    const centerA = await account('center-a', ['DIVE_CENTER']);
    const centerB = await account('center-b', ['DIVE_CENTER']);
    const marine = await account('marine', ['BOAT_OWNER']);
    const customer = await account('customer', ['DIVER']);
    const unrelated = await account('unrelated');
    const participant = await account('participant');
    const reviewer = await account('reviewer', ['REVIEWER']);
    const instructor = await account('instructor', ['INSTRUCTOR']);
    const operator = await account('center-operator', ['DIVE_CENTER']);
    const viewer = await account('marine-viewer', ['BOAT_OWNER']);
    const orgA = await organization('center-a', centerA), orgB = await organization('center-b', centerB);
    const marineOrg = await organization('marine', marine, 'MARINE_OPERATOR');
    await db.organizationMember.createMany({ data: [
      { organizationId: orgA.id, accountId: operator.id, role: 'OPERATOR', status: 'ACTIVE' },
      { organizationId: marineOrg.id, accountId: viewer.id, role: 'VIEWER', status: 'ACTIVE' },
    ] });
    const trip = await packageTrip(orgA.id, admin.id), foreign = await packageTrip(orgB.id, admin.id);
    const marineTrip = await packageTrip(marineOrg.id, admin.id);
    const booking = await db.booking.create({ data: { tripId: trip.id, accountId: customer.id, status: 'CONFIRMED' } });
    await db.bookingParticipant.create({ data: { bookingId: booking.id, accountId: participant.id, fullName: 'Synthetic linked participant' } });
    const resource = await db.calendarResource.create({ data: { type: 'INSTRUCTOR', name: 'Synthetic crew', referenceId: instructor.id } });
    await db.crewAssignment.create({ data: { tripId: trip.id, accountId: instructor.id, resourceId: resource.id, roleType: 'INSTRUCTOR', status: 'ACCEPTED' } });
    class FixtureModule {}
    Module({ controllers: [TripIntelligenceController], providers: [
      { provide: TripIntelligenceService, useValue: service }, { provide: AuthService, useValue: auth },
      { provide: DatabaseService, useValue: db }, AccessTokenGuard, ReviewGuard,
    ] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false });
    await app.listen(0, '127.0.0.1'); base = await app.getUrl();
    if (process.argv.includes('--prove-unfixed')) {
      for (const [name, reader] of [['cross-account', unrelated], ['cross-center', centerB]]) {
        for (const suffix of routes) await check(`UNFIXED ${name} exposes ${suffix || 'metadata'}`, async () => {
          const response = await request(reader, trip, suffix);
          assert.equal(response.status, 200); assert.ok(response.body.checksum);
        });
      }
      console.log(`BASELINE PROOF: ${passed} unauthorized requests returned HTTP 200; synthetic storage only.`);
      return;
    }
    await check('admin can read every route', () => allowed(admin, trip));
    await check('UTC epoch expiry matches current physical timestamp type', async () => {
      const [row] = await db.$queryRaw`SELECT EXTRACT(EPOCH FROM "expiresAt")::double precision AS expires FROM "Session" WHERE id::text=${admin.sessionId}`;
      const remaining = row.expires - Date.now()/1000;
      assert.ok(remaining > 3500 && remaining < 3601, 'Session future expiry must not drift with database timezone');
      const gate = new Authorization(db);
      await db.session.update({ where: { id: admin.sessionId }, data: { expiresAt: new Date(Date.now()-60000) } });
      await assert.rejects(() => gate.assertAccess({accountId:admin.id,sessionId:admin.sessionId}, trip.id), error => error.getStatus() === 401);
      await denied(admin, trip, 401);
      await db.session.update({ where: { id: admin.sessionId }, data: { expiresAt: new Date(Date.now()+3600000) } });
      await gate.assertAccess({accountId:admin.id,sessionId:admin.sessionId}, trip.id);
    });
    await check('canonical center owner can read every route', () => allowed(centerA, trip));
    await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: operator.id } }, data: { role: 'ADMIN' } });
    await check('canonical center admin can read every route', () => allowed(operator, trip));
    await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: operator.id } }, data: { role: 'OPERATOR' } });
    await check('canonical marine owner can read every route', () => allowed(marine, marineTrip));
    for (const role of ['OPERATOR', 'STAFF', 'ADMIN']) {
      await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: marineOrg.id, accountId: viewer.id } }, data: { role } });
      await check(`canonical marine ${role} can read`, () => allowed(viewer, marineTrip));
    }
    await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: marineOrg.id, accountId: viewer.id } }, data: { role: 'VIEWER' } });
    await db.organizationMember.create({ data: { organizationId: orgB.id, accountId: centerA.id, role: 'ADMIN', status: 'ACTIVE', createdAt: new Date(Date.now()+1000) } });
    await check('center scope remains oldest managed center, not any membership', () => denied(centerA, foreign));
    await check('unrelated account denied before every private read', () => denied(unrelated, trip));
    await check('linked participant does not invent full-package grant', () => denied(participant, trip));
    await check('cross-center denied', () => denied(centerB, trip));
    await check('cross-marine/center denied', () => denied(marine, trip));
    await check('center cannot read marine trip', () => denied(centerA, marineTrip));
    await check('customer booking does not invent full-package grant', () => denied(customer, trip));
    await db.booking.update({ where: { id: booking.id }, data: { status: 'PENDING' } });
    await check('pending booking does not invent full-package grant', () => denied(customer, trip));
    await db.booking.update({ where: { id: booking.id }, data: { organizationId: orgB.id } });
    await check('organization booking owner does not invent full-package grant', () => denied(customer, trip));
    await check('accepted instructor does not invent package grant', () => denied(instructor, trip));
    await check('review role does not invent private reader grant', () => denied(reviewer, trip));
    await check('center operator is not canonical center owner/admin', () => denied(operator, trip));
    await check('marine viewer denied', () => denied(viewer, marineTrip));
    await check('query identity and scope cannot override server identity', () => denied(unrelated, trip, 403, `?accountId=${admin.id}&scope=admin&organizationId=${orgA.id}`));
    await check('missing trip is indistinguishable from forbidden', () => denied(centerA, { id: randomUUID() }));
    await check('unauthenticated rejected before private reads', () => denied(null, trip, 401));
    await check('malformed bearer token denied', () => denied({ token: 'invalid' }, trip, 401));
    await check('signed account/session mismatch denied', () => denied({ token: token(unrelated.id, admin.sessionId) }, trip, 401));
    await check('expired access token denied', () => denied({ token: token(admin.id, admin.sessionId, Math.floor(Date.now()/1000)-60) }, trip, 401));
    await db.session.update({ where: { id: unrelated.sessionId }, data: { expiresAt: new Date(Date.now()-60000) } });
    await check('expired persisted session denied', () => denied(unrelated, trip, 401));
    await db.session.update({ where: { id: unrelated.sessionId }, data: { expiresAt: new Date(Date.now()+3600000), tokenHash: 'mfa:synthetic-only' } });
    await check('MFA challenge session denied', () => denied(unrelated, trip, 401));
    await db.session.update({ where: { id: unrelated.sessionId }, data: { tokenHash: randomUUID() } });
    await db.account.update({ where: { id: unrelated.id }, data: { status: 'SUSPENDED' } });
    await check('suspended account denied', () => denied(unrelated, trip, 401));
    await db.account.update({ where: { id: unrelated.id }, data: { status: 'ACTIVE', emailVerifiedAt: null } });
    await check('unverified account denied', () => denied(unrelated, trip, 401));
    await db.account.update({ where: { id: unrelated.id }, data: { emailVerifiedAt: new Date() } });
    await db.roleAssignment.update({ where: { accountId_role: { accountId: admin.id, role: 'ADMIN' } }, data: { status: 'SUSPENDED' } });
    await check('revoked admin role denied', () => denied(admin, trip));
    await db.roleAssignment.update({ where: { accountId_role: { accountId: admin.id, role: 'ADMIN' } }, data: { status: 'ACTIVE' } });
    await db.roleAssignment.update({ where: { accountId_role: { accountId: centerA.id, role: 'DIVE_CENTER' } }, data: { status: 'SUSPENDED' } });
    await check('current role revocation immediately denies all routes', () => denied(centerA, trip));
    await db.roleAssignment.update({ where: { accountId_role: { accountId: centerA.id, role: 'DIVE_CENTER' } }, data: { status: 'ACTIVE' } });
    await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'REMOVED' } });
    await check('current membership revocation denies all routes', () => denied(centerA, trip));
    await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'ACTIVE' } });
    await db.organization.update({ where: { id: orgA.id }, data: { status: 'SUSPENDED' } });
    await check('suspended owning organization denies all routes', () => denied(centerA, trip));
    await db.organization.update({ where: { id: orgA.id }, data: { status: 'ACTIVE' } });
    await db.session.update({ where: { id: centerB.sessionId }, data: { revokedAt: new Date() } });
    await check('revoked session rejected by real AccessTokenGuard', () => denied(centerB, foreign, 401));
    for (const suffix of routes) await check(`revocation during asynchronous read blocks ${suffix || 'metadata'}`, async () => {
      afterRead = () => db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'REMOVED' } });
      const deliveries = storageCalls, response = await request(centerA, trip, suffix);
      assert.equal(response.status, 403); assert.equal(storageCalls, deliveries);
      assert.equal('checksum' in response.body, false);
      await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'ACTIVE' } });
    });
    for (const suffix of routes) await check(`role revocation during awaited read blocks ${suffix || 'metadata'}`, async () => {
      afterRead = () => db.roleAssignment.update({ where: { accountId_role: { accountId: centerA.id, role: 'DIVE_CENTER' } }, data: { status: 'SUSPENDED' } });
      const deliveries = storageCalls, response = await request(centerA, trip, suffix);
      assert.equal(response.status, 403); assert.equal(storageCalls, deliveries);
      await db.roleAssignment.update({ where: { accountId_role: { accountId: centerA.id, role: 'DIVE_CENTER' } }, data: { status: 'ACTIVE' } });
    });
    for (const kind of ['role', 'membership']) await check(`${kind} revoked during storage await never releases delivery`, async () => {
      const revoke = kind === 'role'
        ? () => db.roleAssignment.update({ where: { accountId_role: { accountId: centerA.id, role: 'DIVE_CENTER' } }, data: { status: 'SUSPENDED' } })
        : () => db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'REMOVED' } });
      afterDelivery = revoke;
      const response = await request(centerA, trip, '/payloads/test-map');
      assert.equal(response.status, 403); assert.equal('checksum' in response.body, false);
      await db.roleAssignment.update({ where: { accountId_role: { accountId: centerA.id, role: 'DIVE_CENTER' } }, data: { status: 'ACTIVE' } });
      await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'ACTIVE' } });
    });
    await check('revocation masks resource-specific content error', async () => {
      afterRead = async () => {
        await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'REMOVED' } });
        await db.emergencyPlan.update({ where: { tripId_version: { tripId: trip.id, version: 1 } }, data: { approvedAt: null } });
      };
      const response = await request(centerA, trip, '/content');
      assert.equal(response.status, 403); assert.equal(response.body.message, 'Offline trip resource access denied.');
      await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'ACTIVE' } });
      await db.emergencyPlan.update({ where: { tripId_version: { tripId: trip.id, version: 1 } }, data: { approvedAt: new Date() } });
    });
    await check('revocation masks storage failure', async () => {
      failDelivery = true;
      afterDelivery = () => db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'REMOVED' } });
      const response = await request(centerA, trip, '/payloads/test-map');
      assert.equal(response.status, 403); assert.equal(response.body.message, 'Offline trip resource access denied.');
      failDelivery = false;
      await db.organizationMember.update({ where: { organizationId_accountId: { organizationId: orgA.id, accountId: centerA.id } }, data: { status: 'ACTIVE' } });
    });
    await check('session revoked during storage await never releases delivery', async () => {
      afterDelivery = () => db.session.update({ where: { id: centerA.sessionId }, data: { revokedAt: new Date() } });
      const response = await request(centerA, trip, '/payloads/test-map');
      assert.equal(response.status, 401); assert.equal('checksum' in response.body, false);
    });
    console.log(`OFFLINE ACCESS: ${passed} HTTP/database checks passed; zero external provider requests.`);
  } finally { if (app) await app.close(); await db.$disconnect(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
