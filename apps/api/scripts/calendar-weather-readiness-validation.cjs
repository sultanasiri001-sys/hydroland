const assert=require('node:assert/strict');
const {CalendarAllocationService}=require(process.env.CALENDAR_READINESS_MODULE||'../dist/trips/calendar-allocation.service');
const {WeatherGateService}=require(process.env.WEATHER_GATE_MODULE||'../dist/trips/weather-gate.service');
const {TripComplianceService}=require('../dist/trips/trip-compliance.service');
let checks=0,providerCalls=0;
global.fetch=()=>{throw new Error('Network forbidden in calendar readiness fixture');};
const startsAt=new Date('2036-09-01T06:00:00Z'),endsAt=new Date('2036-09-01T07:00:00Z');
const context={version:1,tripId:'calendar-fixture',startsAt:startsAt.toISOString(),endsAt:endsAt.toISOString(),latitude:18.2,longitude:42.5,locationName:'Fixture',locationRevision:'fixture-revision'};
const snapshot={provider:'STORMGLASS',observedAt:startsAt.toISOString(),windSpeedKph:10,decision:'ALLOWED',forecastContext:context};
const canonical={status:'APPROVED',snapshot,context,fetchedAt:new Date(),requiresRefresh:false};
const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('PASS',label);};
async function read(review,{legacyDecision='ALLOWED',safetyDecision='ALLOWED',enabled=true,mode='ENFORCE',weatherPolicy='ENABLED',safetyPolicy='ENABLED',regulatoryPolicy='DISABLED',permitPolicy='DISABLED',complianceRecord={regulatoryStatus:'APPROVED',permitStatus:'APPROVED'}}={}){
 const db={trip:{findUnique:async()=>({id:'calendar-fixture'}),findMany:async()=>[{id:'calendar-fixture',title:'Fixture',type:'TEST',startsAt,endsAt,capacity:1,status:'OPEN',bookings:[],safetyChecklists:safetyDecision?[{decision:safetyDecision,items:{weather:{...snapshot,decision:legacyDecision}}}]:[]}]},$queryRaw:async(strings)=>{
  const sql=strings.join('');assert.match(sql,/^\s*SELECT/,'calendar readiness is read-only');
  return sql.includes('FROM "TripComplianceReview"')&&complianceRecord?[{tripId:'calendar-fixture',...complianceRecord}]:[];
 }};
 const realGate=new WeatherGateService({},{}),gate={settings:async()=>({enabled,mode}),evaluate:realGate.evaluate.bind(realGate),evaluateReview:realGate.evaluateReview.bind(realGate)};
 const policies={decision:async(category,key)=>{const state=category==='WEATHER'?weatherPolicy:key==='SAFETY_CLEARANCE'?safetyPolicy:category==='COMPLIANCE'?(key==='REGULATORY_REVIEW'?regulatoryPolicy:permitPolicy):'DISABLED';return {state,enforce:state==='ENABLED',review:state==='REVIEW',bypass:state==='DISABLED'};}};
 let canonicalReads=0;
 const service=new CalendarAllocationService(db,{},gate,policies,{}, {evaluate:async()=>({blocked:false,reviewRequired:false,states:{}})},new TripComplianceService(db,policies,{}),{}, {latest:async id=>{assert.equal(id,'calendar-fixture');canonicalReads++;return review;},refresh:()=>{providerCalls++;throw Error('Readiness must not refresh provider');}});
 const [result]=await service.calendar('2036-09-01T00:00:00Z','2036-09-02T00:00:00Z');
 return {result,canonicalReads};
}
(async()=>{
 let row=await read(null);
 check(row.result.readiness.checks.weather===false,'legacy checklist ALLOWED cannot substitute for missing canonical forecast');
 check(row.canonicalReads===1,'calendar reads the canonical review service once per trip');
 row=await read(canonical,{legacyDecision:'DEFERRED'});
 check(row.result.readiness.checks.weather===true&&row.result.weather.snapshot===snapshot,'current canonical approval controls weather rather than stale checklist weather');
 row=await read({...canonical,status:'REJECTED'});
 check(row.result.readiness.checks.weather===false,'canonical rejected forecast blocks despite checklist ALLOWED');
 row=await read({...canonical,status:'PENDING'});
 check(row.result.readiness.checks.weather===false,'canonical pending forecast is not operational approval');
 row=await read({...canonical,context:{...context,startsAt:'2036-09-02T06:00:00Z'}});
 check(row.result.readiness.checks.weather===false,'changed canonical trip interval cannot approve an earlier calendar row');
 row=await read({...canonical,context:{...context,tripId:'another-trip'}});
 check(row.result.readiness.checks.weather===false,'another trip context cannot approve this calendar row');
 row=await read({...canonical,fetchedAt:new Date(Date.now()+60000)});
 check(row.result.readiness.checks.weather===false,'future fetch evidence is not trusted');
 row=await read({...canonical,snapshot:{...snapshot,observedAt:'2020-01-01T00:00:00Z'}});
 check(row.result.readiness.checks.weather===false,'out-of-window forecast is not trusted');
 row=await read(canonical,{safetyDecision:'DEFERRED'});
 check(row.result.readiness.checks.weather===true&&row.result.readiness.checks.safety===false,'canonical weather does not bypass the independent safety decision');
 for(const options of [{enabled:false},{mode:'ADVISORY'},{weatherPolicy:'DISABLED'},{weatherPolicy:'REVIEW'}]){
  row=await read(null,options);check(row.result.readiness.checks.weather===true,'existing disabled/advisory/review weather gate semantics remain unchanged');
 }
 // These are explicit persisted decisions, not an inference about which legal
 // or professional requirement applies. Optional missing-approval semantics
 // stay configurable; an existing prohibition must remain a red hard check.
 const states=['ENABLED','REVIEW','DISABLED'],statuses=['PENDING','APPROVED','REJECTED'];
 const records=[null,...statuses.flatMap(regulatoryStatus=>statuses.map(permitStatus=>({regulatoryStatus,permitStatus})))];
 let decisionCases=0;
 for(const safetyPolicy of states)for(const regulatoryPolicy of states)for(const permitPolicy of states)for(const safetyDecision of [null,'ALLOWED','REVIEW_REQUIRED','DEFERRED'])for(const complianceRecord of records){
  const options={safetyPolicy,regulatoryPolicy,permitPolicy,safetyDecision,complianceRecord},label=JSON.stringify(options);
  const before=JSON.stringify(options),{result}=await read(canonical,options),r=result.readiness;
  const safetyOK=safetyDecision!=='DEFERRED'&&(safetyPolicy!=='ENABLED'||safetyDecision==='ALLOWED');
  const rejected=complianceRecord?.regulatoryStatus==='REJECTED'||complianceRecord?.permitStatus==='REJECTED';
  const complianceOK=!rejected&&(regulatoryPolicy!=='ENABLED'||complianceRecord?.regulatoryStatus==='APPROVED')&&(permitPolicy!=='ENABLED'||complianceRecord?.permitStatus==='APPROVED');
  const reviewRequired=safetyDecision==='DEFERRED'||rejected||(safetyPolicy==='REVIEW'&&safetyDecision!=='ALLOWED')||(regulatoryPolicy==='REVIEW'&&complianceRecord?.regulatoryStatus!=='APPROVED')||(permitPolicy==='REVIEW'&&complianceRecord?.permitStatus!=='APPROVED');
  assert.equal(r.checks.safety,safetyOK,label);assert.equal(r.checks.compliance,complianceOK,label);
  assert.equal(r.status,!safetyOK||!complianceOK?'NOT_READY':reviewRequired?'REVIEW_REQUIRED':'READY',label);
  assert.equal(r.blockers.includes('safety'),!safetyOK,label);assert.equal(r.blockers.includes('compliance'),!complianceOK,label);
  assert.equal(r.policyReview.issues.includes('SAFETY_DEFERRED'),safetyDecision==='DEFERRED',label);
  assert.equal(r.policyReview.issues.includes('REGULATORY_BLOCK'),Boolean(rejected),label);
  assert.equal(JSON.stringify(options),before,'readiness preserves source decisions');decisionCases++;
 }
 check(decisionCases===1080,'1080 policy/decision combinations preserve explicit prohibitions and optional approvals');
 check(providerCalls===0,'readiness never invokes a weather provider refresh');
 console.log(`Calendar canonical weather readiness: ${checks} assertions passed; zero network/provider calls.`);
})().catch(error=>{console.error(error);process.exitCode=1});
