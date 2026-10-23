import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PrismaClient} from '@prisma/client';
import {prepareSchema,root} from './schema.mjs';
import {seedUat} from './seed.mjs';
import {seedFinanceFixtures} from './finance-fixtures.mjs';
import {licenseFixture} from './license-fixture.mjs';
import {CURRENT_SCHEMA_HASH,LEGACY_SCHEMA_HASH,UPGRADE_ID,UPGRADE_LEDGER_SQL,applicationTables,applicationFingerprint,
  upgradeExistingUat,verifyCurrentUat} from './upgrade.mjs';

// These tests create and delete only new, randomly named loopback CI databases.
// They must never connect to the saved Render UAT or production database.
assert.equal(process.env.GITHUB_ACTIONS,'true','Upgrade checks are GitHub Actions only');
const baseUrl=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1'].includes(baseUrl.hostname),'Upgrade checks require loopback PostgreSQL');
assert.equal(decodeURIComponent(baseUrl.pathname.slice(1)),'hydroland_center_uat');
assert(!baseUrl.searchParams.has('schema'));
const cli=createRequire(import.meta.url).resolve('prisma/build/index.js');
const admin=new PrismaClient();
let checks=0;
const checked=(condition,message)=>{assert(condition,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const legacySource=execFileSync('git',['show','88b784d08fbbbfbc13471c9a422c773dd1cd9735:apps/api/prisma/schema.prisma'],{cwd:root,encoding:'utf8'});
await mkdir(path.join(root,'.uat'),{recursive:true});
const legacySchemaPath=path.join(root,'.uat/legacy.prisma');
await writeFile(legacySchemaPath,legacySource);
const legacy=await prepareSchema({legacySchemaPath});
const current=await prepareSchema();
equal(legacy.schemaHash,LEGACY_SCHEMA_HASH,'Recreated old input matches the observed deployed UAT marker');
equal(current.schemaHash,CURRENT_SCHEMA_HASH,'Current release has the reviewed exact target hash');

async function catalog(db) {
  const tables=await db.$queryRawUnsafe(`SELECT c.relname AS name,c.relkind::text AS kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') ORDER BY c.relname`);
  const columns=await db.$queryRawUnsafe(`SELECT c.relname AS table_name,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
    a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attname`);
  const constraints=await db.$queryRawUnsafe(`SELECT t.relname AS table_name,c.conname AS name,pg_get_constraintdef(c.oid) AS definition,c.convalidated AS valid
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' ORDER BY t.relname,c.conname`);
  const indexes=await db.$queryRawUnsafe(`SELECT t.relname AS table_name,x.relname AS name,pg_get_indexdef(i.indexrelid) AS definition,i.indisvalid AS valid
    FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' ORDER BY t.relname,x.relname`);
  const triggers=await db.$queryRawUnsafe(`SELECT t.relname AS table_name,g.tgname AS name,pg_get_triggerdef(g.oid) AS definition
    FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND NOT g.tgisinternal ORDER BY t.relname,g.tgname`);
  return {tables,columns,constraints,indexes,triggers};
}
async function fixture(work) {
  const name='hydroland_center_uat_'+randomBytes(8).toString('hex');
  const url=new URL(baseUrl);url.pathname='/'+name;
  await admin.$executeRawUnsafe('CREATE DATABASE "'+name+'"');
  const db=new PrismaClient({datasourceUrl:url.toString()});
  const env={...process.env,DATABASE_URL:url.toString(),HYDROLAND_UAT_DATABASE:name,HYDROLAND_UAT_ENABLED:'true',
    HYDROLAND_UAT_PASSWORD:randomBytes(32).toString('base64url'),JWT_SECRET:randomBytes(48).toString('base64url')};
  const execute=file=>execFileSync(process.execPath,[cli,'db','execute','--file',file,'--schema',path.join(root,'apps/api/prisma/schema.prisma')],
    {cwd:root,env,encoding:'utf8',timeout:120000,stdio:'pipe'});
  const boot=({allowFailure=false}={})=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/center-uat/bootstrap.mjs'],{cwd:root,env,stdio:['ignore','pipe','pipe'],timeout:150000,killSignal:'SIGKILL'});
    let stdout='',stderr='';
    child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.once('error',reject);child.once('close',code=>allowFailure?resolve({code,stdout,stderr}):code===0?resolve(stdout):reject(new Error('Isolated bootstrap failed: '+stderr.replaceAll(url.toString(),'[redacted]'))));
  });
  try{return await work({db,env,execute,boot});}finally{
    await db.$disconnect();
    await admin.$executeRawUnsafe('DROP DATABASE "'+name+'" WITH (FORCE)');
  }
}

