import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {PrismaClient} from '@prisma/client';

const database=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
assert(process.env.NODE_ENV==='test'&&process.env.CI==='true'&&process.env.LEGAL_E2E_CONFIRM==='ISOLATED_LOOPBACK_DATABASE');
assert(['localhost','127.0.0.1','[::1]'].includes(database.hostname)&&/(?:_ci|_test)$/.test(database.pathname),'Dedicated loopback fixture database required');
const require=createRequire(import.meta.url),run=promisify(execFile),root=new PrismaClient(),migration=fileURLToPath(new URL('../prisma/migrations/20261127020000_legal_contract_lifecycle/migration.sql',import.meta.url)),prismaSchema=fileURLToPath(new URL('../prisma/schema.prisma',import.meta.url));
let checks=0;const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
try{
  for(const type of ['text','uuid']){
    const schema='b06_migration_'+type+'_'+randomUUID().replaceAll('-','');await root.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"');
    const url=new URL(database);url.searchParams.set('schema',schema);const db=new PrismaClient({datasources:{db:{url:url.href}}});
    try{
      const names=['Organization','ManagedDocument','Account','FinanceEntry'],ids=Object.fromEntries(names.map(name=>[name,type==='uuid'?randomUUID():'existing-b06-'+name.toLowerCase()]));
      for(const name of names){await db.$executeRawUnsafe(`CREATE TABLE "${name}" ("id" ${type} PRIMARY KEY, "retained" TEXT NOT NULL)`);await db.$executeRawUnsafe(`INSERT INTO "${name}" ("id","retained") VALUES ($1::${type},$2)`,ids[name],'existing-native-source');}
      const before=await Promise.all(names.map(name=>db.$queryRawUnsafe(`SELECT * FROM "${name}"`)));
      await run(process.execPath,[require.resolve('prisma/build/index.js'),'db','execute','--file',migration,'--schema',prismaSchema],{env:{...process.env,DATABASE_URL:url.href},maxBuffer:1024*1024});
      eq(await Promise.all(names.map(name=>db.$queryRawUnsafe(`SELECT * FROM "${name}"`))),before,type+': existing canonical source records are unchanged');
      const refs=[['LegalContractLifecycle','organizationId'],['LegalContractLifecycle','documentId'],['LegalContractLifecycle','createdByAccountId'],['LegalContractLifecycleEvent','actorAccountId'],['LegalContractSettlementReference','financeEntryId']];
      for(const [table,column] of refs){const rows=await db.$queryRawUnsafe('SELECT format_type(atttypid,atttypmod) AS type FROM pg_attribute WHERE attrelid=$1::regclass AND attname=$2',`"${schema}"."${table}"`,column);eq(rows[0].type,type,type+': new FK retains native scalar type');}
      const record=randomUUID(),state={schemaVersion:1,status:'OPEN',contract:{id:ids.ManagedDocument,version:1,hash:'a'.repeat(64)}};
      await db.$executeRawUnsafe(`INSERT INTO "LegalContractLifecycle" ("id","organizationId","documentId","documentVersion","documentHash","revision","digest","state","createdByAccountId","createdAt","updatedAt") VALUES ($1,$2::${type},$3::${type},1,$4,1,$5,$6::jsonb,$7::${type},'2026-11-27 00:00:00','2026-11-27 00:00:00')`,record,ids.Organization,ids.ManagedDocument,'a'.repeat(64),'b'.repeat(64),JSON.stringify(state),ids.Account);
      await db.$executeRawUnsafe(`INSERT INTO "LegalContractLifecycleEvent" ("id","organizationId","lifecycleId","commandId","actorAccountId","requestHash","action","beforeRevision","afterRevision","previousDigest","resultDigest","evidence","createdAt") VALUES ($1,$2::${type},$3,$4,$5::${type},$6,'REGISTER',0,1,NULL,$7,'{}','2026-11-27 00:00:00')`,randomUUID(),ids.Organization,record,randomUUID(),ids.Account,'c'.repeat(64),'b'.repeat(64));
      await db.$executeRawUnsafe(`INSERT INTO "LegalContractSettlementReference" ("financeEntryId","organizationId","lifecycleId","claimId","ledgerHash") VALUES ($1::${type},$2::${type},$3,$4,$5)`,ids.FinanceEntry,ids.Organization,record,randomUUID(),'d'.repeat(64));
      eq((await db.$queryRawUnsafe('SELECT "documentId"::text AS id FROM "LegalContractLifecycle"'))[0].id,ids.ManagedDocument,type+': follow-up references existing original');
      for(const sql of ['UPDATE "LegalContractLifecycleEvent" SET "action"=\'ARCHIVE\'','DELETE FROM "LegalContractSettlementReference"','DELETE FROM "LegalContractLifecycle"']){await assert.rejects(()=>db.$executeRawUnsafe(sql),/append-only|immutable/);checks++;}
      for(const sql of ['TRUNCATE "LegalContractLifecycleEvent"','TRUNCATE "LegalContractSettlementReference"','TRUNCATE "LegalContractLifecycle" CASCADE']){await assert.rejects(()=>db.$executeRawUnsafe(sql),/append-only/);checks++;}
      await assert.rejects(()=>db.$executeRawUnsafe('DELETE FROM "FinanceEntry"'),/foreign key/);checks++;
      await assert.rejects(()=>db.$executeRawUnsafe('DELETE FROM "ManagedDocument"'),/foreign key/);checks++;
      eq(await Promise.all(names.map(name=>db.$queryRawUnsafe(`SELECT * FROM "${name}"`))),before,type+': protected source rows survive all negative checks');
    }finally{await db.$disconnect();await root.$executeRawUnsafe('DROP SCHEMA "'+schema+'" CASCADE');}
  }
  console.log(`PASS B06 migration: ${checks} assertions; exact forward SQL on populated TEXT and UUID source schemas, unchanged originals, native FK types, append-only history and settlement references, deletion restrictions.`);
}finally{await root.$disconnect();}
