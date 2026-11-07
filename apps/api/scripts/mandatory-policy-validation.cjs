const assert=require('node:assert/strict');
const {mandatoryBindingStatus}=require('../dist/trips/mandatory-policy.domain');
const {PolicyControlService}=require('../dist/trips/policy-control.service');
const {BoatComplianceService}=require('../dist/trips/boat-compliance.service');
const {TripComplianceService}=require('../dist/trips/trip-compliance.service');
const {WeatherGateService}=require('../dist/trips/weather-gate.service');
const {TripsService}=require('../dist/trips/trips.service');
const {CrewAssignmentService}=require('../dist/trips/crew-assignment.service');
const {trainingOperationalPolicy}=require('../dist/governance/training-operational-policy');
const {binding}=require('./mandatory-policy-fixture.cjs');
let checks=0;
global.fetch=()=>{throw Error('Network is forbidden');};
(async()=>{
 for(const state of ['ENABLED','REVIEW','DISABLED']){
  const root=new Proxy({},{get(){throw Error('Escaped caller transaction');}});
  const tx={$queryRaw:async(s,...v)=>s.join('').includes('PolicyControl')?[{state,metadata:binding(v[0],v[1])}]:[],trip:{findUnique:async()=>({id:'synthetic-trip'})}};
  const service=new PolicyControlService(root,{});
  assert.equal(await service.state('BOAT','NAVIGATION_LICENSE','DISABLED',tx),'ENABLED');
  const boat=await new BoatComplianceService(root,service,{}).evaluate(['synthetic-boat'],1,tx);
  assert.equal(boat.blocked,true);assert(boat.issues.includes('BOAT_NAVIGATION_LICENSE'));
  const trip=await new TripComplianceService(root,service,{}).get('synthetic-trip',tx);
  assert.equal(trip.policyReview.blocked,true);assert.equal(trip.policyReview.externalVerification,false);checks++;
 }
 for(const mutate of [
  b=>{b.source.reviewDueAt='2001-01-01T00:00:00.000Z';},b=>{b.source.effectiveAt='2099-01-01T00:00:00.000Z';},
  b=>{b.category='OTHER';},b=>{b.ruleKey='OTHER';},b=>{b.scope='ONE_CENTER';},b=>{b.source.clause='';},
  b=>{b.source.officialUrl='http://example.gov.sa';},b=>{b.source.officialUrl='https://example.gov.sa.attacker.invalid';},
  b=>{b.source.officialUrl='https://user:password@example.gov.sa';},b=>{b.adoption.reference='';},
  b=>{b.adoption.approvedByAccountId='';},b=>{b.adoption.approvedAt='2099-01-01T00:00:00.000Z';},
  b=>{b.adoption.approvedAt='2021-02-30T00:00:00.000Z';},b=>{b.evidenceIds=[];},b=>{b.applicability='PENDING';},
  b=>{b.schemaVersion=2;},b=>{b.applicabilityReason='';},
 ]){
  const metadata=binding('BOAT','NAVIGATION_LICENSE');mutate(metadata.mandatoryRequirement);
  assert.equal(mandatoryBindingStatus('BOAT','NAVIGATION_LICENSE',metadata),'REVIEW_REQUIRED');
  const svc=new PolicyControlService({$queryRaw:async()=>[{state:'DISABLED',metadata}]},{});
  await assert.rejects(()=>svc.decision('BOAT','NAVIGATION_LICENSE'),e=>e.getStatus()===409&&e.getResponse().code==='MANDATORY_SOURCE_REVIEW_REQUIRED');checks++;
 }
 for(const metadata of [{mandatoryRequirement:null},{mandatoryRequirement:[]},{mandatoryRequirement:{}}]){assert.equal(mandatoryBindingStatus('BOAT','REGISTRATION',metadata),'REVIEW_REQUIRED');checks++;}
 for(const state of ['ENABLED','REVIEW','DISABLED']){
  for(const metadata of [undefined,null,{}, {unrelated:true},(()=>{const m=binding('BOAT','REGISTRATION');m.mandatoryRequirement.applicability='NOT_APPLICABLE';return m;})()]){
   const svc=new PolicyControlService({$queryRaw:async()=>[{state,metadata}]},{});assert.equal(await svc.state('BOAT','REGISTRATION'),state);checks++;
  }
 }
 // Both legacy writes reject a weaker state, with no mutation or audit.
 for(const method of ['setState','upsert']){
  let writes=0,audits=0;const row={id:'synthetic-policy',category:'BOAT',ruleKey:'REGISTRATION',state:'ENABLED',metadata:binding('BOAT','REGISTRATION')};
  const svc=new PolicyControlService({$queryRaw:async s=>{if(/UPDATE|INSERT/.test(s.join('')))writes++;return[row];}},{record:async()=>{audits++;}});
  await assert.rejects(()=>method==='setState'?svc.setState('actor','BOAT','REGISTRATION','DISABLED'):svc.upsert('actor',{category:'BOAT',ruleKey:'REGISTRATION',labelAr:'Synthetic',state:'REVIEW'}),e=>e.getStatus()===403);
  assert.equal(writes,0);assert.equal(audits,0);checks++;
 }
 // The independent weather switch cannot turn an adopted requirement off.
 {
  let writes=0;const db={$queryRaw:async s=>s.join('').includes('PolicyControl')?[{metadata:binding('WEATHER','WEATHER_GATE')}]:[{value:{enabled:false,mode:'ADVISORY'}}],$executeRaw:async()=>{writes++;}};db.serializable=fn=>fn(db);
  const gate=new WeatherGateService(db,{record:()=>{throw Error('Unexpected audit');}});
  assert.deepEqual(await gate.settings(),{enabled:true,mode:'ENFORCE',provider:'STORMGLASS'});
  assert.equal(gate.evaluate(null,await gate.settings()).blocking,true);
  for(const input of [{enabled:false},{mode:'ADVISORY'}])await assert.rejects(()=>gate.configure('actor',input),e=>e.getStatus()===403);
  assert.equal(writes,0);checks++;
 }
 // Adoption committed before transaction entry must be seen by booking too.
 for(const organization of [false,true]){
  let inTransaction=false,writes=0;
  const tx={$queryRaw:async(s,...v)=>s.join('').includes('PolicyControl')?[{state:'DISABLED',metadata:v[0]==='BOOKING'&&v[1]==='SAFETY_APPROVAL'?binding(v[0],v[1]):null}]:[],trip:{findUnique:async()=>({id:'trip',status:'OPEN',startsAt:new Date('2099-01-01')})},booking:{findFirst:async()=>null,findUnique:async()=>null,create:async()=>{writes++;}},organizationMember:{findFirst:async()=>({id:'member'})},safetyChecklist:{findFirst:async()=>null}};
  const root={$queryRaw:()=>{throw Error('Policy read outside booking transaction');},serializable:async fn=>{inTransaction=true;return fn(tx);}};
  const policies=new PolicyControlService(root,{}),service=new TripsService({},root,new WeatherGateService(root,{}),{}, {},policies,{});
  await assert.rejects(()=>organization?service.bookForOrganization('actor','org',{tripId:'trip',seats:1,requestKey:'synthetic'}):service.book('actor','trip',1),e=>e.getStatus()===409);
  assert(inTransaction);assert.equal(writes,0);checks++;
 }
 // A disabled crew master switch cannot override a mandatory child check.
 {
  const svc=new CrewAssignmentService({}, {}, {}),off={state:'DISABLED',enforce:false,review:false,bypass:true,mandatory:false};
  const mandatory={state:'ENABLED',enforce:true,review:false,bypass:false,mandatory:true};
  assert.equal(svc.enforce(off,mandatory),true);assert.equal(svc.review(off,mandatory),false);
  assert.equal(svc.enforce(off,{...mandatory,mandatory:false}),false);checks++;
 }
 for(const ruleKey of ['CAPACITY_LIMIT','SCHEDULE_CONFLICT','SESSION_TIME_WINDOW','ATTENDANCE_REQUIRED']){
  const p=await trainingOperationalPolicy({$queryRaw:async()=>[{ruleKey,state:'DISABLED',metadata:binding('TRAINING',ruleKey)}]});
  assert(Object.values(p).every(Boolean));checks++;
 }
 console.log(`Mandatory policy boundary: ${checks} groups PASS; compiled consumers, all configured states, malformed/stale/scope mismatch, legacy writes and independent weather switch; no network.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
