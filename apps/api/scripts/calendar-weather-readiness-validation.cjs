const assert=require('node:assert/strict');
const {CalendarAllocationService}=require(process.env.CALENDAR_READINESS_MODULE||'../dist/trips/calendar-allocation.service');
const {WeatherGateService}=require(process.env.WEATHER_GATE_MODULE||'../dist/trips/weather-gate.service');
let checks=0,providerCalls=0;
global.fetch=()=>{throw new Error('Network forbidden in calendar readiness fixture');};
const startsAt=new Date('2036-09-01T06:00:00Z'),endsAt=new Date('2036-09-01T07:00:00Z');
const context={version:1,tripId:'calendar-fixture',startsAt:startsAt.toISOString(),endsAt:endsAt.toISOString(),latitude:18.2,longitude:42.5,locationName:'Fixture',locationRevision:'fixture-revision'};
const snapshot={provider:'STORMGLASS',observedAt:startsAt.toISOString(),windSpeedKph:10,decision:'ALLOWED',forecastContext:context};
const canonical={status:'APPROVED',snapshot,context,fetchedAt:new Date(),requiresRefresh:false};
const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('PASS',label);};
async function read(review,{legacyDecision='ALLOWED',safetyDecision='ALLOWED',enabled=true,mode='ENFORCE',weatherPolicy='ENABLED'}={}){
 const db={trip:{findMany:async()=>[{id:'calendar-fixture',title:'Fixture',type:'TEST',startsAt,endsAt,capacity:1,status:'OPEN',bookings:[],safetyChecklists:[{decision:safetyDecision,items:{weather:{...snapshot,decision:legacyDecision}}}]}]},$queryRaw:async()=>[]};
 const realGate=new WeatherGateService({},{}),gate={settings:async()=>({enabled,mode}),evaluate:realGate.evaluate.bind(realGate),evaluateReview:realGate.evaluateReview.bind(realGate)};
 const policies={decision:async(category,key)=>{const state=category==='WEATHER'?weatherPolicy:key==='SAFETY_CLEARANCE'?'ENABLED':'DISABLED';return {state,enforce:state==='ENABLED',review:state==='REVIEW',bypass:state==='DISABLED'};}};
 let canonicalReads=0;
 const service=new CalendarAllocationService(db,{},gate,policies,{}, {evaluate:async()=>({blocked:false,reviewRequired:false,states:{}})}, {get:async()=>({record:null,policyReview:{required:false,blocked:false,issues:[],states:{}}})},{}, {latest:async id=>{assert.equal(id,'calendar-fixture');canonicalReads++;return review;},refresh:()=>{providerCalls++;throw Error('Readiness must not refresh provider');}});
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
 check(providerCalls===0,'readiness never invokes a weather provider refresh');
 console.log(`Calendar canonical weather readiness: ${checks} assertions passed; zero network/provider calls.`);
})().catch(error=>{console.error(error);process.exitCode=1});
