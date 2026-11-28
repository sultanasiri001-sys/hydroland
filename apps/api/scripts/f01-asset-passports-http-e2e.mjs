import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marineReviewFixture } from './marine-review-fixture.mjs';

assert.equal(process.env.CI, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.F01_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const database = new URL(process.env.DATABASE_URL || 'invalid:');
assert(['postgres:', 'postgresql:'].includes(database.protocol));
assert(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname));
assert.match(database.pathname, /^\/f01_asset_passport_test(?:_[a-z0-9_]+)?$/);
assert.equal(database.search, ''); assert.equal(database.hash, '');
assert(!process.env.F01_E2E_BASE_URL, 'This suite must start its own loopback API.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..'), require = createRequire(import.meta.url);
const load = path => require(resolve(root, 'apps/api/dist', path));
const { PrismaClient } = require('@prisma/client');
const adminDb = new PrismaClient(), startedAt = new Date().toISOString(), checks = [], objects = new Map();
const originalEnvironment = new Map(), originalFetch = global.fetch, allowedOrigins = new Set(), externalFetchAttempts = [];
const concurrentNativeChanges = [];
let app, db, base, storage, fixture, failure, postgresVersion, sourceState, equipment, equipment2, vessel, reviewDocument, latestInspection;
let center, outsiderCenter, boatOrg, owner, outsider, admin, boatOwner, viewer, operations;
const tokens = new Map();
function env(key, value) { if (!originalEnvironment.has(key)) originalEnvironment.set(key, process.env[key]); if (value === undefined) delete process.env[key]; else process.env[key] = value; }
function expected(result, status, label = '') { assert.equal(result.status, status, label + ': ' + JSON.stringify(result.data)); return result.data; }
async function check(name, work) {
  const start = Date.now(); try { await work(); checks.push({ name, status: 'PASS', durationMs: Date.now() - start }); console.log('F01 PASS ' + name); }
  catch (error) { checks.push({ name, status: 'FAIL', durationMs: Date.now() - start }); throw error; }
}
async function call(actor, path, method = 'GET', data) {
  const response = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(actor ? { authorization: 'Bearer ' + tokens.get(actor.id) } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  return { status: response.status, data: await response.json().catch(() => null), cache: response.headers.get('cache-control') };
}
const sourcePath = (kind, id) => '/asset-passports/sources/' + kind + '/' + id;
const read = async (actor, kind, id) => expected(await call(actor, sourcePath(kind, id)), 200, 'source view');
const command = (actor, kind, id, action, data) => call(actor, sourcePath(kind, id) + '/' + action, 'POST', data);
const input = view => ({ requestId: randomUUID(), expectedVersion: view.passport?.currentVersion ?? 0, sourceDigest: view.sourceDigest });
const token = revision => revision.qrValue.slice('hydroland:passport:'.length);
const verify = (actor, revision) => call(actor, '/asset-passports/verify/' + token(revision));
const passportCounts = async () => (await db.$queryRaw`SELECT (SELECT count(*)::int FROM "AssetPassport") AS passports,
  (SELECT count(*)::int FROM "AssetPassportRevision") AS revisions, (SELECT count(*)::int FROM "AssetPassportCommand") AS commands`)[0];
async function commandWhileSourceChanges(who, kind, id, action, body, change) {
  const serializable = db.serializable.bind(db), before = await passportCounts();
  const audits = await db.auditEvent.count({ where: { action: { startsWith: 'ASSET_PASSPORT_' } } });
  let pause = true, arrived, release, timer, request;
  const atBarrier = new Promise(resolveBarrier => { arrived = resolveBarrier; });
  const resume = new Promise(resolveResume => { release = resolveResume; });
  const afterSourceRead = async () => { if (pause) { pause = false; arrived(); await resume; } };
  // The harness alone holds the compiled service after its native source read.
  // A separate connection commits the authority/ownership change before it resumes.
  db.serializable = work => serializable(tx => work(new Proxy(tx, { get(target, key) {
    if (key === '$queryRaw') return async (...args) => {
      const rows = await target.$queryRaw(...args);
      if (kind === 'EQUIPMENT' && Array.isArray(rows) && rows.some(row => row.id === id && Object.hasOwn(row, 'assetCode'))) await afterSourceRead();
      return rows;
    };
    if (key === 'marineAsset') return new Proxy(target.marineAsset, { get(delegate, method) {
      if (method === 'findUnique') return async args => { const row = await delegate.findUnique(args); if (kind === 'MARINE' && row?.id === id) await afterSourceRead(); return row; };
      return Reflect.get(delegate, method);
    } });
    return Reflect.get(target, key);
  } })));
  try {
    request = command(who, kind, id, action, body);
    await Promise.race([atBarrier, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('F01 native-source barrier not reached')), 4000); })]);
    await change(); release();
    const response = await request; expected(response, 404, 'changed native authority must deny the former manager');
    assert.deepEqual(await passportCounts(), before);
    assert.equal((await db.$queryRaw`SELECT "requestId" FROM "AssetPassportCommand" WHERE "requestId"=${body.requestId}`).length, 0);
    assert.equal(await db.auditEvent.count({ where: { action: { startsWith: 'ASSET_PASSPORT_' } } }), audits);
    concurrentNativeChanges.push({ sourceKind: kind, action, observedStatus: response.status,
      interleaving: 'NATIVE_SOURCE_READ_THEN_CHANGE_COMMIT_THEN_AUTHORITY_LOCK', passportOrRevisionWrites: 0, commandReceipts: 0, auditWrites: 0 });
  } finally { clearTimeout(timer); release(); if (request) await request.catch(() => {}); db.serializable = serializable; }
}
async function actor(label, role) {
  const password = 'Synthetic-F01-' + randomBytes(20).toString('hex'), salt = randomBytes(16).toString('hex');
  const account = await db.account.create({ data: { email: 'f01-' + label + '-' + randomUUID() + '@example.invalid',
    passwordHash: salt + ':' + scryptSync(password, salt, 64).toString('hex'), status: 'ACTIVE', emailVerifiedAt: new Date(),
    person: { create: { firstName: 'Synthetic F01', lastName: label } }, ...(role ? { roleAssignments: { create: { role, status: 'ACTIVE' } } } : {}) } });
  const login = expected(await call(null, '/auth/login', 'POST', { email: account.email, password }), 200, 'native login'); tokens.set(account.id, login.accessToken); return account;
}
async function createEquipment(by, name) {
  const data = { requestId: randomUUID(), name, serialNumber: 'SYNTHETIC-SERIAL-' + randomUUID(), location: 'PRIVATE_LOCATION_' + randomUUID(), sku: 'SYNTHETIC' };
  return { ...expected(await call(by, '/center/me/equipment', 'POST', data), 201, 'native equipment create'), ...data };
}
async function inspection(resourceId, expired = false) {
  const inspectedAt = new Date(Date.now() - (expired ? 172800000 : 1000)).toISOString();
  const serviceExpiresAt = new Date(Date.now() + (expired ? -86400000 : 86400000)).toISOString();
  return expected(await call(admin, '/trips/admin/equipment/' + resourceId + '/inspections', 'POST', {
    status: 'PASS', inspectedAt, serviceExpiresAt, notes: 'PRIVATE_REVIEW_NOTE_' + randomUUID(),
  }), 201, 'original inspection review');
}
async function startApp() {
  require('reflect-metadata'); const { NestFactory } = require('@nestjs/core'), { Module } = require('@nestjs/common');
  class PassportAcceptanceModule {}
  Module({ imports: [load('app.module.js').AppModule, load('asset-passports/asset-passports.module.js').AssetPassportsModule] })(PassportAcceptanceModule);
  app = await NestFactory.create(PassportAcceptanceModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api/v1'); app.useBodyParser('json', { limit: '15mb' }); await app.listen(0, '127.0.0.1');
  const origin = await app.getUrl(); allowedOrigins.add(origin); base = origin + '/api/v1'; db = app.get(load('database/database.service.js').DatabaseService);
}

try {
  assert.equal((await adminDb.$queryRaw`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'`)[0].n, 0, 'F01 requires a fresh empty disposable database.');
  postgresVersion = (await adminDb.$queryRaw`SELECT current_setting('server_version') AS version`)[0].version;
  const execute = args => execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), ...args, '--schema', resolve(root, 'apps/api/prisma/schema.prisma')], { cwd: root, env: process.env, stdio: 'pipe', timeout: 120000 });
  execute(['db', 'push', '--skip-generate']);
  execFileSync(process.execPath, [resolve(root, 'apps/api/scripts/bootstrap-equipment-runtime-schema.mjs')], { cwd: root, env: process.env, stdio: 'pipe', timeout: 60000 });
  execute(['db', 'execute', '--file', resolve(root, 'apps/api/prisma/migrations/20261128020000_asset_passport_lifecycle/migration.sql')]);
  env('JWT_SECRET', 'SYNTHETIC_F01_' + randomBytes(32).toString('hex')); env('HYDROLAND_AI_TEST_MANUAL_WORKER', '1');
  env('HYDROLAND_PRIVACY_RECOVERY_REQUIRED', 'false'); env('HYDROLAND_PRIVACY_ERASURE_ENABLED', 'false');
  for (const provider of ['AI_MODEL', 'WEATHER_MARINE', 'EMAIL', 'SMS', 'WHATSAPP', 'PAYMENT_PSP', 'BANKING_SETTLEMENT', 'TRANSLATION_ENGINE', 'MAPS_GEO', 'ESIGN', 'CERTIFICATION', 'DISTRESS_AIS', 'NAFATH', 'REGULATORY']) env('HYDROLAND_INTEGRATION_' + provider + '_STATUS', 'DISABLED');
  storage = createServer(async (request, response) => {
    const key = new URL(request.url, 'http://127.0.0.1').pathname;
    if (!key.startsWith('/f01-synthetic/marine-assets/')) { response.statusCode = 400; response.end(); return; }
    if (request.method === 'PUT') { const parts = []; for await (const part of request) parts.push(part); objects.set(key, Buffer.concat(parts)); }
    else if (request.method === 'DELETE') objects.delete(key);
    else if (!objects.has(key)) response.statusCode = 404;
    response.end(request.method === 'GET' && response.statusCode === 200 ? objects.get(key) : undefined);
  });
  await new Promise((yes, no) => storage.once('error', no).listen(0, '127.0.0.1', yes));
  const origin = 'http://127.0.0.1:' + storage.address().port; allowedOrigins.add(origin);
  for (const [key, value] of Object.entries({ HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS: 'SANDBOX', HYDROLAND_OBJECT_STORAGE_ENDPOINT: origin,
    HYDROLAND_OBJECT_STORAGE_REGION: 'us-east-1', HYDROLAND_OBJECT_STORAGE_BUCKET: 'f01-synthetic',
    HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID: 'SYNTHETIC_F01_ID', HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'SYNTHETIC_F01_SECRET' })) env(key, value);
  global.fetch = (value, options) => { const url = new URL(typeof value === 'string' || value instanceof URL ? value : value.url);
    if (!allowedOrigins.has(url.origin) || url.username || url.password) { externalFetchAttempts.push(url.origin); throw new Error('F01 refuses external HTTP destinations.'); }
    return originalFetch(value, { ...options, redirect: 'error', signal: options?.signal ?? AbortSignal.timeout(10000) }); };
  await startApp();
  [owner, outsider, admin, boatOwner, viewer, operations] = await Promise.all([actor('center', 'DIVE_CENTER'), actor('other-center', 'DIVE_CENTER'), actor('admin', 'ADMIN'), actor('boat-owner', 'BOAT_OWNER'), actor('viewer', 'DIVER'), actor('operations')]);
  fixture = await marineReviewFixture(db, base, owner.id, admin.id);
  center = fixture.center;
  outsiderCenter = await db.organization.create({ data: { ownerId: outsider.id, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: 'Synthetic foreign F01 center' } });
  boatOrg = await db.organization.create({ data: { ownerId: boatOwner.id, kind: 'MARINE_OPERATOR', status: 'ACTIVE', displayName: 'Synthetic F01 marine owner' } });
  for (const [who, org, role] of [[owner, center, 'OWNER'], [outsider, outsiderCenter, 'OWNER'], [boatOwner, boatOrg, 'OWNER'], [viewer, boatOrg, 'VIEWER']]) {
    await db.organizationMember.create({ data: { accountId: who.id, organizationId: org.id, role, status: 'ACTIVE' } });
  }
  await fixture.prepareReviewer(operations);
  expected(await call(admin, '/marine-operations/admin/recommendation-delegates', 'POST', { email: operations.email, enabled: true }), 201);

  await check('native HTTP creates scoped equipment and a marine source; no passport grants an approval', async () => {
    equipment = await createEquipment(owner, 'Synthetic F01 equipment'); equipment2 = await createEquipment(owner, 'Synthetic F01 second equipment');
    vessel = expected(await call(boatOwner, '/marine-operations/assets', 'POST', { organizationId: boatOrg.id, name: 'Synthetic F01 vessel', assetType: 'DIVE_BOAT', registrationNumber: 'F01-' + randomUUID(), hullNumber: 'F01-HULL-' + randomUUID(), passengerCapacity: 8 }), 201);
    sourceState = await read(owner, 'EQUIPMENT', equipment.resourceId);
    assert.equal(sourceState.passport, null); assert.equal(sourceState.source.evidence.evidenceComplete, false); assert.equal(sourceState.source.operationalClearance, false);
    assert.equal((await read(boatOwner, 'MARINE', vessel.id)).source.evidence.nativeReadiness.status, 'NOT_READY');
  });
  await check('anonymous, foreign center and forged source inputs are rejected without creating receipts', async () => {
    expected(await call(null, sourcePath('EQUIPMENT', equipment.resourceId)), 401);
    expected(await call(outsider, sourcePath('EQUIPMENT', equipment.resourceId)), 404);
    expected(await command(outsider, 'EQUIPMENT', equipment.resourceId, 'issue', input(sourceState)), 404);
    expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'issue', { ...input(sourceState), organizationId: outsiderCenter.id }), 400);
    expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'issue', { ...input(sourceState), expectedVersion: '0' }), 400);
    expected(await call(owner, sourcePath('UNKNOWN', equipment.resourceId)), 400);
    assert.equal((await db.$queryRaw`SELECT count(*)::int AS n FROM "AssetPassportCommand"`)[0].n, 0);
  });
  let initialIssue, firstRevision;
  await check('concurrent identical issue creates one immutable revision and attributable audit; incomplete evidence stays explicit', async () => {
    initialIssue = input(sourceState);
    const results = await Promise.all([command(owner, 'EQUIPMENT', equipment.resourceId, 'issue', initialIssue), command(owner, 'EQUIPMENT', equipment.resourceId, 'issue', initialIssue)]);
    assert(results.every(result => result.status === 201), JSON.stringify(results));
    assert.equal(results.filter(result => result.data.replayed).length, 1);
    sourceState = results[0].data; firstRevision = sourceState.revisions[0];
    assert.equal(sourceState.revisions.length, 1); assert.equal(firstRevision.status, 'CURRENT');
    const checked = expected(await verify(owner, firstRevision), 200); assert.equal(checked.status, 'CURRENT'); assert.equal(checked.currentEvidence.evidenceComplete, false); assert.equal(checked.operationalClearance, false);
    const events = await db.auditEvent.findMany({ where: { action: 'ASSET_PASSPORT_ISSUE', resourceId: sourceState.passport.id } });
    assert.equal(events.length, 1); assert.equal(events[0].actorId, owner.personId); assert.equal(events[0].metadata.operationalClearance, false);
    expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'issue', { ...initialIssue, sourceDigest: '0'.repeat(64) }), 409);
    assert.equal((await db.$queryRaw`SELECT count(*)::int AS n FROM "EquipmentInspection" WHERE "resourceId"=${equipment.resourceId}`)[0].n, 0);
  });
  await check('QR is an authenticated scope-checked opaque reference with a minimal private-no-store projection', async () => {
    assert.match(firstRevision.qrValue, /^hydroland:passport:[0-9a-f]{64}$/);
    expected(await verify(null, firstRevision), 401); expected(await verify(outsider, firstRevision), 404);
    expected(await call(owner, '/asset-passports/verify/' + 'a'.repeat(64)), 404);
    const result = await verify(owner, firstRevision); expected(result, 200); assert.equal(result.cache, 'private, no-store');
    assert.deepEqual(Object.keys(result.data).sort(), ['currentEvidence', 'displayName', 'evaluatedAt', 'issuedAt', 'operationalClearance', 'sourceKind', 'sourceMatches', 'sourceState', 'status', 'version']);
    const json = JSON.stringify(result.data); for (const secret of [equipment.serialNumber, equipment.location, owner.id, owner.personId, center.id, equipment.resourceId]) assert(!json.includes(secret));
  });
  await check('source mutation invalidates preview and QR; expired native inspections remain incomplete without blocking factual history', async () => {
    const preview = await read(owner, 'EQUIPMENT', equipment2.resourceId);
    await db.calendarResource.update({ where: { id: equipment2.resourceId }, data: { name: 'Changed source before issue' } });
    expected(await command(owner, 'EQUIPMENT', equipment2.resourceId, 'issue', input(preview)), 409);
    latestInspection = await inspection(equipment.resourceId, true);
    const result = expected(await verify(owner, firstRevision), 200); assert.equal(result.status, 'STALE'); assert.equal(result.currentEvidence.serviceExpired, true); assert.equal(result.currentEvidence.evidenceComplete, false);
    sourceState = await read(owner, 'EQUIPMENT', equipment.resourceId);
    sourceState = expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'update', input(sourceState)), 201);
    assert.equal(sourceState.revisions[0].status, 'CURRENT'); assert.equal(sourceState.source.evidence.evidenceComplete, false);
    assert.equal(sourceState.revisions[1].status, 'SUPERSEDED');
  });
  let reviewedRevision;
  await check('original native inspection review updates the evidence; competing version updates have one winner', async () => {
    latestInspection = await inspection(equipment.resourceId);
    const current = await read(owner, 'EQUIPMENT', equipment.resourceId); assert.equal(current.source.evidence.evidenceComplete, true);
    const results = await Promise.all([command(owner, 'EQUIPMENT', equipment.resourceId, 'update', input(current)), command(owner, 'EQUIPMENT', equipment.resourceId, 'update', input(current))]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    sourceState = results.find(result => result.status === 201).data; reviewedRevision = sourceState.revisions[0];
    assert.equal(sourceState.passport.currentVersion, 3); assert.equal(reviewedRevision.status, 'CURRENT');
    const old = expected(await verify(owner, firstRevision), 200); assert.equal(old.status, 'SUPERSEDED');
    const replay = expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'issue', initialIssue), 201);
    assert.equal(replay.receipt.revisionId, firstRevision.id); assert.equal(replay.passport.currentVersion, 3); assert.equal(replay.replayed, true);
    expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'update', input(sourceState)), 409, 'unchanged source');
  });
  await check('native source expiry and retirement are visible at verification without mutating issued history', async () => {
    const stored = await db.$queryRaw`SELECT "sourceSnapshot" FROM "AssetPassportRevision" WHERE "id"=${reviewedRevision.id}`;
    // Synthetic clock-boundary simulation on a disposable record; no approval is fabricated.
    await db.$executeRaw`UPDATE "EquipmentInspection" SET "serviceExpiresAt"=(${new Date(Date.now() - 1000).toISOString()}::timestamptz AT TIME ZONE 'UTC') WHERE "id"=${latestInspection.id}`;
    const expired = expected(await verify(owner, reviewedRevision), 200); assert.equal(expired.status, 'STALE'); assert.equal(expired.currentEvidence.evidenceComplete, false); assert.equal(expired.currentEvidence.serviceExpired, true);
    await db.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"='RETIRED', "updatedAt"=NOW() WHERE "resourceId"=${equipment.resourceId}`;
    assert.equal((await read(owner, 'EQUIPMENT', equipment.resourceId)).source.stockStatus, 'RETIRED');
    assert.equal(expected(await verify(owner, reviewedRevision), 200).sourceState.stockStatus, 'RETIRED');
    assert.deepEqual(await db.$queryRaw`SELECT "sourceSnapshot" FROM "AssetPassportRevision" WHERE "id"=${reviewedRevision.id}`, stored);
  });
  await check('account, role, membership and current asset ownership are rechecked on every QR and command', async () => {
    const membership = await db.organizationMember.findFirstOrThrow({ where: { accountId: owner.id, organizationId: center.id } });
    await db.organizationMember.update({ where: { id: membership.id }, data: { status: 'SUSPENDED' } }); expected(await verify(owner, firstRevision), 404);
    await db.organizationMember.update({ where: { id: membership.id }, data: { status: 'ACTIVE' } });
    const role = await db.roleAssignment.findFirstOrThrow({ where: { accountId: owner.id, role: 'DIVE_CENTER' } });
    await db.roleAssignment.update({ where: { id: role.id }, data: { status: 'SUSPENDED' } }); expected(await verify(owner, firstRevision), 404);
    await db.roleAssignment.update({ where: { id: role.id }, data: { status: 'ACTIVE' } });
    await db.account.update({ where: { id: owner.id }, data: { status: 'SUSPENDED' } }); expected(await verify(owner, firstRevision), 401);
    await db.account.update({ where: { id: owner.id }, data: { status: 'ACTIVE' } });
    await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${outsiderCenter.id} WHERE "resourceId"=${equipment.resourceId}`;
    expected(await verify(owner, reviewedRevision), 404); assert.equal(expected(await verify(outsider, reviewedRevision), 200).status, 'STALE');
    await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${center.id} WHERE "resourceId"=${equipment.resourceId}`;
  });
  await check('membership revocation during issue and equipment transfer during revoke cannot commit a former manager command', async () => {
    const membership = await db.organizationMember.findFirstOrThrow({ where: { accountId: owner.id, organizationId: center.id } });
    const issue = input(await read(owner, 'EQUIPMENT', equipment2.resourceId));
    try {
      await commandWhileSourceChanges(owner, 'EQUIPMENT', equipment2.resourceId, 'issue', issue,
        () => db.organizationMember.update({ where: { id: membership.id }, data: { status: 'SUSPENDED' } }));
    } finally { await db.organizationMember.update({ where: { id: membership.id }, data: { status: 'ACTIVE' } }); }
    const revoke = { requestId: randomUUID(), expectedVersion: 3, reason: 'Synthetic ownership-transfer race' };
    try {
      await commandWhileSourceChanges(owner, 'EQUIPMENT', equipment.resourceId, 'revoke', revoke,
        () => db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${outsiderCenter.id} WHERE "resourceId"=${equipment.resourceId}`);
    } finally { await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=${center.id} WHERE "resourceId"=${equipment.resourceId}`; }
    assert.equal((await read(owner, 'EQUIPMENT', equipment.resourceId)).passport.status, 'ACTIVE');
    assert.equal((await read(owner, 'EQUIPMENT', equipment2.resourceId)).passport, null);
  });
  await check('audit failure rolls back issue, update and revoke together with command receipt and revision', async () => {
    const audit = app.get(load('audit/audit.service.js').AuditService), original = audit.record.bind(audit); let attempts = 0;
    audit.record = async (value, tx) => { if (value.action.startsWith('ASSET_PASSPORT_')) { attempts++; throw new Error('SYNTHETIC_F01_AUDIT_FAILURE'); } return original(value, tx); };
    const counts = async () => (await db.$queryRaw`SELECT (SELECT count(*)::int FROM "AssetPassport") AS passports, (SELECT count(*)::int FROM "AssetPassportRevision") AS revisions, (SELECT count(*)::int FROM "AssetPassportCommand") AS commands`)[0];
    const before = await counts();
    try {
      expected(await command(owner, 'EQUIPMENT', equipment2.resourceId, 'issue', input(await read(owner, 'EQUIPMENT', equipment2.resourceId))), 500);
      expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'update', input(await read(owner, 'EQUIPMENT', equipment.resourceId))), 500);
      expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'revoke', { requestId: randomUUID(), expectedVersion: 3, reason: 'Synthetic revoke' }), 500);
      assert.equal(attempts, 3); assert.deepEqual(await counts(), before); assert.equal((await read(owner, 'EQUIPMENT', equipment.resourceId)).passport.status, 'ACTIVE');
    } finally { audit.record = original; }
  });
  let revokedState;
  await check('explicit revocation is atomic, idempotent, terminal and applies to every historical QR', async () => {
    expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'revoke', { requestId: randomUUID(), expectedVersion: 3, reason: ' ' }), 400);
    expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'revoke', { requestId: randomUUID(), expectedVersion: 1, reason: 'stale' }), 409);
    const payload = { requestId: randomUUID(), expectedVersion: 3, reason: 'PRIVATE_REVOCATION_REASON' };
    revokedState = expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'revoke', payload), 201);
    const replay = expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'revoke', payload), 201); assert.equal(replay.replayed, true);
    assert.equal(await db.auditEvent.count({ where: { action: 'ASSET_PASSPORT_REVOKE', resourceId: revokedState.passport.id } }), 1);
    for (const revision of revokedState.revisions) { const result = expected(await verify(owner, revision), 200); assert.equal(result.status, 'REVOKED'); assert(!JSON.stringify(result).includes(payload.reason)); }
    expected(await command(owner, 'EQUIPMENT', equipment.resourceId, 'update', input(await read(owner, 'EQUIPMENT', equipment.resourceId))), 409);
  });
  await check('database rejects modifying or deleting issued versions and command receipts', async () => {
    const rejected = error => error.code === 'P2010' && error.meta?.code === '55000';
    await assert.rejects(db.$executeRaw`UPDATE "AssetPassportRevision" SET "sourceSnapshot"='{}'::jsonb WHERE "id"=${firstRevision.id}`, rejected);
    await assert.rejects(db.$executeRaw`DELETE FROM "AssetPassportRevision" WHERE "id"=${firstRevision.id}`, rejected);
    await assert.rejects(db.$executeRaw`UPDATE "AssetPassportCommand" SET "reason"='rewritten' WHERE "requestId"=${initialIssue.requestId}`, rejected);
    await assert.rejects(db.$executeRaw`DELETE FROM "AssetPassportCommand" WHERE "requestId"=${initialIssue.requestId}`, rejected);
  });
  let marineInitial, marineIssued;
  await check('marine factual passport keeps incomplete documents explicit and permits only scoped managers to issue', async () => {
    const preview = await read(boatOwner, 'MARINE', vessel.id);
    const viewerPreview = await read(viewer, 'MARINE', vessel.id); assert.equal(viewerPreview.canManage, false);
    expected(await command(viewer, 'MARINE', vessel.id, 'issue', input(viewerPreview)), 403);
    marineInitial = expected(await command(boatOwner, 'MARINE', vessel.id, 'issue', input(preview)), 201);
    const result = expected(await verify(viewer, marineInitial.revisions[0]), 200); assert.equal(result.status, 'CURRENT'); assert.equal(result.currentEvidence.evidenceComplete, false); assert.equal(result.currentEvidence.nativeReadiness.status, 'NOT_READY');
    expected(await verify(owner, marineInitial.revisions[0]), 404, 'review center affiliation does not grant passport ownership');
  });
  await check('marine ownership transfer committed during revocation preserves the active passport and rejects its former manager', async () => {
    const revoke = { requestId: randomUUID(), expectedVersion: 1, reason: 'Synthetic marine ownership-transfer race' };
    try {
      await commandWhileSourceChanges(boatOwner, 'MARINE', vessel.id, 'revoke', revoke,
        () => db.marineAsset.update({ where: { id: vessel.id }, data: { organizationId: outsiderCenter.id } }));
    } finally { await db.marineAsset.update({ where: { id: vessel.id }, data: { organizationId: boatOrg.id } }); }
    assert.equal((await read(boatOwner, 'MARINE', vessel.id)).passport.status, 'ACTIVE');
  });
  await check('all marine evidence is reviewed through original independent center, operations and platform HTTP transitions', async () => {
    await fixture.bind(tokens.get(boatOwner.id), vessel.id);
    const types = ['REGISTRATION', 'NAVIGATION_LICENSE', 'OPERATING_LICENSE', 'SAFETY_CERTIFICATE', 'PERIODIC_INSPECTION', 'COMMUNICATIONS_LICENSE'];
    for (const documentType of types) {
      const doc = expected(await call(boatOwner, '/marine-operations/assets/' + vessel.id + '/documents', 'POST', {
        documentType, expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(), referenceNumber: 'SYNTHETIC_F01', ...fixture.file(),
      }), 201);
      assert.equal(doc.status, 'PENDING');
      await fixture.decide(tokens.get(owner.id), 'center', await fixture.pending(tokens.get(owner.id), 'center', doc.id), 'FORWARD');
      await fixture.decide(tokens.get(operations.id), 'operations', await fixture.pending(tokens.get(operations.id), 'operations', doc.id), 'RECOMMEND', 'Synthetic independent review of test attachment');
      const final = await fixture.decide(tokens.get(admin.id), 'admin', await fixture.pending(tokens.get(admin.id), 'admin', doc.id), 'VERIFIED');
      assert.equal(final.status, 'VERIFIED'); reviewDocument = final;
    }
    expected(await call(admin, '/marine-operations/admin/assets/' + vessel.id + '/status', 'POST', { status: 'ACTIVE' }), 201);
    const calendar = await db.calendarResource.create({ data: { type: 'BOAT', name: 'Synthetic F01 calendar vessel', active: true } });
    await app.get(load('marine-operations/marine-operations.service.js').MarineOperationsService).linkCalendarResource(vessel.id, calendar.id);
    const current = await read(boatOwner, 'MARINE', vessel.id); assert.equal(current.source.evidence.evidenceComplete, true); assert.equal(current.source.evidence.nativeReadiness.status, 'READY');
    marineIssued = expected(await command(boatOwner, 'MARINE', vessel.id, 'update', input(current)), 201);
    assert.equal(marineIssued.revisions[0].status, 'CURRENT'); assert.equal(marineIssued.source.operationalClearance, false);
    assert.equal(expected(await verify(boatOwner, marineInitial.revisions[0]), 200).status, 'SUPERSEDED');
  });
  await check('marine verification is read-only and exposes expiry and source suspension without leaking file or actor data', async () => {
    const counts = async () => ({ audit: await db.auditEvent.count(), readiness: await db.marineReadinessSnapshot.count(), documents: await db.marineAssetDocument.count() });
    const before = await counts(); const result = expected(await verify(viewer, marineIssued.revisions[0]), 200); assert.deepEqual(await counts(), before);
    assert.equal(result.currentEvidence.evidenceComplete, true);
    const json = JSON.stringify(result); for (const privateValue of [vessel.registrationNumber, vessel.hullNumber, reviewDocument.id, reviewDocument.storageKey, admin.id, operations.id, owner.id, boatOrg.id].filter(Boolean)) assert(!json.includes(privateValue));
    await db.marineAssetDocument.update({ where: { id: reviewDocument.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = expected(await verify(viewer, marineIssued.revisions[0]), 200); assert.equal(expired.status, 'STALE'); assert.equal(expired.currentEvidence.evidenceComplete, false); assert.equal(expired.currentEvidence.nativeReadiness.status, 'NOT_READY');
    expected(await call(admin, '/marine-operations/admin/assets/' + vessel.id + '/status', 'POST', { status: 'SUSPENDED' }), 201);
    assert.equal((await read(boatOwner, 'MARINE', vessel.id)).source.assetStatus, 'SUSPENDED');
    await db.organizationMember.updateMany({ where: { accountId: viewer.id, organizationId: boatOrg.id }, data: { status: 'SUSPENDED' } }); expected(await verify(viewer, marineIssued.revisions[0]), 404);
  });
  await check('equipment source resolver supports legacy UUID ownership without rewriting the passport identity', async () => {
    await db.$executeRaw`ALTER TABLE "EquipmentBarcode" DROP CONSTRAINT "EquipmentBarcode_organizationId_fkey"`;
    await db.$executeRaw`ALTER TABLE "EquipmentBarcode" ALTER COLUMN "organizationId" TYPE UUID USING "organizationId"::uuid`;
    try { assert.equal(expected(await verify(owner, firstRevision), 200).status, 'REVOKED'); expected(await verify(outsider, firstRevision), 404); }
    finally {
      await db.$executeRaw`ALTER TABLE "EquipmentBarcode" ALTER COLUMN "organizationId" TYPE TEXT USING "organizationId"::text`;
      await db.$executeRaw`ALTER TABLE "EquipmentBarcode" ADD CONSTRAINT "EquipmentBarcode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`;
    }
  });
  await check('ordinary API restart preserves immutable versions, original QR revocation and current source checks', async () => {
    await app.close(); app = undefined; await startApp();
    assert.equal(expected(await verify(owner, firstRevision), 200).status, 'REVOKED');
    assert.equal(expected(await verify(boatOwner, marineIssued.revisions[0]), 200).status, 'STALE');
    assert.equal((await read(owner, 'EQUIPMENT', equipment.resourceId)).revisions.length, 3);
    assert.equal(externalFetchAttempts.length, 0); assert.equal(await db.diveLog.count(), 0);
  });
} catch (error) { failure = error; }
finally {
  if (app) await app.close().catch(error => { failure ||= error; });
  if (storage?.listening) await new Promise(resolveClosed => { storage.close(resolveClosed); storage.closeAllConnections?.(); });
  await adminDb.$disconnect(); global.fetch = originalFetch;
  for (const [key, value] of originalEnvironment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  const sourceFiles = ['apps/api/src/asset-passports/asset-passport.domain.ts', 'apps/api/src/asset-passports/asset-passports.service.ts', 'apps/api/src/asset-passports/asset-passports.controller.ts', 'apps/api/src/asset-passports/asset-passports.module.ts', 'apps/api/src/marine-operations/marine-operations.domain.ts', 'apps/api/src/marine-operations/marine-operations.service.ts', 'apps/api/prisma/migrations/20261128020000_asset_passport_lifecycle/migration.sql', 'apps/api/scripts/f01-asset-passports-http-e2e.mjs'];
  const compiledFiles = ['asset-passports/asset-passport.domain.js', 'asset-passports/asset-passports.service.js', 'asset-passports/asset-passports.controller.js', 'asset-passports/asset-passports.module.js', 'marine-operations/marine-operations.domain.js', 'marine-operations/marine-operations.service.js'];
  const hashes = files => Object.fromEntries(files.map(file => [file, createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex')]));
  const receipt = { schemaVersion: 1, suite: 'F01_NATIVE_ASSET_PASSPORT_HTTP_POSTGRESQL', synthetic: true, realOperationalAcceptance: false,
    status: failure ? 'FAIL' : 'PASS', startedAt, finishedAt: new Date().toISOString(), postgresVersion, nodeVersion: process.version,
    passed: checks.filter(item => item.status === 'PASS').length, failed: checks.filter(item => item.status === 'FAIL').length, checks,
    externalFetchAttempts: externalFetchAttempts.length, syntheticMarineAttachments: objects.size, concurrentNativeChanges,
    sourceHashes: hashes(sourceFiles), compiledHashes: hashes(compiledFiles.map(file => 'apps/api/dist/' + file)) };
  if (process.env.F01_RESULT_FILE) { const output = resolve(process.env.F01_RESULT_FILE); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n'); }
  console.log('F01_RESULT ' + JSON.stringify(receipt));
}
if (failure) throw failure;
