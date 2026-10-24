import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recoverOrganizationBookingMigration, ORGANIZATION_BOOKING_MIGRATION, EXPECTED_ORGANIZATION_BOOKING_CHECKSUM } from './organization-booking-migration-recovery.mjs';

const url = new URL(process.env.DATABASE_URL);
if (process.env.CI !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Migration check requires CI loopback PostgreSQL');
const root = new PrismaClient();
const cli = createRequire(import.meta.url).resolve('prisma/build/index.js');
const sql = await readFile(new URL(`../prisma/migrations/${ORGANIZATION_BOOKING_MIGRATION}/migration.sql`, import.meta.url), 'utf8');
const caseMigration = '20261005090000_customer_case_organization_relation';
const caseSql = await readFile(new URL(`../prisma/migrations/${caseMigration}/migration.sql`, import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(sql).digest('hex'), EXPECTED_ORGANIZATION_BOOKING_CHECKSUM);
const expectSqlState = (operation, code) => {
  const codes = Array.isArray(code) ? code : [code];
  return assert.rejects(operation, error => codes.includes(error?.meta?.code), `Expected PostgreSQL ${codes.join(' or ')}`);
};
const noResolve = () => { throw new Error('Unexpected Prisma resolve call'); };

async function fixture(organizationType, bookingType, shape, work) {
  const schema = 'org_booking_' + randomUUID().replaceAll('-', '');
  const directory = await mkdtemp(join(tmpdir(), 'hydroland-org-booking-'));
  const scoped = new URL(url); scoped.searchParams.set('schema', schema);
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const db = new PrismaClient({ datasourceUrl: scoped.toString() });
  const schemaFile = join(directory, 'schema.prisma');
  const putMigration = async (name, content) => {
    const path = join(directory, 'migrations', name); await mkdir(path, { recursive: true }); await writeFile(join(path, 'migration.sql'), content);
  };
  const runCli = (...args) => spawnSync(process.execPath, [cli, 'migrate', ...args, '--schema', schemaFile], {
    cwd: directory, env: { ...process.env, DATABASE_URL: scoped.toString() }, encoding: 'utf8', timeout: 45000,
  });
  const successfulCli = (...args) => {
    const result = runCli(...args);
    assert.equal(result.status, 0, `${args.join(' ')} failed in isolated fixture: ${result.stdout || ''}${result.stderr || ''}`);
    return result;
  };
  const resolveMigration = name => { assert.equal(name, ORGANIZATION_BOOKING_MIGRATION); successfulCli('resolve', '--rolled-back', name); };
  try {
    await writeFile(schemaFile, 'datasource db {\n provider = "postgresql"\n url = env("DATABASE_URL")\n}\n');
    await putMigration('00000000000000_isolated_fixture', `
      CREATE TYPE "BookingStatus" AS ENUM ('PENDING','CONFIRMED','CANCELLED');
      CREATE TABLE "Organization" ("id" ${organizationType} PRIMARY KEY);
      CREATE TABLE "CustomerCase" ("id" text PRIMARY KEY, "organizationId" ${organizationType});
      CREATE TABLE "Booking" ("id" ${bookingType} PRIMARY KEY, "tripId" ${bookingType} NOT NULL, "accountId" ${bookingType} NOT NULL,
        "status" "BookingStatus" NOT NULL, "createdAt" timestamp NOT NULL DEFAULT NOW()
        ${shape === 'constraint' ? ', CONSTRAINT "Booking_tripId_accountId_key" UNIQUE ("tripId","accountId")' : ''});
      ${shape === 'standalone' ? 'CREATE UNIQUE INDEX "Booking_tripId_accountId_key" ON "Booking"("tripId","accountId");' : ''}
      CREATE TABLE "SafetyIncident" ("id" text PRIMARY KEY, "status" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT NOW());
    `);
    await writeFile(join(directory, 'migrations', 'migration_lock.toml'), 'provider = "postgresql"\n');
    successfulCli('deploy');
    const organization = randomUUID(), legacyBooking = randomUUID(), trip = randomUUID(), contact = randomUUID();
    await db.$executeRawUnsafe(`INSERT INTO "Organization" VALUES ($1::${organizationType})`, organization);
    await db.$executeRawUnsafe(`INSERT INTO "Booking" ("id","tripId","accountId","status") VALUES ($1::${bookingType},$2::${bookingType},$3::${bookingType},'PENDING')`, legacyBooking, trip, contact);
    await db.$executeRawUnsafe(`INSERT INTO "CustomerCase" VALUES ('personal',NULL),('organization',$1::${organizationType})`, organization);
    await db.$executeRawUnsafe('INSERT INTO "SafetyIncident" ("id","status") VALUES (\'legacy-report\',\'OPEN\')');
    await putMigration(caseMigration, caseSql);
    await putMigration(ORGANIZATION_BOOKING_MIGRATION, sql);
    const fingerprint = async () => ({
      bookings: await db.$queryRawUnsafe('SELECT "id"::text,"tripId"::text,"accountId"::text,"status"::text,"createdAt"::text FROM "Booking" ORDER BY "id"'),
      cases: await db.$queryRawUnsafe('SELECT "id","organizationId"::text FROM "CustomerCase" ORDER BY "id"'),
      reports: await db.$queryRawUnsafe('SELECT "id","status","createdAt"::text FROM "SafetyIncident" ORDER BY "id"'),
    });
    const initial = await fingerprint();
    await work({ db, organizationType, bookingType, shape, schema, organization, legacyBooking, trip, contact,
      runCli, successfulCli, resolveMigration, fingerprint, initial });
  } finally {
    await db.$disconnect();
    await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await rm(directory, { recursive: true, force: true });
  }
}

async function failOnConstraint(f) {
  const result = f.runCli('deploy');
  assert.notEqual(result.status, 0, 'The unchanged migration must reproduce production failure on a constraint-owned index');
  assert.match(`${result.stdout}${result.stderr}`, /2BP01/);
  const [failed] = await f.db.$queryRawUnsafe('SELECT id,checksum,applied_steps_count,logs FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NULL AND rolled_back_at IS NULL', ORGANIZATION_BOOKING_MIGRATION);
  assert.equal(failed.checksum, EXPECTED_ORGANIZATION_BOOKING_CHECKSUM);
  assert.equal(failed.applied_steps_count, 0);
  assert.match(failed.logs, /2BP01/);
  assert.deepEqual(await f.fingerprint(), f.initial);
  return failed;
}

async function checkResult(f) {
  const { db, organizationType, bookingType, schema, organization, legacyBooking, trip, contact } = f;
  assert.deepEqual(await f.fingerprint(), f.initial, 'Migration/recovery must preserve all original fixture row values');
  const columns = await db.$queryRawUnsafe(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=$1 AND (table_name='Booking' AND column_name='organizationId' OR table_name='SafetyIncident' AND column_name='bookingId')`, schema);
  assert.equal(columns.find(row => row.table_name === 'Booking').data_type, organizationType);
  assert.equal(columns.find(row => row.table_name === 'SafetyIncident').data_type, bookingType);
  const insert = (id, tripId, account, status, org = null, key = null) => db.$executeRawUnsafe(`INSERT INTO "Booking" ("id","tripId","accountId","status","organizationId","bookingRequestKey") VALUES ($1::${bookingType},$2::${bookingType},$3::${bookingType},$4::"BookingStatus",$5::${organizationType},$6)`, id, tripId, account, status, org, key);
  const organizationBooking = randomUUID(), anotherContact = randomUUID();
  await insert(organizationBooking, trip, contact, 'PENDING', organization, 'request-1');
  await expectSqlState(() => insert(randomUUID(), trip, anotherContact, 'CONFIRMED', organization, 'request-2'), '23505');
  await expectSqlState(() => insert(randomUUID(), trip, contact, 'PENDING'), '23505');
  await insert(randomUUID(), trip, contact, 'CANCELLED');
  await db.$executeRawUnsafe(`UPDATE "Booking" SET "status"='CANCELLED' WHERE "id"=$1::${bookingType}`, organizationBooking);
  await insert(randomUUID(), trip, anotherContact, 'PENDING', organization, 'request-2');
  await expectSqlState(() => insert(randomUUID(), randomUUID(), anotherContact, 'PENDING', organization, 'request-1'), '23505');
  await expectSqlState(() => insert(randomUUID(), randomUUID(), contact, 'PENDING', randomUUID(), 'request-3'), '23503');
  await db.$executeRawUnsafe(`INSERT INTO "SafetyIncident" ("id","status","bookingId") VALUES ('report','OPEN',$1::${bookingType})`, organizationBooking);
  await expectSqlState(() => db.$executeRawUnsafe(`INSERT INTO "SafetyIncident" ("id","status","bookingId") VALUES ('invalid','OPEN',$1::${bookingType})`, randomUUID()), '23503');
  // PostgreSQL 16 reports foreign_key_violation; PostgreSQL 18 reports
  // restrict_violation for these same ON DELETE RESTRICT relationships.
  await expectSqlState(() => db.$executeRawUnsafe(`DELETE FROM "Booking" WHERE "id"=$1::${bookingType}`, organizationBooking), ['23503', '23001']);
  await expectSqlState(() => db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id"=$1::${organizationType}`, organization), ['23503', '23001']);
  const old = await db.$queryRawUnsafe(`SELECT "organizationId","bookingRequestKey","bookingRequestFingerprint" FROM "Booking" WHERE "id"=$1::${bookingType}`, legacyBooking);
  assert.deepEqual(old, [{ organizationId: null, bookingRequestKey: null, bookingRequestFingerprint: null }]);
  const [applied] = await db.$queryRawUnsafe('SELECT checksum FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL', ORGANIZATION_BOOKING_MIGRATION);
  assert.equal(applied.checksum, EXPECTED_ORGANIZATION_BOOKING_CHECKSUM);
  assert.deepEqual(await recoverOrganizationBookingMigration({ db, resolveMigration: noResolve }), { status: 'no-open-failure', normalized: false });
  f.successfulCli('deploy');
}

async function catalog(f) {
  return {
    indexes: await f.db.$queryRawUnsafe(`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=$1 AND tablename='Booking' ORDER BY indexname`, f.schema),
    constraints: await f.db.$queryRawUnsafe(`SELECT c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=$1 AND c.conrelid=to_regclass($2) ORDER BY c.conname`, f.schema, `"${f.schema}"."Booking"`),
    rows: await f.fingerprint(),
  };
}

try {
  for (const organizationType of ['text', 'uuid']) for (const bookingType of ['text', 'uuid']) for (const shape of ['standalone', 'constraint']) {
    await fixture(organizationType, bookingType, shape, async f => {
      assert.deepEqual(await recoverOrganizationBookingMigration({ db: f.db, resolveMigration: noResolve }), { status: 'no-open-failure', normalized: false });
      if (shape === 'constraint') {
        await failOnConstraint(f);
        const result = await recoverOrganizationBookingMigration({ db: f.db, resolveMigration: f.resolveMigration });
        assert.deepEqual(result, { status: 'resolved-for-retry', normalized: true });
        assert.deepEqual(await f.fingerprint(), f.initial);
        await expectSqlState(() => f.db.$executeRawUnsafe(`INSERT INTO "Booking" ("id","tripId","accountId","status") VALUES ($1::${bookingType},$2::${bookingType},$3::${bookingType},'PENDING')`, randomUUID(), f.trip, f.contact), '23505');
        assert.deepEqual(await recoverOrganizationBookingMigration({ db: f.db, resolveMigration: noResolve }), { status: 'no-open-failure', normalized: false });
      }
      f.successfulCli('deploy');
      await checkResult(f);
      console.log(`Organization migration/recovery passed: organization=${organizationType}, booking=${bookingType}, legacy=${shape}; real Prisma ledger, immutable SQL, preserved rows, uniqueness and foreign keys`);
    });
  }

  await fixture('uuid', 'uuid', 'constraint', async f => {
    const failed = await failOnConstraint(f);
    const rejectUnchanged = async pattern => {
      const before = await catalog(f);
      await assert.rejects(() => recoverOrganizationBookingMigration({ db: f.db, resolveMigration: noResolve }), pattern);
      assert.deepEqual(await catalog(f), before, 'Refused recovery must not change schema or data');
    };
    // Only this isolated CI ledger receives deliberately invalid metadata for negative controls.
    for (const [field, value, pattern] of [['checksum', '0'.repeat(64), /checksum/], ['applied_steps_count', 1, /applied steps/], ['logs', 'Unrelated connection error', /verified constraint-owned index error/]]) {
      await f.db.$executeRawUnsafe(`UPDATE "_prisma_migrations" SET "${field}"=$1 WHERE id=$2`, value, failed.id);
      await rejectUnchanged(pattern);
      await f.db.$executeRawUnsafe(`UPDATE "_prisma_migrations" SET "${field}"=$1 WHERE id=$2`, failed[field], failed.id);
    }
    const otherFailure = randomUUID();
    await f.db.$executeRawUnsafe('INSERT INTO "_prisma_migrations" (id,checksum,migration_name,logs,applied_steps_count) VALUES ($1,$2,\'isolated_other_failed_migration\',\'fixture negative control\',0)', otherFailure, '0'.repeat(64));
    await rejectUnchanged(/other unresolved migrations/);
    await f.db.$executeRawUnsafe('DELETE FROM "_prisma_migrations" WHERE id=$1', otherFailure);
    await f.db.$executeRawUnsafe('ALTER TABLE "Booking" ADD COLUMN "bookingRequestKey" text');
    await rejectUnchanged(/columns already exist/);
    await f.db.$executeRawUnsafe('ALTER TABLE "Booking" DROP COLUMN "bookingRequestKey"');
    await f.db.$executeRawUnsafe('CREATE INDEX "Booking_personal_active_trip_account_key" ON "Booking"("tripId")');
    await rejectUnchanged(/migration objects/);
    await f.db.$executeRawUnsafe('DROP INDEX "Booking_personal_active_trip_account_key"');
    await f.db.$executeRawUnsafe('CREATE TABLE "Booking_trip_account_recovery_replacement" (id text)');
    await rejectUnchanged(/replacement name/);
    await f.db.$executeRawUnsafe('DROP TABLE "Booking_trip_account_recovery_replacement"');
    await f.db.$executeRawUnsafe('CREATE TABLE "RecoveryDependent" ("tripId" uuid, "accountId" uuid, FOREIGN KEY ("tripId","accountId") REFERENCES "Booking"("tripId","accountId"))');
    await rejectUnchanged(/foreign keys depend/);
    await f.db.$executeRawUnsafe('DROP TABLE "RecoveryDependent"');
    await f.db.$executeRawUnsafe('ALTER TABLE "Booking" REPLICA IDENTITY FULL');
    await rejectUnchanged(/replica identity/);
    await f.db.$executeRawUnsafe('ALTER TABLE "Booking" REPLICA IDENTITY DEFAULT');

    const beforeRollback = await catalog(f);
    const interruptedDb = {
      $queryRawUnsafe: f.db.$queryRawUnsafe.bind(f.db),
      $transaction: (work, options) => f.db.$transaction(async tx => work({
        $queryRawUnsafe: tx.$queryRawUnsafe.bind(tx),
        $executeRawUnsafe: async (statement, ...parameters) => {
          const result = await tx.$executeRawUnsafe(statement, ...parameters);
          if (statement.includes('DROP CONSTRAINT "Booking_tripId_accountId_key"')) throw new Error('Injected interruption after constraint drop, before replacement rename');
          return result;
        },
      }), options),
    };
    await assert.rejects(() => recoverOrganizationBookingMigration({ db: interruptedDb, resolveMigration: noResolve }), /Injected interruption/);
    assert.deepEqual(await catalog(f), beforeRollback, 'Transaction rollback must restore original constraint and remove replacement index');

    await assert.rejects(() => recoverOrganizationBookingMigration({ db: f.db, resolveMigration: () => { throw new Error('Injected CLI interruption'); } }), /Injected CLI interruption/);
    const normalized = await catalog(f);
    assert.equal(normalized.constraints.some(row => row.conname === 'Booking_tripId_accountId_key'), false);
    assert.equal(normalized.indexes.some(row => row.indexname === 'Booking_tripId_accountId_key'), true);
    assert.equal(normalized.indexes.some(row => row.indexname === 'Booking_trip_account_recovery_replacement'), false);
    assert.deepEqual(await f.fingerprint(), f.initial);
    await expectSqlState(() => f.db.$executeRawUnsafe('INSERT INTO "Booking" ("id","tripId","accountId","status") VALUES ($1::uuid,$2::uuid,$3::uuid,\'PENDING\')', randomUUID(), f.trip, f.contact), '23505');
    assert.deepEqual(await recoverOrganizationBookingMigration({ db: f.db, resolveMigration: f.resolveMigration }), { status: 'resolved-for-retry', normalized: false });
    f.successfulCli('deploy');
    await checkResult(f);
    console.log('Organization recovery guards passed: checksum/steps/error/other failure, partial columns/indexes, name collision, dependent FK, replica identity, atomic rollback and commit-before-resolve resume');
  });
} finally { await root.$disconnect(); }
