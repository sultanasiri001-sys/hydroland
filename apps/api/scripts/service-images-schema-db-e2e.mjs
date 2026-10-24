import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {PrismaClient} from '@prisma/client';
import {DatabaseService} from '../dist/database/database.service.js';
import {ServiceImagesService} from '../dist/service-images/service-images.service.js';
const base=new URL(process.env.DATABASE_URL??'');
assert.equal(process.env.NODE_ENV,'test');assert.ok(['localhost','127.0.0.1','::1','[::1]'].includes(base.hostname));
const root=new PrismaClient({datasourceUrl:base.toString()});
const schemaText=await readFile(new URL('../prisma/schema.prisma',import.meta.url),'utf8');
const migration=await readFile(new URL('../prisma/migrations/20261021194500_service_images/migration.sql',import.meta.url),'utf8');
const image=await sharp({create:{width:32,height:24,channels:3,background:'#18b9ce'}}).png().toBuffer();
const second=await sharp({create:{width:24,height:32,channels:3,background:'#123456'}}).jpeg().toBuffer();
const rejects=(promise,status)=>assert.rejects(promise,e=>e.getStatus?.()===status);
try{for(const keyType of ['text','uuid']){
 const schema='service_images_'+randomUUID().replaceAll('-',''),url=new URL(base);url.searchParams.set('schema',schema);
 const db=new DatabaseService({datasourceUrl:url.toString()}),run=sql=>db.$executeRawUnsafe(sql),q=s=>"'"+s.replaceAll("'","''")+"'",id=()=>randomUUID();
 try{
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  for(const name of ['AccountStatus','ProfessionalRole','RoleAssignmentStatus','OrganizationStatus','OrganizationMemberRole','OrganizationMembershipStatus']){
   const values=schemaText.match(new RegExp('enum '+name+' \\{([^}]+)\\}'))[1].split('\n').map(s=>s.trim()).filter(s=>/^[A-Z_]+$/.test(s));
   await run(`CREATE TYPE "${name}" AS ENUM (${values.map(q).join(',')})`);
  }
  await run(`CREATE TABLE "Account" (id ${keyType} PRIMARY KEY,status "AccountStatus")`);
  await run(`CREATE TABLE "Organization" (id ${keyType} PRIMARY KEY,kind text,status "OrganizationStatus")`);
  await run(`CREATE TABLE "OrganizationMember" (id ${keyType} PRIMARY KEY,"organizationId" ${keyType},"accountId" ${keyType},role "OrganizationMemberRole",status "OrganizationMembershipStatus","createdAt" timestamp DEFAULT NOW())`);
  await run(`CREATE TABLE "RoleAssignment" (id ${keyType} PRIMARY KEY,"accountId" ${keyType},role "ProfessionalRole",status "RoleAssignmentStatus")`);
  for(const table of ['Trip','StoreProduct','StoreCourseOffer'])await run(`CREATE TABLE "${table}" (id ${keyType} PRIMARY KEY,"organizationId" ${keyType},status text,"startsAt" timestamp DEFAULT NOW()+interval '30 days')`);
  await run(`CREATE TABLE "CalendarResource" (id ${keyType} PRIMARY KEY,type text)`);
  await run(`CREATE TABLE "EquipmentBarcode" ("resourceId" ${keyType},"organizationId" ${keyType})`);
  // Split around the dollar-quoted function, not its internal semicolons.
  const parts=migration.split('CREATE FUNCTION');for(const statement of parts[0].replace(/--[^\n]*/g,'').split(';').filter(s=>s.trim()))await run(statement);
  const [func,triggers]=parts[1].split('$$;');await run('CREATE FUNCTION'+func+'$$;');for(const statement of triggers.split(';').filter(s=>s.trim()))await run(statement);
  const owner=id(),other=id(),org=id(),foreign=id();
  for(const [account,organization] of [[owner,org],[other,foreign]]){
   await run(`INSERT INTO "Account" VALUES (${q(account)},'ACTIVE')`);await run(`INSERT INTO "Organization" VALUES (${q(organization)},'DIVE_CENTER','ACTIVE')`);
   await run(`INSERT INTO "RoleAssignment" VALUES (${q(id())},${q(account)},'DIVE_CENTER','ACTIVE')`);
   await run(`INSERT INTO "OrganizationMember" (id,"organizationId","accountId",role,status) VALUES (${q(id())},${q(organization)},${q(account)},'OWNER','ACTIVE')`);
  }
  const service=new ServiceImagesService(db);
  for(const [kind,table] of [['trip','Trip'],['course','StoreCourseOffer'],['product','StoreProduct'],['equipment','CalendarResource']]){
   const entity=id();if(kind==='equipment'){await run(`INSERT INTO "CalendarResource" VALUES (${q(entity)},'EQUIPMENT')`);await run(`INSERT INTO "EquipmentBarcode" VALUES (${q(entity)},${q(org)})`)}else await run(`INSERT INTO "${table}" (id,"organizationId",status) VALUES (${q(entity)},${q(org)},'DRAFT')`);
   assert.deepEqual(await service.get(owner,kind,entity),{revision:null,image:null});
   await rejects(service.save(other,kind,entity,{expectedRevision:null,base64:image.toString('base64')}),404);
   await rejects(service.save(owner,kind,entity,{expectedRevision:null,base64:Buffer.from('<svg onload="x"/>').toString('base64')}),400);
   const first=await service.save(owner,kind,entity,{expectedRevision:null,base64:image.toString('base64')});assert.ok(first.image.startsWith('data:image/webp;base64,'));
   assert.deepEqual(await service.get(owner,kind,entity),first);assert.equal(await service.publicImage(kind,entity),null);
   if(kind!=='equipment'){
    await run(`UPDATE "${table}" SET status='${kind==='trip'?'OPEN':'ACTIVE'}' WHERE id=${q(entity)}`);
    const bytes=await service.publicImage(kind,entity);assert.equal((await sharp(bytes).metadata()).format,'webp');
    await run(`UPDATE "Organization" SET status='SUSPENDED' WHERE id=${q(org)}`);assert.equal(await service.publicImage(kind,entity),null);await rejects(service.get(owner,kind,entity),403);
    await run(`UPDATE "Organization" SET status='ACTIVE' WHERE id=${q(org)}`);
   }
   const changed=await service.save(owner,kind,entity,{expectedRevision:first.revision,base64:second.toString('base64')});assert.notEqual(changed.image,first.image);
   await rejects(service.save(owner,kind,entity,{expectedRevision:first.revision},true),409);
   const deleted=await service.save(owner,kind,entity,{expectedRevision:changed.revision},true);assert.equal(deleted.image,null);assert.equal(await service.publicImage(kind,entity),null);
   await rejects(service.save(owner,kind,entity,{expectedRevision:null,base64:image.toString('base64')}),409);
   const concurrent=await Promise.allSettled([1,2].map(()=>service.save(owner,kind,entity,{expectedRevision:deleted.revision,base64:image.toString('base64')})));
   assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
   await run(`UPDATE "RoleAssignment" SET status='SUSPENDED' WHERE "accountId"=${q(owner)}`);await rejects(service.get(owner,kind,entity),403);
   await run(`UPDATE "RoleAssignment" SET status='ACTIVE' WHERE "accountId"=${q(owner)}`);
   await run(`DELETE FROM "${table}" WHERE id=${q(entity)}`);assert.equal((await db.$queryRaw`SELECT * FROM "ServiceImage" WHERE kind=${kind} AND "entityId"=${entity}`).length,0);
  }
  console.log('Service images '+keyType+': persistent add/replace/delete, public visibility, private equipment, ownership, revocation, decoding, stale/concurrent writes and cleanup passed.');
 }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)}
}}finally{await root.$disconnect()}
