import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {warehouseTestDatabase,warehouseMigration,sqlStatements} from './warehouse-location-test-support.mjs';
const url=warehouseTestDatabase(),root=new PrismaClient(),statements=sqlStatements(await warehouseMigration());
try{
 for(const orgType of ['text','uuid'])for(const accountType of ['text','uuid']){
  const schema='warehouse_'+randomUUID().replaceAll('-','');await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const scoped=new URL(url);scoped.searchParams.set('schema',schema);const db=new PrismaClient({datasourceUrl:scoped.toString()});
  try{
   await db.$executeRawUnsafe(`CREATE TABLE "Organization" ("id" ${orgType} PRIMARY KEY)`);await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${accountType} PRIMARY KEY)`);
   const org=randomUUID(),actor=randomUUID();await db.$executeRawUnsafe(`INSERT INTO "Organization" VALUES ($1::${orgType})`,org);await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${accountType})`,actor);
   for(const sql of statements)await db.$executeRawUnsafe(sql);
   assert.equal(await db.warehouseLocation.count(),0);assert.equal(await db.warehouseLocationRevision.count(),0);
   const value={organizationId:org,requestKey:randomUUID(),requestDigest:'a'.repeat(64),title:'Synthetic warehouse location',locationDescription:'Location metadata only; no stock balance evidence',code:'WH-'+randomUUID().slice(0,8).toUpperCase(),createdByAccountId:actor,recordDigest:'b'.repeat(64)};
   const row=await db.warehouseLocation.create({data:value});assert.equal((await db.warehouseLocation.findFirstOrThrow({where:{organizationId:org,createdByAccountId:actor}})).id,row.id);
   for(const change of [{status:'ACTIVE'},{status:'PUBLISHED'},{revision:0},{title:''},{locationDescription:'x'.repeat(1001)},{code:'bad code'},{code:'a'},{recordDigest:'invalid'}])await assert.rejects(()=>db.warehouseLocation.create({data:{...value,requestKey:randomUUID(),code:'WH-'+randomUUID().slice(0,8).toUpperCase(),...change}}));
   await assert.rejects(()=>db.warehouseLocation.create({data:value}));await assert.rejects(()=>db.warehouseLocation.create({data:{...value,requestKey:randomUUID()}}));
   const entry={warehouseLocationId:row.id,revision:1,snapshot:{synthetic:true},action:'WAREHOUSE_LOCATION_CREATED',reason:'Isolated migration fixture',actorAccountId:actor,recordDigest:'c'.repeat(64)};
   await db.warehouseLocationRevision.create({data:entry});await assert.rejects(()=>db.warehouseLocationRevision.create({data:entry}));
   for(const sql of ['UPDATE "WarehouseLocationRevision" SET "reason"=\'tamper\'','DELETE FROM "WarehouseLocationRevision"','TRUNCATE "WarehouseLocationRevision"'])await assert.rejects(()=>db.$executeRawUnsafe(sql));
   await assert.rejects(()=>db.$transaction(async tx=>{await tx.warehouseLocation.update({where:{id:row.id},data:{revision:2}});await tx.warehouseLocationRevision.create({data:{...entry,revision:2}});throw Error('Synthetic rollback');}));
   assert.equal((await db.warehouseLocation.findUniqueOrThrow({where:{id:row.id}})).revision,1);assert.equal(await db.warehouseLocationRevision.count(),1);
   await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Account" WHERE "id"=$1::${accountType}`,actor));await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id"=$1::${orgType}`,org));
   console.log(`PASS warehouse migration Organization=${orgType} Account=${accountType}: native Prisma, no seeds, FK/unique/state/content bounds, append-only history and atomic rollback`);
  }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
 }
}finally{await root.$disconnect();}
