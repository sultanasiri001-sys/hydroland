import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ATTACHMENT_MIGRATION = '20261117120000_managed_document_pdf_attachments';
const migrationFile = new URL(`../prisma/migrations/${ATTACHMENT_MIGRATION}/migration.sql`, import.meta.url);
export const ATTACHMENT_MIGRATION_CHECKSUM = createHash('sha256').update(readFileSync(migrationFile)).digest('hex');
const RECOVERY_LOCK = 'hydroland:' + ATTACHMENT_MIGRATION;
const require = createRequire(import.meta.url);
const EXPECTED_COLUMNS = [
  ['id', 'identity'],
  ['documentId', 'identity'],
  ['organizationId', 'identity'],
  ['uploadedByAccountId', 'identity'],
  ['filename', 'text'],
  ['mimeType', 'text'],
  ['byteSize', 'integer'],
  ['sha256', 'text'],
  ['content', 'bytea'],
  ['createdAt', 'timestamp without time zone'],
];

const fail = (reason) => { throw new Error(`Managed document attachment recovery refused: ${reason}`); };
const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
const qualified = (schema, table) => `${quote(schema)}.${quote(table)}`;
const identityType = (value, label) => {
  if (value !== 'text' && value !== 'uuid') fail(`${label} uses unsupported identity type ${value ?? 'missing'}`);
  return value;
};

export function buildAttachmentSchemaStatements({ schema, documentIdType, organizationIdType, accountIdType }) {
  const docType = identityType(documentIdType, 'ManagedDocument.id');
  const orgType = identityType(organizationIdType, 'Organization.id');
  const accountType = identityType(accountIdType, 'Account.id');
  const table = qualified(schema, 'ManagedDocumentAttachment');
  return [
    `CREATE TABLE ${table} (
      "id" ${docType} NOT NULL,
      "documentId" ${docType} NOT NULL,
      "organizationId" ${orgType} NOT NULL,
      "uploadedByAccountId" ${accountType} NOT NULL,
      "filename" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
      "byteSize" INTEGER NOT NULL,
      "sha256" TEXT NOT NULL,
      "content" BYTEA NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ManagedDocumentAttachment_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX "ManagedDocumentAttachment_documentId_sha256_key" ON ${table}("documentId", "sha256")`,
    `CREATE INDEX "ManagedDocumentAttachment_organizationId_documentId_createdAt_idx" ON ${table}("organizationId", "documentId", "createdAt")`,
    `ALTER TABLE ${table} ADD CONSTRAINT "ManagedDocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES ${qualified(schema, 'ManagedDocument')}("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE ${table} ADD CONSTRAINT "ManagedDocumentAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES ${qualified(schema, 'Organization')}("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE ${table} ADD CONSTRAINT "ManagedDocumentAttachment_uploadedByAccountId_fkey" FOREIGN KEY ("uploadedByAccountId") REFERENCES ${qualified(schema, 'Account')}("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  ];
}

async function currentSchema(db) {
  const [row] = await db.$queryRawUnsafe('SELECT current_schema() AS schema');
  if (!row?.schema) fail('no current database schema');
  return row.schema;
}

async function acquireRecoveryLock(tx) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const [row] = await tx.$queryRawUnsafe(
      'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked',
      RECOVERY_LOCK,
    );
    if (row?.locked) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  fail('another attachment migration recovery still holds the lock');
}

async function tablePresent(db, schema, table) {
  const [row] = await db.$queryRawUnsafe('SELECT to_regclass($1) IS NOT NULL AS present', qualified(schema, table));
  return row?.present === true;
}

async function readIdentityType(db, schema, table) {
  const rows = await db.$queryRawUnsafe(`SELECT format_type(a.atttypid,a.atttypmod) AS id_type
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid
    WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind='r' AND a.attname='id'
      AND a.attnum>0 AND NOT a.attisdropped`, schema, table);
  return rows[0]?.id_type ?? null;
}

async function migrationRows(db, schema) {
  if (!await tablePresent(db, schema, '_prisma_migrations')) return [];
  return db.$queryRawUnsafe(`SELECT id, checksum, finished_at, rolled_back_at, logs, applied_steps_count
    FROM ${qualified(schema, '_prisma_migrations')}
    WHERE migration_name=$1 ORDER BY started_at DESC, id DESC`, ATTACHMENT_MIGRATION);
}

async function inspectPartialTable(db, schema, identityTypes) {
  const present = await tablePresent(db, schema, 'ManagedDocumentAttachment');
  if (!present) return { present: false, columns: [] };
  const [relation] = await db.$queryRawUnsafe(`SELECT c.relkind::text AS kind, c.relispartition AS partitioned
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND c.relname='ManagedDocumentAttachment'`, schema);
  if (!relation || relation.kind !== 'r' || relation.partitioned) fail('partial attachment object is not an ordinary table');

  const columns = await db.$queryRawUnsafe(`SELECT column_name, data_type
    FROM information_schema.columns WHERE table_schema=$1 AND table_name='ManagedDocumentAttachment'
    ORDER BY ordinal_position`, schema);
  if (columns.length !== EXPECTED_COLUMNS.length) fail('partial attachment table has an unexpected column set');
  for (let index = 0; index < EXPECTED_COLUMNS.length; index += 1) {
    const [name, expectedType] = EXPECTED_COLUMNS[index];
    const actual = columns[index];
    if (actual.column_name !== name) fail('partial attachment table has an unexpected column set');
    if (expectedType === 'identity') {
      if (actual.data_type !== 'text' && actual.data_type !== identityTypes[name]) {
        fail(`partial attachment column ${name} has unexpected type ${actual.data_type}`);
      }
    } else if (actual.data_type !== expectedType) {
      fail(`partial attachment column ${name} has unexpected type ${actual.data_type}`);
    }
  }

  const [count] = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${qualified(schema, 'ManagedDocumentAttachment')}`);
  if (Number(count?.count) !== 0) fail('partial attachment table contains data');
  return { present: true, columns };
}

