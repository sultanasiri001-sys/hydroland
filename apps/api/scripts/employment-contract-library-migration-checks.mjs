import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
assert(process.env.CI==='true'||process.env.NODE_ENV==='test');
assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname),'Migration checks require loopback PostgreSQL');
const db=new PrismaClient(),sql=await readFile(new URL('../prisma/migrations/20261024220000_employment_contract_library_snapshot/migration.sql',import.meta.url),'utf8');
try{for(const type of ['TEXT','UUID'])await db.$transaction(async tx=>{
 await tx.$executeRawUnsafe(`CREATE TEMP TABLE "EmploymentContract" ("id" ${type} PRIMARY KEY,"status" TEXT NOT NULL,"documentId" ${type}) ON COMMIT DROP`);
 await tx.$executeRawUnsafe(`INSERT INTO "EmploymentContract" ("id","status","documentId") VALUES ('11111111-1111-4111-8111-111111111111','SIGNED','22222222-2222-4222-8222-222222222222')`);
 await tx.$executeRawUnsafe(sql);
 const rows=await tx.$queryRawUnsafe('SELECT "id"::text,"status","documentId"::text,"librarySnapshot" FROM "EmploymentContract"');
 assert.deepEqual(rows,[{id:'11111111-1111-4111-8111-111111111111',status:'SIGNED',documentId:'22222222-2222-4222-8222-222222222222',librarySnapshot:null}]);
 await tx.$executeRawUnsafe(`UPDATE "EmploymentContract" SET "librarySnapshot"='{"kind":"test"}'::jsonb`);
 assert.deepEqual((await tx.$queryRawUnsafe('SELECT "librarySnapshot" FROM "EmploymentContract"'))[0].librarySnapshot,{kind:'test'});
});console.log('Employment contract additive migration: TEXT/UUID rows, signed status and evidence references preserved');}finally{await db.$disconnect();}
