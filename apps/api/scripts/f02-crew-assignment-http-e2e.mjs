import assert from 'node:assert/strict';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {crewAssignmentFixture} from './crew-assignment-isolated-fixture.mjs';
import {marineTestToken} from './marine-review-fixture.mjs';

assert.equal(process.env.CI, 'true'); assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.F02_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const database = new URL(process.env.DATABASE_URL || 'invalid:');
assert(['postgres:', 'postgresql:'].includes(database.protocol));
assert(['localhost','127.0.0.1','[::1]'].includes(database.hostname));
assert.match(database.pathname, /^\/f02_crew_test(?:_[a-z0-9_]+)?$/);
assert(!database.hash && [...database.searchParams].every(([key, value]) => key === 'schema' && value === 'public'));
assert(!process.env.F02_E2E_BASE_URL, 'This harness starts its own loopback API');
const require = createRequire(import.meta.url), root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const build = resolve(process.env.F02_API_BUILD_DIR || resolve(root, 'apps/api/dist'));
assert(build.startsWith(resolve(root, 'apps/api')+'/'), 'Own repository API build only');
const load = file => require(resolve(build, file)), schema = 'f02_'+randomUUID().replaceAll('-', ''), scoped = new URL(database);
scoped.searchParams.set('schema', schema);
const originalEnvironment = {...process.env}, startedAt = new Date().toISOString(), checks = [], requests = [], nativeFetch = global.fetch;
const receiptPath = resolve(process.env.F02_EVIDENCE_PATH || resolve(root, 'artifacts/f02/crew-assignment-http.json'));
let adminDb, db, app, fixture, base, failure, postgresVersion, schemaCreated = false;
const hashFile = file => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');
const check = async (name, work) => { const start = Date.now(); try {await work(); checks.push({name, status: 'PASS', durationMs: Date.now()-start}); console.log('F02 PASS '+name);} catch (error) {checks.push({name, status: 'FAIL', durationMs: Date.now()-start}); throw error;} };
const tokens = new Map();
async function token(actor) { if (!tokens.has(actor.id)) tokens.set(actor.id, await marineTestToken(db, actor.id, process.env.JWT_SECRET)); return tokens.get(actor.id); }
async function call(actor, path, method='GET', body) {
  const response = await fetch(base+'/trips/crew/assignments'+path, {method, headers: {'content-type':'application/json', ...(actor ? {authorization:'Bearer '+await token(actor)} : {})}, ...(body===undefined ? {} : {body:JSON.stringify(body)})});
  return {status: response.status, body: await response.json().catch(()=>null)};
}
function ok(response, status=201) {assert.equal(response.status,status,JSON.stringify(response.body));return response.body;}
const proposalInput = (candidate, extra={}) => ({requestId:randomUUID(),resourceId:candidate.resource.id,sourceId:candidate.source.id,reason:'Synthetic F02 assignment request',waitlisted:false,...extra});
const command = (row, action, extra={}) => ({requestId:randomUUID(),expectedRevision:row.revision,action,reason:'Synthetic F02 independent decision',...extra});
const response = (row, value='ACCEPTED') => ({requestId:randomUUID(),expectedRevision:row.revision,response:value,reason:'Synthetic F02 crew response to recorded terms'});
const native = async id => (await db.$queryRaw`SELECT * FROM "CrewAssignment" WHERE id::text=${id}`)[0];
const trip = async (hours=24) => db.trip.create({data:{title:'Synthetic F02 trip '+randomUUID(),type:'F02_TEST',capacity:4,status:'OPEN',startsAt:new Date(Date.now()+hours*3600000),endsAt:new Date(Date.now()+(hours+1)*3600000)}});
async function propose(candidate, extra={}) {return ok(await call(fixture.requester,'/trips/'+candidate.trip.id+'/proposals','POST',proposalInput(candidate,extra)));}
async function approve(row, actor=fixture.approver) {return ok(await call(actor,'/'+row.assignmentId+'/commands','POST',command(row,'APPROVE')));}
async function accept(candidate, row) {return ok(await call(candidate.account,'/'+row.assignmentId+'/respond','PATCH',response(row)),200);}
async function pending(candidate) {return approve(await propose(candidate));}
const allocationCount = (tripId, resourceId) => db.calendarAllocation.count({where:{resourceId,status:'ACTIVE',event:{referenceType:'TRIP',referenceId:tripId}}});

