import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {DatabaseService} from '../dist/database/database.service.js';
import {BookingManagementService} from '../dist/trips/booking-management.service.js';

const base = new URL(process.env.DATABASE_URL ?? '');
assert.equal(process.env.NODE_ENV, 'test');
assert.ok(['localhost', '127.0.0.1', '::1', '[::1]'].includes(base.hostname), 'Requires an isolated loopback database');
const root = new PrismaClient({datasourceUrl: base.toString()});
try {
  for (const keyType of ['text', 'uuid']) {
    const schema = 'booking_search_' + randomUUID().replaceAll('-', '');
    const url = new URL(base); url.searchParams.set('schema', schema);
    const db = new DatabaseService({datasourceUrl: url.toString()});
    const run = sql => db.$executeRawUnsafe(sql);
    const literal = value => "'" + value.replaceAll("'", "''") + "'";
    const id = () => (keyType === 'text' ? 'text_' : '') + randomUUID();
    try {
      await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      assert.equal((await db.$queryRaw`SELECT current_schema() AS name`)[0].name, schema);
      await run(`CREATE TABLE "Person" (id ${keyType} PRIMARY KEY,"firstName" text,"lastName" text)`);
      await run(`CREATE TABLE "Account" (id ${keyType} PRIMARY KEY,"personId" ${keyType},status text)`);
      await run(`CREATE TABLE "Organization" (id ${keyType} PRIMARY KEY,kind text,status text)`);
      await run(`CREATE TABLE "OrganizationMember" (id ${keyType} PRIMARY KEY,"organizationId" ${keyType},"accountId" ${keyType},role text,status text,"createdAt" timestamp DEFAULT NOW())`);
      await run(`CREATE TABLE "RoleAssignment" (id ${keyType} PRIMARY KEY,"accountId" ${keyType},role text,status text,scope jsonb,"activeAt" timestamp,"endedAt" timestamp,"createdAt" timestamp DEFAULT NOW(),"updatedAt" timestamp DEFAULT NOW())`);
      await run(`CREATE TABLE "Trip" (id ${keyType} PRIMARY KEY,"organizationId" ${keyType},title text,type text,status text,capacity int,"startsAt" timestamp DEFAULT NOW(),"endsAt" timestamp DEFAULT NOW(),"createdAt" timestamp DEFAULT NOW(),"updatedAt" timestamp DEFAULT NOW())`);
      await run(`CREATE TABLE "Booking" (id ${keyType} PRIMARY KEY,"tripId" ${keyType},"accountId" ${keyType},"organizationId" ${keyType},"bookingRequestKey" text,"bookingRequestFingerprint" text,status text,seats int,"createdAt" timestamp DEFAULT NOW(),"updatedAt" timestamp DEFAULT NOW())`);
      const manager=id(), customer=id(), org=id(), foreignOrg=id(), trip=id(), foreignTrip=id();
      const first=id(), second=id(), foreign=id(), marine=id(), marineOrg=id(), marineTrip=id(), marineBooking=id();
      for (const account of [manager,customer,marine]) {
        await run(`INSERT INTO "Person" VALUES (${literal(account)},'سالم','الغواص')`);
        await run(`INSERT INTO "Account" VALUES (${literal(account)},${literal(account)},'ACTIVE')`);
      }
      for (const [account,organization,kind,role] of [[manager,org,'DIVE_CENTER','DIVE_CENTER'],[marine,marineOrg,'MARINE_OPERATOR','BOAT_OWNER']]) {
        await run(`INSERT INTO "Organization" VALUES (${literal(organization)},'${kind}','ACTIVE')`);
        await run(`INSERT INTO "OrganizationMember" (id,"organizationId","accountId",role,status) VALUES (${literal(id())},${literal(organization)},${literal(account)},'OWNER','ACTIVE')`);
        await run(`INSERT INTO "RoleAssignment" (id,"accountId",role,status) VALUES (${literal(id())},${literal(account)},'${role}','ACTIVE')`);
      }
      await run(`INSERT INTO "Organization" VALUES (${literal(foreignOrg)},'DIVE_CENTER','ACTIVE')`);
      for (const [t,o] of [[trip,org],[foreignTrip,foreignOrg],[marineTrip,marineOrg]])
        await run(`INSERT INTO "Trip" (id,"organizationId",title,type,status,capacity) VALUES (${literal(t)},${literal(o)},'اكتشاف الساحل','SHORE','OPEN',10)`);
      for (const [b,t,status] of [[first,trip,'PENDING'],[second,trip,'CONFIRMED'],[foreign,foreignTrip,'PENDING'],[marineBooking,marineTrip,'PENDING']])
        await run(`INSERT INTO "Booking" (id,"tripId","accountId",status,seats) VALUES (${literal(b)},${literal(t)},${literal(customer)},'${status}',1)`);
      const service = new BookingManagementService(db);
      const list = query => service.listCenter(manager,query);
      for (const q of ['اكتشاف الساحل','سالم الغواص']) {
        const result = await list({q,pageSize:'1'});
        assert.equal(result.total,2); assert.equal(result.items.length,1); assert.equal(result.totalPages,2);
        assert.equal(result.counts.reduce((sum,row)=>sum+row.count,0),2);
        assert.ok([first,second].includes(result.items[0].id));
        const filtered=await list({q,status:'CONFIRMED'});
        assert.deepEqual(filtered.items.map(row=>row.id),[second]);
        assert.equal(filtered.counts.reduce((sum,row)=>sum+row.count,0),2);
      }
      for (const q of [first,first.slice(-12).toUpperCase()]) assert.deepEqual((await list({q})).items.map(row=>row.id),[first]);
      for (const q of [foreign,marineBooking,'not-found','%','\\',"' OR 1=1 --"]) assert.equal((await list({q})).total,0);
      assert.equal((await list({q:'اكتشاف',tripId:trip})).total,2);
      await assert.rejects(list({q:'اكتشاف',tripId:foreignTrip}),error=>error.getStatus()===404);
      const marineResult=await service.listMarineTrip(marine,marineTrip,{q:'اكتشاف'});
      assert.deepEqual(marineResult.items.map(row=>row.id),[marineBooking]);
      assert.equal((await service.listMarineTrip(marine,marineTrip,{q:first})).total,0);
      assert.equal((await list({q:'',page:'999'})).page,1);
      await run(`UPDATE "RoleAssignment" SET status='SUSPENDED' WHERE "accountId"=${literal(manager)}`);
      await assert.rejects(list({q:'اكتشاف'}),error=>error.getStatus()===403);
      console.log(`PASS booking search ${keyType}: title, full name, full/partial ID, literal input, scope, pagination, counts, status, marine, revocation`);
    } finally {
      await db.$disconnect();
      await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  }
} finally { await root.$disconnect(); }
