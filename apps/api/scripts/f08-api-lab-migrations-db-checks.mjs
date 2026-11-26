// Exact additive lab migration, including both historical Account identity types.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

assert.equal(process.env.CI, 'true');
assert.equal(process.env.F08_API_LAB_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_f08_api_[a-z0-9_]+$/);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const migration = '20261126180000_procurement_api_lab';
const sql = await readFile(resolve(repo, 'apps/api/prisma/migrations', migration, 'migration.sql'), 'utf8');
const root = new PrismaClient(), directory = await mkdtemp(join(tmpdir(), 'hydroland-f08-lab-migrations-'));
const denied = (work, codes) => assert.rejects(work, error => codes.includes(error?.meta?.code));

try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = 'f08_lab_' + randomUUID().replaceAll('-', ''), ownerId = randomUUID(), otherId = randomUUID();
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasourceUrl: scoped.href }), file = join(directory, type + '.sql');
    const apply = () => execFileSync(process.execPath, [resolve(repo, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--url', scoped.href, '--file', file], { stdio: 'pipe', timeout: 30_000 });
    try {
      for (const table of ['Account', 'Organization', 'ManagedDocument', 'FinanceEntry']) {
        await db.$executeRawUnsafe(`CREATE TABLE "${table}" ("id" ${type} PRIMARY KEY, "marker" TEXT NOT NULL)`);
        await db.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ($1::${type},$2)`, ownerId, 'ORIGINAL_' + table);
      }
      await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${type},$2)`, otherId, 'ORIGINAL_SECOND_OWNER');
      const original = async () => JSON.stringify(await Promise.all(['Account', 'Organization', 'ManagedDocument', 'FinanceEntry'].map(table => db.$queryRawUnsafe(`SELECT "id"::text AS id,"marker",pg_typeof("id")::text AS "identityType" FROM "${table}" ORDER BY "id"`))));
      const before = await original();
      await writeFile(file, `SET search_path TO "${schema}";\n${sql}\n`);
      apply();
      const checks = await db.$queryRawUnsafe(`SELECT conname,conrelid::regclass::text AS table_name FROM pg_constraint WHERE contype='c' AND connamespace=$1::regnamespace`, schema);
      for (const row of checks) await db.$executeRawUnsafe(`ALTER TABLE ${row.table_name} DROP CONSTRAINT "${row.conname}"`);
      await db.$executeRawUnsafe('DROP TRIGGER "ProcurementLabEvent_immutable" ON "ProcurementLabEvent"');
      apply(); apply();
      const identities = await db.$queryRawUnsafe(`SELECT table_name,data_type FROM information_schema.columns WHERE table_schema=$1 AND column_name='ownerAccountId' ORDER BY table_name`, schema);
      assert.equal(identities.length, 3); assert.ok(identities.every(row => row.data_type.toUpperCase() === type));
      const sessionData = { id: randomUUID(), ownerAccountId: ownerId, scenario: 'STANDARD_V1', status: 'REQUESTED', revision: 1,
        digest: 'a'.repeat(64), amountMinor: 4450, state: { synthetic: true, schemaVersion: 1 } };
      const session = await db.procurementLabSession.create({ data: sessionData });
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementLabSession" SET "revision"=161'), ['23514']);
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementLabSession" SET "amountMinor"=-1'), ['23514']);
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementLabSession" SET "state"=\'{"synthetic":false,"schemaVersion":1}\'::jsonb'), ['23514']);
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementLabSession" SET "state"=\'{}\'::jsonb'), ['23514']);
      await assert.rejects(() => db.procurementLabSession.create({ data: { ...sessionData, id: randomUUID(), ownerAccountId: randomUUID() } }), error => error.code === 'P2003');
      const eventData = { id: randomUUID(), ownerAccountId: ownerId, sessionId: session.id, requestId: randomUUID(), action: 'CREATE', role: 'MAKER',
        requestFingerprint: 'b'.repeat(64), beforeRevision: 0, afterRevision: 1, previousDigest: null, resultDigest: 'c'.repeat(64), evidenceHash: 'd'.repeat(64), payload: {} };
      await db.procurementLabEvent.create({ data: eventData });
      await assert.rejects(() => db.procurementLabEvent.create({ data: { ...eventData, id: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.procurementLabEvent.create({ data: { ...eventData, id: randomUUID(), requestId: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.procurementLabEvent.create({ data: { ...eventData, id: randomUUID(), ownerAccountId: otherId, requestId: randomUUID(), beforeRevision: 1, afterRevision: 2, previousDigest: 'a'.repeat(64), action: 'RECOMMEND', role: 'RECOMMENDER' } }), error => error.code === 'P2003');
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementLabEvent" SET "role"=\'OWNER\''), ['55000']);
      await denied(() => db.$executeRawUnsafe('DELETE FROM "ProcurementLabEvent"'), ['55000']);
      await denied(() => db.$executeRawUnsafe('DELETE FROM "ProcurementLabSession"'), ['23001', '23503']);
      const profileData = { id: randomUUID(), ownerAccountId: ownerId, revision: 1, configHash: 'e'.repeat(64), settings: {}, history: [], lastCheck: null };
      delete profileData.lastCheck;
      await db.procurementApiProfile.create({ data: profileData });
      await assert.rejects(() => db.procurementApiProfile.create({ data: { ...profileData, id: randomUUID() } }), error => error.code === 'P2002');
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementApiProfile" SET "settings"=\'[]\'::jsonb'), ['23514']);
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementApiProfile" SET "history"=$1::jsonb', JSON.stringify(Array(101).fill({}))), ['23514']);
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementApiProfile" SET "lastCheck"=\'[]\'::jsonb'), ['23514']);
      await denied(() => db.$executeRawUnsafe('UPDATE "ProcurementApiProfile" SET "settings"=$1::jsonb', JSON.stringify({ value: 'x'.repeat(32768) })), ['23514']);
      await denied(() => db.$executeRawUnsafe(`DELETE FROM "Account" WHERE "id"=$1::${type}`, ownerId), ['23001', '23503']);
      const retained = async () => JSON.stringify(await Promise.all([db.procurementLabSession.findMany({ orderBy: { id: 'asc' } }), db.procurementLabEvent.findMany({ orderBy: { id: 'asc' } }), db.procurementApiProfile.findMany({ orderBy: { id: 'asc' } })]));
      const retainedBefore = await retained(); apply();
      assert.equal(await retained(), retainedBefore); assert.equal(await original(), before);
      console.log(`PASS F08 API lab migration ${type}: original identities and business rows preserved, owner FKs, bounded synthetic state/history, unique occurrence revisions, append-only events, checkless bootstrap and replay`);
    } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
} finally { await root.$disconnect(); await rm(directory, { recursive: true, force: true }); }
