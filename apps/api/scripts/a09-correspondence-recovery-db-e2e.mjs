import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const parsedUrl = new URL(databaseUrl);
if (process.env.CI !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname)) {
  throw new Error('A09 recovery test requires a CI loopback PostgreSQL database');
}

const root = new PrismaClient();
const scriptPath = 'scripts/a09-correspondence-recovery.sql';
const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const references = [
  ['AdministrativeRecord', 'managedDocumentId', 'ManagedDocument', 'id'],
  ['AdministrativeRouting', 'repliedByAccountId', 'Account', 'id'],
  ['AdministrativeRouting', 'deliveredByAccountId', 'Account', 'id'],
];

try {
  for (const type of ['text', 'uuid']) {
    const schema = 'a09_' + randomUUID().replaceAll('-', '');
    await root.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
    const scopedUrl = new URL(databaseUrl);
    scopedUrl.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasourceUrl: scopedUrl.toString() });

    try {
      await db.$executeRawUnsafe('CREATE TABLE "Account" ("id" ' + type + ' PRIMARY KEY)');
      await db.$executeRawUnsafe('CREATE TABLE "ManagedDocument" ("id" ' + type + ' PRIMARY KEY)');
      await db.$executeRawUnsafe(
        'CREATE TABLE "AdministrativeRecord" (' +
          '"id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "status" TEXT NOT NULL, ' +
          '"updatedAt" TIMESTAMP(3) NOT NULL, "managedDocumentId" TEXT, ' +
          '"managedDocumentVersion" INTEGER, "managedDocumentContentHash" TEXT)',
      );
      await db.$executeRawUnsafe(
        'CREATE TABLE "AdministrativeRouting" (' +
          '"id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "recordId" TEXT NOT NULL)',
      );

      const scopedEnv = { ...process.env, DATABASE_URL: scopedUrl.toString() };
      execFileSync(
        'npx',
        ['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', scriptPath],
        { cwd: apiDirectory, env: scopedEnv, stdio: 'inherit' },
      );

      for (const [sourceTable, sourceColumn, targetTable, targetColumn] of references) {
        const sourceRows = await db.$queryRawUnsafe(
          'SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3',
          schema, sourceTable, sourceColumn,
        );
        const targetRows = await db.$queryRawUnsafe(
          'SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3',
          schema, targetTable, targetColumn,
        );
        assert.equal(sourceRows[0]?.data_type, type, sourceTable + '.' + sourceColumn + ' type');
        assert.equal(targetRows[0]?.data_type, type, targetTable + '.' + targetColumn + ' type');
      }

      const constraints = await db.$queryRawUnsafe(
        "SELECT COUNT(*)::int AS count FROM pg_constraint WHERE " +
          "(conrelid = '\"AdministrativeRecord\"'::regclass AND conname IN ('AdministrativeRecord_managedDocumentId_fkey','AdministrativeRecord_managed_document_snapshot_check')) " +
          "OR (conrelid = '\"AdministrativeRouting\"'::regclass AND conname IN ('AdministrativeRouting_repliedByAccountId_fkey','AdministrativeRouting_deliveredByAccountId_fkey','AdministrativeRouting_reply_snapshot_check','AdministrativeRouting_delivery_snapshot_check'))",
      );
      assert.equal(constraints[0]?.count, 6, 'A09 foreign-key and snapshot constraints');

      const indexes = await db.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS count FROM pg_indexes WHERE schemaname=$1 AND indexname IN ($2,$3,$4)',
        schema,
        'AdministrativeRecord_managedDocumentId_key',
        'AdministrativeRecord_organizationId_status_updatedAt_idx',
        'AdministrativeRouting_organizationId_recordId_deliveredAt_idx',
      );
      assert.equal(indexes[0]?.count, 3, 'A09 indexes');

      const accountId = randomUUID();
      const documentId = randomUUID();
      await db.$executeRawUnsafe('INSERT INTO "Account" ("id") VALUES ($1::' + type + ')', accountId);
      await db.$executeRawUnsafe('INSERT INTO "ManagedDocument" ("id") VALUES ($1::' + type + ')', documentId);
      await db.$executeRawUnsafe(
        'INSERT INTO "AdministrativeRecord" ' +
          '("id","organizationId","status","updatedAt","managedDocumentId","managedDocumentVersion","managedDocumentContentHash") ' +
          'VALUES ($1,$2,$3,CURRENT_TIMESTAMP,$4::' + type + ',1,$5)',
        randomUUID(), 'org-test', 'REGISTERED', documentId, 'sha256',
      );
      await db.$executeRawUnsafe(
        'INSERT INTO "AdministrativeRouting" ' +
          '("id","organizationId","recordId","replyText","repliedByAccountId","repliedAt") ' +
          'VALUES ($1,$2,$3,$4,$5::' + type + ',CURRENT_TIMESTAMP)',
        randomUUID(), 'org-test', 'record-test', 'تم الرد', accountId,
      );

      await assert.rejects(() => db.$executeRawUnsafe(
        'INSERT INTO "AdministrativeRecord" ' +
          '("id","organizationId","status","updatedAt","managedDocumentId","managedDocumentVersion","managedDocumentContentHash") ' +
          'VALUES ($1,$2,$3,CURRENT_TIMESTAMP,$4::' + type + ',1,$5)',
        randomUUID(), 'org-test', 'REGISTERED', randomUUID(), 'sha256',
      ));
      await assert.rejects(() => db.$executeRawUnsafe(
        'INSERT INTO "AdministrativeRouting" ' +
          '("id","organizationId","recordId","replyText","repliedByAccountId","repliedAt") ' +
          'VALUES ($1,$2,$3,$4,$5::' + type + ',CURRENT_TIMESTAMP)',
        randomUUID(), 'org-test', 'record-test', ' ', accountId,
      ));
    } finally {
      await db.$disconnect();
      await root.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
    }
  }

  console.log('A09 recovery passed on TEXT and UUID foreign keys, constraints, indexes, and lifecycle snapshots.');
} finally {
  await root.$disconnect();
}
