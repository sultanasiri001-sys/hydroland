import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marineReviewFixture } from './marine-review-fixture.mjs';

// The boat owner's identity, verification, role request, memberships, vessel,
// files and review transitions must come through the real HTTP routes. Only the
// independent existing reviewers are fixture identities. All writes are confined
// to a newly created schema in an explicitly named, disposable loopback database.
assert.equal(process.env.CI, 'true', 'A14 onboarding requires explicit CI context');
assert.equal(process.env.NODE_ENV, 'test', 'A14 onboarding requires NODE_ENV=test');
assert.equal(process.env.A14_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const database = new URL(process.env.DATABASE_URL || 'invalid:');
assert.ok(['postgres:', 'postgresql:'].includes(database.protocol));
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'A14 refuses non-loopback databases');
assert.match(database.pathname, /^\/a14_owner_onboarding_test(?:_[a-z0-9_]+)?$/);
assert.ok(!database.hash && [...database.searchParams].every(([key, value]) => key === 'schema' && value === 'public'), 'A14 refuses database connection overrides');
for (const key of ['A14_E2E_BASE_URL', 'MARINE_DOCS_E2E_BASE_URL']) {
  assert.ok(!process.env[key], 'A14 starts its own loopback API; an existing API URL is not accepted');
}

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const load = file => require(resolve(root, 'apps/api/dist', file));
const schema = 'a14_owner_' + randomUUID().replaceAll('-', '');
const scopedDatabase = new URL(database);
scopedDatabase.searchParams.set('schema', schema);
const startedAt = new Date().toISOString(), checks = [], externalAttempts = [];
const savedEnvironment = new Map(), allowedOrigins = new Set(), nativeFetch = global.fetch;
const capturedMail = [], gatewayErrors = [], objects = new Map();
const ownerEmail = 'a14-new-owner-' + randomUUID() + '@example.invalid';
const password = 'A14-Synthetic-' + randomBytes(18).toString('hex') + '!';
let adminDb, app, db, gateway, objectStore, base, schemaCreated = false;
let owner, centerOwner, administrator, operations, outsider, fixture, invitation, marineOrg, asset, document;
let verificationRow, verificationToken, receipt, failure, postgresVersion;

