import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {sqlStatements} from './warehouse-location-test-support.mjs';
const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
if(process.env.NODE_ENV!=='test'||process.env.C05_E2E_CONFIRM!=='ISOLATED_LOOPBACK_DATABASE'||!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/hydroland_form_library_ci')throw Error('Dedicated isolated loopback C05 test database required');
const statements=sqlStatements(await readFile(new URL('../prisma/migrations/20261127013000_maintenance_work_orders/migration.sql',import.meta.url),'utf8')),root=new PrismaClient();
try{
 for(const type of ['text','uuid']){
  const schema='c05_'+randomUUID().replaceAll('-','');await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);const scoped=new URL(url);scoped.searchParams.set('schema',schema);const db=new PrismaClient({datasourceUrl:scoped.href});
  try{
   for(const table of ['Organization','Account','Person','MarineAsset','MarineMaintenanceRecord','CalendarResource'])await db.$executeRawUnsafe(`CREATE TABLE "${table}" ("id" ${type} PRIMARY KEY)`);
   // B05 can retain a TEXT organization key even with historical UUID core IDs.
   await db.$executeRawUnsafe('CREATE TABLE "WarehouseIssuePosting" ("organizationId" TEXT,"requestId" TEXT,PRIMARY KEY("organizationId","requestId"))');
   for(const statement of statements)await db.$executeRawUnsafe(statement);
   const tables=await db.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_name LIKE 'Maintenance%'`,schema);assert.equal(tables.length,4);
   for(const table of tables)assert.equal((await db.$queryRawUnsafe(`SELECT COUNT(*)::int n FROM "${table.table_name}"`))[0].n,0);
   const org=randomUUID(),actor=randomUUID(),person=randomUUID(),asset=randomUUID(),native=randomUUID();
   for(const [table,id] of [['Organization',org],['Account',actor],['Person',person],['MarineAsset',asset],['MarineMaintenanceRecord',native]])await db.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ($1::${type})`,id);
   const id=randomUUID(),payload={id,organizationId:org,marineAssetId:asset,maintenanceRecordId:native,status:'REQUESTED',metadata:{synthetic:true}};
   await db.$executeRaw`INSERT INTO "MaintenanceWorkOrder"("id","organizationId","marineAssetId","maintenanceRecordId","status","metadata") SELECT x."id",x."organizationId",x."marineAssetId",x."maintenanceRecordId",x."status",x."metadata" FROM jsonb_populate_record(NULL::"MaintenanceWorkOrder",${JSON.stringify(payload)}::jsonb) x`;
   const command={organizationId:org,requestId:id,subjectId:id,action:'REQUESTED',actorId:actor,actorPersonId:person,requestDigest:'a'.repeat(64),result:payload};
   await db.$executeRaw`INSERT INTO "MaintenanceCommand"("organizationId","requestId","subjectId","action","actorId","actorPersonId","requestDigest","result") SELECT x."organizationId",x."requestId",x."subjectId",x."action",x."actorId",x."actorPersonId",x."requestDigest",x."result" FROM jsonb_populate_record(NULL::"MaintenanceCommand",${JSON.stringify(command)}::jsonb) x`;
   const issue=randomUUID();await db.$executeRaw`INSERT INTO "WarehouseIssuePosting" VALUES(${org},${issue})`;await db.$executeRaw`INSERT INTO "MaintenancePartUsage"("organizationId","issueRequestId","workOrderId","snapshot") VALUES(${org},${issue},${id},'{}')`;
   for(const table of ['MaintenanceCommand','MaintenancePartUsage'])for(const action of [`DELETE FROM "${table}"`,`TRUNCATE "${table}"`])await assert.rejects(db.$executeRawUnsafe(action),/append-only/);
   await assert.rejects(db.$executeRawUnsafe('UPDATE "MaintenanceWorkOrder" SET "status"=\'FORGED\''));
   await assert.rejects(db.$executeRawUnsafe('UPDATE "MaintenanceWorkOrder" SET "marineAssetId"=NULL'));
   await assert.rejects(db.$executeRawUnsafe('UPDATE "MaintenanceWorkOrder" SET "startsAt"=NOW()'));
   await assert.rejects(db.$executeRawUnsafe('UPDATE "MaintenanceWorkOrder" SET "status"=\'CLOSED\''));
   await assert.rejects(db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id"=$1::${type}`,org));
   await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`UPDATE "MaintenanceWorkOrder" SET "status"='APPROVED' WHERE "id"=${id}`;throw Error('Synthetic rollback');}));
   assert.equal((await db.$queryRaw`SELECT "status" FROM "MaintenanceWorkOrder" WHERE "id"=${id}`)[0].status,'REQUESTED');
   console.log(`PASS exact C05 migration ${type} canonical identities: empty tables, source FKs, native JSON insert casts, state/XOR checks, immutable usage/history and rollback`);
  }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
 }
}finally{await root.$disconnect();}
