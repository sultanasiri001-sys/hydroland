import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const pitrDatabase = 'hydroland_u2vz';
const a09Migration = '20261113150000_a09_linked_correspondence_workflow';
const reconciliationMigration = '20261116180000_a09_uuid_reference_reconciliation';
const expectedA09Checksum = '55277b7f971d4c5dc98131a1a2d8d8aadab76381866437ec0f2fa7f36eefe29f';
const expectedReconciliationChecksum = '8500df9be272a08b4e8ca33df3e2e8932ad914da6c14e69d79771078bdcd6e8c';
const expectedDatabase = process.env.EXPECTED_DATABASE;

const sha256 = (path) => createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const localA09Checksum = sha256('apps/api/prisma/migrations/' + a09Migration + '/migration.sql');
const localReconciliationChecksum = sha256(
  'apps/api/prisma/migrations/' + reconciliationMigration + '/migration.sql',
);

if (!process.env.DATABASE_URL || expectedDatabase !== pitrDatabase) {
  throw new Error('PITR identity configuration did not match');
}
if (localA09Checksum !== expectedA09Checksum ||
    localReconciliationChecksum !== expectedReconciliationChecksum) {
  throw new Error('Reviewed migration file checksum did not match');
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
      'SELECT migration_name, checksum, (finished_at IS NOT NULL) AS finished, ' +
        '(rolled_back_at IS NOT NULL) AS rolled_back, applied_steps_count ' +
        'FROM "_prisma_migrations"',
    );
    const a09Rows = history.filter((row) => row.migration_name === a09Migration);
    const a09Applied = a09Rows.filter((row) => row.finished === true && row.rolled_back === false);
    const a09RolledBack = a09Rows.filter((row) => row.finished === false && row.rolled_back === true);
    const a09Unresolved = a09Rows.filter((row) => row.finished === false && row.rolled_back === false);
    const a09LedgerValid = a09Rows.length === 2 &&
      a09Applied.length === 1 &&
      a09RolledBack.length === 1 &&
      a09Unresolved.length === 0 &&
      a09Rows.every((row) => row.checksum === expectedA09Checksum);
    if (!a09LedgerValid) {
      throw new Error('A09 ledger no longer matches the reviewed immutable history');
    }

    const unresolved = history.filter((row) => row.finished === false && row.rolled_back === false);
    if (unresolved.length !== 0) {
      throw new Error('An unresolved migration exists; no migration will run');
    }

    const parentTypes = await tx.$queryRawUnsafe(
      "SELECT table_name, data_type FROM information_schema.columns " +
        "WHERE table_schema = 'public' AND ((table_name='Account' AND column_name='id') " +
        "OR (table_name='ManagedDocument' AND column_name='id'))",
    );
    const parentTypeMap = new Map(parentTypes.map((row) => [row.table_name, row.data_type]));
    if (parentTypeMap.get('Account') !== 'uuid' ||
        parentTypeMap.get('ManagedDocument') !== 'uuid') {
      throw new Error('PITR parent keys no longer match the reviewed UUID types');
    }

    const columnTypes = await tx.$queryRawUnsafe(
      "SELECT table_name, column_name, data_type FROM information_schema.columns " +
        "WHERE table_schema = 'public' AND " +
        "((table_name = 'AdministrativeRecord' AND column_name IN " +
        "('managedDocumentId','managedDocumentVersion','managedDocumentContentHash')) OR " +
        "(table_name = 'AdministrativeRouting' AND column_name IN " +
        "('replyText','repliedByAccountId','repliedAt','deliveredByAccountId','deliveredAt')))",
    );
    const columnTypeMap = new Map(columnTypes.map((row) => [
      row.table_name + '.' + row.column_name,
      row.data_type,
    ]));
    const supportedTypes = {
      'AdministrativeRecord.managedDocumentId': ['uuid', 'text', 'character varying', 'character'],
      'AdministrativeRecord.managedDocumentVersion': ['integer'],
      'AdministrativeRecord.managedDocumentContentHash': ['text'],
      'AdministrativeRouting.replyText': ['text'],
      'AdministrativeRouting.repliedByAccountId': ['uuid', 'text', 'character varying', 'character'],
      'AdministrativeRouting.repliedAt': ['timestamp without time zone'],
      'AdministrativeRouting.deliveredByAccountId': ['uuid', 'text', 'character varying', 'character'],
      'AdministrativeRouting.deliveredAt': ['timestamp without time zone'],
    };
    for (const [column, allowed] of Object.entries(supportedTypes)) {
      const actual = columnTypeMap.get(column);
      if (actual !== undefined && !allowed.includes(actual)) {
        throw new Error('A reconciliation column has an unsupported current type');
      }
    }

    const directories = fs
      .readdirSync('apps/api/prisma/migrations', { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const completed = new Set(
      history
        .filter((row) => row.finished === true && row.rolled_back === false)
        .map((row) => row.migration_name),
    );
    const pending = directories.filter((name) => !completed.has(name));
    const reconciliationRows = history.filter(
      (row) => row.migration_name === reconciliationMigration,
    );
    const alreadyApplied = reconciliationRows.length === 1 &&
      reconciliationRows[0].finished === true &&
      reconciliationRows[0].rolled_back === false &&
      reconciliationRows[0].checksum === expectedReconciliationChecksum &&
      pending.length === 0;
    const readyToApply = reconciliationRows.length === 0 &&
      pending.length === 1 &&
      pending[0] === reconciliationMigration;
    if (!alreadyApplied && !readyToApply) {
      throw new Error('The reconciliation migration was not the only expected pending migration');
    }

    return {
      database_name: identity.database_name,
      read_only_preflight: identity.read_only,
      pending_migrations: pending,
      a09_ledger: {
        applied_rows: a09Applied.length,
        rolled_back_rows: a09RolledBack.length,
        unresolved_rows: a09Unresolved.length,
        recorded_checksum_prefix: String(a09Applied[0].checksum).slice(0, 12),
      },
      parent_key_types: Object.fromEntries(parentTypeMap),
      reconciliation_state: alreadyApplied ? 'already_applied' : 'pending',
      reconciliation_checksum_prefix: expectedReconciliationChecksum.slice(0, 12),
      checked_at_utc: new Date().toISOString(),
    };
  });
} finally {
  await client.$disconnect();
}

console.log(JSON.stringify({ stage: 'preflight_passed', ...preflight }));
let stage = preflight.reconciliation_state === 'already_applied'
  ? 'post_migration_verification'
  : 'migrate_deploy';

try {
  if (preflight.reconciliation_state !== 'already_applied') {
    execFileSync('./node_modules/.bin/prisma', [
      'migrate',
      'deploy',
      '--schema',
      'apps/api/prisma/schema.prisma',
    ], { cwd: process.cwd(), env: process.env, stdio: 'ignore' });
  }

  stage = 'post_migration_verification';
  execFileSync(process.execPath, ['ops/a10-pitr-diagnostic/check.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  console.log(JSON.stringify({
    target: pitrDatabase,
    migration: reconciliationMigration,
    result: preflight.reconciliation_state === 'already_applied' ? 'ALREADY_APPLIED' : 'APPLIED',
    overall: 'PASS',
  }));
} catch (error) {
  console.error(JSON.stringify({
    target: pitrDatabase,
    migration: reconciliationMigration,
    stage,
    overall: 'ERROR',
    error_type: error?.constructor?.name ?? 'Error',
    error_code: typeof error?.code === 'string' ? error.code : null,
    exit_status: Number.isInteger(error?.status) ? error.status : null,
  }));
  process.exitCode = 2;
}