async function populateLegacy(db,env) {
  await seedUat(db,env.HYDROLAND_UAT_PASSWORD);
  await seedFinanceFixtures(db);
  const manager=await db.account.findUniqueOrThrow({where:{email:'manager@center-uat.hydroland.test'}});
  const accountant=await db.account.findUniqueOrThrow({where:{email:'accountant1@center-uat.hydroland.test'}});
  const center=await db.orgUnit.findFirstOrThrow({where:{code:'UAT-A'}});
  const bytes=await licenseFixture();
  const asset=await db.organizationDocumentAsset.create({data:{organizationId:center.organizationId,kind:'LICENSE_ATTACHMENT',mimeType:'application/pdf',
    byteSize:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),content:bytes}});
  await db.administrativeRecord.create({data:{organizationId:center.organizationId,unitId:center.id,type:'LICENSE',referenceNumber:'UAT-UPGRADE-PRESERVED',
    subject:'Synthetic saved attachment upgrade check',status:'REGISTERED',ownerAccountId:manager.id,licenseAssetId:asset.id,
    licenseIssuedAt:new Date('2026-01-01'),licenseExpiresAt:new Date('2030-01-01')}});
  await db.session.create({data:{accountId:manager.id,tokenHash:createHash('sha256').update(randomBytes(32)).digest('hex'),expiresAt:new Date('2030-01-01')}});
  const invoice=await db.invoice.findUniqueOrThrow({where:{number:'UAT-A-001'},include:{payment:true}});
  const captured=await db.payment.findFirstOrThrow({where:{bookingId:invoice.payment.bookingId,status:'CAPTURED',amountMinor:40000}});
  const shift=await db.financeAccountantShift.create({data:{centerOrgUnitId:center.organizationId,accountantAccountId:accountant.id,openingBalanceMinor:10000}});
  const receivable=await db.receivable.create({data:{invoiceId:invoice.id,customerAccountId:invoice.payment.accountId,centerOrgUnitId:center.id,
    totalMinor:100000,paidMinor:40000,outstandingMinor:60000,status:'PARTIALLY_PAID',dueAt:new Date('2030-01-01')}});
  const installment=await db.receivableInstallment.create({data:{receivableId:receivable.id,sequence:1,amountMinor:40000,paidMinor:40000,status:'PAID',dueAt:new Date('2030-01-01')}});
  const collection=await db.receivablePayment.create({data:{receivableId:receivable.id,installmentId:installment.id,paymentId:captured.id,amountMinor:40000,
    receiptNumber:'UAT-UPGRADE-RECEIPT',shiftId:shift.id,collectedByAccountId:accountant.id}});
  await db.financeShiftEntry.create({data:{shiftId:shift.id,type:'REVENUE',amountMinor:40000,paymentId:captured.id,referenceType:'RECEIVABLE_COLLECTION',
    referenceId:collection.id,recordedByAccountId:accountant.id}});
  const customerCase=await db.customerCase.create({data:{customerId:manager.id,organizationId:center.organizationId,type:'QUESTION',subject:'Synthetic upgrade fixture',description:'No real customer information'}});
  await db.auditEvent.create({data:{actorId:manager.personId,action:'CENTER_UAT_UPGRADE_FIXTURE_CREATED',resource:'HydrolandUatState',resourceId:'1',metadata:{synthetic:true}}});
  return {asset,bytes,customerCase,center};
}

