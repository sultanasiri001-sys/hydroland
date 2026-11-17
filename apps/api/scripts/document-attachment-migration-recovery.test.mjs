import assert from 'node:assert/strict';
import test from 'node:test';
import { ATTACHMENT_MIGRATION, recoverFailedAttachmentMigration } from './document-attachment-migration-recovery.mjs';

const columns = [
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
].map(([column_name, data_type]) => ({ column_name, data_type }));

function makeDatabase({ migrationRows = [], tableColumns = [], rowCount = 0 } = {}) {
  const state = { migrationRows, tableColumns, rowCount, calls: [] };
  const tx = {
    async $queryRawUnsafe(sql) {
      state.calls.push({ kind: 'query', sql });
      if (sql.includes('pg_advisory_xact_lock')) return [];
      if (sql.includes('information_schema.columns')) return state.tableColumns;
      if (sql.includes('COUNT(*)::int')) return [{ count: state.rowCount }];
      if (sql.includes('SELECT migration_name')) {
        return state.migrationRows.filter((row) =>
          sql.includes('finished_at IS NULL')
            ? !row.finished_at && !row.rolled_back_at
            : true,
        );
      }
      throw new Error('Unexpected recovery query: ' + sql);
    },
    async $executeRawUnsafe(sql) {
      state.calls.push({ kind: 'execute', sql });
      if (sql.includes('DROP TABLE')) state.tableColumns = [];
      if (sql.includes('UPDATE public."_prisma_migrations"')) {
        state.migrationRows = state.migrationRows.map((row) =>
          !row.finished_at && !row.rolled_back_at
            ? { ...row, rolled_back_at: new Date() }
            : row,
        );
        return 1;
      }
      return 0;
    },
  };
  return { state, db: { $transaction: (work) => work(tx) } };
}

const failedAttempt = () => ({ migration_name: ATTACHMENT_MIGRATION, finished_at: null, rolled_back_at: null });

test('does nothing when the attachment migration has no failed record', async () => {
  const { db, state } = makeDatabase();
  const result = await recoverFailedAttachmentMigration({ db });
  assert.equal(result.status, 'no-failed-migration');
  assert.equal(state.calls.some((call) => call.sql.includes('DROP TABLE')), false);
  assert.equal(state.calls.some((call) => call.sql.includes('UPDATE public."_prisma_migrations"')), false);
});

test('marks a failed migration rolled back when no partial table exists', async () => {
  const { db, state } = makeDatabase({ migrationRows: [failedAttempt()] });
  const result = await recoverFailedAttachmentMigration({ db });
  assert.equal(result.status, 'rolled-back-without-table');
  assert.equal(state.calls.some((call) => call.sql.includes('DROP TABLE')), false);
  assert.equal(state.migrationRows[0].rolled_back_at instanceof Date, true);
});

test('drops only the known empty partial table before marking failure rolled back', async () => {
  const { db, state } = makeDatabase({ migrationRows: [failedAttempt()], tableColumns: columns });
  const result = await recoverFailedAttachmentMigration({ db });
  assert.equal(result.status, 'rolled-back-empty-partial-table');
  const drop = state.calls.findIndex((call) => call.sql.includes('DROP TABLE'));
  const mark = state.calls.findIndex((call) => call.sql.includes('UPDATE public."_prisma_migrations"'));
  assert(drop >= 0 && mark > drop);
  assert.equal(state.tableColumns.length, 0);
  assert.equal(state.migrationRows[0].rolled_back_at instanceof Date, true);
});

test('refuses to drop a partial attachment table containing files', async () => {
  const { db, state } = makeDatabase({ migrationRows: [failedAttempt()], tableColumns: columns, rowCount: 1 });
  await assert.rejects(recoverFailedAttachmentMigration({ db }), /contains data/);
  assert.equal(state.calls.some((call) => call.sql.includes('DROP TABLE')), false);
  assert.equal(state.migrationRows[0].rolled_back_at, null);
});

test('refuses to drop a table whose columns differ from the failed migration', async () => {
  const unexpected = columns.map((column) => ({ ...column }));
  unexpected[1] = { ...unexpected[1], data_type: 'uuid' };
  const { db, state } = makeDatabase({ migrationRows: [failedAttempt()], tableColumns: unexpected });
  await assert.rejects(recoverFailedAttachmentMigration({ db }), /unexpected column definition/);
  assert.equal(state.calls.some((call) => call.sql.includes('DROP TABLE')), false);
  assert.equal(state.migrationRows[0].rolled_back_at, null);
});

test('does not roll back a successful migration', async () => {
  const { db, state } = makeDatabase({ migrationRows: [{
    migration_name: ATTACHMENT_MIGRATION,
    finished_at: new Date(),
    rolled_back_at: null,
  }] });
  const result = await recoverFailedAttachmentMigration({ db });
  assert.equal(result.status, 'already-applied');
  assert.equal(state.calls.some((call) => call.sql.includes('DROP TABLE')), false);
  assert.equal(state.calls.some((call) => call.sql.includes('UPDATE public."_prisma_migrations"')), false);
});
