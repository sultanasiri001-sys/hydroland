import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

assert.equal(process.env.CI, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.D04_MIGRATION_CHECK_CONFIRM, 'ISOLATED_LOOPBACK_DATABASE');
const database = new URL(process.env.DATABASE_URL || 'invalid:');
assert(['postgres:', 'postgresql:'].includes(database.protocol));
assert(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname));
assert([...database.searchParams].every(([key, value]) => key === 'schema' && value === 'public'));
assert(!database.hash);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const migration = resolve(root, 'apps/api/prisma/migrations/20261128050000_trip_return_accountability/migration.sql');
const sql = readFileSync(migration, 'utf8'), sourceDigest = createHash('sha256').update(sql).digest('hex');
assert.match(sql, /^BEGIN;/); assert.match(sql, /COMMIT;\s*$/);
const admin = new PrismaClient(), checks = [], startedAt = new Date().toISOString();
let version, failure;
const sqlState = state => error => error.code === 'P2010' && error.meta?.code === state;
function apply(url) {
  // Execute the real file, including its BEGIN/COMMIT and DO block. Splitting
  // this SQL at semicolons would not test the actual production transaction.
  execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--file', migration,
    '--schema', resolve(root, 'apps/api/prisma/schema.prisma')], { cwd: root, env: { ...process.env, DATABASE_URL: url.href }, stdio: 'pipe', timeout: 30000 });
}
async function fixture(tripType, accountType, work) {
  const schema = 'd04_return_migration_' + randomUUID().replaceAll('-', '');
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
  const url = new URL(database); url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasourceUrl: url.href });
  try {
    await db.$executeRawUnsafe('CREATE TABLE "Trip" ("id" ' + tripType + ' PRIMARY KEY, "marker" TEXT NOT NULL)');
    await db.$executeRawUnsafe('CREATE TABLE "Account" ("id" ' + accountType + ' PRIMARY KEY, "marker" TEXT NOT NULL)');
    await work(db, url);
  } finally {
    await db.$disconnect();
    await admin.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
  }
}

