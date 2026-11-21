const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {PrismaClient} = require('@prisma/client');
const {RenderProviderObserver} = require('../dist/health/render-provider-observer');
const {AuditService} = require('../dist/audit/audit.service');

const source = new URL(process.env.DATABASE_URL);
assert.equal(process.env.A06_DB_TEST, 'DISPOSABLE_LOOPBACK');
assert(['localhost', '127.0.0.1'].includes(source.hostname));
const schema = 'a06_test_' + randomUUID().replaceAll('-', '');
const admin = new PrismaClient();
const url = new URL(source);
url.searchParams.set('schema', schema);
const db = new PrismaClient({datasourceUrl: url.href});
const observer = new RenderProviderObserver(db, new AuditService(db));
const monitor = {resource: 'integration.provider.monitor.render', resourceId: 'quarter-hour'};
const signal = {action: 'integration.provider.health.observed', resource: 'integration.provider.health', resourceId: 'a06.provider.EMAIL'};
const capture = () => db.$transaction(tx => observer.capture(tx));
const canonicalSchema = source.searchParams.get('schema') || 'public';
assert(/^[a-z_][a-z0-9_]*$/.test(canonicalSchema));


async function verifyProviderEscalation() {
  const {deliverProviderEscalations} = require('../dist/health/render-provider-escalation');
  const audit = new AuditService(db);
  const deliver = () => db.$transaction(tx => deliverProviderEscalations(tx, audit));
  // All fixtures, receipts and identity bindings live in this run's disposable schema.
  for (const name of ['AccountStatus', 'ProfessionalRole', 'RoleAssignmentStatus', 'OrganizationStatus', 'NotificationStatus']) {
    await admin.$executeRawUnsafe('CREATE DOMAIN "' + schema + '"."' + name + '" AS "' + canonicalSchema + '"."' + name + '"');
  }
  for (const table of ['OperationalSetting','Organization','Account','RoleAssignment','Notification']) {
    await admin.$executeRawUnsafe('CREATE TABLE "' + schema + '"."' + table + '" (LIKE "' + canonicalSchema + '"."' + table + '" INCLUDING ALL)');
  }
  const owner = randomUUID(), org = randomUUID();
  await db.$executeRaw`INSERT INTO "Account" ("id","personId","email","passwordHash","status","emailVerifiedAt","updatedAt")
    VALUES (${owner},${randomUUID()},${owner+'@example.invalid'},'test','ACTIVE',NOW(),NOW())`;
  await db.$executeRaw`INSERT INTO "RoleAssignment" ("id","accountId","role","status","updatedAt")
    VALUES (${randomUUID()},${owner},'ADMIN','ACTIVE',NOW())`;
  await db.$executeRaw`INSERT INTO "Organization" ("id","ownerId","kind","displayName","status","updatedAt")
    VALUES (${org},${owner},'HYDROLAND_INTERNAL_PLATFORM','A06 fixture','ACTIVE',NOW())`;
  await db.auditEvent.deleteMany({where:{resource:'integration.provider.health'}});
  const signalAt = (ago, state, category) => db.auditEvent.create({data:{
    ...signal, occurredAt:new Date(Date.now()-ago), metadata:{state,category}}});
  await deliver(); // unknown providers
  await signalAt(10*60_000,'DEGRADED','PROVIDER_FAILURE');
  await deliver();
  assert.equal(await db.notification.count(),0);
  await db.auditEvent.deleteMany({where:signal});
  await signalAt(32*60_000,'DEGRADED','PROVIDER_FAILURE');
  await deliver(); // owner binding missing: retry later
  assert.equal(await db.notification.count(),0);
  await db.operationalSetting.create({data:{key:'PLATFORM_STAFFING_ORGANIZATION:v1',value:{organizationId:org}}});
  await Promise.all([deliver(),deliver()]);
  await deliver();
  const [alert] = await db.notification.findMany({where:{accountId:owner,type:'A06_PROVIDER_STATUS'}});
  assert.equal(await db.notification.count(),1);
  assert.equal(alert.payload.state,'DEGRADED');
  await signalAt(60_000,'AVAILABLE','SUCCESS');
  await deliver(); await deliver();
  assert.equal(await db.notification.count(),2);
  const recovery = await db.auditEvent.findFirstOrThrow({where:{resource:'integration.provider.escalation.render',action:'provider.recovered'}});
  assert.equal((await db.notification.findUniqueOrThrow({where:{id:recovery.metadata.notificationId}})).payload.state,'AVAILABLE');
}

async function verify() {
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
  try {
    await admin.$executeRawUnsafe('CREATE TABLE "' + schema + '"."AuditEvent" (LIKE "' + canonicalSchema + '"."AuditEvent" INCLUDING ALL)');
    const [one, two] = await Promise.all([capture(), capture()]);
    const first = one || two;
    assert.equal([one, two].filter(Boolean).length, 1);
    assert.equal(first.missedSlots, null);
    assert.equal(first.providers.length, 5);
    assert(first.providers.every(p => p.state === 'UNKNOWN' && p.observedAt === null));
    assert.equal(await capture(), undefined);
    assert.equal(await db.auditEvent.count({where: monitor}), 1);
    await db.auditEvent.deleteMany({where: monitor});
    const slot = Date.parse(first.slotStart);
    await db.auditEvent.create({data: {...monitor, action: 'integration.provider.monitor.sampled', occurredAt: new Date(slot - 45 * 60_000)}});
    await db.auditEvent.create({data: {...signal, occurredAt: new Date(slot - 70_000), metadata: {state: 'AVAILABLE', category: 'SUCCESS'}}});
    await db.auditEvent.create({data: {...signal, occurredAt: new Date(slot - 60_000), metadata: {state: 'DEGRADED', category: 'SUCCESS'}}});
    await assert.rejects(capture(), /Inconsistent provider observation/);
    assert.equal(await db.auditEvent.count({where: monitor}), 1);
    await db.auditEvent.create({data: {...signal, occurredAt: new Date(slot - 40_000), metadata: {state: 'DEGRADED', category: 'PROVIDER_FAILURE', privatePayload: 'must-never-leave-source'}}});
    const later = await capture();
    assert.equal(later.missedSlots, (Date.parse(later.slotStart) - slot) / 900000 + 2);
    assert.equal(later.providers.find(p => p.provider === 'EMAIL').state, 'DEGRADED');
    assert.equal(later.providers.filter(p => p.state === 'UNKNOWN').length, 4);
    const persisted = await db.auditEvent.findFirstOrThrow({where: monitor, orderBy: {occurredAt: 'desc'}});
    assert.deepEqual(persisted.metadata, later);
    assert(!JSON.stringify(later).includes('must-never-leave-source'));
    await db.auditEvent.deleteMany({where: {resource: 'integration.provider.health'}});
    await require('./provider-adapter-drill.cjs').runProviderDrill(db);
    await verifyProviderEscalation();
    console.log('PASS Render monitoring: independent sample, five unknowns, concurrent deduplication, missed slots, invalid-input rollback, sanitized latest transition and durable readback');
  } finally {
    await db.$disconnect();
    await admin.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
  }
}
verify().finally(() => admin.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
