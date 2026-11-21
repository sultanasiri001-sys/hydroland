import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {readFile} from 'node:fs/promises';
const db=new PrismaClient();
const sql=await readFile(new URL('../prisma/migrations/20261009183000_unified_store_offerings/migration.sql',import.meta.url),'utf8');
const stock=await readFile(new URL('../prisma/migrations/20261121223500_store_location_stock/migration.sql',import.meta.url),'utf8');
try{
 for(const type of ['TEXT','UUID']){
  const schema='store_offer_migration_'+type.toLowerCase();
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  try{
   await db.$transaction(async tx=>{
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    await tx.$executeRawUnsafe(`CREATE TABLE "Organization" ("id" ${type} PRIMARY KEY)`);
    await tx.$executeRawUnsafe('CREATE TABLE "StoreProduct" ("id" TEXT PRIMARY KEY,"status" TEXT)');
    await tx.$executeRawUnsafe('CREATE TABLE "TrainingEnrollment" ("id" TEXT PRIMARY KEY,"studentAccountId" TEXT,"status" TEXT)');
    await tx.$executeRawUnsafe(`CREATE TYPE "StoreProductStatus" AS ENUM ('DRAFT','ACTIVE','INACTIVE')`);
    // Use a deterministic boundary that preserves the single DO statement.
    const start=sql.indexOf('DO $$'),end=sql.indexOf('END $$;')+7;
    for(const statement of sql.slice(0,start).split(';').filter(s=>s.trim()))await tx.$executeRawUnsafe(statement);
    await tx.$executeRawUnsafe(sql.slice(start,end));
    for(const statement of sql.slice(end).split(';').filter(s=>s.trim()))await tx.$executeRawUnsafe(statement);
    const id='12345678-1234-4234-8234-123456789012';
    await tx.$executeRawUnsafe(`INSERT INTO "Organization" ("id") VALUES ('${id}')`);
    await tx.$executeRawUnsafe(`INSERT INTO "StoreProduct" ("id","organizationId") VALUES ('goods','${id}')`);
    await tx.$executeRawUnsafe(`INSERT INTO "StoreCourseOffer" ("id","organizationId","courseCode","title","description","locationName","startsAt","endsAt","capacity","priceMinor","updatedAt") VALUES ('course','${id}','OW','course','','site',NOW(),NOW()+INTERVAL '1 day',1,0,NOW())`);
    await tx.$executeRawUnsafe(`INSERT INTO "TrainingEnrollment" ("id","storeCourseOfferId") VALUES ('enrollment','course')`);
    const columns=await tx.$queryRawUnsafe(`SELECT data_type FROM information_schema.columns WHERE table_schema='${schema}' AND table_name='StoreProduct' AND column_name='organizationId'`);
    assert.equal(columns[0].data_type,type.toLowerCase());
    for(const table of ['OrgUnit','Account'])await tx.$executeRawUnsafe(`CREATE TABLE "${table}" (id ${type} PRIMARY KEY)`);
    for(const statement of stock.split(';').filter(s=>s.trim()))await tx.$executeRawUnsafe(statement);
    await tx.$executeRawUnsafe(`INSERT INTO "Account"(id) VALUES ('${id}')`);
    await tx.$executeRawUnsafe(`INSERT INTO "StoreStockLocation"(id,"organizationId",code,title) VALUES ('loc','${id}','A','Site')`);
    await tx.$executeRawUnsafe(`INSERT INTO "StoreStockBalance"("productId","locationId",quantity) VALUES ('goods','loc',2)`);
    await tx.$executeRawUnsafe(`INSERT INTO "StoreStockTransfer"(id,"productId","actorId","organizationId","sourceKey","destinationKey",quantity) VALUES ('move','goods','${id}','${id}','ONLINE','loc',2)`);
    const [transfer]=await tx.$queryRawUnsafe(`SELECT quantity FROM "StoreStockTransfer" WHERE id='move'`);assert.equal(transfer.quantity,2);
    await tx.$executeRawUnsafe(`INSERT INTO "StoreStockCount"(id,"productId","actorId","organizationId","locationKey","expectedQuantity","countedQuantity",reason) VALUES ('count','goods','${id}','${id}','loc',2,1,'Damaged')`);
    const [count]=await tx.$queryRawUnsafe(`SELECT "expectedQuantity","countedQuantity" FROM "StoreStockCount" WHERE id='count'`);
    assert.deepEqual(count,{expectedQuantity:2,countedQuantity:1});
   });
  }finally{await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)}
 }
 console.log('Unified store forward migration passed on TEXT and UUID organization keys.');
}finally{await db.$disconnect()}
