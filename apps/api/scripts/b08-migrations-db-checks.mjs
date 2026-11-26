import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const files = ['20261126100000_unified_store_orders', '20261126103000_commerce_source_finance'];
const migrations = await Promise.all(files.map(name => readFile(resolve(repo, 'apps/api/prisma/migrations', name, 'migration.sql'), 'utf8')));
const root = new PrismaClient();
const temporary = await mkdtemp(join(tmpdir(), 'hydroland-b08-migration-'));
try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = 'b08_' + randomUUID().replaceAll('-', ''), account = randomUUID(), original = randomUUID(), organization = randomUUID();
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasources: { db: { url: scoped.href } } });
    try {
      await db.$executeRawUnsafe(`CREATE TABLE "Account" (id ${type} PRIMARY KEY, marker TEXT NOT NULL)`);
      await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${type},'ORIGINAL_ACCOUNT')`, account);
      await db.$executeRawUnsafe(`CREATE TABLE "FinanceEntry" (id ${type} PRIMARY KEY, "organizationId" ${type} NOT NULL, "referenceType" TEXT NOT NULL, "referenceId" ${type} NOT NULL, marker TEXT NOT NULL)`);
      await db.$executeRawUnsafe(`INSERT INTO "FinanceEntry" VALUES ($1::${type},$2::${type},'ORIGINAL',$1::${type},'ORIGINAL_LEDGER')`, original, organization);
      const file = join(temporary, type + '.sql');
      await writeFile(file, `SET search_path TO "${schema}";\n${migrations.join('\n')}\n`);
      for (let repeat = 0; repeat < 3; repeat++) {
        execFileSync(process.execPath,
          [resolve(repo, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--url', scoped.href, '--file', file], { stdio: 'pipe' });
        if (repeat === 0) {
          // Prisma db push creates these tables without SQL CHECK constraints.
          // Reproduce that state only inside this disposable schema, then prove
          // the forward migrations add their invariants and replay unchanged.
          const checks = await db.$queryRawUnsafe(`SELECT conname,conrelid::regclass::text AS table_name FROM pg_constraint
            WHERE contype='c' AND connamespace=$1::regnamespace`, schema);
          for (const row of checks) await db.$executeRawUnsafe(`ALTER TABLE ${row.table_name} DROP CONSTRAINT "${row.conname}"`);
        }
      }
      const order = await db.unifiedStoreOrder.create({ data: { id: randomUUID(), accountId: account, requestId: randomUUID(), requestFingerprint: 'a'.repeat(64),
        totalMinor: 1000, currency: 'SAR', lines: { create: { id: randomUUID(), kind: 'GOODS', sourceType: 'STORE_ORDER', sourceId: randomUUID(),
          organizationId: organization, title: 'Synthetic original source', amountMinor: 1000, currency: 'SAR', contractSnapshot: {}, contractHash: 'b'.repeat(64) } } }, include: { lines: true } });
      await assert.rejects(() => db.unifiedStoreOrder.create({ data: { id: randomUUID(), accountId: account, requestId: order.requestId,
        requestFingerprint: order.requestFingerprint, totalMinor: 1000 } }), error => error.code === 'P2002');
      await assert.rejects(() => db.unifiedStoreOrderLine.create({ data: { ...order.lines[0], id: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "UnifiedStoreOrder" SET "totalMinor"=-1'), error => error.meta?.code === '23514');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "UnifiedStoreOrderLine" SET "kind"=\'COURSE\''), error => error.meta?.code === '23514');
      const invoice = { id: randomUUID(), sourceType: 'STORE_ORDER', sourceId: order.lines[0].sourceId, sellerId: organization, customerAccountId: account,
        number: 'SYNTHETIC-B08-1', issuedAt: new Date(), documentSha256: 'c'.repeat(64), collectionFinanceEntryId: original,
        contractHash: 'd'.repeat(64), amountMinor: 1000, taxMinor: 0, currency: 'SAR', snapshot: {}, finalizedBy: account };
      await db.commerceInvoiceFinalization.create({ data: invoice });
      await assert.rejects(() => db.commerceInvoiceFinalization.create({ data: { ...invoice, id: randomUUID(), sourceId: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "CommerceInvoiceFinalization" SET "taxMinor"=1001'), error => error.meta?.code === '23514');
      const receipt = { id: randomUUID(), financeEntryId: original, activeFinanceEntryId: original, organizationId: organization, centerOrgUnitId: randomUUID(),
        sourceType: 'STORE_ORDER', sourceId: invoice.sourceId, invoiceFinalizationId: invoice.id, bankName: 'SYNTHETIC', bankReference: 'SYNTHETIC', bankReferenceKey: 'e'.repeat(64),
        amountMinor: 1000, currency: 'SAR', transferredAt: new Date(), document: Buffer.from('%PDF-synthetic'), documentSha256: 'f'.repeat(64), evidenceSnapshot: {}, submittedBy: account };
      await db.commerceSourceTransferReceipt.create({ data: receipt });
      await assert.rejects(() => db.commerceSourceTransferReceipt.create({ data: { ...receipt, id: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "CommerceSourceTransferReceipt" SET status=\'INVENTED\''), error => error.meta?.code === '23514');
      await db.$executeRawUnsafe(`INSERT INTO "FinanceEntry" VALUES ($1::${type},$2::${type},'CENTER_STORE_ENTITLEMENT',$3::${type},'SYNTHETIC')`, randomUUID(), organization, invoice.sourceId);
      await assert.rejects(() => db.$executeRawUnsafe(`INSERT INTO "FinanceEntry" VALUES ($1::${type},$2::${type},'CENTER_STORE_ENTITLEMENT',$3::${type},'DUPLICATE')`, randomUUID(), organization, invoice.sourceId), error => error.meta?.code === '23505');
      assert.deepEqual(await db.$queryRawUnsafe('SELECT id::text,marker FROM "Account"'), [{ id: account, marker: 'ORIGINAL_ACCOUNT' }]);
      assert.deepEqual(await db.$queryRawUnsafe('SELECT id::text,marker FROM "FinanceEntry" WHERE marker=\'ORIGINAL_LEDGER\''), [{ id: original, marker: 'ORIGINAL_LEDGER' }]);
      console.log(`PASS B08 migrations: ${type} original IDs, replay after checkless bootstrap, order/source uniqueness, invoice tax bounds, receipt uniqueness, one source settlement, preserved history`);
    } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
} finally { await root.$disconnect(); await rm(temporary, { recursive: true, force: true }); }
