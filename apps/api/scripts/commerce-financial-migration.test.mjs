// Apply the actual additive migration against TEXT and native UUID FK fixtures.
// No production database is accepted and no provider is contacted.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const prismaCli = resolve(repositoryRoot, 'node_modules/prisma/build/index.js');
const migrationPath = resolve(repositoryRoot, 'apps/api/prisma/migrations/20261121040000_commerce_contract_refund_operations/migration.sql');
const migration = await readFile(migrationPath, 'utf8');
const checkoutMigrationPath = resolve(repositoryRoot, 'apps/api/prisma/migrations/20261121041500_commerce_checkout_journal/migration.sql');
const checkoutMigration = await readFile(checkoutMigrationPath, 'utf8');
const temporary = await mkdtemp(resolve(tmpdir(), 'hydroland-commerce-migration-'));
let passed = 0;
const paymentId = '10000000-0000-4000-8000-000000000001';
const financeEntryId = '20000000-0000-4000-8000-000000000001';
const operation = (id = 'operation-1', entry = financeEntryId) => `INSERT INTO "CommerceRefundOperation" ("id","paymentId","financeEntryId","requestAuditEventId","idempotencyKey","requestFingerprint","organizationId","requestedByAccountId","approvedByAccountId","executedByAccountId","amountMinor","currency","baselineRefundedMinor","providerPaymentId","providerInvoiceId","policyDecision","updatedAt") VALUES ('${id}','${paymentId}','${entry}','audit','key-${id}','fingerprint','center','requester','approver','executor',2500,'SAR',0,'provider-payment','provider-invoice','{}',CURRENT_TIMESTAMP)`;
function executeFile(file) {
  execFileSync(process.execPath, [prismaCli, 'db', 'execute', '--url', url.toString(), '--file', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = `commerce_migration_${type.toLowerCase()}`;
    const setup = `CREATE SCHEMA "${schema}"; SET search_path TO "${schema}";
CREATE TABLE "Payment" ("id" ${type} PRIMARY KEY, "amountMinor" INTEGER NOT NULL, "legacyEvidence" TEXT NOT NULL);
CREATE TABLE "Booking" ("id" TEXT PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
CREATE TABLE "Invoice" ("id" TEXT PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
CREATE TABLE "StoreOrderItem" ("id" TEXT PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
CREATE TABLE "FinanceEntry" ("id" ${type} PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
INSERT INTO "Payment" VALUES ('${paymentId}',10000,'preserve-payment');
INSERT INTO "Booking" VALUES ('booking-1','preserve-booking');
INSERT INTO "Invoice" VALUES ('invoice-1','preserve-invoice');
INSERT INTO "StoreOrderItem" VALUES ('item-1','preserve-item');
INSERT INTO "FinanceEntry" VALUES ('${financeEntryId}','preserve-ledger');
`;
    const setupPath = resolve(temporary, `${type}-before.sql`), migratedPath = resolve(temporary, `${type}-migration.sql`);
    await writeFile(setupPath, setup); await writeFile(migratedPath, `SET search_path TO "${schema}";\n${migration}\n${checkoutMigration}`);
    executeFile(setupPath); executeFile(migratedPath);
    const scopedUrl = new URL(url); scopedUrl.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasources: { db: { url: scopedUrl.toString() } } });
    try {
      const oldPayment = await db.$queryRawUnsafe('SELECT "id"::text AS "id","amountMinor","legacyEvidence","contractSnapshot","refundedAmountMinor" FROM "Payment"');
      assert.deepEqual(oldPayment, [{ id: paymentId, amountMinor: 10000, legacyEvidence: 'preserve-payment', contractSnapshot: null, refundedAmountMinor: 0 }]);
      const oldInvoice = await db.$queryRawUnsafe('SELECT * FROM "Invoice"');
      assert.deepEqual(oldInvoice, [{ id: 'invoice-1', legacyEvidence: 'preserve-invoice', contractSnapshot: null }]);
      const oldBooking = await db.$queryRawUnsafe('SELECT * FROM "Booking"');
      assert.deepEqual(oldBooking, [{ id: 'booking-1', legacyEvidence: 'preserve-booking', contractSnapshot: null }]);
      const oldItem = await db.$queryRawUnsafe('SELECT * FROM "StoreOrderItem"');
      assert.deepEqual(oldItem, [{ id: 'item-1', legacyEvidence: 'preserve-item', contractSnapshot: null, actualReceivedAt: null }]);
      passed++; console.log('PASS', type, 'preserves prior payment/invoice/item data and leaves legacy policies null');
      const columns = await db.$queryRawUnsafe('SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=$1 AND ((table_name=\'CommerceRefundOperation\' AND column_name IN (\'paymentId\',\'financeEntryId\')) OR (table_name=\'CommerceCollectionEvidence\' AND column_name=\'financeEntryId\')) ORDER BY table_name,column_name', schema);
      assert.equal(columns.length, 3); assert.ok(columns.every(row => row.data_type === (type === 'TEXT' ? 'text' : 'uuid')));
      await db.$executeRawUnsafe(operation());
      await assert.rejects(() => db.$executeRawUnsafe(operation('other-op')), e => e.meta?.code === '23505');
      await assert.rejects(() => db.$executeRawUnsafe('DELETE FROM "Payment" WHERE "id"::text=$1', paymentId), e => ['23503','23001'].includes(e.meta?.code));
      await assert.rejects(() => db.$executeRawUnsafe('DELETE FROM "FinanceEntry" WHERE "id"::text=$1', financeEntryId), e => ['23503','23001'].includes(e.meta?.code));
      passed++; console.log('PASS', type, 'aligns all three FK types, enforces links and unique ledger operation');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "Payment" SET "refundedAmountMinor"=10001'), e => e.meta?.code === '23514');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "CommerceRefundOperation" SET "amountMinor"=0'), e => e.meta?.code === '23514');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "CommerceRefundOperation" SET "status"=\'MADE_UP\''), e => e.meta?.code === '23514');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "CommerceRefundOperation" SET "executedByAccountId"="approvedByAccountId"'), e => e.meta?.code === '23514');
      passed++; console.log('PASS', type, 'bounds refunded totals, amounts, statuses and segregation of duties');
      const grantCount = await db.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM "FinanceOperationGrant"');
      assert.equal(grantCount[0].count, 0, 'migration never seeds financial authority');
      await assert.rejects(() => db.$executeRawUnsafe(`INSERT INTO "FinanceOperationGrant" ("id","organizationId","accountId","operation","currency","limitMinor","validFrom","validUntil","approvedByAccountId","approvalEvidenceReference") VALUES ('grant','center','delegate','EXECUTE_REFUND','SAR',1000,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP - INTERVAL '1 day','owner','evidence')`), e => e.meta?.code === '23514');
      await assert.rejects(() => db.$executeRawUnsafe(`INSERT INTO "CommerceCollectionEvidence" ("id","sourceType","sourceId","organizationId","customerAccountId","amountMinor","currency","provider","providerPaymentId","providerInvoiceId","providerCapturedMinor","providerRefundedMinor","providerVerifiedAt","providerSnapshot","financeEntryId","contractSnapshot") VALUES ('evidence','TRIP_BOOKING','booking','center','buyer',10001,'SAR','MOYASAR','payment','invoice',10000,0,CURRENT_TIMESTAMP,'{}','${financeEntryId}','{}')`), e => e.meta?.code === '23514');
      passed++; console.log('PASS', type, 'does not seed authority and rejects invalid mandate and collection totals');
      const checkout = (id = 'checkout-1', source = 'rental-1', key = 'key-1', invoice = 'invoice-1') => `INSERT INTO "CommerceCheckout" ("id","sourceType","sourceId","organizationId","customerAccountId","amountMinor","currency","idempotencyKey","requestFingerprint","providerInvoiceId","contractSnapshot","updatedAt") VALUES ('${id}','EQUIPMENT_RENTAL','${source}','center','customer',2500,'SAR','${key}','fingerprint','${invoice}','{}',CURRENT_TIMESTAMP)`;
      await db.$executeRawUnsafe(checkout());
      await assert.rejects(() => db.$executeRawUnsafe(checkout('checkout-source-duplicate', 'rental-1', 'key-2', 'invoice-2')), e => e.meta?.code === '23505');
      await assert.rejects(() => db.$executeRawUnsafe(checkout('checkout-key-duplicate', 'rental-2', 'key-1', 'invoice-2')), e => e.meta?.code === '23505');
      await assert.rejects(() => db.$executeRawUnsafe(checkout('checkout-invoice-duplicate', 'rental-2', 'key-2', 'invoice-1')), e => e.meta?.code === '23505');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "CommerceCheckout" SET "amountMinor"=0'), e => e.meta?.code === '23514');
      await assert.rejects(() => db.$executeRawUnsafe(`UPDATE "CommerceCheckout" SET "status"='PAID_WITHOUT_VERIFICATION'`), e => e.meta?.code === '23514');
      const checkoutRows = await db.$queryRawUnsafe('SELECT "status","dispatchedAt","providerPaymentId" FROM "CommerceCheckout"');
      assert.deepEqual(checkoutRows, [{status: 'RESERVED', dispatchedAt: null, providerPaymentId: null}]);
      passed++; console.log('PASS', type, 'checkout journal enforces source, idempotency and provider binding without faking capture');
    } finally { await db.$disconnect(); }
  }
  console.log(JSON.stringify({ suite: 'commerce-financial-migration', passed, failed: 0, migrationSha256: createHash('sha256').update(migration).digest('hex'), checkoutMigrationSha256: createHash('sha256').update(checkoutMigration).digest('hex'), identifierTypes: ['TEXT', 'UUID'], providerCalls: 0, productionWrites: 0 }));
} finally { await rm(temporary, { recursive: true, force: true }); }
