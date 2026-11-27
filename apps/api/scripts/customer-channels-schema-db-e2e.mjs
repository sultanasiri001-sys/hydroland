import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
const url=new URL(process.env.DATABASE_URL||'postgresql://missing');
assert(['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.pathname==='/customer_channels_test'
  &&process.env.CUSTOMER_CHANNEL_DB_TEST_CONFIRM==='DISPOSABLE_LOOPBACK_ONLY','Requires disposable loopback customer_channels_test');
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..'),tmp=await mkdtemp(resolve(tmpdir(),'customer-channels-schema-'));
const migrations=resolve(here,'../prisma/migrations'),db=new PrismaClient();
const [pushMigration,channelsMigration,fixture]=await Promise.all([
  readFile(resolve(migrations,'20261123034000_session_push_registration/migration.sql'),'utf8'),
  readFile(resolve(migrations,'20261127113000_customer_notice_channels/migration.sql'),'utf8'),
  readFile(resolve(here,'customer-channels-schema-fixture.sql'),'utf8')
]);
let count=0;
try{
  for(const accountType of ['text','uuid'])for(const sessionType of ['text','uuid'])for(const eventType of ['text','uuid']){
    const schema='b07_channels_'+randomUUID().replaceAll('-','');
    const preamble=`CREATE SCHEMA ${schema}; SET search_path TO ${schema},public;
      CREATE TABLE "Account" (id ${accountType} PRIMARY KEY);
      CREATE TABLE "Session" (id ${sessionType} PRIMARY KEY,"accountId" ${accountType} NOT NULL REFERENCES "Account"(id),"revokedAt" timestamp(3),"expiresAt" timestamp(3) NOT NULL,"tokenHash" text NOT NULL);
      CREATE TABLE "Booking" (id ${eventType} PRIMARY KEY,"accountId" ${accountType} NOT NULL REFERENCES "Account"(id),status text NOT NULL);
      CREATE TABLE "Notification" (id ${eventType} PRIMARY KEY,"accountId" ${accountType} NOT NULL REFERENCES "Account"(id),type text NOT NULL,payload jsonb NOT NULL,"createdAt" timestamp(3) NOT NULL DEFAULT timezone('UTC',CURRENT_TIMESTAMP));
      CREATE TABLE "CustomerNoticeEmail" (id text PRIMARY KEY,event text NOT NULL,"sourceType" text NOT NULL,"sourceId" text NOT NULL,"accountId" text NOT NULL);
    `;
    const sql=preamble+pushMigration+'\n'+channelsMigration+'\n'+fixture.replaceAll('__SCHEMA__',schema).replaceAll('__ACCOUNT_TYPE__',accountType);
    const file=resolve(tmp,`matrix-${++count}.sql`);await writeFile(file,sql);
    try{
      execFileSync(process.execPath,[resolve(root,'node_modules/prisma/build/index.js'),'db','execute','--schema',resolve(here,'../prisma/schema.prisma'),'--file',file],{cwd:root,env:process.env,stdio:'pipe',timeout:60000});
      console.log(`PASS customer channel schema: Account ${accountType}; Session ${sessionType}; Booking/Notification ${eventType}`);
    }finally{await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);}
  }
  console.log(`PASS ${count} additive native identity combinations; explicit consent, canonical source, event/device dedup, privacy constraints and revocation.`);
}finally{await db.$disconnect();await rm(tmp,{recursive:true,force:true});}
