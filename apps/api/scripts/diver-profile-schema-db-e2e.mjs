import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

// Exercise the deployed UUID account foreign key in a private, disposable local schema.
// The regular HTTP/DB suite separately covers the canonical text-key schema.
const url=new URL(process.env.DATABASE_URL||'postgresql://missing');
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Diver schema E2E requires a local test database');
const schema='diver_profile_e2e_'+randomUUID().replaceAll('-','');
assert(/^diver_profile_e2e_[a-f0-9]+$/.test(schema));
const require=createRequire(import.meta.url);
const {DatabaseService}=require('../dist/database/database.service.js');
const {DiverMasterProfileService}=require('../dist/profile/diver-master-profile.service.js');
const admin=new PrismaClient();
url.searchParams.set('schema',schema);
const db=new DatabaseService({datasources:{db:{url:url.href}}});
const events=[];
const service=new DiverMasterProfileService(db,{decision:async()=>({bypass:true,enforce:false,review:false,state:'DISABLED'})},{record:async event=>events.push(event)});
let created=false;
try{
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);created=true;
  await db.$executeRaw`CREATE TABLE "Account" ("id" UUID PRIMARY KEY)`;
  const migration=await readFile(new URL('../prisma/migrations/20260914224000_diver_master_profile/migration.sql',import.meta.url),'utf8');
  for(const statement of migration.split('ALTER TABLE "BookingParticipant"')[0].split(';').map(s=>s.trim()).filter(Boolean))await db.$executeRawUnsafe(statement);
  const [{data_type:type}]=await db.$queryRaw`SELECT data_type FROM information_schema.columns WHERE table_schema=${schema} AND table_name='DiverProfile' AND column_name='accountId'`;
  assert.equal(type,'uuid','Fixture must use the production foreign-key type');
  const accountId=randomUUID();
  await db.$executeRaw`INSERT INTO "Account" ("id") VALUES (${accountId}::uuid)`;
  const initial={dateOfBirth:'1995-05-20',nationality:'SA',identityLast4:'1234',primaryPhone:'0500000000',preferredLanguage:'en',medicalFitnessStatus:'FIT',emergencyName:'Emergency',emergencyPhone:'0500000001',notes:'Keep omitted fields'};
  await service.upsert(accountId,initial);
  let result=await service.upsert(accountId,{primaryPhone:'0555555555'});
  assert.equal(result.profile.accountId,accountId);assert.equal(result.profile.primaryPhone,'0555555555');
  assert.equal(result.profile.identityLast4,'1234');assert.equal(result.profile.preferredLanguage,'en');
  assert.equal(result.profile.medicalFitnessStatus,'FIT');assert.equal(result.profile.notes,initial.notes);
  assert.equal(result.profile.dateOfBirth.toISOString(),'1995-05-20T00:00:00.000Z');
  await Promise.all([service.upsert(accountId,{nationality:'SA-UPDATED'}),service.upsert(accountId,{primaryPhone:'0566666666'})]);
  result=await service.get(accountId);
  assert.equal(result.profile.nationality,'SA-UPDATED');assert.equal(result.profile.primaryPhone,'0566666666');
  await assert.rejects(()=>service.upsert(accountId,{emergencyPhone:null}),error=>error.getStatus?.()===400);
  result=await service.upsert(accountId,{notes:null,emergencyName:null,emergencyPhone:null});
  assert.equal(result.profile.notes,null);assert.equal(result.profile.emergencyName,null);assert.equal(result.profile.emergencyPhone,null);
  assert.equal(events.at(-1).metadata.preferredLanguage,'en');assert.equal(events.at(-1).metadata.medicalFitnessStatus,'FIT');
  const secondId=randomUUID();await db.$executeRaw`INSERT INTO "Account" ("id") VALUES (${secondId}::uuid)`;
  await Promise.all([service.upsert(secondId,{nationality:'SA'}),service.upsert(secondId,{primaryPhone:'0500000002'})]);
  result=await service.get(secondId);
  assert.equal(result.profile.nationality,'SA');assert.equal(result.profile.primaryPhone,'0500000002');
  result=await service.addEquipment(accountId,{category:'REGULATOR',brand:'Schema Test'});
  const equipmentId=result.equipment[0].id;
  result=await service.updateEquipment(accountId,equipmentId,{model:'Persisted',status:'INACTIVE'});
  assert.equal(result.equipment[0].model,'Persisted');assert.equal(result.equipment[0].status,'INACTIVE');
  await assert.rejects(()=>service.updateEquipment(secondId,equipmentId,{model:'Foreign update'}),error=>error.getStatus?.()===404);
  assert.equal((await service.get(accountId)).equipment[0].model,'Persisted');
  console.log('Diver profile production-schema PostgreSQL E2E passed: native UUID account key, omitted-field preservation, explicit clearing, contact validation, concurrent create/update, audit state and equipment ownership.');
}finally{
  await db.$disconnect();
  if(created)await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.$disconnect();
}
