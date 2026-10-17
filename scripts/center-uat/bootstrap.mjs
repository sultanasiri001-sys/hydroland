import {PrismaClient} from '@prisma/client';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {assertUatEnvironment} from './guard.mjs';
import {prepareSchema, root} from './schema.mjs';
import {seedUat} from './seed.mjs';
import {seedFinanceFixtures} from './finance-fixtures.mjs';

const {database} = assertUatEnvironment();
const {file, schemaHash} = await prepareSchema();
const db = new PrismaClient();
try {
  const identity = await db.$queryRaw`SELECT current_database() AS name`;
  if (identity[0].name !== database) throw new Error('UAT_CONNECTED_DATABASE_MISMATCH');
  // Serialize bootstrap/restart operations on this dedicated database.
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1740152026)`;
    const marker = await tx.$queryRaw`SELECT to_regclass('public."HydrolandUatState"')::text AS name`;
    if (marker[0].name) {
      const state = await tx.$queryRaw`SELECT "schemaHash" FROM "HydrolandUatState" WHERE id=1`;
      if (state.length !== 1 || state[0].schemaHash !== schemaHash) throw new Error('UAT_SCHEMA_VERSION_MISMATCH');
    } else {
      const objects = await tx.$queryRaw`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S')`;
      if (objects[0].count) throw new Error('UAT_EXISTING_DATABASE_DENIED');
      const result = spawnSync(process.execPath, [path.join(root,'node_modules/prisma/build/index.js'),'db','execute','--file',file,'--schema',path.join(root,'apps/api/prisma/schema.prisma')], {stdio:['ignore','pipe','pipe'],env:process.env});
      if (result.status !== 0) throw new Error('UAT_SCHEMA_CREATION_FAILED: '+String(result.stderr).replaceAll(process.env.DATABASE_URL,'[redacted]'));
    }
  }, {timeout:120000});
  await seedUat(db, process.env.HYDROLAND_UAT_PASSWORD);
  await seedFinanceFixtures(db);
  console.log(JSON.stringify({event:'center_uat_ready',synthetic:true,schemaHash}));
} finally { await db.$disconnect(); }
