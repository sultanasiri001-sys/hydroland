import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Deadline migration checks require an isolated loopback database');
const sql = await readFile(new URL('../prisma/migrations/20261119120000_customer_case_deadline/migration.sql', import.meta.url), 'utf8');
const db = new PrismaClient();
try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = 'case_deadline_' + type.toLowerCase() + '_' + randomBytes(5).toString('hex');
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    try {
      await db.$transaction(async tx => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
        await tx.$executeRawUnsafe(`CREATE TABLE "CustomerCase" ("id" ${type} PRIMARY KEY,"status" TEXT NOT NULL,"subject" TEXT NOT NULL)`);
        await tx.$executeRawUnsafe(`INSERT INTO "CustomerCase" VALUES ('11111111-1111-4111-8111-111111111111','OPEN','Preserved legacy case')`);
        for (const statement of sql.split(';').filter(value => value.trim())) await tx.$executeRawUnsafe(statement);
        const rows = await tx.$queryRawUnsafe('SELECT "id"::text AS id,"status","subject","dueAt" FROM "CustomerCase"');
        assert.deepEqual(rows, [{ id: '11111111-1111-4111-8111-111111111111', status: 'OPEN', subject: 'Preserved legacy case', dueAt: null }]);
        const columns = await tx.$queryRaw`SELECT data_type,column_default,is_nullable FROM information_schema.columns WHERE table_schema=${schema} AND table_name='CustomerCase' AND column_name='dueAt'`;
        assert.deepEqual(columns, [{ data_type: 'timestamp with time zone', column_default: null, is_nullable: 'YES' }]);
        const [index] = await tx.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname=${schema} AND indexname='CustomerCase_status_dueAt_idx'`;
        assert(index);
        const instant = new Date('2031-03-10T12:34:56.789+03:00');
        for (const zone of ['UTC', 'Asia/Riyadh']) {
          await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
          await tx.$executeRaw`UPDATE "CustomerCase" SET "dueAt"=${instant}`;
          const [record] = await tx.$queryRaw`SELECT "dueAt" FROM "CustomerCase"`;
          assert.equal(record.dueAt.toISOString(), instant.toISOString());
        }
      });
    } finally { await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
  console.log('Customer-case deadline migration passed: TEXT/UUID identities, preserved legacy rows, nullable deadline without a default, indexed status/deadline, UTC and Riyadh instant preservation.');
} finally { await db.$disconnect(); }
