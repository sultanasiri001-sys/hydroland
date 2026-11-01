const assert=require('node:assert/strict');
const {BoatComplianceService}=require('../dist/trips/boat-compliance.service');
const {TripComplianceService}=require('../dist/trips/trip-compliance.service');
const {PolicyControlService}=require('../dist/trips/policy-control.service');
let cases=0;
let rootReads=0;
const forbidden=()=>{rootReads++;throw Error('Root database access escaped caller transaction');};
const root={trip:{findUnique:forbidden},$queryRaw:forbidden};
global.fetch=()=>{throw Error('Network forbidden');};
(async()=>{
 for(const state of ['ENABLED','REVIEW','DISABLED']){
  const reads=[];
  const tx={trip:{findUnique:async()=>{reads.push('trip');return{id:'synthetic-trip'};}},$queryRaw:async(strings)=>{
   const sql=strings.join('');assert.match(sql,/SELECT/);reads.push(sql);
   if(sql.includes('PolicyControl'))return[{state}];
   if(sql.includes('BoatResourceCompliance')||sql.includes('TripComplianceReview'))return[];
   throw Error('Unexpected SQL');
  }};
  const policies=new PolicyControlService(root,{});
  const boat=await new BoatComplianceService(root,policies,{}).evaluate(['synthetic-boat'],1,tx);
  assert.equal(boat.blocked,state==='ENABLED');assert.equal(boat.reviewRequired,state==='REVIEW');
  assert.equal(reads.filter(x=>x.includes('PolicyControl')).length,4);
  assert.equal(reads.filter(x=>x.includes('BoatResourceCompliance')).length,1);cases++;
  reads.length=0;
  const trip=await new TripComplianceService(root,policies,{}).get('synthetic-trip',tx);
  assert.equal(trip.policyReview.blocked,state==='ENABLED');assert.equal(trip.policyReview.required,state==='REVIEW');
  assert.equal(trip.policyReview.externalVerification,false);
  assert.equal(reads.filter(x=>x==='trip').length,1);
  assert.equal(reads.filter(x=>x.includes('PolicyControl')).length,2);
  assert.equal(reads.filter(x=>x.includes('TripComplianceReview')).length,1);cases++;
  // Existing callers without a transaction retain exactly the same results.
  const defaultPolicies=new PolicyControlService(tx,{});
  assert.deepEqual(await new BoatComplianceService(tx,defaultPolicies,{}).evaluate(['synthetic-boat'],1),boat);
  assert.deepEqual(await new TripComplianceService(tx,defaultPolicies,{}).get('synthetic-trip'),trip);cases+=2;
 }
 const failure=new Error('synthetic transaction failure');
 const broken={$queryRaw:async()=>{throw failure;},trip:{findUnique:async()=>{throw failure;}}};
 const policies=new PolicyControlService(root,{});
 await assert.rejects(()=>new BoatComplianceService(root,policies,{}).evaluate(['synthetic-boat'],1,broken),e=>e===failure);
 await assert.rejects(()=>new TripComplianceService(root,policies,{}).get('synthetic-trip',broken),e=>e===failure);cases+=2;

 const approvedBoat={resourceId:'synthetic-boat',registrationNumber:'SYNTHETIC',registrationStatus:'VERIFIED',navigationLicenseNumber:'SYNTHETIC',navigationLicenseExpiresAt:new Date('2099-01-01'),safetyCertificateExpiresAt:new Date('2099-01-01'),passengerLimit:2};
 const approvedTrip={regulatoryStatus:'APPROVED',permitStatus:'APPROVED'};
 function fixture({boat=approvedBoat,trip=approvedTrip,states={},policyRows,failAt}={}){
  const reads=[],error=new Error('synthetic failure at '+failAt);
  const read=label=>{reads.push(label);if(label===failAt)throw error;};
  const tx={trip:{findUnique:async()=>{read('trip');return{id:'synthetic-trip'};}},$queryRaw:async(strings,...values)=>{
   const sql=strings.join('');assert.match(sql,/^\s*SELECT/);
   if(sql.includes('PolicyControl')){read('policy:'+values[1]);return policyRows===undefined?[{state:states[values[1]]??'ENABLED'}]:policyRows;}
   if(sql.includes('BoatResourceCompliance')){read('boat-proof');return boat?[boat]:[];}
   if(sql.includes('TripComplianceReview')){read('trip-proof');return trip?[trip]:[];}
   throw Error('Unexpected SQL');
  }};
  return {tx,reads,error};
 }
 const boatService=new BoatComplianceService(root,policies,{}),tripService=new TripComplianceService(root,policies,{});
 for(const [boat,issues] of [
  [approvedBoat,[]],
  [{...approvedBoat,registrationStatus:'REJECTED'},['BOAT_REGISTRATION']],
  [{...approvedBoat,navigationLicenseExpiresAt:new Date('2000-01-01'),safetyCertificateExpiresAt:new Date('2000-01-01')},['BOAT_NAVIGATION_LICENSE','BOAT_SAFETY_CERTIFICATES']],
  [{...approvedBoat,passengerLimit:1},['BOAT_PASSENGER_LIMIT']],
 ]){
  const before=JSON.stringify(boat),f=fixture({boat}),r=await boatService.evaluate(['synthetic-boat'],2,f.tx);
  assert.deepEqual(r.issues,issues);assert.equal(r.blocked,issues.length>0);assert.equal(r.ready,issues.length===0);
  assert.equal(JSON.stringify(boat),before);assert.equal(f.reads.at(-1),'boat-proof');cases++;
 }
 for(const trip of [approvedTrip,{regulatoryStatus:'REJECTED',permitStatus:'APPROVED'},{regulatoryStatus:'APPROVED',permitStatus:'REJECTED'}]){
  const before=JSON.stringify(trip),f=fixture({trip}),r=await tripService.get('synthetic-trip',f.tx);
  assert.equal(r.policyReview.blocked,trip!==approvedTrip);assert.deepEqual(r.record,trip);
  assert.equal(r.policyReview.externalVerification,false);assert.equal(JSON.stringify(trip),before);cases++;
 }
 // Mixed controls must retain their individual semantics; no new legal defaults.
 {
  const f=fixture({boat:null,states:{REGISTRATION:'DISABLED',NAVIGATION_LICENSE:'REVIEW',SAFETY_CERTIFICATES:'ENABLED',PASSENGER_LIMIT:'DISABLED'}});
  const r=await boatService.evaluate(['synthetic-boat'],2,f.tx);
  assert.deepEqual(r.issues,['BOAT_NAVIGATION_LICENSE','BOAT_SAFETY_CERTIFICATES']);assert.equal(r.blocked,true);assert.equal(r.reviewRequired,false);cases++;
 }
 for(const [states,blocked,required,issues] of [
  [{REGULATORY_REVIEW:'DISABLED',PERMIT_REQUIRED:'REVIEW'},false,true,['COMPLIANCE_PERMIT_REQUIRED']],
  [{REGULATORY_REVIEW:'REVIEW',PERMIT_REQUIRED:'ENABLED'},true,true,['COMPLIANCE_REGULATORY_REVIEW','COMPLIANCE_PERMIT_REQUIRED']],
 ]){
  const f=fixture({trip:{regulatoryStatus:'PENDING',permitStatus:'PENDING'},states}),r=await tripService.get('synthetic-trip',f.tx);
  assert.equal(r.policyReview.blocked,blocked);assert.equal(r.policyReview.required,required);assert.deepEqual(r.policyReview.issues,issues);cases++;
 }
 for(const policyRows of [[],[{state:'INVALID'}],[{state:null}]]){
  const f=fixture({boat:null,trip:null,policyRows});
  const boat=await boatService.evaluate(['synthetic-boat'],2,f.tx),trip=await tripService.get('synthetic-trip',f.tx);
  assert.equal(boat.blocked,true);assert.equal(trip.policyReview.blocked,true);
  assert(Object.values(boat.states).every(s=>s==='ENABLED'));assert(Object.values(trip.policyReview.states).every(s=>s==='ENABLED'));cases++;
 }
 {
  const f=fixture({states:{REGISTRATION:'DISABLED',NAVIGATION_LICENSE:'DISABLED',SAFETY_CERTIFICATES:'DISABLED',PASSENGER_LIMIT:'DISABLED'}});
  const r=await boatService.evaluate([],2,f.tx);assert.equal(r.blocked,true);assert.deepEqual(r.issues,['BOAT_RESOURCE_MISSING']);
  assert.equal(f.reads.length,4);assert(!f.reads.includes('boat-proof'));cases++;
 }
 // Fail after earlier reads succeeded, with exact error identity and zero root
 // accesses. This proves routing/error propagation, not DB snapshot isolation.
 for(const [kind,failAt,earlier] of [
  ['boat','policy:NAVIGATION_LICENSE','policy:REGISTRATION'],
  ['boat','policy:PASSENGER_LIMIT','policy:REGISTRATION'],
  ['boat','boat-proof','policy:SAFETY_CERTIFICATES'],
  ['trip','trip-proof','trip'],
  ['trip','policy:REGULATORY_REVIEW','trip-proof'],
  ['trip','policy:PERMIT_REQUIRED','trip-proof'],
 ]){
  const f=fixture({failAt});
  await assert.rejects(()=>kind==='boat'?boatService.evaluate(['synthetic-boat'],2,f.tx):tripService.get('synthetic-trip',f.tx),e=>e===f.error);
  assert(f.reads.indexOf(earlier)>=0);assert(f.reads.indexOf(earlier)<f.reads.indexOf(failAt));cases++;
 }
 assert.equal(rootReads,0,'no fallback to root client, including failures');
 console.log(`Compliance transaction validation: ${cases} cases passed; compiled services; no network or real database.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
