import {PrismaClient} from '@prisma/client';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {assertUatEnvironment} from './guard.mjs';
import {prepareSchema, root} from './schema.mjs';
import {seedUat} from './seed.mjs';
import {seedFinanceFixtures} from './finance-fixtures.mjs';
import {CURRENT_SCHEMA_HASH, upgradeExistingUat, verifyCurrentUat} from './upgrade.mjs';

let db;
let upgrade;
let stage='environment';
const failureCodes=new Set(['UAT_UNREVIEWED_TARGET_SCHEMA','UAT_CONNECTED_DATABASE_MISMATCH',
  'UAT_SCHEMA_VERSION_MISMATCH','UAT_EXISTING_DATABASE_DENIED','UAT_SCHEMA_CREATION_FAILED']);
const reportFailure=(stage,error)=>{
  // Database/child-process exceptions can contain query detail or connection
  // metadata. Keep the process boundary to fixed, source-controlled fields.
  const code=failureCodes.has(error?.message)?error.message:'UAT_BOOTSTRAP_FAILED';
  console.error(JSON.stringify({event:'center_uat_failed',synthetic:true,stage,code}));
  process.exitCode=1;
};
try {
  const {database} = assertUatEnvironment();
  stage='schema_prepare';
  const {file, schemaHash} = await prepareSchema();
  if(schemaHash!==CURRENT_SCHEMA_HASH) throw new Error('UAT_UNREVIEWED_TARGET_SCHEMA');
  stage='database_identity';
  db = new PrismaClient();
  const identity = await db.$queryRaw`SELECT current_database() AS name`;
  if (identity[0].name !== database) throw new Error('UAT_CONNECTED_DATABASE_MISMATCH');
  // Serialize bootstrap/restart operations on this dedicated database.
  stage='schema_inspect';
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1740152026)`;
    const marker = await tx.$queryRaw`SELECT to_regclass('public."HydrolandUatState"')::text AS name`;
    if (marker[0].name) {
      const state = await tx.$queryRaw`SELECT "schemaHash" FROM "HydrolandUatState" WHERE id=1`;
      if (state.length !== 1) throw new Error('UAT_SCHEMA_VERSION_MISMATCH');
      if (state[0].schemaHash !== schemaHash) {
        stage='schema_upgrade';
        upgrade=await upgradeExistingUat(tx,{fromSchemaHash:state[0].schemaHash,toSchemaHash:schemaHash});
      }
    } else {
      const objects = await tx.$queryRaw`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S')`;
      if (objects[0].count) throw new Error('UAT_EXISTING_DATABASE_DENIED');
      stage='schema_create';
      const result = spawnSync(process.execPath, [path.join(root,'node_modules/prisma/build/index.js'),'db','execute','--file',file,'--schema',path.join(root,'apps/api/prisma/schema.prisma')], {stdio:['ignore','pipe','pipe'],env:process.env});
      if (result.status !== 0) throw new Error('UAT_SCHEMA_CREATION_FAILED');
    }
    stage='schema_verify';
    await verifyCurrentUat(tx,schemaHash);
  }, {timeout:120000});
  if(upgrade) console.log(JSON.stringify({event:'center_uat_schema_upgraded',synthetic:true,...upgrade}));
  stage='identity_seed';
  await seedUat(db, process.env.HYDROLAND_UAT_PASSWORD);
  stage='finance_seed';
  await seedFinanceFixtures(db);
  console.log(JSON.stringify({event:'center_uat_ready',synthetic:true,schemaHash}));
} catch (error) {
  reportFailure(stage,error);
} finally {
  try { await db?.$disconnect(); } catch { reportFailure('disconnect'); }
}
