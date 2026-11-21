import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sql = await readFile(resolve(root, 'apps/api/prisma/migrations/20261121110000_rental_refund_operations/migration.sql'), 'utf8');
const cancellationSql = await readFile(resolve(root, 'apps/api/prisma/migrations/20261121140000_rental_refund_reservation_cancellation/migration.sql'), 'utf8');
const temporary = await mkdtemp(resolve(tmpdir(), 'rental-refund-migration-'));
const financeId = '10000000-0000-4000-8000-000000000001';
let passed = 0;
try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = `rental_refund_migration_${type.toLowerCase()}`;
    const path = resolve(temporary, type + '.sql');
    await writeFile(path, `CREATE SCHEMA "${schema}"; SET search_path TO "${schema}";
CREATE TABLE "FinanceEntry" ("id" ${type} PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
CREATE TABLE "CommerceCheckout" ("id" TEXT PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
CREATE TABLE "CommerceCollectionEvidence" ("id" TEXT PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
CREATE TABLE "EquipmentRental" ("id" TEXT PRIMARY KEY, "legacyEvidence" TEXT NOT NULL);
INSERT INTO "FinanceEntry" VALUES ('${financeId}','preserve-ledger');
INSERT INTO "CommerceCheckout" VALUES ('checkout','preserve-checkout');
INSERT INTO "CommerceCollectionEvidence" VALUES ('collection','preserve-collection');
INSERT INTO "EquipmentRental" VALUES ('rental','preserve-rental');
${sql}`);
    execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--url', url.toString(), '--file', path], { stdio: ['ignore', 'pipe', 'pipe'] });
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasources: { db: { url: scoped.toString() } } });
    try {
      for (const table of ['FinanceEntry', 'CommerceCheckout', 'CommerceCollectionEvidence', 'EquipmentRental']) {
        const rows = await db.$queryRawUnsafe(`SELECT "legacyEvidence" FROM "${table}"`);
        assert.equal(rows.length, 1); assert.ok(rows[0].legacyEvidence.startsWith('preserve-'));
      }
      assert.equal(await db.rentalRefundOperation.count(), 0);
      passed++; console.log('PASS', type, 'additive migration preserves all financial and rental originals without seeding execution');
      const entry = await db.rentalRefundOperation.create({ data: { id: 'operation', checkoutId: 'checkout', rentalId: 'rental', collectionEvidenceId: 'collection', financeEntryId: financeId,
        requestAuditEventId: 'request', idempotencyKey: 'key', requestFingerprint: 'fingerprint', organizationId: 'center',
        requestedByAccountId: 'preparer', approvedByAccountId: 'approver', executedByAccountId: 'executor', amountMinor: 2500, currency: 'SAR', baselineRefundedMinor: 0,
        providerPaymentId: 'payment', providerInvoiceId: 'invoice', policyDecision: {} } });
      assert.equal(entry.status, 'RESERVED');
      const columns = await db.$queryRawUnsafe(`SELECT udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='RentalRefundOperation' AND column_name='financeEntryId'`, schema);
      assert.equal(columns[0].udt_name, type === 'UUID' ? 'uuid' : 'text');
      for (const change of [ { amountMinor: 0 }, { currency: 'USD' }, { approvedByAccountId: 'preparer' }, { executedByAccountId: 'approver' }, { resultingRefundedMinor: 2501 }, { status: 'PAID_BY_LABEL' } ]) {
        await assert.rejects(db.rentalRefundOperation.update({ where: { id: entry.id }, data: change }));
      }
      passed++; console.log('PASS', type, 'real insert and amount, currency, state, exact-result and separation constraints');
      await writeFile(path, `SET search_path TO "${schema}";\n${cancellationSql}`);
      execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--url', url.toString(), '--file', path], { stdio: ['ignore', 'pipe', 'pipe'] });
      assert.deepEqual(await db.rentalRefundOperation.findUniqueOrThrow({ where: { id: entry.id } }), entry);
      await db.rentalRefundOperation.update({ where: { id: entry.id }, data: { status: 'CANCELLED' } });
      for (const change of [{ dispatchedAt: new Date() }, { providerResult: { source: 'REFUND_POST_RESPONSE' } }, { confirmedAt: new Date() }, { resultingRefundedMinor: 2500 }]) {
        await assert.rejects(db.rentalRefundOperation.update({ where: { id: entry.id }, data: change }));
      }
      passed++; console.log('PASS', type, 'forward cancellation migration preserves the reservation and disallows dispatch or proof on a cancelled journal');
      for (const [table, id] of [['FinanceEntry', financeId], ['CommerceCheckout', 'checkout'], ['CommerceCollectionEvidence', 'collection'], ['EquipmentRental', 'rental']]) {
        await assert.rejects(db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id"::text=$1`, id), error => ['23503', '23001'].includes(error.meta?.code));
      }
      const duplicate = { ...entry, id: 'duplicate', idempotencyKey: 'other' };
      await assert.rejects(db.rentalRefundOperation.create({ data: duplicate }), error => error.code === 'P2002');
      passed++; console.log('PASS', type, 'all source foreign keys restrict deletion and a ledger entry cannot fund two operations');
    } finally { await db.$disconnect(); }
  }
  console.log(JSON.stringify({ suite: 'rental-refund-migration', passed, failed: 0, identityTypes: ['TEXT', 'UUID'], productionWrites: 0, financialActions: 0 }));
} finally { await rm(temporary, { recursive: true, force: true }); }
