import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  ATTACHMENT_MIGRATION,
  ATTACHMENT_MIGRATION_CHECKSUM,
  recoverFailedAttachmentMigration,
} from './document-attachment-migration-recovery.mjs';

const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
assert.equal(process.env.CI, 'true', 'CI runner required');
assert.equal(process.env.DOCUMENT_ATTACHMENT_MIGRATION_CHECK_CONFIRM, 'ISOLATED_LOOPBACK_DATABASE');
assert.equal(database.pathname, '/hydroland', 'Dedicated disposable loopback database required');
assert(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'Loopback database required');

const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
const root = new PrismaClient({ datasourceUrl: database.toString() });
const cases = [
  { identity: 'TEXT', failed: false, partial: true },
  { identity: 'UUID', failed: true, partial: true },
  { identity: 'UUID', failed: false, partial: false },
];

try {
  for (const scenario of cases) {
    const schema = 'managed_document_attachment_' + scenario.identity.toLowerCase() + '_' + randomUUID().replaceAll('-', '');
    const qSchema = quote(schema);
    const table = (name) => `${qSchema}.${quote(name)}`;
    await root.$executeRawUnsafe(`CREATE SCHEMA ${qSchema}`);
    try {
      const identity = scenario.identity;
      for (const name of ['ManagedDocument', 'Organization', 'Account']) {
        await root.$executeRawUnsafe(`CREATE TABLE ${table(name)} ("id" ${identity} PRIMARY KEY)`);
      }
      await root.$executeRawUnsafe(`CREATE TABLE ${table('_prisma_migrations')} (
        "id" TEXT PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`);

      if (scenario.partial) {
        await root.$executeRawUnsafe(`CREATE TABLE ${table('ManagedDocumentAttachment')} (
          "id" TEXT NOT NULL,
          "documentId" TEXT NOT NULL,
          "organizationId" TEXT NOT NULL,
          "uploadedByAccountId" TEXT NOT NULL,
          "filename" TEXT NOT NULL,
          "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
          "byteSize" INTEGER NOT NULL,
          "sha256" TEXT NOT NULL,
          "content" BYTEA NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ManagedDocumentAttachment_pkey" PRIMARY KEY ("id")
        )`);
        await root.$executeRawUnsafe(`CREATE UNIQUE INDEX "ManagedDocumentAttachment_documentId_sha256_key" ON ${table('ManagedDocumentAttachment')}("documentId", "sha256")`);
        await root.$executeRawUnsafe(`CREATE INDEX "ManagedDocumentAttachment_organizationId_documentId_createdAt_idx" ON ${table('ManagedDocumentAttachment')}("organizationId", "documentId", "createdAt")`);
      }
      if (scenario.failed) {
        await root.$executeRawUnsafe(`INSERT INTO ${table('_prisma_migrations')} ("id","checksum","migration_name","logs","applied_steps_count")
          VALUES ($1,$2,$3,$4,0)`, randomUUID(), ATTACHMENT_MIGRATION_CHECKSUM, ATTACHMENT_MIGRATION,
        'P3018; Database error code: 42804; foreign key constraint cannot be implemented; key columns have incompatible types: text and uuid.');
      }

      const result = await recoverFailedAttachmentMigration({
        db: root,
        schema,
        resolveMigration: async (name) => {
          assert.equal(name, ATTACHMENT_MIGRATION);
          const [latest] = await root.$queryRawUnsafe(`SELECT "id" FROM ${table('_prisma_migrations')} WHERE "migration_name"=$1 ORDER BY "started_at" DESC, "id" DESC LIMIT 1`, name);
          if (latest) {
            await root.$executeRawUnsafe(`UPDATE ${table('_prisma_migrations')} SET "finished_at"=NOW(), "rolled_back_at"=NULL, "logs"=NULL, "applied_steps_count"=1 WHERE "id"=$1`, latest.id);
          } else {
            await root.$executeRawUnsafe(`INSERT INTO ${table('_prisma_migrations')} ("id","checksum","finished_at","migration_name","applied_steps_count")
              VALUES ($1,$2,NOW(),$3,1)`, randomUUID(), ATTACHMENT_MIGRATION_CHECKSUM, name);
          }
        },
      });
      assert.match(result.status, /recorded-applied$/);

      const columns = await root.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema=$1 AND table_name='ManagedDocumentAttachment' ORDER BY ordinal_position`, schema);
      assert.equal(columns.length, 10, 'Expected all attachment columns');
      const byName = Object.fromEntries(columns.map((column) => [column.column_name, column.data_type]));
      for (const name of ['id', 'documentId', 'organizationId', 'uploadedByAccountId']) {
        assert.equal(byName[name], identity.toLowerCase(), `${name} must match its parent identity type`);
      }
      const foreignKeys = await root.$queryRawUnsafe(`SELECT conname FROM pg_constraint WHERE contype='f'
        AND conrelid=(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname=$1 AND c.relname='ManagedDocumentAttachment')`, schema);
      assert.equal(foreignKeys.length, 3, 'Expected document, organization, and uploader foreign keys');
      const [row] = await root.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${table('ManagedDocumentAttachment')}`);
      assert.equal(Number(row.count), 0, 'Recovery must retain the empty attachment table');
      console.log(`PASS ${identity} identities (${scenario.failed ? 'failed attempt' : scenario.partial ? 'empty partial table' : 'clean UUID baseline'})`);
    } finally {
      await root.$executeRawUnsafe(`DROP SCHEMA ${qSchema} CASCADE`);
    }
  }
  console.log('Managed document attachment recovery checks passed.');
} finally {
  await root.$disconnect();
}
