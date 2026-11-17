import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Only the isolated adapter suite uses exception substitutes. No Nest/Prisma or production service is contacted.
const exceptions = 'data:text/javascript,' + encodeURIComponent(['BadRequestException','ConflictException','ForbiddenException','NotFoundException'].map(name => `export class ${name} extends Error {constructor(response){super(typeof response==='string'?response:response.message);this.response=response;}}`).join('\n'));
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === '@nestjs/common') return { url: exceptions, shortCircuit: true };
  if (specifier.startsWith('.') && context.parentURL && !/\.[cm]?[jt]s$/.test(specifier)) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });
const core = await import('../src/governance/training-standard-profile.ts');
const store = await import('../src/governance/training-standard-store.ts');
const clone = value => structuredClone(value);

// Every limit and source in this fixture is SYNTHETIC: not PADI, SSI, NAUI, ISO, or Saudi policy.
function fixture(agencyCode = 'TEST_AGENCY') {
  return { agencyCode, programCode: 'SYNTHETIC_OW', level: 'TEST_LEVEL', edition: 'TEST_EDITION_1',
    diveProgression: { schemaVersion:2,timeZone:'Asia/Riyadh',qualification:{minimumDepthMetres:3,minimumPercentAtDepth:40,depthFractionComparison:'MORE_THAN',alternatives:[{metric:'SUBMERGED_SECONDS',minimum:600},{metric:'BREATHED_GAS_LITRES',minimum:900}]},qualifyingDives:[{number:1,maximumDepthMetres:8,requiredSkillCodesBeforeDive:[]},{number:2,maximumDepthMetres:12,requiredSkillCodesBeforeDive:[]}],experienceLimits:[0,1,2].map(afterQualifyingDive=>({afterQualifyingDive,maximumDepthMetres:7})),dayLimits:{maximumDives:3,depthLimits:[],afterConfinedWaterMaximumDives:2}},
    sources: [{ authority:'AGENCY', reference:'SYNTHETIC_SOURCE_DO_NOT_PUBLISH', edition:'TEST_EDITION_1', locator:'fixture-only' }],
    requirements: { minimumAge:10, minimumCompletedSessions:2, minimumOpenWaterDives:2, minimumOpenWaterMinutes:0,
      instructorCredentialTitles:['SYNTHETIC_INSTRUCTOR'], prerequisites:[], requiredSkillCodes:['TEST_MASK','TEST_ASCENT'], requiredFormCodes:['TEST_WAIVER'],
      supervision:[{environment:'OPEN_WATER',minimumAge:10,maximumAge:14,studentsPerInstructor:2,maximumDepthMetres:8},{environment:'OPEN_WATER',minimumAge:15,maximumAge:120,studentsPerInstructor:6,maximumDepthMetres:16}] } };
}
const now = () => new Date();
const credential = (issuer = 'TEST_AGENCY') => ({issuer,title:'SYNTHETIC_INSTRUCTOR',verificationStatus:'VERIFIED',issuedAt:new Date('2020-01-01'),expiresAt:new Date('2099-01-01')});
const complete = () => ({completedSessions:2,completedSkillCodes:['TEST_MASK','TEST_ASCENT'],verifiedFormCodes:['TEST_WAIVER'],verifiedOpenWaterDives:2,verifiedOpenWaterMinutes:20});