try {
  let upgradedCatalog;
  await fixture(async f=>{
    f.execute(legacy.file);
    const preserved=await populateLegacy(f.db,f.env);
    const tables=await applicationTables(f.db);
    const originalData=await applicationFingerprint(f.db,tables);
    const upgrade=async({from=LEGACY_SCHEMA_HASH,to=CURRENT_SCHEMA_HASH,interrupt=false}={})=>f.db.$transaction(async tx=>{
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(1740152026)');
      const client=interrupt?{$queryRawUnsafe:tx.$queryRawUnsafe.bind(tx),$executeRawUnsafe:async(sql,...args)=>{
        if(sql===UPGRADE_LEDGER_SQL) throw new Error('Injected failure after all original migrations, before version evidence');
        return tx.$executeRawUnsafe(sql,...args);
      }}:tx;
      return upgradeExistingUat(client,{fromSchemaHash:from,toSchemaHash:to,env:f.env});
    },{timeout:120000});
    const refuses=async(options,pattern)=>{
      const before={schema:await catalog(f.db),data:await applicationFingerprint(f.db,await applicationTables(f.db)),state:await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatState"')};
      await assert.rejects(()=>upgrade(options),pattern);checks++;
      equal({schema:await catalog(f.db),data:await applicationFingerprint(f.db,await applicationTables(f.db)),state:await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatState"')},before,'Rejected/interrupted upgrade preserves all schema, rows and marker');
    };
    await refuses({from:'0'.repeat(64)},/unsupported schema version/);
    await refuses({to:'0'.repeat(64)},/unsupported schema version/);
    await f.db.$executeRawUnsafe('ALTER TABLE "MarineAssetDocument" ADD COLUMN "storageKey" text');
    await refuses({},/target columns already exist/);
    await f.db.$executeRawUnsafe('ALTER TABLE "MarineAssetDocument" DROP COLUMN "storageKey"');
    await f.db.$executeRawUnsafe('ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_accountId_key" UNIQUE USING INDEX "Booking_tripId_accountId_key"');
    await refuses({},/standalone UAT shape/);
    await f.db.$executeRawUnsafe('ALTER TABLE "Booking" DROP CONSTRAINT "Booking_tripId_accountId_key"');
    await f.db.$executeRawUnsafe('CREATE UNIQUE INDEX "Booking_tripId_accountId_key" ON "Booking"("tripId","accountId")');
    await f.db.$executeRawUnsafe('CREATE TABLE "UatDependentFixture" ("tripId" text,"accountId" text,FOREIGN KEY ("tripId","accountId") REFERENCES "Booking"("tripId","accountId"))');
    await refuses({},/standalone UAT shape/);
    await f.db.$executeRawUnsafe('DROP TABLE "UatDependentFixture"');
    const missingOrganization='uat-missing-organization-'+randomBytes(16).toString('hex');
    await f.db.customerCase.update({where:{id:preserved.customerCase.id},data:{organizationId:missingOrganization}});
    await refuses({},/foreign key constraint|23503/);
    const beforeFailedBoot={schema:await catalog(f.db),data:await applicationFingerprint(f.db,tables),state:await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatState"')};
    const failedBoot=await f.boot({allowFailure:true});
    equal(failedBoot.code,1,'Actual failed bootstrap exits nonzero');
    equal(failedBoot.stdout,'','Failed bootstrap does not claim completion');
    for(const sensitive of [missingOrganization,f.env.DATABASE_URL,f.env.HYDROLAND_UAT_PASSWORD,f.env.JWT_SECRET]) {
      checked(!failedBoot.stderr.includes(sensitive),'Failed bootstrap omits record identifiers and secrets');
    }
    equal(failedBoot.stderr.trim(),JSON.stringify({event:'center_uat_failed',synthetic:true,stage:'schema_upgrade',code:'UAT_BOOTSTRAP_FAILED'}),'Failure emits only fixed stage/code fields without a raw exception');
    equal({schema:await catalog(f.db),data:await applicationFingerprint(f.db,tables),state:await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatState"')},beforeFailedBoot,'Actual failed bootstrap rolls back schema, rows and marker');
    await f.db.customerCase.update({where:{id:preserved.customerCase.id},data:{organizationId:preserved.center.organizationId,updatedAt:preserved.customerCase.updatedAt}});
    await refuses({interrupt:true},/Injected failure/);
    equal(await applicationFingerprint(f.db,tables),originalData,'Negative controls restore exact starting data');
    const boots=await Promise.all([f.boot(),f.boot()]);
    equal(boots.filter(output=>output.includes('center_uat_schema_upgraded')).length,1,'Concurrent startup upgrades once');
    await verifyCurrentUat(f.db,CURRENT_SCHEMA_HASH);
    equal(await applicationFingerprint(f.db,tables,true),originalData,'Every original row/byte remains unchanged across real bootstrap upgrade');
    const ledger=await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatUpgrade"');
    equal(ledger.length,1,'One genuine UAT version record');
    equal(ledger[0].id,UPGRADE_ID,'Exact reviewed upgrade recorded');
    const saved=await f.db.organizationDocumentAsset.findUniqueOrThrow({where:{id:preserved.asset.id}});
    checked(Buffer.from(saved.content).equals(preserved.bytes),'Registered license bytes preserved');
    const beforeRestart={data:await applicationFingerprint(f.db,tables,true),ledger,state:await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatState"')};
    checked(!(await f.boot()).includes('center_uat_schema_upgraded'),'Following startup is a no-op upgrade');
    equal({data:await applicationFingerprint(f.db,tables,true),ledger:await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatUpgrade"'),state:await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatState"')},beforeRestart,'Restart preserves rows, marker and applied timestamp');
    upgradedCatalog=await catalog(f.db);
    const originalBooking=await f.db.booking.findFirstOrThrow();
    await assert.rejects(()=>f.db.booking.create({data:{tripId:originalBooking.tripId,accountId:originalBooking.accountId,status:'PENDING'}}),error=>error.code==='P2002');checks++;
    await f.db.booking.create({data:{tripId:originalBooking.tripId,accountId:originalBooking.accountId,status:'CANCELLED'}});
    const orgBooking=await f.db.booking.create({data:{tripId:originalBooking.tripId,accountId:originalBooking.accountId,organizationId:preserved.center.organizationId,status:'PENDING',bookingRequestKey:randomUUID()}});
    await assert.rejects(()=>f.db.booking.create({data:{tripId:originalBooking.tripId,accountId:originalBooking.accountId,organizationId:orgBooking.organizationId,status:'PENDING'}}),error=>error.code==='P2002');checks++;
    await assert.rejects(()=>f.db.booking.create({data:{tripId:originalBooking.tripId,accountId:originalBooking.accountId,organizationId:'uat-missing-organization',status:'PENDING'}}),error=>error.code==='P2003');checks++;
    checked((await f.db.$queryRawUnsafe(`SELECT to_regclass('public."_prisma_migrations"') IS NULL AS absent`))[0].absent,'No fabricated production migration history');
  });
  await fixture(async f=>{
    await f.boot();
    await verifyCurrentUat(f.db,CURRENT_SCHEMA_HASH);
    equal(await catalog(f.db),upgradedCatalog,'Fresh current bootstrap and preserved legacy upgrade have the same full logical catalog');
    equal(await f.db.$queryRawUnsafe('SELECT * FROM "HydrolandUatUpgrade"'),[],'Fresh bootstrap does not claim historical upgrade execution');
  });
  console.log(JSON.stringify({suite:'center-uat-preserved-upgrade',checks,synthetic:true,productionWrites:0,externalProviderCalls:0}));
} finally {await admin.$disconnect();}
