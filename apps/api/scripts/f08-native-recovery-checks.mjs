// Native PostgreSQL recovery of synthetic F08 records only. This script never
// connects to a production host, overwrites a database, or starts a provider.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const source = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.F08_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(source.hostname));
assert.match(source.pathname, /^\/commerce_test_f08_[a-z0-9_]+$/);
const container = process.env.F08_POSTGRES_CONTAINER;
assert.match(container || '', /^[a-f0-9]{12,64}$/, 'The existing disposable PostgreSQL service container is required.');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const copyName = 'commerce_test_f08_restore_' + randomUUID().replaceAll('-', '');
const copied = new URL(source); copied.pathname = '/' + copyName;
const db = new PrismaClient({ datasourceUrl: source.href });
const restored = new PrismaClient({ datasourceUrl: copied.href });
const directory = await mkdtemp(join(tmpdir(), 'hydroland-f08-recovery-'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const stable = value => JSON.stringify(value);
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
let created = false;

function native(command, args, input) {
  const result = spawnSync('docker', ['exec', ...(input ? ['-i'] : []), '-e', 'PGPASSWORD', container,
    command, '--host=127.0.0.1', '--username=' + decodeURIComponent(source.username), ...args], {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(source.password) }, input,
    maxBuffer: 128 * 1024 * 1024, timeout: 60_000,
  });
  assert.equal(result.status, 0, `Synthetic native ${command} failed: ${result.stderr?.toString().slice(-3000) || result.error?.message || result.signal}`);
  return result.stdout;
}

async function snapshot(client) {
  const tables = await client.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  const contents = [];
  for (const { tablename } of tables) {
    const [row] = await client.$queryRawUnsafe(`SELECT count(*)::text AS count,
      md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),'')) AS fingerprint
      FROM public.${identifier(tablename)} r`);
    contents.push({ table: tablename, ...row });
  }
  const columns = await client.$queryRaw`SELECT table_name,column_name,ordinal_position,is_nullable,data_type,udt_name,column_default
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
  const constraints = await client.$queryRaw`SELECT r.relname AS table_name,c.conname,c.contype,c.convalidated,pg_get_constraintdef(c.oid,true) AS definition
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE n.nspname='public' ORDER BY r.relname,c.conname`;
  const indexes = await client.$queryRaw`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`;
  const enums = await client.$queryRaw`SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
    JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`;
  const triggers = await client.$queryRaw`SELECT r.relname,t.tgname,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t
    JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY r.relname,t.tgname`;
  const functions = await client.$queryRaw`SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY p.proname,arguments`;
  const views = await client.$queryRaw`SELECT viewname,definition FROM pg_views WHERE schemaname='public' ORDER BY viewname`;
  const sequences = await client.$queryRaw`SELECT sequencename,data_type,start_value::text,min_value::text,max_value::text,
    increment_by::text,cycle,cache_size::text,last_value::text FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`;
  return { contents, columns, constraints, indexes, enums, triggers, functions, views, sequences };
}

try {
  const [server] = await db.$queryRaw`SELECT current_database() AS database,current_setting('server_version') AS version`;
  assert.equal(server.database, source.pathname.slice(1));
  assert.match(server.version, /^18\./);
  const before = await snapshot(db);
  const procurement = before.contents.filter(row => /^Procurement/.test(row.table));
  assert.ok(procurement.length >= 3 && procurement.every(row => Number(row.count) > 0), 'Run complete F08 HTTP acceptance before recovery.');
  const existing = await db.$queryRaw`SELECT datname FROM pg_database WHERE datname=${copyName}`;
  assert.equal(existing.length, 0, 'Never overwrite an existing database.');
  const archive = native('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--dbname=' + server.database]);
  assert.ok(archive.length > 1000 && archive.subarray(0, 5).toString() === 'PGDMP');
  await writeFile(join(directory, 'synthetic-f08.dump'), archive, { mode: 0o600 });
  await db.$executeRawUnsafe('CREATE DATABASE ' + identifier(copyName)); created = true;
  native('pg_restore', ['--exit-on-error', '--no-owner', '--no-privileges', '--dbname=' + copyName], archive);
  const after = await snapshot(restored);
  assert.deepEqual(after, before, 'Native recovery must preserve schema, every original row and binary-document fingerprint.');
  const migrations = (await readdir(resolve(repo, 'apps/api/prisma/migrations'))).filter(name => name.includes('organization_procurement'));
  assert.ok(migrations.length > 0);
  for (const migration of migrations) {
    const sql = await readFile(resolve(repo, 'apps/api/prisma/migrations', migration, 'migration.sql'));
    native('psql', ['--no-psqlrc', '--quiet', '--set=ON_ERROR_STOP=1', '--dbname=' + copyName], sql);
  }
  assert.deepEqual(await snapshot(restored), after, 'Forward replay after native restore must retain data and constraints.');
  assert.deepEqual(await snapshot(db), before, 'The original synthetic database must remain unchanged.');
  const result = { kind: 'F08_SYNTHETIC_NATIVE_RECOVERY_V1', serverVersion: server.version,
    archiveSha256: digest(archive), archiveBytes: archive.length,
    originalSha256: digest(stable(before)), restoredSha256: digest(stable(after)),
    tableCount: before.contents.length, procurement, forwardReplayUnchanged: true,
    originalUnchanged: true, productionWrites: 0, realOrganizationAcceptance: false };
  if (process.env.F08_RECOVERY_EVIDENCE_FILE) await writeFile(process.env.F08_RECOVERY_EVIDENCE_FILE, JSON.stringify(result, null, 2));
  console.log('PASS F08 native pg_dump/pg_restore, full row/catalog/binary evidence, forward replay and unchanged source');
  console.log(JSON.stringify(result));
} finally {
  await restored.$disconnect();
  if (created) await db.$executeRawUnsafe('DROP DATABASE ' + identifier(copyName));
  await db.$disconnect();
  await rm(directory, { recursive: true, force: true });
}