test('profile parsing normalizes the agency without hardcoding an agency list',()=>{
  const profile=fixture('test_new_agency');assert.equal(core.parseTrainingStandard(profile).agencyCode,'TEST_NEW_AGENCY');
});
for(const agency of ['TEST_PADI','TEST_NAUI','TEST_SSI','TEST_OTHER'])test(`independent ${agency} profile has its own content hash`,()=>{
  const profile=fixture(agency), other=fixture('TEST_UNRELATED');assert.notEqual(core.trainingStandardHash(profile),core.trainingStandardHash(other));
});
test('canonical hash is stable for JSON key ordering',()=>{
  const p=fixture();assert.equal(core.trainingStandardHash(p),core.trainingStandardHash(Object.fromEntries(Object.entries(p).reverse())));
});
test('edition, programme and requirement changes invalidate the pinned hash',()=>{
  const p=fixture(), binding=core.trainingStandardBinding('profile',p);
  for(const mutate of [q=>q.edition='OTHER',q=>q.programCode='OTHER',q=>q.requirements.minimumAge=15]){const q=clone(p);mutate(q);assert.throws(()=>core.assertTrainingStandardBinding(binding,'profile',q,p.programCode));}
});
test('no profile or programme mismatch can fall back to ISO or another agency',()=>{
  const p=fixture();assert.throws(()=>core.assertTrainingStandardBinding(undefined,'id',p,p.programCode));assert.throws(()=>core.assertTrainingStandardBinding(core.trainingStandardBinding('id',p),'id',p,'OTHER'));
});
test('ISO-only sources do not establish an agency programme',()=>{const p=fixture();p.sources[0].authority='ISO';assert.throws(()=>core.parseTrainingStandard(p),{code:'AGENCY_SOURCE_REQUIRED'});});
for(const [name,mutate] of [
  ['unknown field',p=>p.bypass=true],['missing sources',p=>p.sources=[]],['missing edition',p=>p.edition=''],['zero ratio',p=>p.requirements.supervision[0].studentsPerInstructor=0],
  ['negative depth',p=>p.requirements.supervision[0].maximumDepthMetres=-1],['infinite depth',p=>p.requirements.supervision[0].maximumDepthMetres=Infinity],['reversed age band',p=>p.requirements.supervision[0].maximumAge=3],
  ['duplicate skills',p=>p.requirements.requiredSkillCodes.push('TEST_MASK')],['missing instructor titles',p=>p.requirements.instructorCredentialTitles=[]],['missing supervision',p=>p.requirements.supervision=[]],
  ['unknown environment',p=>p.requirements.supervision[0].environment='ANY'],['partial requirements',p=>delete p.requirements.minimumOpenWaterMinutes]
])test(`rejects ${name}`,()=>{const p=fixture();mutate(p);assert.throws(()=>core.parseTrainingStandard(p));});
test('verified exact-issuer credentials cannot be borrowed across agencies',()=>{
  assert.equal(core.hasTrainingCredential([credential()],'TEST_AGENCY',['SYNTHETIC_INSTRUCTOR'],now()),true);
  assert.equal(core.hasTrainingCredential([credential()],'OTHER',['SYNTHETIC_INSTRUCTOR'],now()),false);
});
for(const [name,changes] of [['unverified',{verificationStatus:'UNVERIFIED'}],['expired',{expiresAt:new Date('2000-01-01')}],['future-issued',{issuedAt:new Date('2099-01-01')}],['wrong-title',{title:'SYNTHETIC_DIVER'}]])test(`rejects ${name} instructor qualification`,()=>{
  assert.equal(core.hasTrainingCredential([{...credential(),...changes}],'TEST_AGENCY',['SYNTHETIC_INSTRUCTOR'],now()),false);
});
test('age boundary uses the Riyadh activity date',()=>{assert.equal(core.ageOn(new Date('2016-11-09'),new Date('2026-11-08T21:00:00Z')),10);assert.equal(core.ageOn(null,now()),null);assert.equal(core.ageOn(new Date('2099-01-01'),now()),null);});
test('age-specific supervision changes without changing the course agency',()=>{
  assert.equal(core.trainingSupervisionLimits(fixture(),12,'OPEN_WATER').studentsPerInstructor,2);assert.equal(core.trainingSupervisionLimits(fixture(),20,'OPEN_WATER').maximumDepthMetres,16);
});
test('unknown environment or under-age participant fails closed',()=>{assert.throws(()=>core.trainingSupervisionLimits(fixture(),9,'OPEN_WATER'));assert.throws(()=>core.trainingSupervisionLimits(fixture(),20,'POOL'));});
test('overlapping age limits intersect conservatively',()=>{const p=fixture();p.requirements.supervision.push({environment:'OPEN_WATER',minimumAge:10,maximumAge:120,studentsPerInstructor:1,maximumDepthMetres:5});assert.deepEqual(core.trainingSupervisionLimits(p,12,'OPEN_WATER'),{studentsPerInstructor:1,maximumDepthMetres:5});});
test('completion requires all programme-specific evidence',()=>{assert.deepEqual(core.trainingCompletionGaps(fixture(),complete()),[]);const gaps=core.trainingCompletionGaps(fixture(),{completedSessions:0,completedSkillCodes:[],verifiedFormCodes:[],verifiedOpenWaterDives:0,verifiedOpenWaterMinutes:0});assert.deepEqual(gaps,['STANDARD_SESSIONS_REQUIRED','STANDARD_DIVES_REQUIRED','STANDARD_SKILLS_REQUIRED','STANDARD_FORMS_REQUIRED']);});
test('aggregate session minutes cannot replace the v2 qualification contract',()=>{const p=fixture();p.requirements.minimumOpenWaterMinutes=20;assert.throws(()=>core.parseTrainingStandard(p),{code:'INVALID_STANDARD'});});