try {
  version = (await admin.$queryRaw`SELECT current_setting('server_version') AS version`)[0].version;
  for (const tripType of ['text', 'uuid']) for (const accountType of ['text', 'uuid']) {
    await fixture(tripType, accountType, async (db, url) => {
      const trip = randomUUID(), account = randomUUID();
      await db.$executeRawUnsafe('INSERT INTO "Trip" VALUES ($1::' + tripType + ", 'legacy trip')", trip);
      await db.$executeRawUnsafe('INSERT INTO "Account" VALUES ($1::' + accountType + ", 'legacy account')", account);
      const nativeBefore = {
        trips: await db.$queryRaw`SELECT "id"::text,"marker" FROM "Trip" ORDER BY "id"`,
        accounts: await db.$queryRaw`SELECT "id"::text,"marker" FROM "Account" ORDER BY "id"`,
      };
      apply(url);
      const columns = await db.$queryRaw`SELECT attname,format_type(atttypid,atttypmod) AS type FROM pg_attribute
        WHERE attrelid='"TripReturnRecord"'::regclass AND attname IN ('tripId','recordedByAccountId','observedAt','createdAt','updatedAt') AND attnum>0 AND NOT attisdropped ORDER BY attname`;
      const types = Object.fromEntries(columns.map(column => [column.attname, column.type]));
      assert.equal(types.tripId, tripType); assert.equal(types.recordedByAccountId, accountType);
      for (const column of ['observedAt', 'createdAt', 'updatedAt']) assert.equal(types[column], 'timestamp(3) with time zone');
      const entries = JSON.stringify([{ kind: 'PARTICIPANT', id: randomUUID(), status: 'RETURNED' }]);
      const observed = new Date('2026-11-28T10:00:00.000Z');
      // This is the service's native INSERT...SELECT shape, not a TEXT cast
      // that happens to work on the canonical Prisma-only fixture schema.
      await db.$executeRaw`INSERT INTO "TripReturnRecord"("tripId","revision","sourceDigest","entries","observedAt","recordedByAccountId","createdAt","updatedAt")
        SELECT t."id",1,${sourceDigest},${entries}::jsonb,${observed},a."id",clock_timestamp(),clock_timestamp()
        FROM "Trip" t CROSS JOIN "Account" a WHERE t."id"::text=${trip} AND a."id"::text=${account}`;
      let row = (await db.$queryRaw`SELECT "tripId"::text,"recordedByAccountId"::text,"revision","sourceDigest","entries","observedAt" FROM "TripReturnRecord"`)[0];
      assert.equal(row.tripId, trip); assert.equal(row.recordedByAccountId, account); assert.equal(row.revision, 1);
      assert.equal(row.observedAt.toISOString(), observed.toISOString()); assert.deepEqual(row.entries, JSON.parse(entries));
      await db.$executeRaw`UPDATE "TripReturnRecord" SET "revision"=2,"recordedByAccountId"=(SELECT "id" FROM "Account" WHERE "id"::text=${account}),"updatedAt"=clock_timestamp() WHERE "tripId"::text=${trip}`;
      const persisted = await db.$queryRaw`SELECT "tripId"::text,"recordedByAccountId"::text,"revision","sourceDigest","entries","observedAt","createdAt","updatedAt" FROM "TripReturnRecord"`;
      apply(url);
      assert.deepEqual(await db.$queryRaw`SELECT "tripId"::text,"recordedByAccountId"::text,"revision","sourceDigest","entries","observedAt","createdAt","updatedAt" FROM "TripReturnRecord"`, persisted, 'Reapplying preserves the current revision and timestamps.');
      await assert.rejects(db.$executeRaw`UPDATE "TripReturnRecord" SET "revision"=0 WHERE "tripId"::text=${trip}`, sqlState('23514'));
      await assert.rejects(db.$executeRaw`UPDATE "TripReturnRecord" SET "sourceDigest"='invalid' WHERE "tripId"::text=${trip}`, sqlState('23514'));
      await assert.rejects(db.$executeRaw`UPDATE "TripReturnRecord" SET "entries"='{}'::jsonb WHERE "tripId"::text=${trip}`, sqlState('23514'));
      await assert.rejects(db.$executeRaw`DELETE FROM "Trip" WHERE "id"::text=${trip}`, sqlState('23503'));
      await assert.rejects(db.$executeRaw`DELETE FROM "Account" WHERE "id"::text=${account}`, sqlState('23503'));
      assert.deepEqual(await db.$queryRaw`SELECT "id"::text,"marker" FROM "Trip" ORDER BY "id"`, nativeBefore.trips);
      assert.deepEqual(await db.$queryRaw`SELECT "id"::text,"marker" FROM "Account" ORDER BY "id"`, nativeBefore.accounts);
      const indexes = await db.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname=current_schema() AND tablename='TripReturnRecord'`;
      assert.equal(indexes.filter(index => index.indexname === 'TripReturnRecord_recordedByAccountId_idx').length, 1);
      row = (await db.$queryRaw`SELECT "revision" FROM "TripReturnRecord"`)[0]; assert.equal(row.revision, 2);
      checks.push({ tripType, accountType, status: 'PASS', nativeInsertAndUpdate: true, repeatedMigrationPreservedData: true, foreignKeysEnforced: true, timeZonePreserved: true });
    });
  }
  await fixture('integer', 'text', async (db, url) => {
    assert.throws(() => apply(url));
    assert.equal((await db.$queryRaw`SELECT to_regclass('"TripReturnRecord"')::text AS name`)[0].name, null);
    checks.push({ unsupportedIdentity: 'integer', status: 'PASS', transactionRolledBack: true });
  });
} catch (error) { failure = error; }
finally {
  await admin.$disconnect();
  const receipt = { suite: 'D04_NATIVE_RETURN_MIGRATION', synthetic: true, status: failure ? 'FAIL' : 'PASS', startedAt, finishedAt: new Date().toISOString(),
    nodeVersion: process.version, postgresVersion: version, migrationSha256: sourceDigest, passed: checks.length, checks };
  if (process.env.D04_MIGRATION_RESULT_FILE) { const path = resolve(process.env.D04_MIGRATION_RESULT_FILE); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(receipt, null, 2) + '\n'); }
  console.log('D04_MIGRATION_RESULT ' + JSON.stringify(receipt));
}
if (failure) throw failure;
