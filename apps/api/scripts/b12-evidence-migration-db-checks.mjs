import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';

const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert(['127.0.0.1','localhost','[::1]'].includes(url.hostname));
assert.match(url.pathname,/^\/commerce_test_[a-z0-9_]+$/);
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM,'DISPOSABLE_LOOPBACK_ONLY');
const root = new PrismaClient();
const sql = await readFile(new URL('../prisma/migrations/20261126080000_organization_invoice_finalization_transfer_receipts/migration.sql',import.meta.url),'utf8');
const statements = sql.split(';').map(value=>value.trim()).filter(Boolean);
try {
  for (const keyType of ['TEXT','UUID']) {
    const schema = 'b12_' + randomUUID().replaceAll('-','');
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const isolated = new URL(url);isolated.searchParams.set('schema',schema);
    const db = new PrismaClient({datasources:{db:{url:isolated.href}}});
    try {
      const sourceId=randomUUID();
      for (const table of ['Payment','Invoice','FinanceEntry']) {
        await db.$executeRawUnsafe(`CREATE TABLE "${table}" (id ${keyType} PRIMARY KEY, marker TEXT NOT NULL)`);
        await db.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ($1::${keyType},'ORIGINAL_UNCHANGED')`,sourceId);
      }
      for (const statement of statements) await db.$executeRawUnsafe(statement);
      for (const statement of statements) await db.$executeRawUnsafe(statement);
      const makeFinalization = sellerId=>({id:randomUUID(),paymentId:randomUUID(),invoiceId:randomUUID(),sellerId,buyerOrganizationId:randomUUID(),
        number:'SAME-CENTER-LOCAL-NUMBER',issuedAt:new Date(),documentSha256:'a'.repeat(64),collectionEvidenceId:randomUUID(),
        collectionFinanceEntryId:randomUUID(),contractHash:'b'.repeat(64),snapshot:{fixture:true},finalizedBy:randomUUID()});
      const first=makeFinalization(randomUUID());
      await db.organizationBookingInvoiceFinalization.create({data:first});
      await db.organizationBookingInvoiceFinalization.create({data:makeFinalization(randomUUID())});
      await assert.rejects(()=>db.organizationBookingInvoiceFinalization.create({data:makeFinalization(first.sellerId)}),error=>error.code==='P2002');
      assert.equal(await db.organizationBookingInvoiceFinalization.count(),2);
      for (const table of ['Payment','Invoice','FinanceEntry']) {
        const rows=await db.$queryRawUnsafe(`SELECT id::text,marker FROM "${table}"`);
        assert.deepEqual(rows,[{id:sourceId,marker:'ORIGINAL_UNCHANGED'}]);
      }
      const columns=await db.$queryRaw`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema=${schema} AND table_name='CenterServiceTransferReceipt'`;
      assert(columns.some(row=>row.column_name==='document'&&row.data_type==='bytea'));
      assert(columns.some(row=>row.column_name==='receiptDocument'&&row.data_type==='bytea'));
      console.log(`PASS B12 additive evidence migration: ${keyType} source IDs, repeat apply, seller-local numbers, originals unchanged`);
    } finally {await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
  }
} finally {await root.$disconnect();}
