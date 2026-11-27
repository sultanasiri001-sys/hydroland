import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {sqlStatements} from './internal-research-test-support.mjs';

// Disposable CI fixtures only. Production continues to use its real migration
// history and normal db:deploy. This helper never synthesizes that history.
export async function ensurePurpleTestSchema(db){
 const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
 assert(process.env.CI==='true'&&process.env.NODE_ENV==='test'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Purple fixture migrations require an isolated loopback test database.');
 await import('./bootstrap-equipment-runtime-schema.mjs');
 for(const [migration,tables] of [
  ['20261127013000_maintenance_work_orders',['MaintenancePreventivePlan','MaintenanceWorkOrder','MaintenancePartUsage','MaintenanceCommand']],
  ['20261127020000_legal_contract_lifecycle',['LegalContractLifecycle','LegalContractLifecycleEvent','LegalContractSettlementReference']],
 ]){
  const names=await db.$queryRawUnsafe('SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND tablename=ANY($1::text[])',tables);
  assert(names.length===0||names.length===tables.length,'Partial Purple fixture schema must be investigated, not silently repaired.');
  if(names.length===tables.length)continue;
  const sql=await readFile(new URL('../prisma/migrations/'+migration+'/migration.sql',import.meta.url),'utf8');
  // Standalone SQL comments can contain semicolons. Remove those comments before
  // the existing dollar-quote-aware splitter; executable migration SQL is intact.
  const statements=sqlStatements(sql.replace(/^\s*--[^\r\n]*/gm,''));
  await db.$transaction(async tx=>{for(const statement of statements)await tx.$executeRawUnsafe(statement);},{timeout:30000});
 }
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const {PrismaClient}=await import('@prisma/client'),db=new PrismaClient();
 try{await ensurePurpleTestSchema(db);console.log('Purple additive CI schemas are present; production migration history was not synthesized.');}
 finally{await db.$disconnect();}
}
