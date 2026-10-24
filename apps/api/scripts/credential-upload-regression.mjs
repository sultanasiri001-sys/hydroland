import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { CredentialsService } from '../dist/credentials/credentials.service.js';

const service=new CredentialsService();
const badPayload=value=>assert.throws(()=>service.decode(value),error=>error.getStatus?.()===400);
for(const size of [1,2,3,1990,1_000_000,10_000_000]){
  const bytes=Buffer.alloc(size,0x61);
  assert.deepEqual(service.decode(bytes.toString('base64')),bytes);
}
assert.deepEqual(service.decode('  YQ==  '),Buffer.from('a'));
for(const value of ['', '!!!!', 'YQ', 'Y===', 'YQ=A', 'YQ==AAAA', 'YW Jj', 'YWJj\n', '-___', 'YR==']){
  if(value==='YWJj\n')continue; // Outer whitespace remains supported.
  badPayload(value);
}
badPayload(Buffer.alloc(10_000_001).toString('base64'));
badPayload('A'.repeat(13_400_004));
console.log('Credential payload boundaries passed (1 byte through 10 MB).');

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required for the migration regression test.');
const admin=new PrismaClient();
const schema='credential_upload_test_'+randomUUID().replaceAll('-','');
const url=new URL(process.env.DATABASE_URL);
url.searchParams.set('schema',schema);
const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
const migration=readFileSync(new URL('../prisma/migrations/20260929163000_document_status_enum/migration.sql',import.meta.url),'utf8');
const statuses=['UPLOADED','QUARANTINED','AVAILABLE','REJECTED','ARCHIVED'];
const inSchema=fn=>db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET LOCAL search_path TO "'+schema+'"');
  return fn(tx);
});
try{
  await admin.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"');
  await inSchema(async tx=>{
    await tx.$executeRawUnsafe(`CREATE TABLE "Document" (
      "id" UUID PRIMARY KEY,"credentialId" UUID,"ownerId" UUID NOT NULL,
      "storageKey" TEXT NOT NULL UNIQUE,"originalName" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,"byteSize" INTEGER NOT NULL,"sha256" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'UPLOADED',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"archivedAt" TIMESTAMPTZ
    )`);
    for(const status of [...statuses,'UNKNOWN_LEGACY']){
      await tx.$executeRawUnsafe(`INSERT INTO "Document"
        ("id","ownerId","storageKey","originalName","mimeType","byteSize","sha256","status")
        VALUES ($1::uuid,$2::uuid,$3,'test.pdf','application/pdf',7,$3,$4)`,
        randomUUID(),randomUUID(),randomUUID(),status);
    }
  });
  await assert.rejects(inSchema(tx=>tx.$executeRawUnsafe(migration)));
  await inSchema(async tx=>{
    const rows=await tx.$queryRawUnsafe(`SELECT "status",count(*)::int AS n FROM "Document" GROUP BY "status"`);
    assert.equal(rows.length,6,'failed conversion must retain every legacy row');
    const types=await tx.$queryRawUnsafe(`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=$1 AND t.typname='DocumentStatus'`,schema);
    assert.equal(types.length,0,'failed conversion must roll back enum creation');
    await tx.$executeRawUnsafe(`DELETE FROM "Document" WHERE "status"='UNKNOWN_LEGACY'`);
  });
  await inSchema(tx=>tx.$executeRawUnsafe(migration));
  await inSchema(tx=>tx.$executeRawUnsafe(migration));
  const rows=await db.document.findMany({orderBy:{status:'asc'}});
  assert.deepEqual(rows.map(row=>row.status),statuses);
  assert.equal(rows.length,5,'migration must preserve all valid documents');
  const created=await db.document.create({data:{
    ownerId:randomUUID(),storageKey:randomUUID(),originalName:'test.pdf',
    mimeType:'application/pdf',byteSize:7,sha256:randomUUID()
  }});
  assert.equal(created.status,'UPLOADED');
  const updated=await db.document.update({where:{id:created.id},data:{status:'AVAILABLE'}});
  assert.equal(updated.status,'AVAILABLE');
  assert.equal((await db.document.findMany({where:{status:{not:'ARCHIVED'}}})).length,5);
  console.log('Legacy Document.status migration passed: atomic failure, preservation, repeat application and Prisma create/read/update.');
}finally{
  await db.$disconnect();
  await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');
  await admin.$disconnect();
}
