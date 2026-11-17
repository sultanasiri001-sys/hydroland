import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ATTACHMENT_MIGRATION,
  ATTACHMENT_MIGRATION_CHECKSUM,
  buildAttachmentSchemaStatements,
  recoverFailedAttachmentMigration,
} from './document-attachment-migration-recovery.mjs';

function makeDatabase({ schema = 'public', ledgerPresent = true, migrationRows = [], parents = {} } = {}) {
  const state = { calls: [], resolved: [] };
  const tx = {
    async $queryRawUnsafe(sql, ...parameters) {
      state.calls.push({ kind: 'query', sql, parameters });
      if (sql.includes('pg_advisory_xact_lock')) return [];
      if (sql.includes('current_schema()')) return [{ schema }];
      if (sql.includes('to_regclass')) {
        const name = String(parameters[0]).replaceAll('"', '').split('.').at(-1);
        return [{ present: name === '_prisma_migrations' ? ledgerPresent : Boolean(parents[name]) }];
      }
      if (sql.includes('WHERE migration_name=$1')) return migrationRows;
      if (sql.includes('format_type')) return parents[parameters[1]] ? [{ id_type: parents[parameters[1]] }] : [];
      throw new Error('Unexpected recovery query: ' + sql);
    },
    async $executeRawUnsafe(sql) {
      state.calls.push({ kind: 'execute', sql });
      return 0;
    },
  };
  return { state, db: { $transaction: (work) => work(tx) } };
}

test('builds TEXT-compatible tables for legacy identities', () => {
  const statements = buildAttachmentSchemaStatements({
    schema: 'public', documentIdType: 'text', organizationIdType: 'text', accountIdType: 'text',
  });
  assert.equal(statements.length, 6);
  assert.match(statements[0], /"id" text NOT NULL/);
  assert.match(statements[0], /"organizationId" text NOT NULL/);
  assert.equal(statements.filter((sql) => sql.includes('FOREIGN KEY')).length, 3);
});

test('derives each attachment key type independently', () => {
  const [create] = buildAttachmentSchemaStatements({
    schema: 'tenant_a', documentIdType: 'uuid', organizationIdType: 'text', accountIdType: 'uuid',
  });
  assert.match(create, /"id" uuid NOT NULL/);
  assert.match(create, /"documentId" uuid NOT NULL/);
  assert.match(create, /"organizationId" text NOT NULL/);
  assert.match(create, /"uploadedByAccountId" uuid NOT NULL/);
});

test('rejects unsupported database identity types', () => {
  assert.throws(() => buildAttachmentSchemaStatements({
    schema: 'public', documentIdType: 'bigint', organizationIdType: 'uuid', accountIdType: 'uuid',
  }), /unsupported identity type/);
});

test('does nothing before parent tables exist', async () => {
  const { db, state } = makeDatabase({ parents: { _prisma_migrations: true } });
  const result = await recoverFailedAttachmentMigration({ db, resolveMigration: async () => state.resolved.push('called') });
  assert.equal(result.status, 'parents-not-ready');
  assert.deepEqual(state.resolved, []);
  assert.equal(state.calls.some((call) => call.kind === 'execute'), false);
});

test('does not change a successful migration', async () => {
  const { db, state } = makeDatabase({ migrationRows: [{
    id: 'done', checksum: 'any', finished_at: new Date(), rolled_back_at: null,
  }] });
  const result = await recoverFailedAttachmentMigration({ db, resolveMigration: async () => state.resolved.push('called') });
  assert.equal(result.status, 'already-applied');
  assert.deepEqual(state.resolved, []);
});

test('refuses to repair a failed migration with an unrelated checksum', async () => {
  const { db, state } = makeDatabase({ migrationRows: [{
    id: 'failed', checksum: 'wrong', finished_at: null, rolled_back_at: null, logs: 'SQLSTATE 42804',
  }] });
  await assert.rejects(
    recoverFailedAttachmentMigration({ db, resolveMigration: async () => state.resolved.push('called') }),
    /checksum differs/,
  );
  assert.deepEqual(state.resolved, []);
});

test('refuses to mark a failed migration applied for a different database error', async () => {
  const { db, state } = makeDatabase({ migrationRows: [{
    id: 'failed', checksum: ATTACHMENT_MIGRATION_CHECKSUM, finished_at: null, rolled_back_at: null, logs: 'permission denied',
  }] });
  await assert.rejects(
    recoverFailedAttachmentMigration({ db, resolveMigration: async () => state.resolved.push('called') }),
    /not the verified foreign-key identity-type mismatch/,
  );
  assert.deepEqual(state.resolved, []);
});

assert.equal(ATTACHMENT_MIGRATION, '20261117120000_managed_document_pdf_attachments');
