// Rehearse the exact additive migration on disposable PostgreSQL schemas with
// both historical identity types, retaining the original document and ledger.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.F08_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_f08_[a-z0-9_]+$/);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const migration = '20261126140000_organization_procurement';
const sql = await readFile(resolve(repo, 'apps/api/prisma/migrations', migration, 'migration.sql'), 'utf8');
const root = new PrismaClient();
const directory = await mkdtemp(join(tmpdir(), 'hydroland-f08-migration-'));
const sqlDenied = (work, codes) => assert.rejects(work, error => codes.includes(error?.meta?.code));

try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = 'f08_' + randomUUID().replaceAll('-', '');
    const organizationId = randomUUID(), accountId = randomUUID(), documentId = randomUUID(), financeId = randomUUID();
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasourceUrl: scoped.href });
    const file = join(directory, type + '.sql');
    const apply = () => execFileSync(process.execPath, [resolve(repo, 'node_modules/prisma/build/index.js'), 'db', 'execute',
      '--url', scoped.href, '--file', file], { stdio: 'pipe', timeout: 30_000 });
    try {
      for (const [table, value] of [['Organization', organizationId], ['Account', accountId], ['ManagedDocument', documentId], ['FinanceEntry', financeId]]) {
        await db.$executeRawUnsafe(`CREATE TABLE "${table}" ("id" ${type} PRIMARY KEY, "marker" TEXT NOT NULL)`);
        await db.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ($1::${type},$2)`, value, 'ORIGINAL_' + table);
      }
      await writeFile(file, `SET search_path TO "${schema}";\n${sql}\n`);
      apply();
      // Prisma db push creates the same tables and foreign keys without these
      // SQL checks. The forward migration must install them on that shape too.
      const constraints = await db.$queryRawUnsafe(`SELECT conname,conrelid::regclass::text AS table_name FROM pg_constraint
        WHERE contype='c' AND connamespace=$1::regnamespace`, schema);
      for (const row of constraints) await db.$executeRawUnsafe(`ALTER TABLE ${row.table_name} DROP CONSTRAINT "${row.conname}"`);
      apply(); apply();
      const orderData = { id: randomUUID(), organizationId, purchaseReference: 'SYN-F08-MIGRATION', contractDocumentId: documentId,
        contractVersion: 1, contractHash: 'a'.repeat(64), contractSnapshot: { synthetic: true }, supplierDocumentId: randomUUID(),
        supplierVersion: 1, supplierHash: 'b'.repeat(64), supplierSnapshot: { synthetic: true }, terms: { synthetic: true },
        authoritySnapshot: { synthetic: true }, amountMinor: 1150, currency: 'SAR', requestedByAccountId: accountId, ownerAccountId: randomUUID() };
      const order = await db.procurementOrder.create({ data: orderData });
      await assert.rejects(() => db.procurementOrder.create({ data: { ...orderData, id: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.procurementOrder.create({ data: { ...orderData, id: randomUUID(), contractDocumentId: randomUUID() } }), error => error.code === 'P2002');
      await sqlDenied(() => db.$executeRawUnsafe('UPDATE "ProcurementOrder" SET "amountMinor"=-1'), ['23514']);
      await sqlDenied(() => db.$executeRawUnsafe('UPDATE "ProcurementOrder" SET "status"=\'INVENTED\''), ['23514']);
      await sqlDenied(() => db.$executeRawUnsafe('UPDATE "ProcurementOrder" SET "invoiceSnapshot"=\'{"synthetic":true}\'::jsonb'), ['23514']);
      await db.procurementOrder.update({ where: { id: order.id }, data: { invoiceKey: '1'.repeat(64), invoiceSnapshot: { synthetic: true } } });
      await assert.rejects(() => db.procurementOrder.create({ data: { ...orderData, id: randomUUID(), contractDocumentId: randomUUID(),
        purchaseReference: 'SYN-F08-OTHER', invoiceKey: '1'.repeat(64), invoiceSnapshot: { synthetic: true } } }), error => error.code === 'P2002');
      const event = { id: randomUUID(), organizationId, orderId: order.id, requestId: randomUUID(), action: 'CREATE',
        actorAccountId: accountId, actorPersonId: randomUUID(), requestFingerprint: 'c'.repeat(64), beforeRevision: 0,
        afterRevision: 1, payload: { synthetic: true }, evidenceHash: 'd'.repeat(64), result: { id: order.id } };
      await db.procurementOrderEvent.create({ data: event });
      await assert.rejects(() => db.procurementOrderEvent.create({ data: { ...event, id: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.procurementOrderEvent.create({ data: { ...event, id: randomUUID(), requestId: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.procurementOrderEvent.create({ data: { ...event, id: randomUUID(), requestId: randomUUID(), organizationId: randomUUID() } }), error => error.code === 'P2003');
      await sqlDenied(() => db.$executeRawUnsafe('UPDATE "ProcurementOrderEvent" SET "afterRevision"=4'), ['23514']);
      const receipt = { id: randomUUID(), organizationId, orderId: order.id, documentId: randomUUID(), documentVersion: 1,
        documentHash: 'e'.repeat(64), documentSnapshot: { synthetic: true }, lines: [{ lineId: 'one', quantity: 1 }],
        receivedByAccountId: accountId, receivedByPersonId: randomUUID() };
      await db.procurementReceipt.create({ data: receipt });
      await assert.rejects(() => db.procurementReceipt.create({ data: { ...receipt, id: randomUUID() } }), error => error.code === 'P2002');
      await sqlDenied(() => db.$executeRawUnsafe('UPDATE "ProcurementReceipt" SET "lines"=\'[]\'::jsonb'), ['23514']);
      const proof = { id: randomUUID(), organizationId, orderId: order.id, kind: 'SETTLEMENT', financeEntryId: financeId,
        activeKey: order.id + ':SETTLEMENT', status: 'PREPARED', amountMinor: 1150, currency: 'SAR', preparedByAccountId: accountId };
      await db.procurementMoneyProof.create({ data: proof });
      await assert.rejects(() => db.procurementMoneyProof.create({ data: { ...proof, id: randomUUID(), financeEntryId: randomUUID() } }), error => error.code === 'P2002');
      await sqlDenied(() => db.$executeRawUnsafe('UPDATE "ProcurementMoneyProof" SET "status"=\'CONFIRMED\''), ['23514']);
      await sqlDenied(() => db.$executeRawUnsafe('UPDATE "ProcurementMoneyProof" SET "status"=\'REJECTED\''), ['23514']);
      await db.procurementMoneyProof.update({ where: { id: proof.id }, data: { status: 'CONFIRMED', approvedByAccountId: randomUUID(),
        confirmedByAccountId: randomUUID(), confirmedAt: new Date(), documentId: randomUUID(), documentVersion: 1,
        documentHash: 'f'.repeat(64), documentSnapshot: { synthetic: true }, bankReferenceKey: '0'.repeat(64), bankName: 'SYNTHETIC',
        bankReference: 'SYN-F08', transferredAt: new Date() } });
      for (const column of ['documentVersion', 'documentHash', 'bankReferenceKey']) {
        await sqlDenied(() => db.$executeRawUnsafe(`UPDATE "ProcurementMoneyProof" SET "${column}"=NULL`), ['23514']);
      }
      const snapshot = async () => ({ order: await db.procurementOrder.findMany(), events: await db.procurementOrderEvent.findMany(),
        receipts: await db.procurementReceipt.findMany(), money: await db.procurementMoneyProof.findMany() });
      const before = await snapshot();
      // PostgreSQL RESTRICT may surface through different Prisma ORM wrappers.
      // Assert the database SQLSTATE and retained evidence, not that wrapper.
      await sqlDenied(() => db.$executeRaw`DELETE FROM "ProcurementOrder" WHERE "id"=${order.id}`, ['23001', '23503']);
      assert.deepEqual(await snapshot(), before, 'A refused deletion must preserve the order and all dependent evidence.');
      apply(); assert.deepEqual(await snapshot(), before);
      for (const [table, value] of [['Organization', organizationId], ['Account', accountId], ['ManagedDocument', documentId], ['FinanceEntry', financeId]]) {
        assert.deepEqual(await db.$queryRawUnsafe(`SELECT "id"::text,"marker" FROM "${table}"`), [{ id: value, marker: 'ORIGINAL_' + table }]);
      }
      console.log(`PASS F08 migration ${type}: preserved original identities/documents/ledger, checkless bootstrap and replay, scope/event/receipt/proof uniqueness, money/status/null boundaries and unchanged history`);
    } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
} finally { await root.$disconnect(); await rm(directory, { recursive: true, force: true }); }
