import { PrismaClient } from '@prisma/client';

const expectedDatabase = process.env.EXPECTED_DATABASE;
const expectedMigration = process.env.EXPECTED_MIGRATION;
if (!process.env.DATABASE_URL || !expectedDatabase || !expectedMigration) {
  throw new Error('Required diagnostic configuration is missing');
}

const client = new PrismaClient();
const requiredColumns = [
  ['AdministrativeRecord', 'managedDocumentId', 'text'],
  ['AdministrativeRecord', 'managedDocumentVersion', 'integer'],
  ['AdministrativeRecord', 'managedDocumentContentHash', 'text'],
  ['AdministrativeRouting', 'replyText', 'text'],
  ['AdministrativeRouting', 'repliedByAccountId', 'text'],
  ['AdministrativeRouting', 'repliedAt', 'timestamp without time zone'],
  ['AdministrativeRouting', 'deliveredByAccountId', 'text'],
  ['AdministrativeRouting', 'deliveredAt', 'timestamp without time zone'],
];
const requiredConstraints = [
  'AdministrativeRecord_managedDocumentId_fkey',
  'AdministrativeRecord_managed_document_snapshot_check',
  'AdministrativeRouting_repliedByAccountId_fkey',
  'AdministrativeRouting_deliveredByAccountId_fkey',
  'AdministrativeRouting_reply_snapshot_check',
  'AdministrativeRouting_delivery_snapshot_check',
];
const requiredIndexes = [
  'AdministrativeRecord_managedDocumentId_key',
  'AdministrativeRecord_organizationId_status_updatedAt_idx',
  'AdministrativeRouting_organizationId_recordId_deliveredAt_idx',
];

try {
  const report = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

    const [database] = await tx.$queryRawUnsafe(
      "SELECT current_database() AS database_name, current_setting('transaction_read_only') AS read_only",
    );
    const [migration] = await tx.$queryRawUnsafe(
      'SELECT (finished_at IS NOT NULL) AS finished, ' +
        '(rolled_back_at IS NOT NULL) AS rolled_back, applied_steps_count ' +
        'FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1',
      expectedMigration,
    );
    const columns = await tx.$queryRawUnsafe(
      "SELECT table_name, column_name, data_type FROM information_schema.columns " +
        "WHERE table_schema = 'public' AND " +
        "((table_name = 'AdministrativeRecord' AND column_name IN " +
        "('managedDocumentId','managedDocumentVersion','managedDocumentContentHash')) OR " +
        "(table_name = 'AdministrativeRouting' AND column_name IN " +
        "('replyText','repliedByAccountId','repliedAt','deliveredByAccountId','deliveredAt')))",
    );
    const constraints = await tx.$queryRawUnsafe(
      "SELECT conname, convalidated FROM pg_constraint " +
        "WHERE conrelid IN ('public.\"AdministrativeRecord\"'::regclass, " +
        "'public.\"AdministrativeRouting\"'::regclass) AND conname IN " +
        "('AdministrativeRecord_managedDocumentId_fkey'," +
        "'AdministrativeRecord_managed_document_snapshot_check'," +
        "'AdministrativeRouting_repliedByAccountId_fkey'," +
        "'AdministrativeRouting_deliveredByAccountId_fkey'," +
        "'AdministrativeRouting_reply_snapshot_check'," +
        "'AdministrativeRouting_delivery_snapshot_check')",
    );
    const indexes = await tx.$queryRawUnsafe(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN " +
        "('AdministrativeRecord_managedDocumentId_key'," +
        "'AdministrativeRecord_organizationId_status_updatedAt_idx'," +
        "'AdministrativeRouting_organizationId_recordId_deliveredAt_idx')",
    );
    const [integrity] = await tx.$queryRawUnsafe(
      'SELECT ' +
        '(SELECT COUNT(*)::int FROM "AdministrativeRecord" WHERE NOT (' +
        '("managedDocumentId" IS NULL AND "managedDocumentVersion" IS NULL AND "managedDocumentContentHash" IS NULL) OR ' +
        '("managedDocumentId" IS NOT NULL AND "managedDocumentVersion" IS NOT NULL AND "managedDocumentVersion" > 0 AND "managedDocumentContentHash" IS NOT NULL)' +
        ')) AS record_snapshot_violations, ' +
        '(SELECT COUNT(*)::int FROM "AdministrativeRouting" WHERE NOT (' +
        '("replyText" IS NULL AND "repliedByAccountId" IS NULL AND "repliedAt" IS NULL) OR ' +
        '("replyText" IS NOT NULL AND BTRIM("replyText") <> \'\' AND "repliedByAccountId" IS NOT NULL AND "repliedAt" IS NOT NULL)' +
        ')) AS reply_snapshot_violations, ' +
        '(SELECT COUNT(*)::int FROM "AdministrativeRouting" WHERE NOT (' +
        '("deliveredByAccountId" IS NULL AND "deliveredAt" IS NULL) OR ' +
        '("deliveredByAccountId" IS NOT NULL AND "deliveredAt" IS NOT NULL)' +
        ')) AS delivery_snapshot_violations',
    );

    const columnMap = new Map(columns.map((row) => [
      row.table_name + '.' + row.column_name,
      row.data_type,
    ]));
    const columnMismatches = requiredColumns
      .filter(([table, column, type]) => columnMap.get(table + '.' + column) !== type)
      .map(([table, column, expected]) => ({
        column: table + '.' + column,
        expected,
        actual: columnMap.get(table + '.' + column) ?? null,
      }));
    const migrationApplied = migration?.finished === true && migration?.rolled_back === false;
    const constraintsValid = constraints.length === requiredConstraints.length &&
      constraints.every((row) => row.convalidated);
    const indexesComplete = indexes.length === requiredIndexes.length &&
      requiredIndexes.every((name) => indexes.some((row) => row.indexname === name));
    const snapshotsValid = Number(integrity.record_snapshot_violations) === 0 &&
      Number(integrity.reply_snapshot_violations) === 0 &&
      Number(integrity.delivery_snapshot_violations) === 0;

    const checks = {
      connected_to_expected_pitr_database: database.database_name === expectedDatabase,
      transaction_read_only_enforced: database.read_only === 'on',
      a09_migration_applied: migrationApplied,
      a09_columns_complete_and_typed: columnMismatches.length === 0,
      a09_constraints_present_and_validated: constraintsValid,
      a09_indexes_present: indexesComplete,
      a09_snapshot_data_integrity: snapshotsValid,
    };
    return {
      target: 'hydroland-pitr-a09-20261114',
      database_name: database.database_name,
      inspected_at_utc: new Date().toISOString(),
      checks,
      migration_ledger: migration
        ? { row_found: true, finished: migration.finished, rolled_back: migration.rolled_back,
            applied_steps_count: migration.applied_steps_count }
        : { row_found: false },
      column_mismatches: columnMismatches,
      observed_counts: {
        a09_columns: columns.length,
        a09_constraints: constraints.length,
        a09_indexes: indexes.length,
        snapshot_violations: {
          administrative_record: Number(integrity.record_snapshot_violations),
          routing_reply: Number(integrity.reply_snapshot_violations),
          routing_delivery: Number(integrity.delivery_snapshot_violations),
        },
      },
      overall: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
    };
  });

  console.log(JSON.stringify(report));
  if (report.overall !== 'PASS') process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({
    target: 'hydroland-pitr-a09-20261114',
    overall: 'ERROR',
    error_type: error?.constructor?.name ?? 'Error',
    error_code: typeof error?.code === 'string' ? error.code : null,
  }));
  process.exitCode = 2;
} finally {
  await client.$disconnect();
}
