import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

const pitrDatabase = 'hydroland_u2vz';
const a09Migration = '20261113150000_a09_linked_correspondence_workflow';
const reconciliationMigration = '20261116180000_a09_uuid_reference_reconciliation';
const expectedA09Checksum = '55277b7f971d4c5dc98131a1a2d8d8aadab76381866437ec0f2fa7f36eefe29f';
const expectedReconciliationChecksum = '8500df9be272a08b4e8ca33df3e2e8932ad914da6c14e69d79771078bdcd6e8c';
const expectedDatabase = process.env.EXPECTED_DATABASE;
const require = createRequire(import.meta.url);

if (!process.env.DATABASE_URL || expectedDatabase !== pitrDatabase) {
  throw new Error('Required PITR diagnostic configuration did not match');
}

const sha256 = (path) => createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const localA09Checksum = sha256('apps/api/prisma/migrations/' + a09Migration + '/migration.sql');
const localReconciliationChecksum = sha256(
  'apps/api/prisma/migrations/' + reconciliationMigration + '/migration.sql',
);
const requiredColumns = [
  ['AdministrativeRecord', 'managedDocumentId', 'uuid'],
  ['AdministrativeRecord', 'managedDocumentVersion', 'integer'],
  ['AdministrativeRecord', 'managedDocumentContentHash', 'text'],
  ['AdministrativeRouting', 'replyText', 'text'],
  ['AdministrativeRouting', 'repliedByAccountId', 'uuid'],
  ['AdministrativeRouting', 'repliedAt', 'timestamp without time zone'],
  ['AdministrativeRouting', 'deliveredByAccountId', 'uuid'],
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

const client = new PrismaClient();

async function probeRestoredApplicationReadiness() {
  const startedAt = performance.now();
  const sourceRoot = path.resolve('apps/api/src');
  const temporaryRoot = fs.mkdtempSync(path.join(path.resolve('apps/api'), '.a10-readiness-'));
  const typescript = require('typescript');
  const compilerOptions = {
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    esModuleInterop: true,
  };

  for (const [source, destination] of [
    ['health/health.controller.ts', 'health/health.controller.js'],
    ['database/database.service.ts', 'database/database.service.js'],
  ]) {
    const output = typescript.transpileModule(
      fs.readFileSync(path.join(sourceRoot, source), 'utf8'),
      { compilerOptions, reportDiagnostics: true },
    );
    const errors = output.diagnostics.filter((diagnostic) => diagnostic.category === typescript.DiagnosticCategory.Error);
    if (errors.length) throw new Error('Health probe module compilation failed');
    const destinationPath = path.join(temporaryRoot, destination);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, output.outputText, { mode: 0o600 });
  }

  const { Module } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const { HealthController } = require(path.join(temporaryRoot, 'health/health.controller.js'));
  const { DatabaseService } = require(path.join(temporaryRoot, 'database/database.service.js'));
  class ReadinessProbeModule {}
  Module({ controllers: [HealthController], providers: [DatabaseService] })(ReadinessProbeModule);

  let app;
  try {
    app = await NestFactory.create(ReadinessProbeModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health/ready`, {
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    return {
      status: response.status === 200 && body.status === 'ready' && body.database === 'ok' ? 'PASS' : 'FAIL',
      http_status: response.status,
      application_status: body.status,
      database_status: body.database,
      latency_ms: Math.round((performance.now() - startedAt) * 100) / 100,
      scope: 'actual health controller and database provider over HTTP; background workers excluded',
    };
  } finally {
    if (app) await app.close();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  const report = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

    const [database] = await tx.$queryRawUnsafe(
      "SELECT current_database() AS database_name, current_setting('transaction_read_only') AS read_only",
    );
    if (database.database_name !== pitrDatabase || database.read_only !== 'on') {
      throw new Error('Isolated read-only database required');
    }
    // The independently captured inventory predates this PITR target. Compare
    // only its existing cohort, keeping all identifiers and storage keys in SQL.
    const baseline = JSON.parse(fs.readFileSync('docs/evidence/a03-readonly-inventory-2026-10-28.json', 'utf8'));
    const expected = baseline.externalReferences.credentialDocuments;
    const [documents] = await tx.$queryRaw`
      SELECT count(*)::int AS records,
        count(*) FILTER (WHERE "storageKey" LIKE 'credentials/%')::int AS namespaced,
        count(*) FILTER (WHERE sha256 ~ '^[a-f0-9]{64}$')::int AS valid_hashes,
        coalesce(sum("byteSize"), 0)::double precision AS bytes,
        max("createdAt") AS latest
      FROM "Document" WHERE "createdAt" <= ${new Date(baseline.observationWindowUtc.from)}`;
    const historicalDocumentInventoryMatched = documents.records === expected.records &&
      documents.namespaced === expected.expectedNamespaceRecords &&
      documents.valid_hashes === expected.validSha256Records &&
      documents.bytes === expected.totalBytes &&
      documents.latest?.toISOString() === expected.latestRecordCreatedAtUtc;
    const [bookings] = await tx.$queryRaw`
      SELECT count(*)::int AS records,
        count(*) FILTER (WHERE a.id IS NULL OR t.id IS NULL)::int AS unresolved_references
      FROM "Booking" b LEFT JOIN "Account" a ON a.id = b."accountId"
      LEFT JOIN "Trip" t ON t.id = b."tripId"
      WHERE b."createdAt" <= TIMESTAMP '2026-11-14 21:34:39'`;
    const [assets] = await tx.$queryRaw`
      SELECT count(*)::int AS records,
        count(*) FILTER (WHERE "byteSize" IS DISTINCT FROM octet_length(content)
          OR sha256 IS DISTINCT FROM encode(sha256(content), 'hex'))::int AS mismatches
      FROM "OrganizationDocumentAsset"
      WHERE "createdAt" <= TIMESTAMP '2026-11-14 21:34:39'`;
    const migrations = await tx.$queryRawUnsafe(
      'SELECT migration_name, checksum, (finished_at IS NOT NULL) AS finished, ' +
        '(rolled_back_at IS NOT NULL) AS rolled_back, applied_steps_count ' +
        'FROM "_prisma_migrations" WHERE migration_name IN ($1, $2) ORDER BY migration_name, started_at',
      a09Migration,
      reconciliationMigration,
    );
    const columns = await tx.$queryRawUnsafe(
      "SELECT table_name, column_name, data_type FROM information_schema.columns " +
        "WHERE table_schema = 'public' AND " +
        "((table_name = 'AdministrativeRecord' AND column_name IN " +
        "('managedDocumentId','managedDocumentVersion','managedDocumentContentHash')) OR " +
        "(table_name = 'AdministrativeRouting' AND column_name IN " +
        "('replyText','repliedByAccountId','repliedAt','deliveredByAccountId','deliveredAt')))",
    );
    const referencedColumns = await tx.$queryRawUnsafe(
      "SELECT table_name, column_name, data_type FROM information_schema.columns " +
        "WHERE table_schema = 'public' AND " +
        "((table_name = 'ManagedDocument' AND column_name = 'id') OR " +
        "(table_name = 'Account' AND column_name = 'id'))",
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
    const referenceTypeMap = new Map(referencedColumns.map((row) => [row.table_name, row.data_type]));
    const referenceTypeMismatches = ['Account', 'ManagedDocument']
      .filter((table) => referenceTypeMap.get(table) !== 'uuid')
      .map((table) => ({
        column: table + '.id',
        expected: 'uuid',
        actual: referenceTypeMap.get(table) ?? null,
      }));
    const a09Rows = migrations.filter((row) => row.migration_name === a09Migration);
    const reconciliationRows = migrations.filter((row) => row.migration_name === reconciliationMigration);
    const a09Applied = a09Rows.filter((row) => row.finished === true && row.rolled_back === false);
    const a09RolledBack = a09Rows.filter((row) => row.finished === false && row.rolled_back === true);
    const a09Unresolved = a09Rows.filter((row) => row.finished === false && row.rolled_back === false);
    const reconciliationApplied = reconciliationRows.filter(
      (row) => row.finished === true && row.rolled_back === false,
    );
    const reconciliationUnresolved = reconciliationRows.filter(
      (row) => row.finished === false && row.rolled_back === false,
    );
    const a09LedgerValid = a09Rows.length === 2 &&
      a09Applied.length === 1 &&
      a09RolledBack.length === 1 &&
      a09Unresolved.length === 0 &&
      a09Rows.every((row) => row.checksum === expectedA09Checksum);
    const reconciliationLedgerValid = reconciliationRows.length === 1 &&
      reconciliationApplied.length === 1 &&
      reconciliationUnresolved.length === 0 &&
      reconciliationRows[0].checksum === expectedReconciliationChecksum;
    const constraintsValid = constraints.length === requiredConstraints.length &&
      constraints.every((row) => row.convalidated);
    const indexesComplete = indexes.length === requiredIndexes.length &&
      requiredIndexes.every((name) => indexes.some((row) => row.indexname === name));
    const snapshotsValid = Number(integrity.record_snapshot_violations) === 0 &&
      Number(integrity.reply_snapshot_violations) === 0 &&
      Number(integrity.delivery_snapshot_violations) === 0;

    const checks = {
      historical_document_inventory_matched: historicalDocumentInventoryMatched,
      booking_references_resolved: bookings.unresolved_references === 0,
      embedded_file_lengths_and_hashes_consistent: assets.mismatches === 0,
      connected_to_expected_pitr_database: database.database_name === expectedDatabase,
      transaction_read_only_enforced: database.read_only === 'on',
      a09_file_matches_original_checksum: localA09Checksum === expectedA09Checksum,
      a09_ledger_keeps_original_history: a09LedgerValid,
      reconciliation_file_matches_reviewed_checksum:
        localReconciliationChecksum === expectedReconciliationChecksum,
      reconciliation_migration_applied: reconciliationLedgerValid,
      required_columns_complete_and_typed: columnMismatches.length === 0,
      parent_keys_are_uuid: referenceTypeMismatches.length === 0,
      constraints_present_and_validated: constraintsValid,
      indexes_present: indexesComplete,
      snapshot_data_integrity: snapshotsValid,
    };
    return {
      target: 'hydroland-pitr-a09-20261114',
      database_name: database.database_name,
      inspected_at_utc: new Date().toISOString(),
      checks,
      migration_ledger: {
        a09: {
          row_count: a09Rows.length,
          applied_rows: a09Applied.length,
          rolled_back_rows: a09RolledBack.length,
          unresolved_rows: a09Unresolved.length,
          recorded_checksum_prefixes: a09Rows.map((row) => String(row.checksum).slice(0, 12)),
        },
        reconciliation: {
          row_count: reconciliationRows.length,
          applied_rows: reconciliationApplied.length,
          unresolved_rows: reconciliationUnresolved.length,
          expected_checksum_prefix: expectedReconciliationChecksum.slice(0, 12),
          recorded_checksum_prefixes: reconciliationRows.map((row) => String(row.checksum).slice(0, 12)),
        },
      },
      column_mismatches: columnMismatches,
      reference_type_mismatches: referenceTypeMismatches,
      observed_counts: {
        historical_document_inventory: { records: documents.records, bytes: documents.bytes },
        restored_bookings: bookings,
        embedded_files: assets,
        reconciliation_columns: columns.length,
        constraints: constraints.length,
        indexes: indexes.length,
        snapshot_violations: {
          administrative_record: Number(integrity.record_snapshot_violations),
          routing_reply: Number(integrity.reply_snapshot_violations),
          routing_delivery: Number(integrity.delivery_snapshot_violations),
        },
      },
      overall: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
    };
  });

  report.application_readiness = await probeRestoredApplicationReadiness();
  report.checks.application_ready_on_restored_pitr = report.application_readiness.status === 'PASS';
  report.overall = Object.values(report.checks).every(Boolean) ? 'PASS' : 'FAIL';

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

