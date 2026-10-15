import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// The only allowed target is the empty, disposable database created by this CI job.
assert.equal(process.env.CI, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.HISTORICAL_REPLAY_CONFIRM, 'EMPTY_CI_DATABASE_ONLY');
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.protocol, 'postgresql:');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '5432');
assert.equal(url.username, 'hydroland');
assert.equal(url.pathname, '/hydroland_history_replay');
assert.equal(url.search, '?schema=public');
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(apiRoot, '../..');
const evidenceDir = join(repoRoot, 'historical-replay-evidence');
const migrationsDir = join(apiRoot, 'prisma/migrations');
const sha = value => createHash('sha256').update(value).digest('hex');
const manifest = async () => {
  const names = (await readdir(migrationsDir, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  return Promise.all(names.map(async name => ({ name, sha256: sha(await readFile(join(migrationsDir, name, 'migration.sql'))) })));
};
await mkdir(evidenceDir, { recursive: true });
const report = {
  scope: 'UNMODIFIED_HISTORICAL_MIGRATION_REPLAY', sourceCommit: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID, status: 'RUNNING', startedAt: new Date().toISOString(),
  historicalReplayVerified: false, productionRecoveryVerified: false,
  notes: ['Only a new empty loopback CI database is used.', 'No migrate resolve, schema bootstrap, SQL transformation or history rewrite is permitted.'],
};
const db = new PrismaClient();
let before;
try {
  const tables = await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  assert.equal(tables.length, 0, 'Historical replay target must be completely empty');
  before = await manifest();
  assert.ok(before.length > 0, 'Migration history is missing');
  report.migrationCount = before.length;
  await writeFile(join(evidenceDir, 'migration-manifest.json'), JSON.stringify(before, null, 2));
  const deploy = () => spawnSync(process.execPath, [join(repoRoot, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', join(apiRoot, 'prisma/schema.prisma')], { cwd: repoRoot, env: process.env, encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  const result = deploy();
  const history = await db.$queryRaw`SELECT migration_name,checksum,finished_at,rolled_back_at,logs,applied_steps_count FROM "_prisma_migrations" ORDER BY started_at,id`;
  const failed = history.find(row => !row.finished_at && !row.rolled_back_at);
  report.appliedCount = history.filter(row => row.finished_at && !row.rolled_back_at).length;
  if (result.error || result.status !== 0) {
    report.failedMigration = failed?.migration_name ?? null;
    report.databaseFailure = String(failed?.logs || result.stderr || result.stdout || result.error).slice(0, 4000);
    throw new Error('Unmodified historical migration replay failed; inspect the recorded migration and database error.');
  }
  assert.equal(history.length, before.length, 'Every historical migration must be executed');
  for (const entry of before) assert.ok(history.some(row => row.migration_name === entry.name && row.checksum === entry.sha256 && row.finished_at && !row.rolled_back_at), 'Missing or incorrect history: ' + entry.name);
  const rerun = deploy();
  assert.equal(rerun.status, 0, 'Second historical deployment must succeed');
  const afterRerun = await db.$queryRaw`SELECT migration_name,checksum,finished_at,rolled_back_at,logs,applied_steps_count FROM "_prisma_migrations" ORDER BY started_at,id`;
  assert.deepEqual(afterRerun, history, 'Second deployment must leave migration history unchanged');
  report.historicalReplayVerified = true;
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.message;
  process.exitCode = 1;
} finally {
  if (before) {
    report.migrationFilesUnchanged = JSON.stringify(await manifest()) === JSON.stringify(before);
    if (!report.migrationFilesUnchanged) { report.status = 'FAIL'; report.historicalReplayVerified = false; process.exitCode = 1; }
  }
  report.finishedAt = new Date().toISOString();
  await db.$disconnect();
  await writeFile(join(evidenceDir, 'historical-replay-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
