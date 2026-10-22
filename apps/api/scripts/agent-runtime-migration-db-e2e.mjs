import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const url=new URL(process.env.DATABASE_URL);
assert(process.env.CI==='true'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Agent migration fixtures require CI loopback PostgreSQL');
const root=new PrismaClient(),source=await readFile(new URL('../prisma/migrations/20261022190000_ai_agent_runtime/migration.sql',import.meta.url),'utf8');
const boundary=source.indexOf('END $migration$;')+'END $migration$;'.length;
const parts=[source.slice(0,boundary),...source.slice(boundary).split(';').map(s=>s.trim()).filter(Boolean)];
try{for(const type of ['text','uuid']){
 const schema='agent_'+randomUUID().replaceAll('-','');await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);const scoped=new URL(url);scoped.searchParams.set('schema',schema);const db=new PrismaClient({datasourceUrl:scoped.toString()});
 try{
  await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${type} PRIMARY KEY)`);
  const actor=randomUUID();await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${type})`,actor);
  for(const sql of parts)await db.$executeRawUnsafe(sql);
  await db.$executeRawUnsafe(`INSERT INTO "AiAgentRuntime" ("key","revision","updatedAt","lastAdminAccountId") VALUES ('SUPPORT','revision',NOW(),$1::${type})`,actor);
  const task=randomUUID();await db.$executeRawUnsafe(`INSERT INTO "AiAgentTask" ("id","agentKey","requestedByAccountId","requestKey","fingerprint","action","language","prompt","revision","updatedAt") VALUES ($1,'SUPPORT',$2::${type},'request','hash','DRAFT_MESSAGE','ar-SA','fixture','revision',NOW())`,task,actor);
  await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Account" WHERE "id"=$1::${type}`,actor));
  await assert.rejects(()=>db.$executeRawUnsafe(`UPDATE "AiAgentTask" SET "reservedCostMicroUsd"=-1 WHERE "id"=$1`,task));
  await assert.rejects(()=>db.$executeRawUnsafe(`UPDATE "AiAgentRuntime" SET "state"='UNKNOWN' WHERE "key"='SUPPORT'`));
  await assert.rejects(()=>db.$executeRawUnsafe(`INSERT INTO "AiAgentTask" ("id","agentKey","requestedByAccountId","requestKey","fingerprint","action","language","prompt","revision","updatedAt") VALUES ('duplicate','SUPPORT',$1::${type},'request','hash','DRAFT_MESSAGE','ar-SA','fixture','revision',NOW())`,actor));
  const rows=await db.$queryRawUnsafe('SELECT "state","reservedCostMicroUsd" FROM "AiAgentTask" WHERE "id"=$1',task);assert.equal(rows[0].state,'QUEUED');assert.equal(rows[0].reservedCostMicroUsd,0);
  await assert.rejects(()=>db.$transaction(async tx=>{await tx.$executeRawUnsafe('UPDATE "AiAgentTask" SET "state"=\'RUNNING\' WHERE "id"=$1',task);throw new Error('rollback');}));
  assert.equal((await db.$queryRawUnsafe('SELECT "state" FROM "AiAgentTask" WHERE "id"=$1',task))[0].state,'QUEUED');
 }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
}console.log('AI runtime forward migration passed: TEXT/UUID canonical accounts, preserved identities, FKs, idempotency constraint, state/cost bounds and transaction rollback.');}finally{await root.$disconnect();}