function database() {
  const p=fixture(), hash=core.trainingStandardHash(p), profile={id:'profile',category:'TRAINING_STANDARD_PROFILE',ruleKey:'PROFILE',state:'APPROVED',updatedAt:new Date('2026-01-01'),metadata:{schemaVersion:1,profile:p,contentHash:hash,createdByAccountId:'author',approval:{profileHash:hash,reviewedByAccountId:'reviewer',approvalReference:'SYNTHETIC_REVIEW',reviewedAt:'2025-01-01',validUntil:'2099-01-01'}}};
  const enrollment={id:'enrollment',studentAccountId:'student',instructorAccountId:'instructor',courseCode:p.programCode,centerOrganizationId:'centre',status:'PENDING',enrolledAt:new Date(Date.now()-86400000),updatedAt:new Date('2026-01-01'),record:{id:'record',updatedAt:new Date('2026-01-01'),sessions:[],stages:[]},metadata:{trainingStandard:core.trainingStandardBinding('profile',p),trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:8}}};
  const state={profile,enrollment,audits:[],assessments:[],documents:[],roleActive:true,instructorCredentials:[credential()],studentCredentials:[],birthday:new Date('2000-01-01'),writeCount:0};
  const tx={
    roleAssignment:{findFirst:async({where})=>{const role=where.accountId==='instructor'?'INSTRUCTOR':'REVIEWER';return state.roleActive&&(typeof where.role==='string'?where.role===role:where.role.in.includes(role))?{id:'role',role,account:{person:{credentials:state.instructorCredentials}}}:null;}},
    policyControl:{findFirst:async()=>state.profile,findMany:async()=>[state.profile],create:async({data})=>{state.profile={...data,updatedAt:now()};state.writeCount++;return state.profile;},updateMany:async({where,data})=>{if(state.profile.updatedAt.getTime()!==where.updatedAt.getTime())return {count:0};Object.assign(state.profile,data);state.writeCount++;return {count:1};}},
    account:{findFirst:async({where})=>where.id==='instructor'?{person:{credentials:state.instructorCredentials}}:{diverProfile:{dateOfBirth:state.birthday},person:{credentials:state.studentCredentials}},findUniqueOrThrow:async()=>({diverProfile:{dateOfBirth:state.birthday}})},
    trainingEnrollment:{findUnique:async()=>state.enrollment,findUniqueOrThrow:async()=>state.enrollment,updateMany:async({where,data})=>{if(state.enrollment.updatedAt.getTime()!==where.updatedAt.getTime())return {count:0};Object.assign(state.enrollment,data);state.writeCount++;return {count:1};}},
    trainingRecord:{update:async()=>({}),create:async()=>state.enrollment.record},trainingStage:{create:async()=>({id:'stage'})},trainingSkill:{createMany:async()=>({count:2})},
    trainingSession:{findFirst:async()=>null},organizationMember:{findFirst:async()=>({id:'member'})},managedDocument:{findMany:async()=>state.documents},auditEvent:{create:async({data})=>state.audits.push(data),findMany:async()=>state.assessments}
  };return {tx,state};
}
test('approved matching profile resolves from persisted server state',async()=>{const {tx,state}=database();const r=await store.assertTrainingStandardReady(tx,state.enrollment,'instructor');assert.equal(r.profile.agencyCode,'TEST_AGENCY');});
for(const [name,change] of [
  ['missing binding',s=>s.enrollment.metadata={}],['draft',s=>s.profile.state='REVIEW'],['revoked',s=>s.profile.state='REVOKED'],['generic ENABLED flag',s=>s.profile.state='ENABLED'],
  ['expired source approval',s=>s.profile.metadata.approval.validUntil='2000-01-01'],['changed source',s=>s.profile.metadata.profile.edition='ALTERED'],['missing approval reference',s=>delete s.profile.metadata.approval.approvalReference],
  ['self-reviewed source',s=>s.profile.metadata.approval.reviewedByAccountId='author'],['wrong instructor agency',s=>s.instructorCredentials=[credential('OTHER')]],['unknown date of birth',s=>s.birthday=null],['missing planned depth',s=>delete s.enrollment.metadata.trainingStandardContext.plannedMaximumDepthMetres],['excessive planned depth',s=>s.enrollment.metadata.trainingStandardContext.plannedMaximumDepthMetres=100]
])test(`runtime rejects ${name} without writes`,async()=>{const {tx,state}=database();change(state);await assert.rejects(store.assertTrainingStandardReady(tx,state.enrollment,'instructor'));assert.equal(state.writeCount,0);});
test('source approval must cover the scheduled activity date',async()=>{const {tx,state}=database();state.profile.metadata.approval.validUntil='2030-01-01';await assert.rejects(store.assertTrainingStandardReady(tx,state.enrollment,'instructor',new Date('2031-01-01')));});
test('student registration cannot inject trusted bindings',()=>{assert.throws(()=>store.rejectReservedTrainingMetadata({trainingStandard:{}}));assert.throws(()=>store.rejectReservedTrainingMetadata({trainingStandardContext:{}}));assert.doesNotThrow(()=>store.rejectReservedTrainingMetadata({notes:'allowed'}));});
test('instructor cannot draft or approve profiles without reviewer authority',async()=>{const {tx,state}=database();state.roleActive=false;await assert.rejects(store.createTrainingStandardDraft(tx,'instructor',{profile:fixture(),reason:'SYNTHETIC_REASON'}));assert.equal(state.writeCount,0);});
test('drafting never grants approval',async()=>{const {tx,state}=database();const r=await store.createTrainingStandardDraft(tx,'author',{profile:fixture(),reason:'SYNTHETIC_REASON'});assert.equal(r.state,'REVIEW');assert.equal(state.profile.metadata.approval,null);assert.equal(state.audits[0].metadata.actorAccountId,'author');});
test('author cannot self-approve a profile',async()=>{const {tx,state}=database();state.profile.state='REVIEW';state.profile.metadata.approval=null;await assert.rejects(store.decideTrainingStandard(tx,'author','profile',{outcome:'APPROVE',reviewed:true,approvalReference:'SYNTHETIC_REVIEW',expectedUpdatedAt:state.profile.updatedAt.toISOString(),validUntil:'2099-01-01'}));assert.equal(state.writeCount,0);});
test('independent review pins the exact hash',async()=>{const {tx,state}=database();state.profile.state='REVIEW';state.profile.metadata.approval=null;const r=await store.decideTrainingStandard(tx,'reviewer','profile',{outcome:'APPROVE',reviewed:true,approvalReference:'SYNTHETIC_REVIEW',expectedUpdatedAt:state.profile.updatedAt.toISOString(),validUntil:'2099-01-01'});assert.equal(r.state,'APPROVED');assert.equal(state.profile.metadata.approval.profileHash,core.trainingStandardHash(fixture()));});
test('stale review does not mutate source state',async()=>{const {tx,state}=database();await assert.rejects(store.decideTrainingStandard(tx,'reviewer','profile',{outcome:'REVOKE',reviewed:true,approvalReference:'SYNTHETIC_REVIEW',expectedUpdatedAt:'2000-01-01'}));assert.equal(state.writeCount,0);});
test('binding writes only for assigned instructor and pins once',async()=>{const {tx,state}=database();state.enrollment.metadata={};const body={profileId:'profile',environment:'OPEN_WATER',plannedMaximumDepthMetres:8,expectedUpdatedAt:state.enrollment.updatedAt.toISOString(),reason:'SYNTHETIC_SELECTION'};await assert.rejects(store.bindTrainingStandard(tx,'other','enrollment',body));const r=await store.bindTrainingStandard(tx,'instructor','enrollment',body);assert.equal(r.binding.agencyCode,'TEST_AGENCY');await assert.rejects(store.bindTrainingStandard(tx,'instructor','enrollment',{...body,expectedUpdatedAt:state.enrollment.updatedAt.toISOString()}));assert.equal(state.writeCount,1);});
test('instructor catalog hides draft or unauthorised agency profiles',async()=>{const {tx,state}=database();assert.equal((await store.trainingStandardCatalog(tx,'instructor')).profiles.length,1);state.instructorCredentials=[credential('OTHER')];assert.equal((await store.trainingStandardCatalog(tx,'instructor')).profiles.length,0);state.profile.state='REVIEW';assert.equal((await store.trainingStandardCatalog(tx,'instructor')).profiles.length,0);});
test('generic sessions or unsigned forms cannot satisfy dive evidence',async()=>{const {tx,state}=database();state.enrollment.record.sessions=[{status:'COMPLETED'},{status:'COMPLETED'}];state.enrollment.record.stages=[{skills:['TEST_MASK','TEST_ASCENT'].map(skillCode=>({skillCode,status:'COMPETENT',signedOffAt:now(),signedOffByInstructorId:'instructor'}))}];await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),error=>error.code==='DIVE_EVIDENCE_INVALID'||error.response?.gaps?.includes('STANDARD_DIVES_REQUIRED'));});