try {
  const {PrismaClient} = require('@prisma/client'); adminDb = new PrismaClient({datasourceUrl:database.href});
  postgresVersion = (await adminDb.$queryRaw`SELECT current_setting('server_version') AS version`)[0].version;
  await adminDb.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"'); schemaCreated = true;
  process.env.DATABASE_URL = scoped.href; process.env.JWT_SECRET = 'SYNTHETIC_F02_'+randomBytes(32).toString('hex');
  await check('actual additive migration preserves pre-F02 legacy rows and installs native command receipts',async()=>{
    const directory=mkdtempSync(resolve(tmpdir(),'f02-prisma-baseline-')),schemaPath=resolve(root,'apps/api/prisma/schema.prisma');
    const additions=['revision','requestedByAccountId','approvedByAccountId','approvedAt','replacesRevision','qualificationSnapshot','compensationSnapshot','approvalAuthority','decisionReason'];
    const baseline=readFileSync(schemaPath,'utf8').replace(/model CrewAssignment \{[\s\S]*?\n\}/,model=>model.split('\n').filter(line=>!additions.some(name=>new RegExp('^\\s*'+name+'\\s').test(line))).join('\n'))
      .replace(/model CrewAssignmentCommand \{[\s\S]*?\n\}/,'');
    assert(!baseline.includes('model CrewAssignmentCommand'));const baselinePath=resolve(directory,'schema.prisma');writeFileSync(baselinePath,baseline);
    const legacyDb=new PrismaClient({datasourceUrl:scoped.href});
    try{
      execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'db','push','--skip-generate','--schema',baselinePath],{cwd:resolve(root,'apps/api'),env:process.env,stdio:'pipe',timeout:120000});
      const person=await legacyDb.account.create({data:{email:'legacy-'+randomUUID()+'@example.invalid',passwordHash:'NOT-A-LOGIN',person:{create:{firstName:'Synthetic legacy F02',lastName:'Fixture'}}}});
      const resource=await legacyDb.calendarResource.create({data:{type:'CREW',name:'Synthetic legacy',referenceId:person.id}});
      const legacyTrip=await legacyDb.trip.create({data:{title:'Synthetic pre-F02',type:'TEST',capacity:1,startsAt:new Date('2038-01-01T00:00:00Z'),endsAt:new Date('2038-01-01T01:00:00Z')}});
      // The generated client may already know the new columns. Seed the older
      // row through its original SQL columns before applying the real migration.
      const old={id:randomUUID()};
      await legacyDb.$executeRaw`INSERT INTO "CrewAssignment" (id,"tripId","resourceId","accountId","roleType",status,"updatedAt")
        VALUES (${old.id},${legacyTrip.id},${resource.id},${person.id},'CREW','ACCEPTED',NOW())`;
      execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'db','execute','--file',resolve(root,'apps/api/prisma/migrations/20261128030000_crew_assignment_lifecycle/migration.sql'),'--schema',schemaPath],{cwd:resolve(root,'apps/api'),env:process.env,stdio:'pipe',timeout:30000});
      const [saved]=await legacyDb.$queryRaw`SELECT status,revision,"qualificationSnapshot","compensationSnapshot" FROM "CrewAssignment" WHERE id::text=${old.id}`;
      assert.deepEqual(saved,{status:'ACCEPTED',revision:1,qualificationSnapshot:null,compensationSnapshot:null});
      assert.equal((await legacyDb.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname=${schema} AND indexname IN ('CrewAssignment_f02_active_person','CrewAssignment_f02_pending_replacement')`).length,2);
      // Existing raw-runtime tables are absent from schema.prisma. Install their
      // original definitions into this disposable schema for the real clearance
      // status reader; do not rewrite or synthesize production migration history.
      for(const migration of ['20260915031500_equipment_inspections','20260925210500_trip_weather_runtime'])
        execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'db','execute','--file',resolve(root,'apps/api/prisma/migrations/'+migration+'/migration.sql'),'--schema',schemaPath],{cwd:resolve(root,'apps/api'),env:process.env,stdio:'pipe',timeout:30000});
    }finally{await legacyDb.$disconnect();rmSync(directory,{recursive:true,force:true});}
  });
  const {DatabaseService} = load('database/database.service.js'), {AuditService} = load('audit/audit.service.js'), {PolicyControlService} = load('trips/policy-control.service.js');
  const {CrewAssignmentService} = load('trips/crew-assignment.service.js'), {CrewAssignmentController} = load('trips/crew-assignment.controller.js');
  const {AuthService} = load('auth/auth.service.js'), {AccessTokenGuard} = load('auth/access-token.guard.js'), {AdminGuard} = load('admin/admin.guard.js');
  const {crewAssignmentReadiness} = load('trips/crew-assignment-evidence.js');
  db = new DatabaseService(); await db.$connect();
  const audit = new AuditService(db), policies = new PolicyControlService(db,audit), service = new CrewAssignmentService(db,policies,audit);
  const forbiddenProvider = new Proxy({}, {get(){throw new Error('No external providers in F02 acceptance');}});
  const auth = new AuthService(db,forbiddenProvider,forbiddenProvider);
  const {Module} = require('@nestjs/common'), {NestFactory} = require('@nestjs/core');
  class Harness {}
  Module({controllers:[CrewAssignmentController],providers:[{provide:DatabaseService,useValue:db},{provide:AuthService,useValue:auth},{provide:AuditService,useValue:audit},{provide:PolicyControlService,useValue:policies},{provide:CrewAssignmentService,useValue:service},AccessTokenGuard,AdminGuard]})(Harness);
  app = await NestFactory.create(Harness,{logger:false,abortOnError:false}); app.setGlobalPrefix('api/v1'); await app.listen(0,'127.0.0.1');
  base = (await app.getUrl())+'/api/v1';
  global.fetch = (input, options) => {const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);assert.equal(url.origin,new URL(base).origin);requests.push({method:options?.method||'GET',path:url.pathname});return nativeFetch(input,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});};
  fixture = await crewAssignmentFixture(db,{load});
  const outsider = await fixture.actor('unrelated user',['INSTRUCTOR']);

  await check('migration keeps legacy history readable but cannot accept it as newly qualified', async()=>{
    const t=await trip(),candidate=await fixture.candidate(t.id);
    const legacy=await db.crewAssignment.create({data:{tripId:t.id,resourceId:candidate.resource.id,accountId:candidate.account.id,roleType:'INSTRUCTOR',status:'PENDING'}});
    const saved=await native(legacy.id);assert.equal(saved.qualificationSnapshot,null);assert.equal(saved.compensationSnapshot,null);assert.equal(saved.revision,1);
    assert.equal((await call(null,'/mine')).status,401);assert.equal((await call(outsider,'/workspace')).status,403);
    const rows=ok(await call(candidate.account,'/mine'),200);assert(rows.find(r=>r.id===legacy.id)?.legacyUnverified);
    assert.equal((await call(outsider,'/'+legacy.id+'/respond','PATCH',{response:'ACCEPTED'})).status,404);
    const refused=await call(candidate.account,'/'+legacy.id+'/respond','PATCH',{response:'ACCEPTED'});assert.equal(refused.status,409);assert.equal(refused.body.code,'F02_LEGACY_SOURCE_REVIEW_REQUIRED');
    assert.equal((await native(legacy.id)).status,'PENDING');assert.equal(await allocationCount(t.id,candidate.resource.id),0);
  });

  await check('exact role-specific credential, lifetime, verification and native membership cannot be bypassed by generic policy flags',async()=>{
    const t=await trip(30),c=await fixture.candidate(t.id),original=await db.credential.findUniqueOrThrow({where:{id:c.credential.id}});
    await db.policyControl.upsert({where:{category_ruleKey:{category:'CREW',ruleKey:'QUALIFICATION'}},create:{category:'CREW',ruleKey:'QUALIFICATION',labelAr:'Synthetic optional switch',state:'DISABLED'},update:{state:'DISABLED'}});
    for(const patch of [{issuer:'WRONG SYNTHETIC ISSUER'},{title:'UNRELATED QUALIFICATION'},{expiresAt:new Date(t.startsAt.getTime()+1000)},{issuedAt:new Date(t.startsAt.getTime()+1000)},{verificationStatus:'REJECTED'}]){
      await db.credential.update({where:{id:c.credential.id},data:patch});const r=await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',proposalInput(c));assert.equal(r.status,409,JSON.stringify(r));
      await db.credential.update({where:{id:c.credential.id},data:{issuer:original.issuer,title:original.title,expiresAt:original.expiresAt,issuedAt:original.issuedAt,verificationStatus:original.verificationStatus}});
    }
    await db.roleAssignment.update({where:{accountId_role:{accountId:c.account.id,role:'INSTRUCTOR'}},data:{status:'SUSPENDED'}});
    assert.equal((await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',proposalInput(c))).status,409);
    await db.roleAssignment.update({where:{accountId_role:{accountId:c.account.id,role:'INSTRUCTOR'}},data:{status:'ACTIVE'}});
    await db.organizationMember.update({where:{organizationId_accountId:{organizationId:c.organization.id,accountId:c.account.id}},data:{status:'SUSPENDED'}});
    assert.equal((await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',proposalInput(c))).status,409);
    assert.equal(await db.crewAssignment.count({where:{tripId:t.id}}),0);
  });

  await check('missing, foreign or incomplete compensation is refused without any financial execution',async()=>{
    const t=await trip(36),c=await fixture.candidate(t.id),agreement=c.agreement;
    await db.instructorCompensationAgreement.delete({where:{id:agreement.id}});
    assert.equal((await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',proposalInput(c))).status,409);
    await db.instructorCompensationAgreement.create({data:{...agreement,organizationId:randomUUID()}});
    assert.equal((await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',proposalInput(c))).status,409);
    await db.instructorCompensationAgreement.delete({where:{id:agreement.id}});
    await db.instructorCompensationAgreement.create({data:{...agreement,earningTiming:null}});
    assert.equal((await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',proposalInput(c))).status,409);
    await db.instructorCompensationAgreement.update({where:{id:agreement.id},data:{earningTiming:agreement.earningTiming,fixedMinor:-100}});
    assert.equal((await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',proposalInput(c))).status,409);
    assert.equal(await db.crewAssignment.count({where:{tripId:t.id}}),0);assert.equal(await db.financeEntry.count(),0);assert.equal(await db.instructorEarning.count(),0);
  });

  await check('waitlist has no reservation; promotion, independent approval and personal response are distinct native steps',async()=>{
    const t=await trip(42),c=await fixture.candidate(t.id),input=proposalInput(c,{waitlisted:true});
    const results=await Promise.all([call(fixture.requester,'/trips/'+t.id+'/proposals','POST',input),call(fixture.requester,'/trips/'+t.id+'/proposals','POST',input)]);
    results.forEach(r=>ok(r));assert.equal(results[0].body.assignmentId,results[1].body.assignmentId);let row=results[0].body;
    assert.equal(row.status,'WAITLISTED');assert.equal(await allocationCount(t.id,c.resource.id),0);
    const reused=await call(fixture.requester,'/trips/'+t.id+'/proposals','POST',{...input,reason:'Different command with same identity'});assert.equal(reused.status,409);
    row=ok(await call(fixture.requester,'/'+row.assignmentId+'/commands','POST',command(row,'PROPOSE')));assert.equal(row.status,'PROPOSED');
    assert.equal((await call(fixture.requester,'/'+row.assignmentId+'/commands','POST',command(row,'APPROVE'))).status,403);
    assert.equal((await call(c.account,'/'+row.assignmentId+'/commands','POST',command(row,'APPROVE'))).status,403);
    row=await approve(row);assert.equal(row.status,'PENDING');assert.equal(await allocationCount(t.id,c.resource.id),1);
    assert.equal((await crewAssignmentReadiness(db,row.assignmentId)).operationalReady,false);
    const before=await native(row.assignmentId),snapshot=before.compensationSnapshot;
    await db.instructorCompensationAgreement.create({data:{...c.agreement,id:randomUUID(),revision:c.agreement.revision+1,fixedMinor:99000,recordedAt:new Date()}});
    const body=response(row),accepted=ok(await call(c.account,'/'+row.assignmentId+'/respond','PATCH',body),200);
    assert.equal(accepted.status,'ACCEPTED');assert.deepEqual((await native(row.assignmentId)).compensationSnapshot,snapshot);
    assert.equal(ok(await call(c.account,'/'+row.assignmentId+'/respond','PATCH',body),200).alreadyApplied,true);
    assert.equal((await crewAssignmentReadiness(db,row.assignmentId)).operationalReady,true);
    const safe=ok(await call(c.account,'/mine'),200).find(r=>r.id===row.assignmentId);assert.equal(safe.compensation.fixedMinor,12500);
    for(const key of ['qualificationSnapshot','compensationSnapshot','credentials','sourceHash','payload','storageKey'])assert(!Object.hasOwn(safe,key));
    assert.equal(await db.auditEvent.count({where:{resource:'CrewAssignment',resourceId:row.assignmentId,action:'CREW_ASSIGNMENT_ACCEPTED'}}),1);
  });

  await check('current source, credential reviewer and same-session role revocation are rechecked before acceptance',async()=>{
    const t=await trip(48),c=await fixture.candidate(t.id),row=await pending(c),before=await native(row.assignmentId);
    await db.managedDocument.update({where:{id:c.source.id},data:{status:'ARCHIVED'}});
    assert.equal((await call(c.account,'/'+row.assignmentId+'/respond','PATCH',response(row))).status,409);
    await db.managedDocument.update({where:{id:c.source.id},data:{status:'APPROVED'}});
    await db.roleAssignment.update({where:{accountId_role:{accountId:fixture.approver.id,role:'REVIEWER'}},data:{status:'SUSPENDED'}});
    assert.equal((await call(c.account,'/'+row.assignmentId+'/respond','PATCH',response(row))).status,409);
    await db.roleAssignment.update({where:{accountId_role:{accountId:fixture.approver.id,role:'REVIEWER'}},data:{status:'ACTIVE'}});
    await db.roleAssignment.update({where:{accountId_role:{accountId:c.account.id,role:'INSTRUCTOR'}},data:{status:'SUSPENDED'}});
    assert.equal((await call(c.account,'/'+row.assignmentId+'/respond','PATCH',response(row))).status,409);
    assert.deepEqual(await native(row.assignmentId),before);
  });

  await check('calendar conflict and alias conflict inside approval keep the original assignment intact',async()=>{
    const t=await trip(54),c=await fixture.candidate(t.id),row=await propose(c),other=await db.trip.create({data:{title:'Synthetic competing trip',type:'F02_TEST',status:'OPEN',capacity:1,startsAt:t.startsAt,endsAt:t.endsAt}});
    const alias=await db.calendarResource.create({data:{type:'CAPTAIN',name:'Synthetic alias',referenceId:c.account.id}});
    const event=await db.calendarEvent.create({data:{type:'TRIP',referenceType:'TRIP',referenceId:other.id,title:other.title,startsAt:t.startsAt,endsAt:t.endsAt}});
    await db.calendarAllocation.create({data:{eventId:event.id,resourceId:alias.id,startsAt:t.startsAt,endsAt:t.endsAt}});
    assert.equal((await call(fixture.approver,'/'+row.assignmentId+'/commands','POST',command(row,'APPROVE'))).status,409);
    assert.equal((await native(row.assignmentId)).status,'PROPOSED');assert.equal(await allocationCount(t.id,c.resource.id),0);
  });

  await check('withdrawn calendar reservation blocks new acceptance and readiness without erasing the accepted person',async()=>{
    const t=await trip(57),c=await fixture.candidate(t.id),row=await pending(c);
    const allocation=await db.calendarAllocation.findFirstOrThrow({where:{resourceId:c.resource.id,status:'ACTIVE',event:{referenceType:'TRIP',referenceId:t.id}}});
    await db.calendarAllocation.update({where:{id:allocation.id},data:{status:'INACTIVE'}});
    const blocked=await call(c.account,'/'+row.assignmentId+'/respond','PATCH',response(row));
    assert.equal(blocked.status,409);assert.equal(blocked.body.code,'F02_CALENDAR_RESERVATION_CHANGED');
    assert(!ok(await call(c.account,'/mine'),200).find(r=>r.id===row.assignmentId).actions.includes('ACCEPT'));
    await db.calendarAllocation.update({where:{id:allocation.id},data:{status:'ACTIVE'}});await accept(c,row);
    await db.calendarAllocation.update({where:{id:allocation.id},data:{status:'INACTIVE'}});
    assert.deepEqual(await crewAssignmentReadiness(db,row.assignmentId),{operationalReady:false,legacyUnverified:false,reasons:['F02_CALENDAR_RESERVATION_CHANGED']});
    assert.equal((await native(row.assignmentId)).status,'ACCEPTED');
  });

  await check('decline, cancellation and overdue notification never perform an automatic replacement',async()=>{
    const t=await trip(2),c=await fixture.candidate(t.id),row=await pending(c);
    const before=await db.crewAssignment.count();const first=await service.escalatePending(24),again=await service.escalatePending(24);
    assert.equal(first.reassigned,0);assert.equal(again.reassigned,0);assert.equal(again.adminRequired,0);
    const rejected=ok(await call(c.account,'/'+row.assignmentId+'/respond','PATCH',response(row,'REJECTED')),200);
    assert.equal(rejected.replacement,null);assert.equal(await db.crewAssignment.count(),before);assert.equal(await allocationCount(t.id,c.resource.id),0);
    const next=await fixture.candidate(t.id),p=await propose(next,{waitlisted:true});
    const cancelled=ok(await call(next.account,'/'+p.assignmentId+'/commands','POST',command(p,'CANCEL')));assert.equal(cancelled.status,'CANCELLED');assert.equal(await allocationCount(t.id,next.resource.id),0);
  });

  await check('qualified substitute requires independent approval and personal acceptance before replacing old assignment',async()=>{
    const t=await trip(60),old=await fixture.candidate(t.id),oldRow=await pending(old);await accept(old,oldRow);
    const savedOld=await native(oldRow.assignmentId),a=await fixture.candidate(t.id),b=await fixture.candidate(t.id);
    const extra={replacesAssignmentId:savedOld.id,replacesRevision:savedOld.revision};
    const proposedA=await propose(a,extra),proposedB=await propose(b,extra);
    assert.equal((await native(savedOld.id)).status,'ACCEPTED');assert.equal(await allocationCount(t.id,old.resource.id),1);
    const raced=await Promise.all([call(fixture.approver,'/'+proposedA.assignmentId+'/commands','POST',command(proposedA,'APPROVE')),call(fixture.approver,'/'+proposedB.assignmentId+'/commands','POST',command(proposedB,'APPROVE'))]);
    assert.deepEqual(raced.map(r=>r.status).sort(),[201,409]);
    const winner=raced[0].status===201?{c:a,row:raced[0].body}:{c:b,row:raced[1].body};
    assert.equal((await native(savedOld.id)).status,'ACCEPTED');assert.equal(await allocationCount(t.id,old.resource.id),1);
    const before=await db.auditEvent.count({where:{resource:'CrewAssignment'}}),record=audit.record.bind(audit),body=response(winner.row);
    audit.record=async(input,tx)=>{if(input.action==='CREW_ASSIGNMENT_ACCEPTED')throw new Error('Synthetic F02 audit unavailable');return record(input,tx);};
    assert.equal((await call(winner.c.account,'/'+winner.row.assignmentId+'/respond','PATCH',body)).status,500);audit.record=record;
    assert.equal((await native(savedOld.id)).status,'ACCEPTED');assert.equal((await native(winner.row.assignmentId)).status,'PENDING');assert.equal(await allocationCount(t.id,old.resource.id),1);
    assert.equal(await db.auditEvent.count({where:{resource:'CrewAssignment'}}),before);
    ok(await call(winner.c.account,'/'+winner.row.assignmentId+'/respond','PATCH',body),200);
    assert.equal((await native(savedOld.id)).status,'REASSIGNED');assert.equal(await allocationCount(t.id,old.resource.id),0);assert.equal(await allocationCount(t.id,winner.c.resource.id),1);
    const events=await db.auditEvent.findMany({where:{action:'CREW_ASSIGNMENT_REASSIGNED',resourceId:winner.row.assignmentId}});assert.equal(events.length,1);assert.equal(events[0].metadata.approvedByAccountId,fixture.approver.id);
  });

  await check('notification storage failure rolls back response, audit and command receipt together',async()=>{
    const t=await trip(66),c=await fixture.candidate(t.id),row=await pending(c),before=await native(row.assignmentId),serializable=db.serializable.bind(db);
    const body=response(row);db.serializable=work=>serializable(tx=>work(new Proxy(tx,{get(target,key){if(key==='notification')return new Proxy(target.notification,{get(delegate,method){if(method==='create')return async()=>{throw new Error('Synthetic F02 notification storage unavailable');};return Reflect.get(delegate,method);}});return Reflect.get(target,key);}})));
    assert.equal((await call(c.account,'/'+row.assignmentId+'/respond','PATCH',body)).status,500);db.serializable=serializable;
    assert.deepEqual(await native(row.assignmentId),before);assert.equal((await db.$queryRaw`SELECT id FROM "CrewAssignmentCommand" WHERE "requestId"=${body.requestId}`).length,0);
    ok(await call(c.account,'/'+row.assignmentId+'/respond','PATCH',body),200);
  });

  await check('credential revocation committed during replacement acceptance retries without releasing the original crew',async()=>{
    const t=await trip(69),old=await fixture.candidate(t.id),oldAccepted=await accept(old,await pending(old)),savedOld=await native(oldAccepted.assignmentId);
    const substitute=await fixture.candidate(t.id),row=await approve(await propose(substitute,{replacesAssignmentId:savedOld.id,replacesRevision:savedOld.revision}));
    const serializable=db.serializable.bind(db),body=response(row);let pause=true,arrived,release;
    const atBarrier=new Promise(resolve=>{arrived=resolve;}),resume=new Promise(resolve=>{release=resolve;});
    db.serializable=work=>serializable(tx=>work(new Proxy(tx,{get(target,key){
      if(key==='credential')return new Proxy(target.credential,{get(delegate,method){
        if(method==='findMany')return async args=>{const rows=await delegate.findMany(args);if(pause&&rows.some(c=>c.id===substitute.credential.id)){pause=false;arrived();await resume;}return rows;};
        return Reflect.get(delegate,method);
      }});return Reflect.get(target,key);
    }})));
    let request;
    try{
      request=call(substitute.account,'/'+row.assignmentId+'/respond','PATCH',body);
      await Promise.race([atBarrier,new Promise((_,reject)=>setTimeout(()=>reject(new Error('F02 acceptance barrier not reached')),4000))]);
      await db.credential.update({where:{id:substitute.credential.id},data:{verificationStatus:'REJECTED'}});release();
      const denied=await request;assert.equal(denied.status,409);assert.equal(denied.body.code,'F02_QUALIFICATION_CREDENTIAL_REQUIRED');
    }finally{release();if(request)await request;db.serializable=serializable;}
    assert.equal((await native(row.assignmentId)).status,'PENDING');assert.equal((await native(savedOld.id)).status,'ACCEPTED');
    assert.equal(await allocationCount(t.id,old.resource.id),1);assert.equal(await db.auditEvent.count({where:{resourceId:row.assignmentId,action:'CREW_ASSIGNMENT_ACCEPTED'}}),0);
    assert.equal((await db.$queryRaw`SELECT id FROM "CrewAssignmentCommand" WHERE "requestId"=${body.requestId}`).length,0);
  });

  await check('employment compensation and salary-only are recorded without calculating or posting earnings',async()=>{
    const t=await trip(72),captain=await fixture.candidate(t.id,{roleType:'CAPTAIN'}),row=await pending(captain);await accept(captain,row);
    const saved=await native(row.assignmentId);assert.equal(saved.compensationSnapshot.kind,'EMPLOYMENT_COMPENSATION_TERM');assert.equal(saved.compensationSnapshot.baseAmountMinor,400000);
    const s=await trip(78),instructor=await fixture.candidate(s.id);
    await db.instructorCompensationAgreement.update({where:{id:instructor.agreement.id},data:{mode:'SALARY_ONLY',fixedMinor:0,rateBps:0,earningTiming:null,reversalTerms:null}});
    const salary=await pending(instructor);await accept(instructor,salary);assert.equal((await native(salary.assignmentId)).compensationSnapshot.mode,'SALARY_ONLY');
    assert.equal(await db.financeEntry.count(),0);assert.equal(await db.instructorEarning.count(),0);
  });

  await check('no acceptance or replacement after departure; physical legacy record remains present',async()=>{
    const t=await trip(84),c=await fixture.candidate(t.id),row=await pending(c);
    await db.trip.update({where:{id:t.id},data:{startsAt:new Date(Date.now()-1000)}});
    const denied=await call(c.account,'/'+row.assignmentId+'/respond','PATCH',response(row));assert.equal(denied.status,409);assert.equal(denied.body.code,'F02_TRIP_NOT_OPEN_FOR_ASSIGNMENT');
    assert.equal((await native(row.assignmentId)).status,'PENDING');
    const legacy=await db.crewAssignment.create({data:{tripId:t.id,resourceId:c.resource.id,accountId:c.account.id,roleType:'INSTRUCTOR',status:'ACCEPTED',respondedAt:new Date()}});
    assert.equal((await crewAssignmentReadiness(db,legacy.id)).legacyUnverified,true);assert.equal((await native(legacy.id)).status,'ACCEPTED');
  });

  await check('clearance preview becomes stale on current credential loss and the scan revokes without removing accepted crew',async()=>{
    const t=await trip(87),c=await fixture.candidate(t.id),row=await accept(c,await pending(c));
    const {OperationalClearanceService}=load('trips/operational-clearance.service.js');
    const clearance=new OperationalClearanceService(db,audit,new Proxy({}, {get(){throw new Error('Status inspection must not call a provider or persist readiness snapshots');}}));
    // A prior native grant is the fixture input; this case covers its current
    // source inspection/revocation, not issuance of the grant itself.
    await audit.record({action:'OPERATIONAL_CLEARANCE_GRANTED',resource:'Trip',resourceId:t.id,metadata:{syntheticPriorGrant:true}},db);
    assert.equal((await clearance.status(t.id)).status,'ACTIVE');
    await db.credential.update({where:{id:c.credential.id},data:{verificationStatus:'REJECTED'}});
    const before=await db.auditEvent.count({where:{resource:'Trip',resourceId:t.id}});
    assert.equal((await clearance.status(t.id)).status,'STALE');assert.equal(await db.auditEvent.count({where:{resource:'Trip',resourceId:t.id}}),before);
    assert.equal((await clearance.revokeIfStale(t.id)).revoked,true);assert.equal((await clearance.status(t.id)).status,'REVOKED');
    assert.equal((await native(row.assignmentId)).status,'ACCEPTED');
  });

  await check('manager workspace is source-minimized and stale authority cannot write with the same token',async()=>{
    const t=await trip(90),c=await fixture.candidate(t.id),row=await propose(c);
    const workspace=ok(await call(fixture.requester,'/workspace?tripId='+t.id),200);assert(workspace.assignments.some(a=>a.id===row.assignmentId));
    const serialized=JSON.stringify(workspace);for(const forbidden of ['credentialRequirements','SYNTHETIC-NO-REAL-APPROVAL','qualificationSnapshot','storageKey','passwordHash'])assert(!serialized.includes(forbidden));
    await db.employment.updateMany({where:{accountId:fixture.approver.id},data:{status:'SUSPENDED'}});
    assert.equal((await call(fixture.approver,'/'+row.assignmentId+'/commands','POST',command(row,'APPROVE'))).status,403);
    assert.equal((await native(row.assignmentId)).status,'PROPOSED');
  });
} catch(error) {failure=error;console.error('F02 acceptance failed:',error instanceof Error?error.message:String(error));}
finally {
  global.fetch=nativeFetch;
  if(app)await app.close().catch(()=>{});if(db)await db.$disconnect().catch(()=>{});
  if(schemaCreated&&adminDb)await adminDb.$executeRawUnsafe('DROP SCHEMA "'+schema+'" CASCADE').catch(error=>{failure??=error;});
  if(adminDb)await adminDb.$disconnect().catch(()=>{});
  for(const key of Object.keys(process.env))if(!(key in originalEnvironment))delete process.env[key];Object.assign(process.env,originalEnvironment);
  const sources=['apps/api/prisma/schema.prisma','apps/api/prisma/migrations/20261128030000_crew_assignment_lifecycle/migration.sql','apps/api/src/trips/crew-assignment-evidence.ts','apps/api/src/trips/crew-assignment-lifecycle.ts','apps/api/src/trips/crew-assignment.service.ts','apps/api/src/trips/crew-assignment.controller.ts','apps/api/src/trips/calendar-allocation.service.ts','apps/api/scripts/crew-assignment-isolated-fixture.mjs','apps/api/scripts/f02-crew-assignment-http-e2e.mjs','apps/web/src/hydroland-crew-assignments.js','apps/web/src/hydroland-crew-assignments.css','apps/web/src/hydroland-workspace-ui.js','apps/web/e2e/crew-assignment.spec.js'];
  sources.push('apps/api/src/trips/operational-clearance.service.ts');
  const compiled=['trips/crew-assignment-evidence.js','trips/crew-assignment-lifecycle.js','trips/crew-assignment.service.js','trips/crew-assignment.controller.js','trips/calendar-allocation.service.js','trips/operational-clearance.service.js'];
  const receipt={suite:'F02_NATIVE_CREW_HTTP',startedAt,finishedAt:new Date().toISOString(),status:failure?'FAIL':'PASS',node:process.version,postgres:postgresVersion,checks,requestCount:requests.length,
    bounds:{disposableLoopbackSchema:true,externalProviderCalls:0,realQualificationsCreated:0,realExternalApprovals:0,financialExecution:false,productionModified:false},
    sourceHashes:Object.fromEntries(sources.map(file=>[file,hashFile(file)])),compiledHashes:Object.fromEntries(compiled.map(file=>[file,createHash('sha256').update(readFileSync(resolve(build,file))).digest('hex')]))};
  mkdirSync(dirname(receiptPath),{recursive:true});writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  console.log(`F02 ${receipt.status}: ${checks.filter(c=>c.status==='PASS').length}/${checks.length} groups; receipt ${receiptPath}`);
}
if(failure)process.exitCode=1;
