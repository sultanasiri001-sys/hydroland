import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/governance/training-standard-profile.ts';

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

