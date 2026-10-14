import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const url = new URL(process.env.DATABASE_URL);
if (process.env.CI !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Migration check requires CI loopback PostgreSQL');
const root = new PrismaClient();
const sql = (await readFile(new URL('../prisma/migrations/20261005130000_organization_booking_safety/migration.sql', import.meta.url), 'utf8')).replace(/--[^\n]*/g, '');
const caseSql = await readFile(new URL('../prisma/migrations/20261005090000_customer_case_organization_relation/migration.sql', import.meta.url), 'utf8');
// The migration has a single DO block; preserve its internal semicolons.
const begin = sql.indexOf('DO $$'), end = sql.indexOf('END $$;') + 'END $$;'.length;
const statements = [...sql.slice(0, begin).split(';'), sql.slice(begin, end), ...sql.slice(end).split(';')].map(value => value.trim()).filter(value => value.replace(/--[^\n]*/g, '').trim());
try {
  for (const organizationType of ['text', 'uuid']) for (const bookingType of ['text', 'uuid']) {
    const schema = 'org_booking_' + randomUUID().replaceAll('-', '');
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasourceUrl: scoped.toString() });
    try {
      await db.$executeRawUnsafe(`CREATE TABLE "Organization" ("id" ${organizationType} PRIMARY KEY)`);
      await db.$executeRawUnsafe(`CREATE TABLE "CustomerCase" ("id" text PRIMARY KEY, "organizationId" ${organizationType})`);
      await db.$executeRawUnsafe(`CREATE TABLE "Booking" ("id" ${bookingType} PRIMARY KEY, "tripId" text NOT NULL, "accountId" text NOT NULL, "status" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT NOW())`);
      await db.$executeRawUnsafe('CREATE UNIQUE INDEX "Booking_tripId_accountId_key" ON "Booking"("tripId","accountId")');
      await db.$executeRawUnsafe('CREATE TABLE "SafetyIncident" ("id" text PRIMARY KEY, "status" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT NOW())');
      const organization = randomUUID(), legacyBooking = randomUUID();
      await db.$executeRawUnsafe(`INSERT INTO "Organization" VALUES ($1::${organizationType})`, organization);
      await db.$executeRawUnsafe(`INSERT INTO "Booking" ("id","tripId","accountId","status") VALUES ($1::${bookingType},'trip-1','contact','PENDING')`, legacyBooking);
      await db.$executeRawUnsafe(`INSERT INTO "CustomerCase" VALUES ('personal',NULL),('organization',$1::${organizationType})`, organization);
      await db.$executeRawUnsafe(caseSql);
      for (const statement of statements) await db.$executeRawUnsafe(statement);
      const columns = await db.$queryRawUnsafe(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=$1 AND (table_name='Booking' AND column_name='organizationId' OR table_name='SafetyIncident' AND column_name='bookingId')`, schema);
      assert.equal(columns.find(row => row.table_name === 'Booking').data_type, organizationType);
      assert.equal(columns.find(row => row.table_name === 'SafetyIncident').data_type, bookingType);
      const insert = (id, trip, account, status, org = null, key = null) => db.$executeRawUnsafe(`INSERT INTO "Booking" ("id","tripId","accountId","status","organizationId","bookingRequestKey") VALUES ($1::${bookingType},$2,$3,$4,$5::${organizationType},$6)`, id, trip, account, status, org, key);
      const organizationBooking = randomUUID();
      await insert(organizationBooking, 'trip-1', 'contact', 'PENDING', organization, 'request-1');
      await assert.rejects(() => insert(randomUUID(), 'trip-1', 'another-contact', 'CONFIRMED', organization, 'request-2'));
      await assert.rejects(() => insert(randomUUID(), 'trip-1', 'contact', 'PENDING'));
      await insert(randomUUID(), 'trip-1', 'contact', 'CANCELLED');
      await db.$executeRawUnsafe(`UPDATE "Booking" SET "status"='CANCELLED' WHERE "id"=$1::${bookingType}`, organizationBooking);
      await insert(randomUUID(), 'trip-1', 'another-contact', 'PENDING', organization, 'request-2');
      await assert.rejects(() => insert(randomUUID(), 'trip-2', 'another-contact', 'PENDING', organization, 'request-1'));
      await assert.rejects(() => insert(randomUUID(), 'trip-3', 'contact', 'PENDING', randomUUID(), 'request-3'));
      await db.$executeRawUnsafe(`INSERT INTO "SafetyIncident" ("id","status","bookingId") VALUES ('report','OPEN',$1::${bookingType})`, organizationBooking);
      await assert.rejects(() => db.$executeRawUnsafe(`INSERT INTO "SafetyIncident" ("id","status","bookingId") VALUES ('invalid','OPEN',$1::${bookingType})`, randomUUID()));
      await assert.rejects(() => db.$executeRawUnsafe(`DELETE FROM "Booking" WHERE "id"=$1::${bookingType}`, organizationBooking));
      await assert.rejects(() => db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id"=$1::${organizationType}`, organization));
      const old = await db.$queryRawUnsafe(`SELECT "organizationId","bookingRequestKey" FROM "Booking" WHERE "id"=$1::${bookingType}`, legacyBooking);
      assert.deepEqual(old, [{ organizationId: null, bookingRequestKey: null }]);
      assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CustomerCase"'))[0].count, 2);
      console.log(`Organization migration passed: organization=${organizationType}, booking=${bookingType}; legacy rows, uniqueness, cancelled history, request keys and foreign keys`);
    } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
} finally { await root.$disconnect(); }
