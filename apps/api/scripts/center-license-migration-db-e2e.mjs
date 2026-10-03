import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const url=new URL(process.env.DATABASE_URL);
if(process.env.CI!=='true'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('License migration test requires CI loopback database');
const root=new PrismaClient();
const sql=await readFile(new URL('../prisma/migrations/20261003080000_center_license_attachments/migration.sql',import.meta.url),'utf8');
const boundary=sql.indexOf('END $$;')+'END $$;'.length;
try{
  for(const type of ['text','uuid']){
    const schema='license_'+randomUUID().replaceAll('-','');
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped=new URL(url);scoped.searchParams.set('schema',schema);
    const db=new PrismaClient({datasourceUrl:scoped.toString()});
    try{
      await db.$executeRawUnsafe(`CREATE TABLE "OrganizationDocumentAsset" ("id" ${type} PRIMARY KEY)`);
      await db.$executeRawUnsafe('CREATE TABLE "AdministrativeRecord" ("id" text PRIMARY KEY)');
      await db.$executeRawUnsafe(sql.slice(0,boundary));await db.$executeRawUnsafe(sql.slice(boundary));
      const [column]=await db.$queryRaw`SELECT data_type FROM information_schema.columns WHERE table_schema=${schema} AND table_name='AdministrativeRecord' AND column_name='licenseAssetId'`;
      assert.equal(column.data_type,type);
      const asset=randomUUID();
      await db.$executeRawUnsafe(`INSERT INTO "OrganizationDocumentAsset" VALUES ($1::${type})`,asset);
      await db.$executeRawUnsafe(`INSERT INTO "AdministrativeRecord" VALUES ('valid',$1::${type},'2025-01-01','2030-01-01')`,asset);
      await assert.rejects(()=>db.$executeRawUnsafe(`INSERT INTO "AdministrativeRecord" VALUES ('foreign',$1::${type},'2025-01-01','2030-01-01')`,randomUUID()));
      await assert.rejects(()=>db.$executeRawUnsafe(`INSERT INTO "AdministrativeRecord" VALUES ('dates',$1::${type},'2030-01-01','2025-01-01')`,asset));
      await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "OrganizationDocumentAsset" WHERE "id"=$1::${type}`,asset));
      await db.$executeRawUnsafe(`INSERT INTO "AdministrativeRecord" ("id") VALUES ('legacy')`);
    }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
  }
  console.log('Center license forward migration passed: TEXT/UUID asset keys, FK integrity, expiry constraint, delete restriction and nullable legacy records.');
}finally{await root.$disconnect();}
