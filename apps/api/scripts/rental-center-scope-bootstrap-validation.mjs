import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PrismaClient} from '@prisma/client';

assert.notEqual(process.env.NODE_ENV,'production');
const base=new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'Bootstrap validation requires disposable loopback databases');
const admin=new PrismaClient({datasourceUrl:base.toString()});
let checked=0;
try{
  for(const type of ['TEXT','UUID']){
    const name='rental_scope_'+type.toLowerCase()+'_'+randomBytes(6).toString('hex');
    const url=new URL(base);url.pathname='/'+name;
    let db;
    try{
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      db=new PrismaClient({datasourceUrl:url.toString()});
      await db.$executeRawUnsafe(`CREATE TABLE "Organization"("id" ${type} PRIMARY KEY)`);
      await db.$executeRawUnsafe('CREATE TABLE "CalendarResource"("id" TEXT PRIMARY KEY)');
      const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./bootstrap-equipment-runtime-schema.mjs',import.meta.url))],{
        env:{...process.env,DATABASE_URL:url.toString(),NODE_ENV:'test'},encoding:'utf8',timeout:30000,
      });
      const first=run();assert.equal(first.status,0,(first.stderr||first.stdout).slice(-2000));checked++;
      const id=randomUUID(),resourceId=randomUUID();
      if(type==='UUID')await db.$executeRaw`INSERT INTO "Organization"("id") VALUES(${id}::uuid)`;
      else await db.$executeRaw`INSERT INTO "Organization"("id") VALUES(${id})`;
      await db.$executeRaw`INSERT INTO "CalendarResource"("id") VALUES(${resourceId})`;
      await db.$executeRawUnsafe(`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","organizationId") VALUES($1,$2,$3,$3,$3,$4${type==='UUID'?'::uuid':''})`,randomUUID(),resourceId,'SYN-'+randomUUID(),id);
      const before=await db.$queryRaw`SELECT row_to_json(b)::text AS row FROM "EquipmentBarcode" b`;
      const replay=run();assert.equal(replay.status,0,(replay.stderr||replay.stdout).slice(-2000));
      const after=await db.$queryRaw`SELECT row_to_json(b)::text AS row FROM "EquipmentBarcode" b`;
      assert.deepEqual(after,before,'Replaying center-scope bootstrap must preserve existing ownership and every barcode field');checked++;
      const [column]=await db.$queryRaw`SELECT udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='EquipmentBarcode' AND column_name='organizationId'`;
      assert.equal(column.udt_name,type.toLowerCase());checked++;
      if(type==='TEXT'){
        await db.$executeRawUnsafe('ALTER TABLE "EquipmentBarcode" DROP CONSTRAINT "EquipmentBarcode_organizationId_fkey"');
        await db.$executeRawUnsafe('ALTER TABLE "EquipmentBarcode" ALTER COLUMN "organizationId" TYPE UUID USING "organizationId"::uuid');
        const driftBefore=await db.$queryRaw`SELECT row_to_json(b)::text AS row FROM "EquipmentBarcode" b`;
        const refused=run();assert.notEqual(refused.status,0);assert.match(refused.stderr,/different identity type; no data was altered/);
        assert.deepEqual(await db.$queryRaw`SELECT row_to_json(b)::text AS row FROM "EquipmentBarcode" b`,driftBefore);checked++;
      }
    }finally{
      if(db)await db.$disconnect();
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    }
  }
  console.log(JSON.stringify({result:'PASS',checks:checked,identityTypes:['TEXT','UUID'],existingOwnershipPreserved:true,driftRefusedWithoutDataChange:true}));
}finally{await admin.$disconnect();}
