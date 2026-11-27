import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');
assert.equal(process.env.A15_DB_TEST_CONFIRM,'DISPOSABLE_LOOPBACK_ONLY');
const database=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1','[::1]'].includes(database.hostname));assert.match(database.pathname,/^\/a15_erasure_test(?:_[a-z0-9_]+)?$/);
assert.equal(database.search,'');assert.equal(database.hash,'');
const require=createRequire(import.meta.url),root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const load=path=>require(resolve(root,'apps/api/dist',path));
const {PrismaClient}=require('@prisma/client');
let postgresBin=process.env.A15_POSTGRES_BIN??'';
const command=name=>postgresBin?resolve(postgresBin,name):name;
const localDb=new PrismaClient(),objects=new Map(),checks=[],startedAt=new Date().toISOString();
let postgresTools=null;
let app,db,base,store,storeOrigin,failure,restoreDb,restoreName,blockedPhase=null,failAfterWrite=false;
const originalEnv=new Map();
function env(k,v){if(!originalEnv.has(k))originalEnv.set(k,process.env[k]);if(v===undefined)delete process.env[k];else process.env[k]=v;}
function expect(r,status,label=''){assert.equal(r.status,status,label+' '+JSON.stringify(r.data));return r.data;}
async function check(name,fn){try{await fn();checks.push({name,status:'PASS'});console.log('A15 PASS '+name);}catch(e){checks.push({name,status:'FAIL'});throw e;}}
async function call(actor,path,method='GET',body){const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(actor?{authorization:'Bearer '+actor.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
const text=async request=>{const parts=[];for await(const part of request)parts.push(part);return Buffer.concat(parts);};
async function actor(name,role='DIVER'){
 const password=randomBytes(24).toString('hex'),salt=randomBytes(16).toString('hex');
 const a=await db.account.create({data:{person:{create:{firstName:'Synthetic '+name,lastName:'A15',phone:'SYNTHETIC_'+randomUUID()}},email:randomUUID()+'@example.invalid',passwordHash:salt+':'+scryptSync(password,salt,64).toString('hex'),status:'ACTIVE',emailVerifiedAt:new Date(),roleAssignments:{create:{role,status:'ACTIVE'}}}});
 const login=expect(await call(null,'/auth/login','POST',{email:a.email,password}),200,'login');return {...a,token:login.accessToken};
}
let owner,manager,manager2,member,outsider,finance,center,platform,foreign,dispositionTemplate,activationTemplate;
const old=new Date('2000-01-02T12:00:00.000Z'),end=new Date('2001-01-02T12:00:00.000Z');
const daysAgo=days=>new Date(Date.now()-days*86400000);
const disposition=recordClass=>({recordClass,accountClosureAt:null,commercialPeriodEnd:recordClass.includes('COMMERCIAL')?end.toISOString():null,taxPeriodEnd:recordClass.includes('VAT')?end.toISOString():null,
 additionalRetainUntil:null,settlementsComplete:true,holdsReviewed:true,holdReviewReference:'Synthetic independent review of all retention reasons'});
const reviewersByDepartment=new Map();
async function approvedDocument(template,payload){
 const pair=reviewersByDepartment.get(template.department);assert(pair,'Independent reviewers must exist for the actual document department');
 const d=expect(await call(owner,'/documents','POST',{organizationId:platform.id,templateId:template.id,department:template.department,contentHash:'sha256:'+createHash('sha256').update(JSON.stringify(payload)).digest('hex'),payload}),201,'original source draft');
 expect(await call(owner,'/documents/'+d.id+'/submit','POST'),201,'original source submit');
 const path='/document-reviews/organizations/'+platform.id+'/documents/'+d.id;
 const params={reviewerAccountId:pair[0].id,signerAccountId:pair[1].id,expectedDocumentVersion:d.version,expiresAt:new Date(Date.now()+86400000).toISOString(),reason:'Synthetic isolated original source review'};
 const p=expect(await call(owner,path+'/plan','POST',params),201,'original review plan');
 expect(await call(owner,path+'/assignment','POST',{...params,expectedPlanHash:p.planHash,confirmed:true}),201,'original review assignment');
 const v=expect(await call(pair[0],path+'/view'),200,'original reviewer source');
 expect(await call(pair[0],path+'/decisions','POST',{action:'APPROVE',expectedVersion:v.source.version,reviewHash:v.reviewHash,note:'Synthetic independent actor approval through original HTTP route',confirmed:true}),201,'original independent approval');
 const {reviewSource}=load('document-forms/internal-document-review.domain.js');
 const r=await db.serializable(tx=>reviewSource(tx,platform.id,d.id));return {documentId:d.id,version:r.d.version,contentHash:r.d.contentHash,sourceHash:r.sourceHash};
}

async function request(domain,recordRef,subject=member,routing=center){
 const receipt=expect(await call(subject,'/me/data-requests','POST',{kind:'ERASURE',domain,...(recordRef?{recordRef}:{}),centerId:routing.id,requestKey:randomUUID(),details:'Synthetic record erasure acceptance only'}),201,'request');
 const c=await db.privacyGrievance.findUniqueOrThrow({where:{personalDataRequestId:receipt.id}});return {...c,subject};
}
const route=c=>'/privacy/grievances/'+c.id;
async function sourceFor(c,domain,recordRef,d){
 const preview=expect(await call(manager,route(c)+'/erasure-preview','POST',d),201,'preview');
 const template=domain==='PAYMENTS'?await db.documentTemplate.findFirstOrThrow({where:{code:'FIN-A15-RECORD-DISPOSITION'}}):dispositionTemplate;
 const source=await approvedDocument(template,{purpose:'A15_RECORD_DISPOSITION',policyVersion:'0.1',requestId:c.personalDataRequestId,accountId:c.subject.id,domain,recordRef,sourceHash:preview.sourceHash,
  ...d,noOutstandingLegalHold:true});
 expect(await call(owner,'/privacy/retention-dispositions','POST',{source}),201,'owner source binding');return source;
}
const execute=(c,source,operationId=randomUUID(),by=manager)=>call(by,route(c)+'/erasure','POST',{source,operationId});
async function nativeTrip(org=center){return db.trip.create({data:{organizationId:org.id,title:'Synthetic retired trip',type:'DIVE',status:'COMPLETED',startsAt:old,endsAt:old,createdAt:old,updatedAt:old,capacity:4}});}
async function nativeBooking(org=center){const trip=await nativeTrip(org);return db.booking.create({data:{tripId:trip.id,accountId:member.id,status:'CANCELLED',createdAt:old,updatedAt:old}});}
let conversation;
async function message(body='SYNTHETIC_PRIVATE_CONTENT'){
 if(!conversation)conversation=expect(await call(member,'/messages/conversations','POST',{participantAccountIds:[outsider.id]}),201).id;
 const sent=expect(await call(member,'/messages/conversations/'+conversation+'/messages','POST',{body}),201);
 expect(await call(member,'/messages/conversations/'+conversation+'/messages/'+sent.id+'/withdraw','POST',{}),201);
 await db.$executeRaw`UPDATE "Message" SET "withdrawnAt"=${daysAgo(31)} WHERE id::text=${sent.id}`;return sent.id;
}
async function retained(id){return (await db.$queryRaw`SELECT "messageId" FROM "WithdrawnMessageContent" WHERE "messageId"=${id}`).length===1;}

try{
 assert.equal(await localDb.account.count(),0,'A15 test requires a new empty database');
 const [{version:serverVersion}]=await localDb.$queryRaw`SELECT current_setting('server_version_num') AS version`;
 const serverMajor=Math.floor(Number(serverVersion)/10000);assert.ok(Number.isInteger(serverMajor)&&serverMajor>=10);
 const matchingBin='/usr/lib/postgresql/'+serverMajor+'/bin';
 if(!postgresBin&&existsSync(resolve(matchingBin,'pg_dump'))&&existsSync(resolve(matchingBin,'pg_restore')))postgresBin=matchingBin;
 const clients={};for(const name of ['pg_dump','pg_restore']){
  const version=execFileSync(command(name),['--version'],{encoding:'utf8',timeout:5000}).trim();
  assert.equal(Number(/PostgreSQL\)\s+(\d+)\./.exec(version)?.[1]),serverMajor,'A15 requires '+name+' matching PostgreSQL '+serverMajor+'; set A15_POSTGRES_BIN to its installed bin directory');clients[name]=version;
 }
 postgresTools={serverVersion,serverMajor,...clients};
 store=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1'),key=u.pathname;
  if(req.method==='GET'&&u.searchParams.get('list-type')==='2'){
   const prefix=u.searchParams.get('prefix')??'',items=[...objects.entries()].filter(([k])=>k.startsWith('/a15-synthetic/'+prefix));
   res.setHeader('content-type','application/xml');res.end('<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>false</IsTruncated>'+items.map(([k,v])=>'<Contents><Key>'+k.slice('/a15-synthetic/'.length)+'</Key><Size>'+v.length+'</Size></Contents>').join('')+'</ListBucketResult>');return;
  }
  if(!key.startsWith('/a15-synthetic/privacy-erasure/')){res.statusCode=400;res.end();return;}
  const phase=key.split('/').at(-1)?.split('-')[0];
  if(blockedPhase===phase){res.statusCode=503;res.end('<Error><Code>ServiceUnavailable</Code></Error>');return;}
  if(req.method==='PUT'){
   assert.equal(req.headers['if-none-match'],undefined);assert.equal(req.headers['x-amz-sdk-checksum-algorithm'],undefined);const bytes=await text(req);
   objects.set(key,bytes);if(failAfterWrite){req.socket.destroy();return;}res.setHeader('ETag','"synthetic"');res.end();return;
  }
  if(req.method==='GET'&&objects.has(key)){res.setHeader('content-type','application/json');res.end(objects.get(key));return;}
  res.statusCode=404;res.end('<Error><Code>NoSuchKey</Code></Error>');
 });
 await new Promise((ok,bad)=>store.once('error',bad).listen(0,'127.0.0.1',ok));storeOrigin='http://127.0.0.1:'+store.address().port;
 for(const k of ['AI_MODEL','WEATHER_MARINE','EMAIL','SMS','WHATSAPP','PAYMENT_PSP','BANKING_SETTLEMENT','TRANSLATION_ENGINE','MAPS_GEO','ESIGN','CERTIFICATION','DISTRESS_AIS','NAFATH','REGULATORY'])env('HYDROLAND_INTEGRATION_'+k+'_STATUS','DISABLED');
 for(const [k,v] of Object.entries({JWT_SECRET:'SYNTHETIC_A15_'+randomBytes(32).toString('hex'),HYDROLAND_AI_TEST_MANUAL_WORKER:'1',HYDROLAND_PRIVACY_RECOVERY_REQUIRED:'true',HYDROLAND_PRIVACY_ERASURE_ENABLED:'true',HYDROLAND_PRIVACY_JOURNAL_INITIALIZE:'INITIALIZE_EMPTY_JOURNAL_ONCE',
  HYDROLAND_PRIVACY_JOURNAL_NAMESPACE:'a15-isolated-'+randomBytes(8).toString('hex'),HYDROLAND_PRIVACY_JOURNAL_KEY:randomBytes(32).toString('hex'),
  HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS:'SANDBOX',HYDROLAND_OBJECT_STORAGE_ENDPOINT:storeOrigin,HYDROLAND_OBJECT_STORAGE_REGION:'us-east-1',HYDROLAND_OBJECT_STORAGE_BUCKET:'a15-synthetic',HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID:'SYNTHETIC_A15_STORAGE',HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY:'SYNTHETIC_A15_SECRET'}))env(k,v);
 require('reflect-metadata');const {NestFactory}=require('@nestjs/core');
 app=await NestFactory.create(load('app.module.js').AppModule,{logger:['error'],abortOnError:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');base=await app.getUrl()+'/api/v1';
 db=app.get(load('database/database.service.js').DatabaseService);
 [owner,manager,manager2,member,outsider,finance]=await Promise.all([actor('owner','ADMIN'),actor('center','DIVE_CENTER'),actor('center-reviewer','DIVE_CENTER'),actor('member'),actor('outside'),actor('finance','STAFF')]);
 center=await db.organization.create({data:{ownerId:manager.id,kind:'DIVE_CENTER',status:'ACTIVE',displayName:'Synthetic A15 center'}});
 foreign=await db.organization.create({data:{ownerId:outsider.id,kind:'DIVE_CENTER',status:'ACTIVE',displayName:'Synthetic other center'}});
 platform=await db.organization.create({data:{ownerId:owner.id,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',displayName:'Synthetic A15 platform'}});
 await db.operationalSetting.create({data:{key:'PLATFORM_STAFFING_ORGANIZATION:v1',value:{organizationId:platform.id}}});
 await db.documentBrandSnapshot.create({data:{organizationId:platform.id,brandVersion:1,brandNameAr:'هوية اصطناعية'}});
 for(const who of [member,manager,manager2])await db.organizationMember.create({data:{organizationId:center.id,accountId:who.id,role:who.id===member.id?'VIEWER':'ADMIN',status:'ACTIVE'}});
 await db.organizationMember.create({data:{organizationId:foreign.id,accountId:member.id,role:'VIEWER',status:'ACTIVE'}});
 await db.organizationMember.create({data:{organizationId:platform.id,accountId:finance.id,role:'STAFF',status:'ACTIVE'}});
 const unit=await db.orgUnit.create({data:{organizationId:platform.id,type:'DEPARTMENT',code:'FINANCE',nameAr:'مالية الاختبار'}});
 const position=await db.position.create({data:{orgUnitId:unit.id,code:'A15_FIXTURE',titleAr:'مراجع مالي اختباري'}});
 await db.employment.create({data:{organizationId:platform.id,accountId:finance.id,orgUnitId:unit.id,positionId:position.id,status:'ACTIVE',workerClass:'EMPLOYEE'}});
 for(const department of ['FINANCE','LEGAL_CONTRACTS_INSURANCE']){
  const u=department==='FINANCE'?unit:await db.orgUnit.create({data:{organizationId:platform.id,type:'DEPARTMENT',code:department,nameAr:'مراجعة اصطناعية'}});
  const pair=[];for(let i=0;i<2;i++){
   const who=department==='FINANCE'&&i===0?finance:await actor(department+'-'+i,'STAFF');
   if(who!==finance){await db.organizationMember.create({data:{organizationId:platform.id,accountId:who.id,role:'STAFF',status:'ACTIVE'}});const p=await db.position.create({data:{orgUnitId:u.id,code:'A15_'+randomUUID(),titleAr:'مراجع مستقل اصطناعي'}});await db.employment.create({data:{organizationId:platform.id,accountId:who.id,orgUnitId:u.id,positionId:p.id,status:'ACTIVE',workerClass:'EMPLOYEE'}});}
   pair.push(who);
  }reviewersByDepartment.set(department,pair);
 }

 const erasure=app.get(load('privacy/privacy-erasure.service.js').PrivacyErasureService),recovery=app.get(load('privacy/privacy-recovery.service.js').PrivacyRecoveryService),journal=app.get(load('privacy/erasure-journal.js').PrivateErasureJournal);
 await check('native migration blocks legacy purge after the baseline and rolls its deletion back',async()=>{
  const id=await message('SYNTHETIC_LEGACY_DEPLOYMENT_RACE');
  await assert.rejects(db.serializable(async tx=>{
   await tx.$executeRaw`DELETE FROM "WithdrawnMessageContent" WHERE "messageId"=${id}`;
   await tx.$executeRaw`DELETE FROM "Message" WHERE id::text=${id}`;
   await tx.auditEvent.create({data:{action:'message.expired_content_purged',resource:'Message',metadata:{count:1}}});
  }));assert(await retained(id));
 });
 await check('auth and owner-only blank templates are idempotent; no approvals or activation are fabricated',async()=>{
  expect(await call(null,'/privacy/retention-activation'),401);expect(await call(member,'/privacy/retention-activation'),403);
  const prepared=expect(await call(owner,'/privacy/retention-templates','POST',{confirmed:true}),201);assert.equal(prepared.created,3);assert.equal(prepared.approvalsCreated,0);
  assert.equal(expect(await call(owner,'/privacy/retention-templates','POST',{confirmed:true}),201).created,0);
  assert.equal((await db.managedDocument.count()),0);assert.equal(expect(await call(owner,'/privacy/retention-activation'),200).effectiveFrom,null);
  activationTemplate=await db.documentTemplate.findFirstOrThrow({where:{code:'LEGAL-A15-RETENTION-ACTIVATION'}});dispositionTemplate=await db.documentTemplate.findFirstOrThrow({where:{code:'LEGAL-A15-RECORD-DISPOSITION'}});
 });
 let booking,bookingCase,bookingSource;
 await check('source-specific booking preview isolates tenants, requires retention expiry and approved activation',async()=>{
  booking=await nativeBooking();bookingCase=await request('BOOKINGS',booking.id);bookingSource=await sourceFor(bookingCase,'BOOKINGS',booking.id,disposition('BOOKINGS_RENTALS'));
  expect(await execute(bookingCase,bookingSource),409);
  expect(await call(outsider,route(bookingCase)+'/erasure-preview','POST',disposition('BOOKINGS_RENTALS')),403);
  expect(await call(member,route(bookingCase)+'/erasure-preview','POST',disposition('BOOKINGS_RENTALS')),403);
  const other=await request('BOOKINGS',booking.id,member,foreign);
  expect(await call(outsider,route(other)+'/erasure-preview','POST',disposition('BOOKINGS_RENTALS')),404);
  const current=await db.booking.create({data:{accountId:member.id,tripId:booking.tripId,status:'CANCELLED'}}),c=await request('BOOKINGS',current.id);
  expect(await call(manager,route(c)+'/erasure-preview','POST',disposition('BOOKINGS_RENTALS')),409);
  const effective=new Date(Date.now()+5000);
  const source=await approvedDocument(activationTemplate,{purpose:'A15_RETENTION_ACTIVATION',policyVersion:'0.1',technicalWorkCompleted:true,acceptanceReference:'SYNTHETIC_LOCAL_ACCEPTANCE_ONLY',effectiveFrom:effective.toISOString()});
  if(effective>Date.now())await new Promise(r=>setTimeout(r,effective-Date.now()+20));
  expect(await call(manager,'/privacy/retention-activation','POST',{source}),403);expect(await call(owner,'/privacy/retention-activation','POST',{source}),201);
  const exported=expect(await call(member,'/me/data-export/trip-records','POST',{domain:'BOOKINGS'}),201);assert.equal(exported.retentionPolicy.status,'DURATIONS_EFFECTIVE_SOURCE_BOUND');assert.ok(exported.retentionPolicy.effectiveFrom);
 });
 await check('record hold blocks erasure; release needs two distinct authorized people; suspended owner denies access',async()=>{
  const hold=expect(await call(manager,route(bookingCase)+'/retention-holds','POST',{reason:'Synthetic temporary retention hold'}),201);
  expect(await execute(bookingCase,bookingSource),409);assert.equal(expect(await call(manager,route(bookingCase)+'/erasure-options'),200).sources.length,0);
  const release=route(bookingCase)+'/retention-holds/'+hold.id+'/release';
  assert.equal(expect(await call(manager,release,'POST',{reason:'Synthetic reason no longer applies'}),201).released,false);
  expect(await call(manager,release,'POST',{reason:'Cannot self-confirm'}),409);
  assert.equal(expect(await call(manager2,release,'POST',{reason:'Independent synthetic review'}),201).released,true);
  await db.account.update({where:{id:manager.id},data:{status:'SUSPENDED'}});
  expect(await call(manager2,route(bookingCase)+'/erasure-options'),403);
  await db.account.update({where:{id:manager.id},data:{status:'ACTIVE'}});
  assert.equal(expect(await call(manager,route(bookingCase)+'/erasure-options'),200).sources.length,1);
 });
 await check('native booking erasure publishes an encrypted external receipt, retries once, and closes only a matching request',async()=>{
  expect(await call(manager,route(bookingCase)+'/actions','POST',{action:'CENTER_RESOLVE',message:'Synthetic unproved closure must fail',disposition:'APPLIED'}),409);
  const op=randomUUID();failAfterWrite=true;const applied=expect(await execute(bookingCase,bookingSource,op),201);failAfterWrite=false;
  assert.equal(applied.externalReceiptSaved,true);assert.equal(await db.booking.count({where:{id:booking.id}}),0);
  expect(await execute(bookingCase,bookingSource,op),201);assert.equal(await db.auditEvent.count({where:{resourceId:op,action:'PERSONAL_DATA_ERASED'}}),1);
  expect(await call(manager,route(bookingCase)+'/actions','POST',{action:'CENTER_RESOLVE',message:'Synthetic erasure verified',disposition:'APPLIED'}),201);
  assert.equal((await db.personalDataRequest.findUniqueOrThrow({where:{id:bookingCase.personalDataRequestId}})).decisionDisposition,'APPLIED');
  assert.equal(await db.notification.count({where:{type:'PRIVACY_GRIEVANCE_MEMBER_RESULT',accountId:member.id,payload:{path:['caseId'],equals:bookingCase.id}}}),1);
  for(const value of objects.values()){assert(!value.toString().includes(member.id));assert(!value.toString().includes('SYNTHETIC_PRIVATE'));}
 });
 await check('resolved cases retain independent hold-release authority without reopening erasure or cross-organization staff access',async()=>{
  const b=await nativeBooking(),c=await request('BOOKINGS',b.id);
  const hold=expect(await call(manager,route(c)+'/retention-holds','POST',{reason:'Synthetic closed-case hold'}),201);
  expect(await call(manager,route(c)+'/actions','POST',{action:'CENTER_RESOLVE',message:'Synthetic retention hold remains',disposition:'REFUSED'}),201);
  const options=expect(await call(manager,route(c)+'/erasure-options'),200);assert.equal(options.enabled,false);assert.equal(options.sources.length,0);assert.equal(options.holds.length,1);
  expect(await call(manager,route(c)+'/erasure-preview','POST',disposition('BOOKINGS_RENTALS')),403);
  const release=route(c)+'/retention-holds/'+hold.id+'/release';
  assert.equal(expect(await call(manager,release,'POST',{reason:'Synthetic hold reason expired'}),201).released,false);
  assert.equal(expect(await call(manager2,release,'POST',{reason:'Independent synthetic closed-case review'}),201).released,true);
  const malformed=await actor('inconsistent-department','STAFF'),unit=await db.orgUnit.create({data:{organizationId:foreign.id,type:'DEPARTMENT',code:'LEGAL_CONTRACTS_INSURANCE',nameAr:'قسم مؤسسة أخرى'}});
  await db.organizationMember.create({data:{organizationId:platform.id,accountId:malformed.id,role:'STAFF',status:'ACTIVE'}});
  const position=await db.position.create({data:{orgUnitId:unit.id,code:'A15_CROSS_ORG',titleAr:'تكليف غير متسق'}});
  await db.employment.create({data:{organizationId:platform.id,accountId:malformed.id,orgUnitId:unit.id,positionId:position.id,status:'ACTIVE',workerClass:'EMPLOYEE'}});
  const scoped=await request('BOOKINGS',b.id);await db.privacyGrievance.update({where:{id:scoped.id},data:{state:'DEPARTMENT_PENDING',escalatedAt:new Date(),departmentCode:'LEGAL_CONTRACTS_INSURANCE'}});
  expect(await call(malformed,route(scoped)+'/erasure-options'),403);
 });
 await check('payment source changes and financial dependencies block deletion; classified mature payment erases native invoice',async()=>{
  const b=await nativeBooking(),p=await db.payment.create({data:{accountId:member.id,bookingId:b.id,status:'CAPTURED',amountMinor:1200,idempotencyKey:randomUUID(),createdAt:old,updatedAt:old}});
  await db.invoice.create({data:{paymentId:p.id,number:randomUUID(),status:'ISSUED',issuedAt:old,createdAt:old}});
  const c=await request('PAYMENTS',p.id),d=disposition('PAYMENT_COMMERCIAL_AND_VAT');
  expect(await call(manager,route(c)+'/erasure-preview','POST',{...d,taxPeriodEnd:null}),409);
  const source=await sourceFor(c,'PAYMENTS',p.id,d);
  await db.$executeRaw`UPDATE "Payment" SET "moyasarPaymentId"='changed-synthetic-provider-id' WHERE id=${p.id}`;
  expect(await execute(c,source),409);assert.equal(await db.payment.count({where:{id:p.id}}),1);
  await db.$executeRaw`UPDATE "Payment" SET "moyasarPaymentId"=NULL WHERE id=${p.id}`;
  const done=expect(await execute(c,source),201);assert.equal(done.scope,'PAYMENT_AND_ITS_NATIVE_INVOICE');assert.equal(await db.payment.count({where:{id:p.id}}),0);
  assert.equal(await db.invoice.count({where:{paymentId:p.id}}),0);
 });
 await check('closed account contact erasure is scoped and revokes sessions while preserving separately retained identity',async()=>{
  const subject=await actor('closed');await db.organizationMember.create({data:{organizationId:center.id,accountId:subject.id,role:'VIEWER',status:'ACTIVE'}});
  const c=await request('ACCOUNT',null,subject);await db.account.update({where:{id:subject.id},data:{status:'ARCHIVED'}});
  const d={...disposition('ACCOUNT_PROFILE'),accountClosureAt:daysAgo(2).toISOString()},source=await sourceFor(c,'ACCOUNT',subject.id,d);
  expect(await execute(c,source),201);
  const a=await db.account.findUniqueOrThrow({where:{id:subject.id},include:{person:true,sessions:true}});assert.equal(a.person.firstName,'محذوف');assert.equal(a.person.phone,null);assert.equal(a.sessions.length,0);assert.equal(a.status,'ARCHIVED');assert.equal(a.passwordHash,'ERASED_NO_LOGIN');
 });
 await check('missing external intent prevents native purge; changed restricted content after prepare is refused',async()=>{
  const id=await message();blockedPhase='intent';await assert.rejects(erasure.purgePrivateMessage(id));assert(await retained(id));blockedPhase=null;
  await db.$executeRaw`UPDATE "WithdrawnMessageContent" SET body='changed synthetic protected content' WHERE "messageId"=${id}`;
  await assert.rejects(erasure.purgePrivateMessage(id));assert(await retained(id));
  const [op]=await db.$queryRaw`SELECT state FROM "PrivacyErasureOperation" WHERE "recordRef"=${id}`;assert.equal(op.state,'ABORTED');
 });
 await check('audit failure rolls back deletion; lost abort publication is repaired without erasing anything',async()=>{
  const id=await message();
  await db.$executeRawUnsafe(`CREATE FUNCTION a15_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='PERSONAL_DATA_ERASED' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER a15_fail_audit BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION a15_fail_audit()');blockedPhase='abort';
  await assert.rejects(erasure.purgePrivateMessage(id));assert(await retained(id));
  await db.$executeRawUnsafe('DROP TRIGGER a15_fail_audit ON "AuditEvent"');blockedPhase=null;
  await assert.rejects(recovery.reconcile(false));await assert.rejects(erasure.purgePrivateMessage(id));
  await recovery.reconcile(true);await recovery.reconcile(false);assert(await retained(id));
 });
 await check('restart after failed intent publication blocks until offline cancellation of the unchanged preparation',async()=>{
  const id=await message();blockedPhase='intent';await assert.rejects(erasure.purgePrivateMessage(id));blockedPhase=null;assert(await retained(id));
  await assert.rejects(recovery.onApplicationBootstrap());await recovery.reconcile(true);await recovery.onApplicationBootstrap();assert(await retained(id));
  const [op]=await db.$queryRaw`SELECT state FROM "PrivacyErasureOperation" WHERE "recordRef"=${id}`;assert.equal(op.state,'ABORTED');
 });
 await check('lost commit publication leaves a recoverable local receipt and never repeats native deletion',async()=>{
  const id=await message();blockedPhase='commit';await assert.rejects(erasure.purgePrivateMessage(id));assert(!(await retained(id)));
  const [op]=await db.$queryRaw`SELECT id,state FROM "PrivacyErasureOperation" WHERE "recordRef"=${id}`;assert.equal(op.state,'APPLIED_LOCAL');
  blockedPhase=null;await recovery.reconcile(true);await recovery.reconcile(false);
  assert.equal(await db.auditEvent.count({where:{resourceId:op.id,action:'PERSONAL_DATA_ERASED'}}),1);
 });
 await check('unresolved intent cannot be replayed and encrypted journal tampering is rejected',async()=>{
  const rows=await db.$queryRaw`SELECT intent FROM "PrivacyErasureOperation" WHERE state='PUBLISHED' LIMIT 1`,intent=structuredClone(rows[0].intent),id=randomUUID();intent.id=id;
  await journal.put(id,'intent',intent);await assert.rejects(journal.put(id,'intent',{...intent,actorId:'DIFFERENT_SYNTHETIC_ACTOR'}));
  await assert.rejects(recovery.reconcile(false));await assert.rejects(recovery.reconcile(true));
  for(const key of [...objects.keys()])if(key.includes('/'+id+'/'))objects.delete(key);
  await recovery.reconcile(false);
  const [published]=await db.$queryRaw`SELECT id,"intentHash" FROM "PrivacyErasureOperation" WHERE state='PUBLISHED' LIMIT 1`;
  await assert.rejects(journal.put(published.id,'abort',{version:1,id:published.id,intentHash:published.intentHash,reason:'CONFLICTING_SYNTHETIC_TERMINAL'}));
  const key=[...objects.keys()].find(x=>/\/commit-[a-f0-9]{64}\.json$/.test(x)),original=objects.get(key);objects.set(key,Buffer.from(original.toString().replace(/"ciphertext":"./,'"ciphertext":"!')));
  await assert.rejects(recovery.reconcile(false));objects.set(key,original);await recovery.reconcile(false);
 });
 await check('real pg_dump/pg_restore blocks resurrection and rejects changed restored content before controlled replay',async()=>{
  const id=await message('RESTORE_SYNTHETIC_PRIVATE_CONTENT');await recovery.reconcile(false);
  const snapshot=resolve(process.env.A15_EVIDENCE_DIR??'/tmp','a15-before-erasure-'+randomUUID()+'.dump');
  execFileSync(command('pg_dump'),['--format=custom','--no-owner','--no-privileges','--file',snapshot,database.href],{stdio:'pipe',timeout:60000});
  await erasure.purgePrivateMessage(id);assert(!(await retained(id)));
  const adminUrl=new URL(database);adminUrl.pathname='/postgres';const admin=new PrismaClient({datasourceUrl:adminUrl.href});restoreName='a15_erasure_restore_'+randomBytes(6).toString('hex');
  try{await admin.$executeRawUnsafe('CREATE DATABASE "'+restoreName+'"');}finally{await admin.$disconnect();}
  const restoredUrl=new URL(database);restoredUrl.pathname='/'+restoreName;
  execFileSync(command('pg_restore'),['--no-owner','--no-privileges','--dbname',restoredUrl.href,snapshot],{stdio:'pipe',timeout:60000});unlinkSync(snapshot);
  const {DatabaseService}=load('database/database.service.js');restoreDb=new DatabaseService({datasourceUrl:restoredUrl.href});
  const {PrivacyRecoveryService}=load('privacy/privacy-recovery.service.js'),gate=new PrivacyRecoveryService(restoreDb,journal);
  await assert.rejects(gate.onApplicationBootstrap());
  const {baselineKey}=load('privacy/privacy-recovery.service.js'),baseline=await restoreDb.operationalSetting.findUniqueOrThrow({where:{key:baselineKey}});
  await restoreDb.operationalSetting.update({where:{key:baselineKey},data:{value:{...baseline.value,nonce:randomUUID()}}});
  await assert.rejects(gate.reconcile(true));await assert.rejects(gate.onApplicationBootstrap());
  await restoreDb.operationalSetting.update({where:{key:baselineKey},data:{value:baseline.value}});
  const [before]=await restoreDb.$queryRaw`SELECT body FROM "WithdrawnMessageContent" WHERE "messageId"=${id}`;
  await restoreDb.$executeRaw`UPDATE "WithdrawnMessageContent" SET body='SAME_ID_BUT_CHANGED_RESTORED_CONTENT' WHERE "messageId"=${id}`;
  await assert.rejects(gate.reconcile(true));assert.equal((await restoreDb.$queryRaw`SELECT body FROM "WithdrawnMessageContent" WHERE "messageId"=${id}`)[0].body,'SAME_ID_BUT_CHANGED_RESTORED_CONTENT');
  await restoreDb.$executeRaw`UPDATE "WithdrawnMessageContent" SET body=${before.body} WHERE "messageId"=${id}`;
  const repaired=await gate.reconcile(true);assert.equal(repaired.replayed,1);await gate.onApplicationBootstrap();
  assert.equal((await restoreDb.$queryRaw`SELECT id FROM "Message" WHERE id::text=${id}`).length,0);
  assert.equal((await restoreDb.$queryRaw`SELECT "messageId" FROM "WithdrawnMessageContent" WHERE "messageId"=${id}`).length,0);
 });
}catch(error){failure=error;}
finally{
 if(restoreDb)await restoreDb.$disconnect();
 if(app)await app.close();await localDb.$disconnect();
 if(store?.listening)await new Promise(ok=>{store.close(ok);store.closeAllConnections?.();});
 for(const [k,v] of originalEnv){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 const result={suite:'A15_NATIVE_ERASURE_HTTP_POSTGRESQL_RECOVERY',synthetic:true,productionDataDeleted:false,humanApprovalCreated:false,status:failure?'FAIL':'PASS',nodeVersion:process.version,postgresTools,startedAt,finishedAt:new Date().toISOString(),passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,checks,postgresRestorePerformed:checks.some(x=>x.name.startsWith('real pg_dump')&&x.status==='PASS'),encryptedJournalObjects:objects.size};
 if(process.env.A15_EVIDENCE_FILE){const file=resolve(process.env.A15_EVIDENCE_FILE);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(result,null,2)+'\n');}
 console.log('A15_RESULT '+JSON.stringify(result));
}
if(failure)throw failure;
