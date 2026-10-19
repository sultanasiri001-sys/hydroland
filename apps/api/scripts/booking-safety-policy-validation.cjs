const assert=require('node:assert/strict');
const {TripsService}=require('../dist/trips/trips.service');
const {PolicyControlService}=require('../dist/trips/policy-control.service');
function setup(state,safety=null,{weatherBlocked=false,used=0}={}){
  let writes=0;
  const trip={id:'trip-test',title:'Test',status:'OPEN',startsAt:new Date('2099-01-01'),capacity:1,bookings:[],safetyChecklists:safety?[{decision:safety}]:[]};
  const db={trip:{findUnique:async()=>trip,findMany:async()=>[trip]},booking:{findFirst:async({where})=>{assert.deepEqual(where,{tripId:'trip-test',accountId:'account',organizationId:null});return null},aggregate:async()=>({_sum:{seats:used}}),create:async()=>{writes++;return{id:'booking-test'}}},safetyChecklist:{findFirst:async()=>safety?{decision:safety}:null},$queryRaw:async()=>[],operationalSetting:{findUnique:async()=>({value:{currency:'SAR',pricePerSeatMinor:100}})}};
  db.serializable=fn=>fn(db);
  const policies={decision:async(category,key)=>{const value=key==='SAFETY_APPROVAL'?state:'ENABLED';return{state:value,enforce:value==='ENABLED',review:value==='REVIEW',bypass:value==='DISABLED'}}};
  const service=new TripsService({},db,{settings:async()=>({enabled:true}),evaluateReview:()=>({blocking:weatherBlocked,reason:'Weather blocked'})},{location:async()=>null,latest:async()=>null},{ensureForBooking:async()=>[]},policies,{});
  return{service,writes:()=>writes};
}
(async()=>{
  let checks=0;
  for(const state of ['ENABLED','DISABLED','REVIEW']){
    for(const safety of [null,'REVIEW_REQUIRED','ALLOWED','DEFERRED']){
      const test=setup(state,safety),blocked=safety==='DEFERRED'||(state==='ENABLED'&&safety!=='ALLOWED');
      if(blocked){await assert.rejects(()=>test.service.book('account','trip-test',1),error=>error.getStatus?.()===409&&error.message===(safety==='DEFERRED'?'Trip is deferred by a safety decision.':'Trip requires safety approval before booking.'));assert.equal(test.writes(),0);}
      else{const result=await test.service.book('account','trip-test',1);assert.equal(test.writes(),1);assert.equal(result.policyReview.required,state==='REVIEW'&&safety!=='ALLOWED');}
      checks++;
    }
    const {service,writes}=setup(state),rows=await service.list();assert.equal(rows[0].bookingPolicy.safetyApproval,state);assert.equal(writes(),0);checks++;
  }
  for(const options of [{weatherBlocked:true},{used:1}]){
    const test=setup('DISABLED',null,options);await assert.rejects(()=>test.service.book('account','trip-test',1),error=>error.getStatus?.()===409&&error.message===(options.weatherBlocked?'Weather blocked':'Trip capacity reached.'));assert.equal(test.writes(),0);checks++;
  }
  const audits=[],rule={id:'policy',category:'BOOKING',ruleKey:'SAFETY_APPROVAL',state:'ENABLED'};
  const service=new PolicyControlService({$queryRaw:async(strings,...values)=>strings.join('').includes('UPDATE')?[{...rule,state:values[0]}]:[rule]},{record:async data=>audits.push(data)});
  await service.setState('admin-test','BOOKING','SAFETY_APPROVAL','DISABLED','Temporary controlled booking review');
  assert.equal(audits[0].action,'POLICY_STATE_CHANGED');assert.equal(audits[0].metadata.previousState,'ENABLED');assert.equal(audits[0].metadata.state,'DISABLED');assert.equal(audits[0].metadata.reason,'Temporary controlled booking review');checks++;
  console.log(`Booking safety policy: ${checks} checks passed; enforcement, deferral, weather, capacity, public state and audit verified.`);
})().catch(error=>{console.error(error);process.exitCode=1});