function setEnvironment(key, value) {
  if (!savedEnvironment.has(key)) savedEnvironment.set(key, process.env[key]);
  if (value === undefined) delete process.env[key]; else process.env[key] = value;
}
async function test(name, work) {
  const began = Date.now();
  try { await work(); checks.push({ name, status: 'PASS', durationMs: Date.now() - began }); console.log('A14 PASS ' + name); }
  catch (error) { checks.push({ name, status: 'FAIL', durationMs: Date.now() - began }); throw error; }
}
async function listen(server) {
  await new Promise((resolveReady, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveReady));
  const origin = 'http://127.0.0.1:' + server.address().port;
  allowedOrigins.add(origin);
  return origin;
}
async function bytes(request, limit = 1024 * 1024) {
  const parts = []; let length = 0;
  for await (const part of request) { length += part.length; assert.ok(length <= limit, 'Fixture payload exceeded its bound'); parts.push(part); }
  return Buffer.concat(parts);
}
function expectStatus(result, expected, label) {
  assert.equal(result.status, expected, label + ': unexpected HTTP status');
  return result.data;
}
async function call(actor, path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method, headers: { 'content-type': 'application/json', ...(actor ? { authorization: 'Bearer ' + actor.token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text(); let data;
  try { data = JSON.parse(raw); } catch { data = null; }
  return { status: response.status, data };
}
async function fixtureActor(label, role) {
  const salt = randomBytes(16).toString('hex');
  const account = await db.account.create({ data: {
    email: 'a14-' + label + '-' + randomUUID() + '@example.invalid',
    passwordHash: salt + ':' + scryptSync(password, salt, 64).toString('hex'),
    status: 'ACTIVE', emailVerifiedAt: new Date(), person: { create: { firstName: 'Synthetic A14 reviewer', lastName: label } },
  } });
  if (role) await db.roleAssignment.create({ data: { accountId: account.id, role, status: 'ACTIVE' } });
  const tokens = expectStatus(await call(null, '/auth/login', 'POST', { email: account.email, password }), 200, 'Fixture reviewer login');
  return { ...account, token: tokens.accessToken };
}
const vesselInput = organizationId => ({ organizationId, name: 'Synthetic A14 onboarding vessel', assetType: 'DIVE_BOAT', registrationNumber: 'A14-SYNTHETIC-' + randomUUID(), hullNumber: 'A14-HULL-' + randomUUID(), passengerCapacity: 8 });
const documentPath = () => '/marine-operations/assets/' + asset.id + '/documents/' + document.id;
const pending = async (actor, stage) => expectStatus(await call(actor, '/marine-operations/' + stage + '/documents/pending'), 200, stage + ' pending queue').find(row => row.id === document.id);
const decide = (actor, stage, row, outcome, note) => call(actor, '/marine-operations/' + stage + '/documents/' + document.id + '/decision', 'POST', { expectedRevision: row.reviewRevision, outcome, ...(note ? { note } : {}) });

try {
  const { PrismaClient } = require('@prisma/client');
  adminDb = new PrismaClient({ datasourceUrl: database.href });
  postgresVersion = (await adminDb.$queryRaw`SELECT current_setting('server_version') AS version`)[0].version;
  await adminDb.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
  schemaCreated = true;
  setEnvironment('DATABASE_URL', scopedDatabase.href);
  setEnvironment('JWT_SECRET', 'SYNTHETIC_A14_LOCAL_JWT_SECRET_' + randomBytes(24).toString('hex'));
  setEnvironment('HYDROLAND_AI_TEST_MANUAL_WORKER', '1');
  setEnvironment('HYDROLAND_EMAIL_TEST_RECIPIENT', undefined);
  for (const key of ['AI_MODEL', 'WEATHER_MARINE', 'SMS', 'WHATSAPP', 'PAYMENT_PSP', 'BANKING_SETTLEMENT', 'TRANSLATION_ENGINE', 'MAPS_GEO', 'ESIGN', 'CERTIFICATION', 'DISTRESS_AIS', 'NAFATH', 'REGULATORY']) {
    setEnvironment('HYDROLAND_INTEGRATION_' + key + '_STATUS', 'DISABLED');
  }
  global.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.protocol !== 'http:' || url.username || url.password || !allowedOrigins.has(url.origin)) {
      externalAttempts.push(url.origin); throw new Error('A14 fixture refuses any HTTP destination outside its three loopback servers');
    }
    return nativeFetch(input, { ...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(10_000) });
  };
  gateway = createServer(async (request, response) => {
    try {
      assert.equal(request.method, 'POST'); assert.equal(request.url, '/emails');
      assert.equal(request.headers.authorization, 'Bearer SYNTHETIC_A14_MAIL_KEY');
      const payload = JSON.parse((await bytes(request)).toString('utf8'));
      assert.deepEqual(payload.to, [ownerEmail], 'Only the newly registered synthetic owner may receive auth mail');
      assert.match(String(request.headers['idempotency-key']), /^hydroland-auth\/[a-zA-Z0-9-]+$/);
      capturedMail.push({ key: request.headers['idempotency-key'], payload });
      response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ id: 'synthetic-a14-message-' + capturedMail.length }));
    } catch (error) { gatewayErrors.push(error.message); response.statusCode = 500; response.end('{}'); }
  });
  const mailOrigin = await listen(gateway);
  objectStore = createServer(async (request, response) => {
    try {
      const key = new URL(request.url, 'http://127.0.0.1').pathname;
      assert.ok(key.startsWith('/a14-synthetic/marine-assets/'), 'Only synthetic marine document storage is allowed');
      if (request.method === 'PUT') objects.set(key, await bytes(request));
      else if (request.method === 'DELETE') objects.delete(key);
      else if (request.method === 'HEAD' || request.method === 'GET') {
        if (!objects.has(key)) response.statusCode = 404;
      } else { response.statusCode = 405; }
      response.end(request.method === 'GET' && response.statusCode === 200 ? objects.get(key) : undefined);
    } catch (error) { gatewayErrors.push(error.message); response.statusCode = 500; response.end(); }
  });
  const storageOrigin = await listen(objectStore);
  for (const [key, value] of Object.entries({
    HYDROLAND_INTEGRATION_EMAIL_STATUS: 'SANDBOX', HYDROLAND_EMAIL_PROVIDER: 'RESEND',
    RESEND_API_KEY: 'SYNTHETIC_A14_MAIL_KEY', RESEND_API_BASE_URL: mailOrigin,
    HYDROLAND_EMAIL_FROM: 'HYDROLAND <a14@example.invalid>', HYDROLAND_PUBLIC_WEB_ORIGIN: mailOrigin,
    HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS: 'SANDBOX', HYDROLAND_OBJECT_STORAGE_ENDPOINT: storageOrigin,
    HYDROLAND_OBJECT_STORAGE_REGION: 'us-east-1', HYDROLAND_OBJECT_STORAGE_BUCKET: 'a14-synthetic',
    HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID: 'SYNTHETIC_A14_OBJECT_ID', HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'SYNTHETIC_A14_OBJECT_SECRET',
  })) setEnvironment(key, value);
  await test('the additive hull migration preserves legacy registrations and enforces uniqueness in PostgreSQL', async () => {
    const migrationDb = new PrismaClient({ datasourceUrl: scopedDatabase.href });
    try {
      await migrationDb.$executeRawUnsafe('CREATE TABLE "MarineAsset" ("id" TEXT PRIMARY KEY, "registrationNumber" TEXT)');
      await migrationDb.$executeRaw`INSERT INTO "MarineAsset" ("id","registrationNumber") VALUES ('legacy-one','LEGACY-1'),('legacy-two','LEGACY-2')`;
      execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--file',
        resolve(root, 'apps/api/prisma/migrations/20261128020000_marine_asset_hull_number/migration.sql'),
        '--schema', resolve(root, 'apps/api/prisma/schema.prisma')], { cwd: root, env: { ...process.env }, stdio: 'pipe', timeout: 30_000 });
      const legacy = await migrationDb.$queryRaw`SELECT "id", "registrationNumber", "hullNumber" FROM "MarineAsset" ORDER BY "id"`;
      assert.deepEqual(legacy, [
        { id: 'legacy-one', registrationNumber: 'LEGACY-1', hullNumber: null },
        { id: 'legacy-two', registrationNumber: 'LEGACY-2', hullNumber: null },
      ]);
      await migrationDb.$executeRaw`INSERT INTO "MarineAsset" ("id","hullNumber") VALUES ('hull-one','A14-UNIQUE')`;
      await assert.rejects(migrationDb.$executeRaw`INSERT INTO "MarineAsset" ("id","hullNumber") VALUES ('hull-two','A14-UNIQUE')`, error => error.code === 'P2010' && error.meta?.code === '23505');
      await migrationDb.$executeRawUnsafe('DROP TABLE "MarineAsset"');
    } finally { await migrationDb.$disconnect(); }
  });
  execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate', '--schema', resolve(root, 'apps/api/prisma/schema.prisma')], {
    cwd: root, env: { ...process.env }, stdio: 'pipe', timeout: 120_000,
  });
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  app = await NestFactory.create(load('app.module.js').AppModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api/v1'); app.useBodyParser('json', { limit: '15mb' });
  await app.listen(0, '127.0.0.1');
  const apiOrigin = await app.getUrl(); allowedOrigins.add(apiOrigin); base = apiOrigin + '/api/v1';
  db = app.get(load('database/database.service.js').DatabaseService);
  assert.equal(await db.account.count(), 0, 'The new test schema must have no existing accounts');
  [centerOwner, administrator, operations, outsider] = await Promise.all([
    fixtureActor('center', 'DIVE_CENTER'), fixtureActor('platform', 'ADMIN'), fixtureActor('operations'), fixtureActor('outsider'),
  ]);
  fixture = await marineReviewFixture(db, base, centerOwner.id, administrator.id);
  await db.organizationMember.create({ data: { organizationId: fixture.center.id, accountId: centerOwner.id, role: 'OWNER', status: 'ACTIVE' } });
  await fixture.prepareReviewer(operations);
  expectStatus(await call(administrator, '/marine-operations/admin/recommendation-delegates', 'POST', { email: operations.email, enabled: true }), 201, 'Independent operations delegate');

  await test('HTTP registration creates only a pending owner and a token-free auth outbox row', async () => {
    const result = expectStatus(await call(null, '/auth/register', 'POST', { email: ownerEmail, password }), 201, 'Owner registration');
    assert.equal(result.status, 'PENDING_VERIFICATION'); assert.equal(result.requiresEmailVerification, true);
    assert.ok(!result.accessToken && !result.refreshToken);
    owner = await db.account.findUniqueOrThrow({ where: { email: ownerEmail } });
    assert.equal(owner.status, 'PENDING_VERIFICATION'); assert.equal(owner.emailVerifiedAt, null);
    assert.equal(await db.session.count({ where: { accountId: owner.id } }), 0);
    verificationRow = await db.notification.findFirstOrThrow({ where: { accountId: owner.id, type: 'AUTH_EMAIL_VERIFICATION', status: 'PENDING' } });
    assert.ok(!Object.hasOwn(verificationRow.payload, 'token'));
    expectStatus(await call(null, '/auth/login', 'POST', { email: ownerEmail, password }), 401, 'Unverified login');
    expectStatus(await call(null, '/marine-operations/assets/mine'), 401, 'Anonymous marine access');
    expectStatus(await call(centerOwner, '/center/me/team/invitations', 'POST', { email: ownerEmail, role: 'OPERATOR' }), 409, 'Pending account cannot be invited');
  });

  await test('the original auth worker delivers one local verification link and HTTP consumes it once', async () => {
    const worker = app.get(load('auth/auth-email-outbox.worker.js').AuthEmailOutboxWorker);
    const deadline = Date.now() + 20_000;
    while (!capturedMail.length && Date.now() < deadline) { await worker.run(); if (!capturedMail.length) await new Promise(resolveWait => setTimeout(resolveWait, 25)); }
    assert.deepEqual(gatewayErrors, []); assert.equal(capturedMail.length, 1);
    assert.equal(capturedMail[0].key, 'hydroland-auth/' + verificationRow.id);
    const link = new URL(capturedMail[0].payload.text.split('\n').find(line => line.startsWith('http://')));
    assert.equal(link.origin, mailOrigin); verificationToken = link.searchParams.get('verify_email');
    assert.ok(verificationToken, 'The actual email must contain its verification challenge');
    const delivered = await db.notification.findUniqueOrThrow({ where: { id: verificationRow.id } });
    assert.equal(delivered.payload.deliveryStatus, 'SENT'); assert.equal(delivered.payload.deliveryAttempts, 1);
    assert.ok(!JSON.stringify(delivered.payload).includes(verificationToken), 'Bearer challenges must not be persisted in notification metadata');
    const tampered = verificationToken.slice(0, -1) + (verificationToken.endsWith('a') ? 'b' : 'a');
    expectStatus(await call(null, '/auth/email-verification/confirm', 'POST', { token: tampered }), 401, 'Tampered verification');
    const tokens = expectStatus(await call(null, '/auth/email-verification/confirm', 'POST', { token: verificationToken }), 200, 'Owner verification');
    assert.ok(tokens.accessToken && tokens.refreshToken); owner.token = tokens.accessToken;
    const persisted = await db.account.findUniqueOrThrow({ where: { id: owner.id } });
    assert.equal(persisted.status, 'ACTIVE'); assert.ok(persisted.emailVerifiedAt);
    assert.equal((await db.notification.findUniqueOrThrow({ where: { id: verificationRow.id } })).status, 'READ');
    assert.equal(await db.session.count({ where: { accountId: owner.id, revokedAt: null } }), 1);
    expectStatus(await call(owner, '/me'), 200, 'Newly verified owner session');
    expectStatus(await call(null, '/auth/email-verification/confirm', 'POST', { token: verificationToken }), 401, 'Verification replay');
    await worker.run(); assert.equal(capturedMail.length, 1, 'Consumed verification must not produce a second delivery');
  });

  await test('boat-owner activation follows the submitted request and independent HTTP review', async () => {
    const request = expectStatus(await call(owner, '/activation-requests', 'POST', { role: 'BOAT_OWNER' }), 201, 'Boat-owner activation request');
    assert.equal(request.status, 'SUBMITTED');
    assert.equal((await db.roleAssignment.findUniqueOrThrow({ where: { accountId_role: { accountId: owner.id, role: 'BOAT_OWNER' } } })).status, 'PENDING_REVIEW');
    expectStatus(await call(owner, '/activation-requests/' + request.id + '/decision', 'POST', { outcome: 'APPROVED' }), 403, 'Owner cannot self-review');
    expectStatus(await call(administrator, '/activation-requests/' + request.id + '/decision', 'POST', { outcome: 'APPROVED', reason: 'Synthetic independent fixture decision only' }), 201, 'Independent role review');
    assert.equal((await db.roleAssignment.findUniqueOrThrow({ where: { accountId_role: { accountId: owner.id, role: 'BOAT_OWNER' } } })).status, 'ACTIVE');
    assert.equal(await db.roleAssignment.count({ where: { accountId: owner.id, role: { in: ['ADMIN', 'REVIEWER', 'DIVE_CENTER'] }, status: 'ACTIVE' } }), 0);
  });

  await test('the real invitation is visible only to the recipient and gives no pending write access', async () => {
    expectStatus(await call(outsider, '/center/me/team/invitations', 'POST', { email: ownerEmail, role: 'OPERATOR' }), 403, 'Unauthorized inviter');
    invitation = expectStatus(await call(centerOwner, '/center/me/team/invitations', 'POST', { email: ownerEmail, role: 'OPERATOR' }), 201, 'Center invitation');
    assert.equal(invitation.accountId, owner.id); assert.equal(invitation.status, 'PENDING');
    const duplicate = expectStatus(await call(centerOwner, '/center/me/team/invitations', 'POST', { email: ownerEmail, role: 'OPERATOR' }), 201, 'Duplicate invitation');
    assert.equal(duplicate.id, invitation.id);
    const notifications = expectStatus(await call(owner, '/notifications'), 200, 'Owner notifications');
    const ownInvite = notifications.find(row => row.type === 'ORGANIZATION_INVITATION' && row.payload.memberId === invitation.id);
    assert.ok(ownInvite); assert.equal(ownInvite.payload.organizationId, fixture.center.id);
    const foreign = expectStatus(await call(outsider, '/notifications'), 200, 'Unrelated notifications');
    assert.ok(!foreign.some(row => row.id === ownInvite.id));
    expectStatus(await call(owner, '/marine-operations/assets', 'POST', vesselInput(fixture.center.id)), 403, 'Pending center membership cannot create a vessel');
    assert.equal(await db.marineAsset.count(), 0);
    assert.equal(await db.notification.count({ where: { accountId: owner.id, type: 'ORGANIZATION_INVITATION' } }), 1);
  });

  await test('only the current recipient can accept the current invitation once through HTTP', async () => {
    const path = '/organizations/' + fixture.center.id + '/membership-response';
    expectStatus(await call(outsider, path, 'POST', { accept: true, expectedUpdatedAt: invitation.updatedAt }), 404, 'Unrelated invitation response');
    expectStatus(await call(owner, path, 'POST', { accept: 'true', expectedUpdatedAt: invitation.updatedAt }), 400, 'Explicit invitation choice');
    expectStatus(await call(owner, path, 'POST', { accept: true, expectedUpdatedAt: new Date(Date.parse(invitation.updatedAt) - 1000).toISOString() }), 409, 'Stale invitation response');
    const accepted = expectStatus(await call(owner, path, 'POST', { accept: true, expectedUpdatedAt: invitation.updatedAt }), 201, 'Invitation acceptance');
    assert.equal(accepted.id, invitation.id); assert.equal(accepted.status, 'ACTIVE'); assert.equal(accepted.role, 'OPERATOR');
    expectStatus(await call(owner, path, 'POST', { accept: true, expectedUpdatedAt: invitation.updatedAt }), 404, 'Invitation replay');
    const audit = await db.auditEvent.findMany({ where: { action: 'organization.member_invitation_accepted', resourceId: fixture.center.id } });
    assert.equal(audit.length, 1); assert.equal(audit[0].actorId, owner.personId);
    assert.equal(await db.notification.count({ where: { accountId: centerOwner.id, type: 'ORGANIZATION_INVITATION_RESPONSE' } }), 1);
    assert.equal((await db.organizationMember.findUniqueOrThrow({ where: { id: invitation.id } })).status, 'ACTIVE');
  });

  await test('the same owner session loses vessel write access when membership is read-only or suspended', async () => {
    const manage = async action => {
      const member = await db.organizationMember.findUniqueOrThrow({ where: { id: invitation.id } });
      return expectStatus(await call(centerOwner, '/center/me/team/' + invitation.id, 'PATCH', {
        ...action, expectedUpdatedAt: member.updatedAt.toISOString(), reason: 'Synthetic A14 membership boundary test',
      }), 200, 'Center membership update');
    };
    await manage({ action: 'CHANGE_ROLE', role: 'VIEWER' });
    expectStatus(await call(owner, '/marine-operations/assets', 'POST', vesselInput(fixture.center.id)), 403, 'Viewer cannot register a vessel');
    await manage({ action: 'CHANGE_ROLE', role: 'OPERATOR' });
    await manage({ action: 'SUSPEND' });
    expectStatus(await call(owner, '/marine-operations/assets', 'POST', vesselInput(fixture.center.id)), 403, 'Suspended member cannot register a vessel');
    assert.equal(await db.marineAsset.count(), 0);
    await manage({ action: 'REACTIVATE' });
    assert.equal((await db.organizationMember.findUniqueOrThrow({ where: { id: invitation.id } })).status, 'ACTIVE');
  });

  await test('the registered owner creates and independently approves the marine organization through HTTP', async () => {
    marineOrg = expectStatus(await call(owner, '/organizations', 'POST', { displayName: 'Synthetic A14 marine owner organization', kind: 'MARINE_OPERATOR', registrationNumber: 'A14-ORG-' + randomUUID() }), 201, 'Marine organization submission');
    assert.equal(marineOrg.ownerId, owner.id); assert.equal(marineOrg.status, 'PENDING_REVIEW');
    expectStatus(await call(owner, '/marine-operations/assets', 'POST', vesselInput(marineOrg.id)), 403, 'Unapproved organization cannot create assets');
    expectStatus(await call(owner, '/organizations/' + marineOrg.id + '/decision', 'POST', { outcome: 'APPROVED' }), 403, 'Owner organization self-review');
    const approved = expectStatus(await call(administrator, '/organizations/' + marineOrg.id + '/decision', 'POST', { outcome: 'APPROVED', reason: 'Synthetic organization review fixture' }), 201, 'Independent organization approval');
    assert.equal(approved.status, 'ACTIVE');
    const membership = await db.organizationMember.findUniqueOrThrow({ where: { organizationId_accountId: { organizationId: marineOrg.id, accountId: owner.id } } });
    assert.equal(membership.role, 'OWNER'); assert.equal(membership.status, 'ACTIVE');
  });

  await test('vessel creation and center binding use the verified owner session and preserved identity', async () => {
    const input = vesselInput(marineOrg.id);
    input.hullNumber = '  a14-' + randomUUID() + '-١٢  ';
    const normalizedHull = input.hullNumber.trim().toUpperCase().replace('١٢', '12');
    expectStatus(await call(outsider, '/marine-operations/assets', 'POST', input), 403, 'Unrelated vessel creation');
    asset = expectStatus(await call(owner, '/marine-operations/assets', 'POST', input), 201, 'Owner vessel creation');
    assert.equal(asset.organizationId, marineOrg.id); assert.equal(asset.registrationNumber, input.registrationNumber); assert.equal(asset.hullNumber, normalizedHull); assert.equal(asset.status, 'DRAFT');
    expectStatus(await call(outsider, '/marine-operations/assets/' + asset.id + '/review-center', 'POST', { centerId: fixture.center.id }), 403, 'Unrelated center binding');
    const bound = expectStatus(await call(owner, '/marine-operations/assets/' + asset.id + '/review-center', 'POST', { centerId: fixture.center.id }), 201, 'Owner review-center binding');
    assert.equal(bound.reviewCenterId, fixture.center.id);
    const mine = expectStatus(await call(owner, '/marine-operations/assets/mine'), 200, 'Owner vessel listing');
    assert.ok(mine.some(row => row.id === asset.id && row.registrationNumber === input.registrationNumber && row.hullNumber === normalizedHull));
    assert.ok(!expectStatus(await call(outsider, '/marine-operations/assets/mine'), 200, 'Unrelated vessel listing').some(row => row.id === asset.id));
  });

  await test('normalized hull uniqueness spans organizations and simultaneous writes without disclosing another owner', async () => {
    const input = { ...vesselInput(fixture.center.id), hullNumber: asset.hullNumber.toLowerCase().replace(/12$/, '۱۲') };
    const duplicate = expectStatus(await call(centerOwner, '/marine-operations/assets', 'POST', input), 409, 'Duplicate hull in another organization');
    for (const value of [owner.id, ownerEmail, asset.id, marineOrg.id, marineOrg.displayName]) assert.ok(!JSON.stringify(duplicate).includes(value));
    expectStatus(await call(outsider, '/marine-operations/assets', 'POST', input), 403, 'Membership checked before a duplicate lookup');
    const racedHull = 'A14-RACE-' + randomUUID();
    const raced = await Promise.all([
      call(owner, '/marine-operations/assets', 'POST', { ...vesselInput(marineOrg.id), hullNumber: racedHull.toLowerCase() }),
      call(centerOwner, '/marine-operations/assets', 'POST', { ...vesselInput(fixture.center.id), hullNumber: '  ' + racedHull + '  ' }),
    ]);
    assert.deepEqual(raced.map(result => result.status).sort(), [201, 409]);
    assert.equal(await db.marineAsset.count({ where: { hullNumber: racedHull.toUpperCase() } }), 1);
    for (const hullNumber of [42, {}, 'A14\nINJECTED', '<script>', 'A'.repeat(81)]) {
      expectStatus(await call(owner, '/marine-operations/assets', 'POST', { ...vesselInput(marineOrg.id), hullNumber }), 400, 'Invalid hull identity');
    }
    const before = await db.marineAsset.findUniqueOrThrow({ where: { id: asset.id } });
    assert.equal(before.hullNumber, asset.hullNumber); assert.equal(before.status, 'DRAFT');
    for (let index = 0; index < 2; index++) {
      const legacy = vesselInput(marineOrg.id); delete legacy.hullNumber;
      const withoutHull = expectStatus(await call(owner, '/marine-operations/assets', 'POST', legacy), 201, 'No retroactive hull assumption');
      assert.equal(withoutHull.hullNumber, null); assert.equal(withoutHull.registrationNumber, legacy.registrationNumber);
    }
  });

  let fileBytes;
  await test('a synthetic private document cannot bypass center review or be changed by a nonmember', async () => {
    document = expectStatus(await call(owner, '/marine-operations/assets/' + asset.id + '/documents', 'POST', { documentType: 'REGISTRATION', referenceNumber: 'A14-DOC-' + randomUUID(), expiresAt: new Date(Date.now() + 365 * 86400_000).toISOString() }), 201, 'Owner document submission');
    assert.equal(document.status, 'PENDING');
    const row = await pending(centerOwner, 'center'); assert.ok(row);
    expectStatus(await decide(centerOwner, 'center', row, 'FORWARD'), 409, 'Missing attachment');
    expectStatus(await decide(administrator, 'admin', row, 'VERIFIED'), 409, 'No bypass of center review');
    expectStatus(await call(outsider, documentPath(), 'PATCH', { referenceNumber: 'UNRELATED' }), 403, 'Nonmember document mutation');
    const file = fixture.file(); fileBytes = Buffer.from(file.base64, 'base64');
    expectStatus(await call(owner, documentPath(), 'PATCH', { ...file, expectedRevision: row.reviewRevision }), 200, 'Synthetic attachment upload');
    assert.equal(objects.size, 1);
    const access = expectStatus(await call(centerOwner, '/marine-operations/center/documents/' + document.id + '/access'), 200, 'Center private document read');
    const response = await fetch(access.url); assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fileBytes);
  });

  await test('the center returns V1 to its owner and only a corrected current revision can re-enter review', async () => {
    const first = await pending(centerOwner, 'center');
    assert.equal(first.marineAsset.hullNumber, asset.hullNumber);
    const returned = expectStatus(await decide(centerOwner, 'center', first, 'RETURNED', 'Synthetic request: replace V1 with the corrected V2 file'), 201, 'Center returns V1');
    assert.equal(returned.status, 'RETURNED');
    assert.equal(await pending(centerOwner, 'center'), undefined);
    assert.equal(await pending(operations, 'operations'), undefined);
    assert.equal(await pending(administrator, 'admin'), undefined);
    const owned = expectStatus(await call(owner, '/marine-operations/assets/mine'), 200, 'Owner reads returned document').find(row => row.id === asset.id);
    const current = owned.documents.find(row => row.id === document.id);
    assert.equal(current.status, 'RETURNED'); assert.match(current.reviewNote, /corrected V2/);
    expectStatus(await call(owner, documentPath(), 'PATCH', { expectedRevision: first.reviewRevision, referenceNumber: 'STALE-V2' }), 409, 'Stale resubmission');
    expectStatus(await call(owner, documentPath(), 'PATCH', { expectedRevision: current.reviewRevision }), 400, 'Unchanged returned document');
    expectStatus(await call(outsider, documentPath(), 'PATCH', { expectedRevision: current.reviewRevision, referenceNumber: 'FOREIGN-V2' }), 403, 'Unrelated resubmission');
    const previousHash = createHash('sha256').update(fileBytes).digest('hex');
    const file = fixture.file(); fileBytes = Buffer.from(file.base64, 'base64');
    const resubmitted = expectStatus(await call(owner, documentPath(), 'PATCH', { ...file, expectedRevision: current.reviewRevision, referenceNumber: 'A14-CORRECTED-V2' }), 200, 'Owner submits V2');
    assert.equal(resubmitted.id, document.id); assert.equal(resubmitted.status, 'PENDING'); assert.equal(resubmitted.reviewNote, null);
    assert.equal(resubmitted.centerApprovedBy, null); assert.equal(resubmitted.operationsRecommendedBy, null);
    const stored = await db.marineAssetDocument.findUniqueOrThrow({ where: { id: document.id } });
    assert.notEqual(stored.sha256, previousHash); assert.equal(stored.sha256, createHash('sha256').update(fileBytes).digest('hex'));
    assert.equal(objects.size, 1, 'V1 is removed only after committed V2 replacement');
    const next = await pending(centerOwner, 'center'); assert.equal(next.referenceNumber, 'A14-CORRECTED-V2');
    assert.notEqual(next.reviewRevision, first.reviewRevision);
    expectStatus(await decide(centerOwner, 'center', first, 'FORWARD'), 409, 'A V1 decision cannot approve V2');
  });

  await test('center forwarding, independent operations recommendation and platform approval persist in order', async () => {
    const center = await pending(centerOwner, 'center');
    assert.equal(center.marineAsset.hullNumber, asset.hullNumber);
    const forwarded = expectStatus(await decide(centerOwner, 'center', center, 'FORWARD'), 201, 'Center forward');
    assert.equal(forwarded.status, 'OPERATIONS_PENDING');
    assert.equal(await pending(administrator, 'admin'), undefined);
    const ops = await pending(operations, 'operations'); assert.ok(ops);
    expectStatus(await decide(administrator, 'admin', ops, 'VERIFIED'), 409, 'No bypass of operations recommendation');
    expectStatus(await decide(owner, 'operations', ops, 'RECOMMEND', 'Unassigned owner'), 403, 'Owner cannot act as operations reviewer');
    const recommendation = expectStatus(await decide(operations, 'operations', ops, 'RECOMMEND', 'Synthetic bytes and vessel identity reviewed in isolated test'), 201, 'Operations recommendation');
    assert.equal(recommendation.status, 'PLATFORM_PENDING');
    const finalReview = await pending(administrator, 'admin'); assert.ok(finalReview);
    const accepted = expectStatus(await decide(administrator, 'admin', finalReview, 'VERIFIED'), 201, 'Independent platform decision');
    assert.equal(accepted.status, 'VERIFIED'); assert.ok(accepted.verifiedAt);
    const stored = await db.marineAssetDocument.findUniqueOrThrow({ where: { id: document.id } });
    assert.equal(stored.centerApprovedBy, centerOwner.id); assert.equal(stored.operationsRecommendedBy, operations.id);
    assert.equal(stored.sha256, createHash('sha256').update(fileBytes).digest('hex'));
    const actions = ['MARINE_DOCUMENT_CENTER_REVIEWED', 'MARINE_DOCUMENT_OPERATIONS_REVIEWED', 'MARINE_DOCUMENT_REVIEWED'];
    const events = await db.auditEvent.findMany({ where: { resource: 'MarineAssetDocument', resourceId: document.id, action: { in: actions } }, orderBy: { occurredAt: 'asc' } });
    assert.deepEqual(events.map(row => row.action), [actions[0], ...actions]);
    assert.deepEqual(events.map(row => row.actorId), [centerOwner.personId, centerOwner.personId, operations.personId, administrator.personId]);
    assert.deepEqual(events.map(row => row.metadata.outcome), ['RETURNED', 'FORWARD', 'RECOMMEND', 'VERIFIED']);
  });

  await test('approved bytes stay immutable and document verification does not activate a real vessel', async () => {
    const before = await db.marineAssetDocument.findUniqueOrThrow({ where: { id: document.id } });
    expectStatus(await call(owner, documentPath(), 'PATCH', { referenceNumber: 'EDIT-AFTER-VERIFY' }), 400, 'Verified document immutability');
    assert.deepEqual(await db.marineAssetDocument.findUniqueOrThrow({ where: { id: document.id } }), before);
    const owned = expectStatus(await call(owner, '/marine-operations/assets/mine'), 200, 'Final owner readback').find(row => row.id === asset.id);
    assert.equal(owned.documents.find(row => row.id === document.id).status, 'VERIFIED');
    assert.equal(owned.status, 'DRAFT'); assert.equal(await db.trip.count(), 0);
    assert.deepEqual(gatewayErrors, []); assert.equal(externalAttempts.length, 0);
    assert.equal(capturedMail.length, 1); assert.equal(await db.account.count({ where: { email: ownerEmail } }), 1);
  });
} catch (error) { failure = error; }
finally {
  try { if (app) await app.close(); }
  catch (error) { failure ||= error; }
  for (const server of [gateway, objectStore]) {
    if (server?.listening) await new Promise(resolveClosed => { server.close(resolveClosed); server.closeAllConnections?.(); });
  }
  try { if (schemaCreated) await adminDb.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE'); }
  catch (error) { failure ||= error; }
  if (adminDb) await adminDb.$disconnect();
  global.fetch = nativeFetch;
  for (const [key, value] of savedEnvironment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  const sourcePaths = ['apps/api/scripts/a14-owner-onboarding-http-e2e.mjs', 'apps/api/scripts/marine-review-fixture.mjs', 'apps/api/src/auth/auth.service.ts', 'apps/api/src/organizations/organization-membership.service.ts', 'apps/api/src/marine-operations/marine-operations.service.ts', 'apps/api/src/marine-operations/marine-asset-identity.domain.ts', 'apps/api/prisma/migrations/20261128020000_marine_asset_hull_number/migration.sql'];
  receipt = {
    schemaVersion: 1, suite: 'A14_OWNER_ONBOARDING_HTTP_POSTGRESQL', synthetic: true, realOwnerAcceptance: false,
    status: failure ? 'FAIL' : 'PASS', startedAt, finishedAt: new Date().toISOString(), postgresVersion, nodeVersion: process.version,
    passed: checks.filter(row => row.status === 'PASS').length, failed: checks.filter(row => row.status === 'FAIL').length,
    checks, externalHttpAttempts: externalAttempts.length, localAuthDeliveries: capturedMail.length,
    productionVesselReviewed: false, productionDocumentAccepted: false,
    sourceHashes: Object.fromEntries(sourcePaths.map(path => [path, createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')])),
  };
  if (process.env.A14_ONBOARDING_RESULT_FILE) {
    const output = resolve(process.env.A14_ONBOARDING_RESULT_FILE); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n');
  }
  console.log('A14_RESULT ' + JSON.stringify(receipt));
}
if (failure) throw failure;
