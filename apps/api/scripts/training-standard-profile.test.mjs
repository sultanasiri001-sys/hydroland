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
    sources: [{ authority:'AGENCY', reference:'SYNTHETIC_SOURCE_DO_NOT_PUBLISH', edition:'TEST_EDITION_1', locator:'fixture-only' }],
    requirements: { minimumAge:10, minimumCompletedSessions:2, minimumOpenWaterDives:2, minimumOpenWaterMinutes:20,
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
test('completion requires all programme-specific evidence',()=>{assert.deepEqual(core.trainingCompletionGaps(fixture(),complete()),[]);const gaps=core.trainingCompletionGaps(fixture(),{completedSessions:0,completedSkillCodes:[],verifiedFormCodes:[],verifiedOpenWaterDives:0,verifiedOpenWaterMinutes:0});assert.equal(gaps.length,5);});
test('session duration is not accepted as bottom time',()=>{const e=complete();e.verifiedOpenWaterMinutes=0;assert.deepEqual(core.trainingCompletionGaps(fixture(),e),['STANDARD_WATER_MINUTES_REQUIRED']);});

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
test('generic sessions or unsigned forms cannot satisfy dive evidence',async()=>{const {tx,state}=database();state.enrollment.record.sessions=[{status:'COMPLETED'},{status:'COMPLETED'}];state.enrollment.record.stages=[{skills:['TEST_MASK','TEST_ASCENT'].map(skillCode=>({skillCode,status:'COMPETENT',signedOffAt:now(),signedOffByInstructorId:'instructor'}))}];await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'),error=>error.response?.gaps?.includes('STANDARD_DIVES_REQUIRED'));});

function evidenceDatabase(){
  const {tx,state}=database(),start=new Date(Date.now()-7200000),end=new Date(start.getTime()+3600000);
  state.enrollment.record.sessions=['session-1','session-2'].map(id=>({id,status:'COMPLETED',instructorAccountId:'instructor',startsAt:start,endsAt:end,evidence:{startedAt:start.toISOString(),completedAt:end.toISOString(),trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:8}}}));
  state.enrollment.record.stages=[{skills:['TEST_MASK','TEST_ASCENT'].map(skillCode=>({skillCode,status:'COMPETENT',signedOffAt:end,signedOffByInstructorId:'instructor'}))}];
  const payload={trainingEnrollmentId:'enrollment',trainingStandardHash:state.enrollment.metadata.trainingStandard.profileHash,studentAccountId:'student',instructorAccountId:'instructor'};
  const doc=(code,extra={})=>({template:{code},contentHash:'SYNTHETIC_DOCUMENT_HASH',approvedByAccountId:'reviewer',signedByAccountId:'instructor',payload:{...payload,...extra}});
  state.documents=[doc('TEST_WAIVER'),doc('TRAINING_DIVE_LOG',{openWaterDives:[{id:'dive-1',sessionId:'session-1',environment:'OPEN_WATER',startedAt:new Date(start.getTime()+60000).toISOString(),bottomMinutes:10,maximumDepthMetres:8},{id:'dive-2',sessionId:'session-2',environment:'OPEN_WATER',startedAt:new Date(start.getTime()+1200000).toISOString(),bottomMinutes:10,maximumDepthMetres:8}]})];
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

// SYNTHETIC per-dive limits: these numbers do not define any real agency programme.
function progression(state) {
  const p=state.profile.metadata.profile;
  p.requirements.openWaterDiveRequirements=[{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:8},{sequence:2,minimumBottomMinutes:10,maximumDepthMetres:12}];
  const hash=core.trainingStandardHash(p);
  state.profile.metadata.contentHash=hash;state.profile.metadata.approval.profileHash=hash;
  state.enrollment.metadata.trainingStandard=core.trainingStandardBinding('profile',p);
  for(const doc of state.documents)doc.payload.trainingStandardHash=hash;
  state.documents[1].payload.openWaterDives.forEach((dive,index)=>{dive.sequence=index+1;});
}
test('completion enforces pinned per-dive rules from independently signed evidence',async()=>{
  const {tx,state}=evidenceDatabase();progression(state);assert.equal((await store.assertTrainingStandardCompletion(tx,'enrollment')).agencyCode,'TEST_AGENCY');
});
for(const [name,mutate] of [
  ['missing sequence',s=>delete s.documents[1].payload.openWaterDives[0].sequence],
  ['duplicate sequence',s=>s.documents[1].payload.openWaterDives[1].sequence=1],
  ['reversed sequence',s=>s.documents[1].payload.openWaterDives.reverse().forEach((d,index)=>d.sequence=index+1)],
  ['short first dive despite sufficient total minutes',s=>{s.documents[1].payload.openWaterDives[0].bottomMinutes=5;s.documents[1].payload.openWaterDives[1].bottomMinutes=15;}],
  ['first-dive depth below general programme limit',s=>{s.documents[1].payload.openWaterDives[0].maximumDepthMetres=9;s.enrollment.record.sessions[0].evidence.trainingStandardContext.plannedMaximumDepthMetres=12;}],
  ['invalid extra proof cannot be silently discarded',s=>s.documents[1].payload.openWaterDives.push({id:'invalid',sessionId:'OTHER',sequence:3})],
  ['rule edit after approval',s=>s.profile.metadata.profile.requirements.openWaterDiveRequirements[0].maximumDepthMetres=16]
])test(`progression completion refuses ${name}`,async()=>{const {tx,state}=evidenceDatabase();progression(state);mutate(state);await assert.rejects(store.assertTrainingStandardCompletion(tx,'enrollment'));assert.equal(state.writeCount,0);});
test('source duration and depth changes alter pinned profile identity',()=>{
  const p=fixture();p.requirements.openWaterDiveRequirements=[{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:8},{sequence:2,minimumBottomMinutes:10,maximumDepthMetres:12}];
  const binding=core.trainingStandardBinding('profile',p);
  for(const key of ['minimumBottomMinutes','maximumDepthMetres']){const q=clone(p);q.requirements.openWaterDiveRequirements[0][key]++;assert.throws(()=>core.assertTrainingStandardBinding(binding,'profile',q,p.programCode));}
});
for(const [name,rules] of [
  ['partial', [{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:8}]],
  ['duplicate', [{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:8},{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:12}]],
  ['missing minutes', [{sequence:1,maximumDepthMetres:8},{sequence:2,minimumBottomMinutes:10,maximumDepthMetres:12}]],
  ['zero depth', [{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:0},{sequence:2,minimumBottomMinutes:10,maximumDepthMetres:12}]],
  ['unknown condition', [{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:8,bypass:true},{sequence:2,minimumBottomMinutes:10,maximumDepthMetres:12}]],
])test(`profile rejects ${name} per-dive rules`,()=>{const p=fixture();p.requirements.openWaterDiveRequirements=rules;assert.throws(()=>core.parseTrainingStandard(p));});
test('legacy profile hash and requirements remain unchanged when no progression is supplied',()=>{
  const p=fixture(),parsed=core.parseTrainingStandard(p);assert.equal(Object.hasOwn(parsed.requirements,'openWaterDiveRequirements'),false);assert.deepEqual(parsed,p);
});
