import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ATTACHMENT_MIGRATION = '20261117120000_managed_document_pdf_attachments';
const RECOVERY_LOCK = 'hydroland:' + ATTACHMENT_MIGRATION;
const EXPECTED_COLUMNS = [
  ['id', 'text'],
  ['documentId', 'text'],
  ['organizationId', 'text'],
  ['uploadedByAccountId', 'text'],
  ['filename', 'text'],
  ['mimeType', 'text'],
  ['byteSize', 'integer'],
  ['sha256', 'text'],
  ['content', 'bytea'],
  ['createdAt', 'timestamp without time zone'],
];

/**
 * Recover only the failed first application of the attachment migration.
 * The API stayed on its previous version, so a partial table must be empty.
 * If it contains data or has an unexpected shape, stop without changing it.
 */
export async function recoverFailedAttachmentMigration({ db }) {
  return db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      RECOVERY_LOCK,
    );

    const records = await tx.$queryRawUnsafe(
      'SELECT migration_name, finished_at, rolled_back_at FROM public."_prisma_migrations" WHERE migration_name=$1 ORDER BY started_at DESC',
      ATTACHMENT_MIGRATION,
    );
    const applied = records.some((row) => row.finished_at && !row.rolled_back_at);
    const failed = records.filter((row) => !row.finished_at && !row.rolled_back_at);
    if (applied && failed.length) {
      throw new Error('Refusing recovery: attachment migration has both successful and failed history');
    }
    if (applied) return { status: 'already-applied' };
    if (!failed.length) return { status: 'no-failed-migration' };

    const columns = await tx.$queryRawUnsafe(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=$1 ORDER BY ordinal_position',
      'ManagedDocumentAttachment',
    );

    if (columns.length) {
      if (columns.length !== EXPECTED_COLUMNS.length) {
        throw new Error('Refusing recovery: partial attachment table has an unexpected column set');
      }
      for (let index = 0; index < EXPECTED_COLUMNS.length; index += 1) {
        const [name, dataType] = EXPECTED_COLUMNS[index];
        if (columns[index].column_name !== name || columns[index].data_type !== dataType) {
          throw new Error('Refusing recovery: partial attachment table has an unexpected column definition');
        }
      }

      const counts = await tx.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS count FROM public."ManagedDocumentAttachment"',
      );
      if (Number(counts[0]?.count) !== 0) {
        throw new Error('Refusing recovery: partial attachment table contains data');
      }

      // No CASCADE: PostgreSQL will refuse to drop the table if another table
      // has started depending on it since the failed deployment.
      await tx.$executeRawUnsafe('DROP TABLE public."ManagedDocumentAttachment"');
    }

    const updated = await tx.$executeRawUnsafe(
      'UPDATE public."_prisma_migrations" SET rolled_back_at=CURRENT_TIMESTAMP WHERE migration_name=$1 AND finished_at IS NULL AND rolled_back_at IS NULL',
      ATTACHMENT_MIGRATION,
    );
    if (!updated) throw new Error('Refusing recovery: failed attachment migration history changed concurrently');

    const remaining = await tx.$queryRawUnsafe(
      'SELECT migration_name FROM public."_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NULL AND rolled_back_at IS NULL',
      ATTACHMENT_MIGRATION,
    );
    if (remaining.length) throw new Error('Attachment migration recovery left an unresolved failure record');

    return {
      status: columns.length ? 'rolled-back-empty-partial-table' : 'rolled-back-without-table',
      failedAttempts: failed.length,
    };
  });
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
