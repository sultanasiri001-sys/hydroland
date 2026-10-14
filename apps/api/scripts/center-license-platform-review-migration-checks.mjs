import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const url=new URL(process.env.DATABASE_URL);
if(process.env.CI!=='true'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Migration check requires CI loopback DB');
const root=new PrismaClient(),sql=await readFile(new URL('../prisma/migrations/20261004000000_center_license_platform_review/migration.sql',import.meta.url),'utf8');
const boundary=sql.indexOf('END $$;')+7,index=sql.indexOf('CREATE INDEX');
try{for(const type of ['text','uuid']){
 const schema='platform_'+randomUUID().replaceAll('-','');await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);const scoped=new URL(url);scoped.searchParams.set('schema',schema);const db=new PrismaClient({datasourceUrl:scoped.toString()});
 try{
  await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${type} PRIMARY KEY)`);await db.$executeRawUnsafe('CREATE TABLE "AdministrativeRecord" ("id" text PRIMARY KEY)');
  for(const part of [sql.slice(0,boundary),sql.slice(boundary,index),sql.slice(index)])await db.$executeRawUnsafe(part);
  const submitter=randomUUID(),reviewer=randomUUID();await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${type}),($2::${type})`,submitter,reviewer);
  await db.$executeRawUnsafe(`INSERT INTO "AdministrativeRecord" ("id") VALUES ('legacy')`);
  await db.$executeRawUnsafe(`INSERT INTO "AdministrativeRecord" ("id","licenseReviewStatus","licenseReviewSubmittedById","licenseReviewSubmittedAt") VALUES ('pending','PENDING',$1::${type},NOW())`,submitter);
  await assert.rejects(()=>db.$executeRawUnsafe(`UPDATE "AdministrativeRecord" SET "licenseReviewStatus"='REJECTED' WHERE "id"='pending'`));
  await assert.rejects(()=>db.$executeRawUnsafe(`UPDATE "AdministrativeRecord" SET "licenseReviewStatus"='APPROVED',"licenseReviewDecidedById"=$1::${type},"licenseReviewDecidedAt"=NOW() WHERE "id"='pending'`,submitter));
  await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Account" WHERE "id"=$1::${type}`,submitter));
  await db.$executeRawUnsafe(`UPDATE "AdministrativeRecord" SET "licenseReviewStatus"='REJECTED',"licenseReviewDecidedById"=$1::${type},"licenseReviewDecidedAt"=NOW(),"licenseReviewReason"='Expired license' WHERE "id"='pending'`,reviewer);
 }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)}
}console.log('Platform license migration: TEXT/UUID account keys, legacy rows, decision constraints and FKs pass.')}finally{await root.$disconnect()}
