import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const pitrDatabase = 'hydroland_u2vz';
const expectedMigration = '20261113150000_a09_linked_correspondence_workflow';
const envDatabase = process.env.EXPECTED_DATABASE;
const envMigration = process.env.EXPECTED_MIGRATION;

if (!process.env.DATABASE_URL || envDatabase !== pitrDatabase || envMigration !== expectedMigration) {
  throw new Error('PITR identity configuration did not match');
}

const client = new PrismaClient();
let preflight;
try {
  preflight = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

    const [identity] = await tx.$queryRawUnsafe(
      "SELECT current_database() AS database_name, current_setting('transaction_read_only') AS read_only",
    );
    if (identity.database_name !== pitrDatabase || identity.read_only !== 'on') {
      throw new Error('PITR identity or read-only preflight failed');
    }

    const history = await tx.$queryRawUnsafe(
      'SELECT migration_name, (finished_at IS NOT NULL) AS finished, ' +
        '(rolled_back_at IS NOT NULL) AS rolled_back, applied_steps_count ' +
        'FROM "_prisma_migrations"',
    );
    const migrationRows = history.filter((row) => row.migration_name === expectedMigration);
    const migrationStatesAreRetryable = migrationRows.length >= 1 &&
      migrationRows.every((row) =>
        row.finished === false &&
        row.rolled_back === true &&
        Number(row.applied_steps_count) === 0,
      );
    if (!migrationStatesAreRetryable) {
      console.error(JSON.stringify({
        stage: 'preflight_blocked',
        reason: 'a09_migration_state_mismatch',
        matching_migration_rows: migrationRows.length,
        states: migrationRows.map((row) => ({
          finished: row.finished,
          rolled_back: row.rolled_back,
          applied_steps_count: Number(row.applied_steps_count),
        })),
      }));
      throw new Error('A09 failed-migration state did not match the reviewed preflight');
    }

    const completed = new Set(
      history
        .filter((row) => row.finished === true && row.rolled_back === false)
        .map((row) => row.migration_name),
    );
    const migrationDirectories = fs
      .readdirSync('apps/api/prisma/migrations', { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const pending = migrationDirectories.filter((name) => !completed.has(name));
    if (pending.length !== 1 || pending[0] !== expectedMigration) {
      throw new Error('A09 was not the only pending migration');
    }

    const referencedTypes = await tx.$queryRawUnsafe(
      "SELECT table_name, data_type FROM information_schema.columns " +
        "WHERE table_schema='public' AND ((table_name='Account' AND column_name='id') " +
        "OR (table_name='ManagedDocument' AND column_name='id'))",
    );
    const typeMap = new Map(referencedTypes.map((row) => [row.table_name, row.data_type]));
    if (typeMap.get('Account') !== 'uuid' || typeMap.get('ManagedDocument') !== 'uuid') {
      throw new Error('Referenced key types were not UUID');
    }

    return {
      database_name: identity.database_name,
      read_only_preflight: identity.read_only,
      pending_migrations: pending,
      failed_migration: {
        finished: migrationRows[0].finished,
        rolled_back: migrationRows[0].rolled_back,
        applied_steps_count: Number(migrationRows[0].applied_steps_count),
      },
      referenced_key_types: Object.fromEntries(typeMap),
      checked_at_utc: new Date().toISOString(),
    };
  });
} finally {
  await client.$disconnect();
}

console.log(JSON.stringify({ stage: 'preflight_passed', ...preflight }));
let stage = 'migrate_deploy';
try {
  execFileSync('./node_modules/.bin/prisma', [
    'migrate',
    'deploy',
    '--schema',
    'apps/api/prisma/schema.prisma',
  ], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });

  stage = 'post_migration_verification';
  execFileSync(process.execPath, ['ops/a10-pitr-diagnostic/check.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  console.log(JSON.stringify({
    target: pitrDatabase,
    migration: expectedMigration,
    overall: 'PASS',
  }));
} catch (error) {
  console.error(JSON.stringify({
    target: pitrDatabase,
    migration: expectedMigration,
    stage,
    overall: 'ERROR',
    error_type: error?.constructor?.name ?? 'Error',
    error_code: typeof error?.code === 'string' ? error.code : null,
  }));
  process.exitCode = 2;
}
