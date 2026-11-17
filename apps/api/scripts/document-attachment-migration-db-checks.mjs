import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { sqlStatements } from './internal-research-test-support.mjs';

const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
assert.equal(process.env.CI, 'true', 'CI runner required');
assert.equal(process.env.DOCUMENT_ATTACHMENT_MIGRATION_CHECK_CONFIRM, 'ISOLATED_LOOPBACK_DATABASE');
assert.equal(database.pathname, '/hydroland', 'Dedicated disposable loopback database required');
assert(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'Loopback database required');

const migration = await readFile(
  new URL('../prisma/migrations/20261117120000_managed_document_pdf_attachments/migration.sql', import.meta.url),
  'utf8',
);
const db = new PrismaClient();
try {
  for (const identity of ['TEXT', 'UUID']) {
    const schema = 'managed_document_attachment_' + identity.toLowerCase() + '_' + randomUUID().replaceAll('-', '');
    await db.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
    try {
      await db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL search_path TO "' + schema + '"');
        for (const table of ['ManagedDocument', 'Organization', 'Account']) {
          await tx.$executeRawUnsafe('CREATE TABLE "' + table + '" ("id" ' + identity + ' PRIMARY KEY)');
        }
        for (const statement of sqlStatements(migration)) await tx.$executeRawUnsafe(statement);

        const columns = await tx.$queryRawUnsafe(
          'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',
          schema,
          'ManagedDocumentAttachment',
        );
        assert.equal(columns.length, 10, 'Expected all attachment columns');
        const byName = Object.fromEntries(columns.map((column) => [column.column_name, column.data_type]));
        const expected = identity.toLowerCase();
        for (const name of ['id', 'documentId', 'organizationId', 'uploadedByAccountId']) {
          assert.equal(byName[name], expected, name + ' must match its parent identity type');
        }

        const foreignKeys = await tx.$queryRawUnsafe(
          'SELECT conname FROM pg_constraint WHERE contype=\'f\' AND conrelid=(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2)',
          schema,
          'ManagedDocumentAttachment',
        );
        assert.equal(foreignKeys.length, 3, 'Expected document, organization, and uploader foreign keys');
      });
    } finally {
      await db.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
    }
    console.log('PASS attachment migration with ' + identity + ' parent identities');
  }
  console.log('Managed document attachment migration checks passed.');
} finally {
  await db.$disconnect();
}