async function verifyCreatedSchema(db, schema, identityTypes) {
  const table = qualified(schema, 'ManagedDocumentAttachment');
  const columns = await db.$queryRawUnsafe(`SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema=$1 AND table_name='ManagedDocumentAttachment'
    ORDER BY ordinal_position`, schema);
  if (columns.length !== EXPECTED_COLUMNS.length) fail('repaired table is missing expected columns');
  for (let index = 0; index < EXPECTED_COLUMNS.length; index += 1) {
    const [name, expectedType] = EXPECTED_COLUMNS[index];
    const actual = columns[index];
    const type = expectedType === 'identity' ? identityTypes[name] : expectedType;
    if (actual.column_name !== name || actual.data_type !== type || actual.is_nullable !== 'NO') {
      fail(`repaired attachment column ${name} failed schema verification`);
    }
  }
  if (!String(columns.find((column) => column.column_name === 'mimeType')?.column_default).includes('application/pdf')) {
    fail('repaired attachment MIME type default is missing');
  }
  if (!String(columns.find((column) => column.column_name === 'createdAt')?.column_default).includes('CURRENT_TIMESTAMP')) {
    fail('repaired attachment timestamp default is missing');
  }

  const constraints = await db.$queryRawUnsafe(`SELECT c.conname AS name, c.contype::text AS type,
    c.convalidated AS valid, c.confdeltype::text AS delete_action, c.confupdtype::text AS update_action,
    rt.relname AS referenced_table,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columns,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
      JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS referenced_columns
    FROM pg_constraint c JOIN pg_class ct ON ct.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=ct.relnamespace
    LEFT JOIN pg_class rt ON rt.oid=c.confrelid
    WHERE n.nspname=$1 AND ct.relname='ManagedDocumentAttachment'`, schema);
  const expectedConstraints = new Map([
    ['ManagedDocumentAttachment_pkey', { type: 'p', columns: ['id'] }],
    ['ManagedDocumentAttachment_documentId_fkey', { type: 'f', columns: ['documentId'], referenced_table: 'ManagedDocument' }],
    ['ManagedDocumentAttachment_organizationId_fkey', { type: 'f', columns: ['organizationId'], referenced_table: 'Organization' }],
    ['ManagedDocumentAttachment_uploadedByAccountId_fkey', { type: 'f', columns: ['uploadedByAccountId'], referenced_table: 'Account' }],
  ]);
  if (constraints.length !== expectedConstraints.size) fail('repaired attachment table has unexpected constraints');
  for (const constraint of constraints) {
    const expected = expectedConstraints.get(constraint.name);
    if (!expected || constraint.type !== expected.type || !constraint.valid || JSON.stringify(constraint.columns) !== JSON.stringify(expected.columns)) {
      fail(`repaired attachment constraint ${constraint.name} failed schema verification`);
    }
    if (expected.type === 'f' && (constraint.referenced_table !== expected.referenced_table
        || JSON.stringify(constraint.referenced_columns) !== JSON.stringify(['id'])
        || constraint.delete_action !== 'r' || constraint.update_action !== 'c')) {
      fail(`repaired attachment foreign key ${constraint.name} failed schema verification`);
    }
  }

  const indexes = await db.$queryRawUnsafe(`SELECT x.relname AS name, i.indisunique AS is_unique,
    i.indisprimary AS is_primary, i.indisvalid AS is_valid, i.indisready AS is_ready,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum
      WHERE k.ord<=i.indnkeyatts ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class x ON x.oid=i.indexrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname=$1 AND t.relname='ManagedDocumentAttachment'`, schema);
  const expectedIndexes = new Map([
    ['ManagedDocumentAttachment_pkey', { unique: true, primary: true, columns: ['id'] }],
    ['ManagedDocumentAttachment_documentId_sha256_key', { unique: true, primary: false, columns: ['documentId', 'sha256'] }],
    ['ManagedDocumentAttachment_organizationId_documentId_createdAt_idx'.slice(0, 63), { unique: false, primary: false, columns: ['organizationId', 'documentId', 'createdAt'] }],
  ]);
  if (indexes.length !== expectedIndexes.size) fail('repaired attachment table has unexpected indexes');
  for (const index of indexes) {
    const expected = expectedIndexes.get(index.name);
    if (!expected || !index.is_valid || !index.is_ready || index.is_unique !== expected.unique || index.is_primary !== expected.primary
        || JSON.stringify(index.columns) !== JSON.stringify(expected.columns)) {
      fail(`repaired attachment index ${index.name} failed schema verification`);
    }
  }

  const [count] = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${table}`);
  if (Number(count?.count) !== 0) fail('repaired attachment table unexpectedly contains data');
}

function resolveWithInstalledPrisma(name) {
  try {
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'resolve', '--applied', name, '--schema', 'prisma/schema.prisma'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: process.env,
      stdio: 'inherit',
      timeout: 60000,
    });
  } catch {
    throw new Error('Managed document attachment recovery: Prisma could not record the repaired migration as applied');
  }
}

export async function recoverFailedAttachmentMigration({ db, resolveMigration = resolveWithInstalledPrisma }) {
  const actualChecksum = ATTACHMENT_MIGRATION_CHECKSUM;
  const prepared = await db.$transaction(async (tx) => {
    await acquireRecoveryLock(tx);
    const schema = await currentSchema(tx);
    const records = await migrationRows(tx, schema);
    const applied = records.some((row) => row.finished_at && !row.rolled_back_at);
    const failed = records.filter((row) => !row.finished_at && !row.rolled_back_at);
    if (applied && failed.length) fail('ledger has both applied and unresolved failed migration records');
    if (applied) return { status: 'already-applied', prepare: false, schema };
    if (failed.length > 1) fail('ledger has multiple unresolved attempts for the attachment migration');
    if (failed.length && records[0]?.id !== failed[0].id) fail('failed attachment migration is not the latest ledger record');
    if (failed.length && failed[0].checksum !== actualChecksum) fail('failed migration checksum differs from the immutable migration source');
    if (failed.length && !(/\b42804\b/.test(failed[0].logs || '') || /incompatible types|cannot be implemented/i.test(failed[0].logs || ''))) {
      fail('failed migration is not the verified foreign-key identity-type mismatch');
    }

    const parentNames = ['ManagedDocument', 'Organization', 'Account'];
    const parents = {};
    for (const name of parentNames) {
      if (!await tablePresent(tx, schema, name)) {
        if (failed.length) fail(`required parent table ${name} is missing`);
        return { status: 'parents-not-ready', prepare: false, schema };
      }
      parents[name] = identityType(await readIdentityType(tx, schema, name), `${name}.id`);
    }
    const identityTypes = {
      id: parents.ManagedDocument,
      documentId: parents.ManagedDocument,
      organizationId: parents.Organization,
      uploadedByAccountId: parents.Account,
    };
    const partial = await inspectPartialTable(tx, schema, identityTypes);
    const needsPreapply = failed.length > 0 || partial.present
      || Object.values(parents).includes('uuid');
    if (!needsPreapply) return { status: 'no-failed-migration', prepare: false, schema };

    if (partial.present) {
      await tx.$executeRawUnsafe(`LOCK TABLE ${qualified(schema, 'ManagedDocumentAttachment')} IN ACCESS EXCLUSIVE MODE`);
      // A fresh inspection under the lock prevents a concurrent writer from
      // adding data between the initial read and the destructive DDL below.
      const locked = await inspectPartialTable(tx, schema, identityTypes);
      if (!locked.present) fail('partial attachment table changed while acquiring its lock');
      await tx.$executeRawUnsafe(`DROP TABLE ${qualified(schema, 'ManagedDocumentAttachment')}`);
    }

    for (const statement of buildAttachmentSchemaStatements({
      schema,
      documentIdType: parents.ManagedDocument,
      organizationIdType: parents.Organization,
      accountIdType: parents.Account,
    })) await tx.$executeRawUnsafe(statement);
    await verifyCreatedSchema(tx, schema, identityTypes);
    return {
      status: failed.length ? 'repaired-failed-empty-table' : 'preapplied-uuid-compatible-schema',
      prepare: true,
      schema,
    };
  }, { maxWait: 10000, timeout: 45000 });

  if (!prepared.prepare) return { status: prepared.status };
  await resolveMigration(ATTACHMENT_MIGRATION);
  const [resolved] = await db.$queryRawUnsafe(`SELECT checksum, finished_at, rolled_back_at
    FROM ${qualified(prepared.schema, '_prisma_migrations')}
    WHERE migration_name=$1 ORDER BY started_at DESC, id DESC LIMIT 1`, ATTACHMENT_MIGRATION);
  if (!resolved || resolved.checksum !== actualChecksum || !resolved.finished_at || resolved.rolled_back_at) {
    fail('Prisma did not record the exact repaired migration as applied');
  }
  return { status: prepared.status + '-and-recorded-applied' };
}

async function main() {
  const db = new PrismaClient();
  try {
    const result = await recoverFailedAttachmentMigration({ db });
    console.log('[document-attachment-recovery] ' + result.status);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