function evidenceDatabase(){
  const {tx,state}=database(),start=new Date(Date.now()-7200000),end=new Date(start.getTime()+38*60000);
  state.enrollment.record.sessions=['session-1','session-2'].map((id,index)=>{const a=new Date(start.getTime()+index*20*60000),b=new Date(a.getTime()+18*60000);return {id,status:'COMPLETED',instructorAccountId:'instructor',startsAt:a,endsAt:b,evidence:{startedAt:a.toISOString(),endedAt:b.toISOString(),startedByAccountId:'instructor',completedByAccountId:'instructor',instructorCheckInAt:a.toISOString(),studentCheckInAt:a.toISOString(),instructorCheckInByAccountId:'instructor',studentCheckInByAccountId:'instructor',instructorCheckInSource:'AUTHORIZED_OPERATOR',studentCheckInSource:'AUTHORIZED_OPERATOR',trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:8}}};});
  state.enrollment.record.stages=[{skills:['TEST_MASK','TEST_ASCENT'].map(skillCode=>({skillCode,status:'COMPETENT',signedOffAt:end,signedOffByInstructorId:'instructor'}))}];
  const payload={trainingEnrollmentId:'enrollment',trainingStandardHash:state.enrollment.metadata.trainingStandard.profileHash,studentAccountId:'student',instructorAccountId:'instructor'};
  const doc=(code,extra={})=>({organizationId:'centre',status:'SIGNED',approvedAt:new Date(end.getTime()+1000),signedAt:new Date(end.getTime()+2000),template:{code},contentHash:'SYNTHETIC_DOCUMENT_HASH',createdByAccountId:'document-creator',approvedByAccountId:'reviewer',signedByAccountId:'instructor',payload:{...payload,...extra}});
  state.documents=[doc('TEST_WAIVER'),doc('TRAINING-DIVE-LOG',{openWaterDives:[0,1].map(index=>({id:'dive-'+(index+1),sessionId:'session-'+(index+1),environment:'OPEN_WATER',startedAt:new Date(start.getTime()+(index*20+1)*60000).toISOString(),endedAt:new Date(start.getTime()+(index*20+11)*60000).toISOString(),kind:'QUALIFYING',qualifyingNumber:index+1,maximumDepthMetres:8,submergedSeconds:600,depthThresholdMetres:3,secondsAtOrDeeperThanThreshold:400,breathedGasLitres:null}))})];
  return {tx,state};
}
test('completion can accept independent signed programme-bound evidence',async()=>{const {tx}=evidenceDatabase();assert.equal((await store.assertTrainingStandardCompletion(tx,'enrollment')).agencyCode,'TEST_AGENCY');});
for(const [name,change] of [
  ['wrong profile',s=>s.documents[1].payload.trainingStandardHash='OTHER'],['student self-approval',s=>s.documents[1].approvedByAccountId='student'],['wrong student',s=>s.documents[1].payload.studentAccountId='OTHER'],['unsigned dive log',s=>s.documents[1].signedByAccountId=null],['wrong session',s=>s.documents[1].payload.openWaterDives[0].sessionId='OTHER'],['no actual attendance window',s=>delete s.enrollment.record.sessions[0].evidence.startedAt],['over-depth dive',s=>s.documents[1].payload.openWaterDives[0].maximumDepthMetres=100]
])test(`completion rejects ${name}`,async()=>{const {tx,state}=evidenceDatabase();change(state);await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'));});
test('duplicate dive identifiers are not counted twice',async()=>{const {tx,state}=evidenceDatabase();state.documents[1].payload.openWaterDives[1].id='dive-1';await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'));});
test('overlapping dive times with distinct IDs are rejected',async()=>{const {tx,state}=evidenceDatabase();state.documents[1].payload.openWaterDives[1].startedAt=state.documents[1].payload.openWaterDives[0].startedAt;await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'));});
test('individual supervision cannot be bypassed by a generic scheduling switch',async()=>{const {tx}=database();tx.trainingSession.findFirst=async()=>({id:'overlap'});await assert.rejects(store.assertStandardSupervisionAvailable(tx,'instructor',now(),new Date(Date.now()+600000),'current'));});
test('session-specific pool and sea limits use the same pinned programme',async()=>{const {tx,state}=database();state.profile.metadata.profile.requirements.supervision.push({environment:'POOL',minimumAge:10,maximumAge:120,studentsPerInstructor:4,maximumDepthMetres:3});const p=state.profile.metadata.profile,h=core.trainingStandardHash(p);state.profile.metadata.contentHash=h;state.profile.metadata.approval.profileHash=h;state.enrollment.metadata.trainingStandard=core.trainingStandardBinding('profile',p);const r=await store.assertTrainingStandardReady(tx,state.enrollment,'instructor',now(),{environment:'POOL',plannedMaximumDepthMetres:3});assert.equal(r.limits.maximumDepthMetres,3);await assert.rejects(store.assertTrainingStandardReady(tx,state.enrollment,'instructor',now(),{environment:'POOL',plannedMaximumDepthMetres:4}));});
test('a transferred course preserves an earlier signature with exact source-bound audit proof',async()=>{const {tx,state}=evidenceDatabase();const skill=state.enrollment.record.stages[0].skills[0];skill.id='prior-skill';skill.signedOffByInstructorId='previous-instructor';state.assessments=[{resourceId:skill.id,metadata:{trainingStandardHash:state.enrollment.metadata.trainingStandard.profileHash,assessedByAccountId:'previous-instructor',signedOffAt:skill.signedOffAt.toISOString(),status:'COMPETENT'}}];await store.assertTrainingStandardCompletion(tx,'enrollment');});
test('an earlier signature without source-bound audit proof is not silently accepted',async()=>{const {tx,state}=evidenceDatabase();state.enrollment.record.stages[0].skills[0].signedOffByInstructorId='previous-instructor';await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'));});

// Guard coverage: supplemental wiring assertions, not a substitute for real Nest HTTP/DB tests.
test('session, legacy completion and certificate paths all retain the new gate',()=>{
  const read=name=>readFileSync(new URL('../src/governance/'+name,import.meta.url),'utf8');
  assert.match(read('training-session.service.ts'),/action!==\s*'CANCEL'.*assertTrainingStandardReady/);
  assert.match(read('training-repository.service.ts'),/status==='COMPLETED'.*assertTrainingStandardCompletion/);
  assert.match(read('training-course-progress.service.ts'),/assertTrainingStandardCompletion\(tx,enrollmentId\)/);
  assert.match(read('training-certificate.service.ts'),/outcome === 'APPROVED'.*assertTrainingStandardCompletion/);
  assert.match(read('training.controller.ts'),/@UseGuards\(AccessTokenGuard\)/);
});

function repinSynthetic(state) {
  const p=state.profile.metadata.profile,h=core.trainingStandardHash(p);
  state.profile.metadata.contentHash=h;state.profile.metadata.approval.profileHash=h;
  state.enrollment.metadata.trainingStandard=core.trainingStandardBinding('profile',p);
  state.documents.forEach(d=>{d.payload.trainingStandardHash=h;});
}
test('progression definition is included in the full immutable source hash',()=>{
  const p=fixture(),binding=core.trainingStandardBinding('profile',p);
  const policy=core.trainingStandardProgressionPolicy(p);assert.equal(policy.profileHash,binding.profileHash);assert.equal(policy.schemaVersion,2);
  p.diveProgression.qualification.alternatives[0].minimum++;
  assert.throws(()=>core.assertTrainingStandardBinding(binding,'profile',p,p.programCode));
});
for(const [name,mutate]of[
  ['missing progression',p=>delete p.diveProgression],
  ['caller supplied policy hash',p=>p.diveProgression.profileHash='a'.repeat(64)],
  ['old schema',p=>p.diveProgression.schemaVersion=1],
  ['inconsistent dive count',p=>p.requirements.minimumOpenWaterDives=3],
  ['unmapped prerequisite skill',p=>p.diveProgression.qualifyingDives[0].requiredSkillCodesBeforeDive=['UNKNOWN_SKILL']],
  ['aggregate minimum as alternative',p=>p.requirements.minimumOpenWaterMinutes=20]
])test(`source profile rejects ${name}`,()=>{const p=fixture();mutate(p);assert.throws(()=>core.parseTrainingStandard(p));});
test('non-diving profiles do not receive implicit progression or altered policy shape',()=>{
  const p=fixture();delete p.diveProgression;p.requirements.minimumOpenWaterDives=0;
  assert.equal(core.trainingStandardProgressionPolicy(p),undefined);assert.equal(Object.hasOwn(core.parseTrainingStandard(p),'diveProgression'),false);
});
test('real completion path accepts gas alternative below submerged time threshold',async()=>{
  const {tx,state}=evidenceDatabase();const d=state.documents[1].payload.openWaterDives[0];
  d.endedAt=new Date(Date.parse(d.startedAt)+30000).toISOString();Object.assign(d,{submergedSeconds:30,depthThresholdMetres:3,secondsAtOrDeeperThanThreshold:20,breathedGasLitres:900});
  await store.assertTrainingStandardCompletion(tx,'enrollment');
});
for(const [name,mutate]of[
  ['neither qualification alternative',s=>Object.assign(s.documents[1].payload.openWaterDives[0],{submergedSeconds:500,secondsAtOrDeeperThanThreshold:300,breathedGasLitres:899})],
  ['only brief minimum-depth visit',s=>s.documents[1].payload.openWaterDives[0].secondsAtOrDeeperThanThreshold=1],
  ['submerged time exceeds actual dive',s=>s.documents[1].payload.openWaterDives[0].submergedSeconds=601],
  ['wrong depth measurement threshold',s=>s.documents[1].payload.openWaterDives[0].depthThresholdMetres=2],
  ['incorrect qualifying sequence',s=>s.documents[1].payload.openWaterDives[0].qualifyingNumber=2],
  ['legacy aggregate-only log',s=>{s.documents[1].payload.openWaterDives[0].bottomMinutes=10;delete s.documents[1].payload.openWaterDives[0].submergedSeconds;}],
  ['missing proof for completed OW session',s=>s.documents[1].payload.openWaterDives.pop()],
  ['multiple dives for one individual session',s=>s.documents[1].payload.openWaterDives[1].sessionId='session-1'],
  ['unknown completed environment',s=>s.enrollment.record.sessions[0].evidence.trainingStandardContext.environment='UNKNOWN'],
  ['completed historical instructor without reviewed adoption',s=>s.enrollment.record.sessions[0].instructorAccountId='earlier-instructor'],
  ['cancelled but started activity',s=>s.enrollment.record.sessions[0].status='CANCELLED'],
  ['unfinished started activity',s=>s.enrollment.record.sessions[0].status='IN_PROGRESS'],
  ['overlapping actual activity windows',s=>s.enrollment.record.sessions[1].evidence.startedAt=s.enrollment.record.sessions[0].evidence.startedAt],
  ['signature before dive end',s=>s.documents[1].signedAt=s.enrollment.record.sessions[0].startsAt],
  ['approval before dive end',s=>s.documents[1].approvedAt=s.enrollment.record.sessions[0].startsAt],
  ['future signature',s=>s.documents[1].signedAt=new Date('2099-01-01')],
  ['wrong document center',s=>s.documents[1].organizationId='other-centre'],
  ['foreign source log alongside good evidence',s=>{const d=clone(s.documents[1]);d.payload.trainingStandardHash='OTHER';s.documents.push(d);}],
  ['malformed signed log alongside good evidence',s=>{const d=clone(s.documents[1]);d.payload.openWaterDives=[];s.documents.push(d);}],
  ['new policy under old approval hash',s=>s.profile.metadata.profile.diveProgression.dayLimits.afterConfinedWaterMaximumDives=1]
])test(`bound progression completion refuses ${name}`,async()=>{const {tx,state}=evidenceDatabase();mutate(state);await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'));assert.equal(state.writeCount,0);});
test('experience credit cannot replace a required qualifying dive',async()=>{
  const {tx,state}=evidenceDatabase();Object.assign(state.documents[1].payload.openWaterDives[1],{kind:'EXPERIENCE',qualifyingNumber:null,maximumDepthMetres:7});
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.response?.gaps?.includes('STANDARD_DIVES_REQUIRED'));
});
test('source review must already cover the actual training history',async()=>{
  const {tx,state}=evidenceDatabase();state.profile.metadata.approval.reviewedAt=new Date(Date.now()-60000).toISOString();
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.response?.code==='TRAINING_STANDARD_NOT_APPROVED');
});
test('prerequisite assessment evidence is needed before the specific dive',async()=>{
  const {tx,state}=evidenceDatabase();state.profile.metadata.profile.diveProgression.qualifyingDives[1].requiredSkillCodesBeforeDive=['TEST_MASK'];repinSynthetic(state);
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.response?.violations?.some(v=>v.code==='PRE_DIVE_SKILL_REQUIRED'));
  state.enrollment.record.stages[0].skills[0].signedOffAt=new Date(state.enrollment.record.sessions[0].startsAt.getTime()-1000);
  await store.assertTrainingStandardCompletion(tx,'enrollment');
});
test('complete confined history activates the bound daily cap in completion adapter',async()=>{
  const {tx,state}=evidenceDatabase(),p=state.profile.metadata.profile;
  p.requirements.supervision.push({environment:'POOL',minimumAge:10,maximumAge:120,studentsPerInstructor:2,maximumDepthMetres:3});p.diveProgression.dayLimits.afterConfinedWaterMaximumDives=1;repinSynthetic(state);
  const end=new Date(state.enrollment.record.sessions[0].startsAt.getTime()-60000),start=new Date(end.getTime()-10*60000);
  state.enrollment.record.sessions.push({id:'confined',status:'COMPLETED',instructorAccountId:'instructor',startsAt:start,endsAt:end,evidence:{startedAt:start.toISOString(),endedAt:end.toISOString(),startedByAccountId:'instructor',completedByAccountId:'instructor',instructorCheckInAt:start.toISOString(),studentCheckInAt:start.toISOString(),instructorCheckInByAccountId:'instructor',studentCheckInByAccountId:'instructor',instructorCheckInSource:'AUTHORIZED_OPERATOR',studentCheckInSource:'AUTHORIZED_OPERATOR',trainingStandardContext:{environment:'POOL',plannedMaximumDepthMetres:3}}});
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.response?.violations?.some(v=>v.code==='AFTER_CONFINED_DAILY_DIVE_LIMIT'));
});
test('profile without OW policy cannot accept completed OW activity silently',async()=>{
  const {tx,state}=evidenceDatabase(),p=state.profile.metadata.profile;delete p.diveProgression;p.requirements.minimumOpenWaterDives=0;repinSynthetic(state);
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.response?.code==='DIVE_PROGRESSION_POLICY_REQUIRED');
});
test('overlong complete activity history is refused rather than truncated',async()=>{
  const {tx,state}=evidenceDatabase();state.enrollment.record.sessions=Array.from({length:201},()=>state.enrollment.record.sessions[0]);
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.code==='DIVE_EVIDENCE_INVALID');
});

// Producer/consumer seam: TrainingSessionService COMPLETE writes endedAt.
test('classified session and signed dive must retain the same kind and sequence',async()=>{
  const {tx,state}=evidenceDatabase(),context=state.enrollment.record.sessions[0].evidence.trainingStandardContext;
  Object.assign(context,{diveKind:'QUALIFYING',qualifyingNumber:1});await store.assertTrainingStandardCompletion(tx,'enrollment');
  context.qualifyingNumber=2;await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.code==='DIVE_EVIDENCE_INVALID');
  Object.assign(context,{diveKind:'EXPERIENCE',qualifyingNumber:null});await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.code==='DIVE_EVIDENCE_INVALID');
  assert.equal(state.writeCount,0);
});
test('producer endedAt attendance is consumed without inventing completedAt',async()=>{
  const {tx,state}=evidenceDatabase();assert.equal(Object.hasOwn(state.enrollment.record.sessions[0].evidence,'completedAt'),false);
  await store.assertTrainingStandardCompletion(tx,'enrollment');
  const e=state.enrollment.record.sessions[0].evidence;e.completedAt=e.endedAt;delete e.endedAt;
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),error=>error.code==='DIVE_EVIDENCE_INVALID');
});
for(const field of ['instructorCheckInAt','studentCheckInAt','instructorCheckInByAccountId','studentCheckInByAccountId','instructorCheckInSource','studentCheckInSource','startedByAccountId','completedByAccountId'])test(`producer attendance requires ${field}`,async()=>{
  const {tx,state}=evidenceDatabase();delete state.enrollment.record.sessions[0].evidence[field];
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.code==='DIVE_EVIDENCE_INVALID');
});
test('post-start check-in does not prove attendance at start',async()=>{
  const {tx,state}=evidenceDatabase();const e=state.enrollment.record.sessions[0].evidence;e.studentCheckInAt=new Date(Date.parse(e.startedAt)+1000).toISOString();
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),error=>error.code==='DIVE_EVIDENCE_INVALID');
});
test('self check-in attribution cannot be borrowed from another account',async()=>{
  const {tx,state}=evidenceDatabase();const e=state.enrollment.record.sessions[0].evidence;e.studentCheckInSource='SELF';e.studentCheckInByAccountId='instructor';
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),error=>error.code==='DIVE_EVIDENCE_INVALID');
});

// The document producer accepts scalar TABLE cells, never nested evidence objects.
const {validateDocumentPayload}=await import('../src/document-forms/document-payload.ts');
const diveDocumentFields=[
  ...['trainingEnrollmentId','studentAccountId','instructorAccountId','trainingStandardHash'].map(key=>({key,labelAr:key,labelEn:key,type:'TEXT',required:true})),
  {key:'openWaterDives',labelAr:'Synthetic dives',labelEn:'Synthetic dives',type:'TABLE',required:true,options:['id','sessionId','environment','startedAt','endedAt','kind','qualifyingNumber','maximumDepthMetres','submergedSeconds','depthThresholdMetres','secondsAtOrDeeperThanThreshold','breathedGasLitres']}
];
test('signed dive scalar contract is accepted by the actual document payload validator',()=>{
  const {state}=evidenceDatabase();assert.doesNotThrow(()=>validateDocumentPayload(diveDocumentFields,state.documents[1].payload));
});
test('nested dive measurements cannot bypass the actual TABLE producer contract',async()=>{
  const {tx,state}=evidenceDatabase(),d=state.documents[1].payload.openWaterDives[0];
  d.qualificationEvidence={submergedSeconds:d.submergedSeconds,depthThresholdMetres:d.depthThresholdMetres,secondsAtOrDeeperThanThreshold:d.secondsAtOrDeeperThanThreshold,breathedGasLitres:d.breathedGasLitres};
  for(const key of Object.keys(d.qualificationEvidence))delete d[key];
  assert.throws(()=>validateDocumentPayload(diveDocumentFields,state.documents[1].payload));
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.code==='DIVE_EVIDENCE_INVALID');
});
for(const [name,mutate]of[
  ['legacy underscored template',s=>s.documents[1].template.code='TRAINING_DIVE_LOG'],
  ['missing document creator',s=>delete s.documents[1].createdByAccountId],
  ['creator also approves',s=>s.documents[1].createdByAccountId=s.documents[1].approvedByAccountId],
  ['creator also signs',s=>s.documents[1].createdByAccountId=s.documents[1].signedByAccountId],
  ['legacy log alongside current valid log',s=>{const d=clone(s.documents[1]);d.template.code='TRAINING_DIVE_LOG';s.documents.push(d);}]
])test(`document lifecycle compatibility refuses ${name}`,async()=>{
  const {tx,state}=evidenceDatabase();mutate(state);
  await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),e=>e.code==='DIVE_EVIDENCE_INVALID');
});
