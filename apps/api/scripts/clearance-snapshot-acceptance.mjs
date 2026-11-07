import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {DatabaseService}=require('../dist/database/database.service');
const {AuditService}=require('../dist/audit/audit.service');
const {CalendarAllocationService}=require('../dist/trips/calendar-allocation.service');
const {OperationalClearanceService}=require('../dist/trips/operational-clearance.service');
const {PolicyControlService}=require('../dist/trips/policy-control.service');
const {BoatComplianceService}=require('../dist/trips/boat-compliance.service');
const {TripComplianceService}=require('../dist/trips/trip-compliance.service');
const {EquipmentInspectionService}=require('../dist/trips/equipment-inspection.service');
const {WeatherGateService}=require('../dist/trips/weather-gate.service');
const {TripWeatherReviewService}=require('../dist/trips/trip-weather-review.service');
const {MarineOperationsService}=require('../dist/marine-operations/marine-operations.service');
const {REQUIRED_MARINE_DOCUMENTS}=require('../dist/marine-operations/marine-operations.domain');
const {binding}=require('./mandatory-policy-fixture.cjs');

export async function clearanceSnapshotAcceptance({db,base,admin,reader,token}){
 for(const value of [base,process.env.DATABASE_URL])assert(['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname),'Disposable loopback fixtures only');
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');
 const runtime=new DatabaseService(),audit=new AuditService(runtime),policies=new PolicyControlService(runtime,audit),gate=new WeatherGateService(runtime,audit);
 const provider=new Proxy({},{get(){throw Error('No external provider permitted in clearance acceptance');}});
 const marine=new MarineOperationsService(runtime,provider,audit);
 const calendar=new CalendarAllocationService(runtime,audit,gate,policies,new BoatComplianceService(runtime,policies,audit),new EquipmentInspectionService(runtime,audit,policies),new TripComplianceService(runtime,policies,audit),marine,new TripWeatherReviewService(runtime,provider,audit));
 const clearance=new OperationalClearanceService(runtime,audit,calendar),rules=[['WEATHER','WEATHER_GATE'],['COMPLIANCE','REGULATORY_REVIEW'],['COMPLIANCE','PERMIT_REQUIRED']];
 const originals=await db.policyControl.findMany({where:{OR:rules.map(([category,ruleKey])=>({category,ruleKey}))}}),weather=await db.operationalSetting.findUnique({where:{key:'WEATHER_GATE'}});
 const startsAt=new Date('2081-06-15T06:00:00Z'),endsAt=new Date('2081-06-15T07:00:00Z');
 const setPolicy=(category,ruleKey,state)=>db.policyControl.upsert({where:{category_ruleKey:{category,ruleKey}},create:{category,ruleKey,state,labelAr:'Disposable snapshot acceptance'},update:{state}});
 const request=async actor=>{const r=await fetch(base+'/trips/admin/'+trip.id+'/operational-clearance',{method:'POST',headers:{'content-type':'application/json',...(actor?{authorization:'Bearer '+token(actor.id)}:{})},body:JSON.stringify({reason:'Disposable snapshot acceptance review'})});return{status:r.status,body:await r.json()};};
 let trip,boat,crew,asset,checks=0;
 const grants=()=>db.auditEvent.count({where:{resource:'Trip',resourceId:trip.id,action:{in:['OPERATIONAL_CLEARANCE_GRANTED','OPERATIONAL_REVIEW_APPROVED']}}});
 const snapshots=()=>db.marineReadinessSnapshot.count({where:{marineAssetId:asset.id}});
 const serializable=runtime.serializable.bind(runtime),record=audit.record.bind(audit);
 try{
  await setPolicy('WEATHER','WEATHER_GATE','DISABLED');await setPolicy('COMPLIANCE','REGULATORY_REVIEW','DISABLED');await setPolicy('COMPLIANCE','PERMIT_REQUIRED','DISABLED');
  await db.operationalSetting.upsert({where:{key:'WEATHER_GATE'},create:{key:'WEATHER_GATE',value:{enabled:false,mode:'ADVISORY'}},update:{value:{enabled:false,mode:'ADVISORY'}}});
  trip=await db.trip.create({data:{title:'Disposable A14 snapshot fixture',type:'BOAT',status:'OPEN',capacity:1,startsAt,endsAt}});
  boat=await db.calendarResource.create({data:{type:'BOAT',name:'Disposable A14 boat'}});
  crew=await db.calendarResource.create({data:{type:'CREW',name:'Disposable A14 crew',referenceId:admin.id}});
  // The later unrelated revision masks an older row's timestamp. This exposes
  // why a global MAX(updatedAt) comparison cannot replace a transactional read.
  await db.crewAssignment.create({data:{tripId:trip.id,resourceId:crew.id,accountId:admin.id,roleType:'CREW',status:'ACCEPTED',updatedAt:new Date('2090-01-01')}});
  await db.safetyChecklist.create({data:{tripId:trip.id,decision:'ALLOWED',items:{fixture:true},decidedAt:new Date()}});
  await db.tripComplianceReview.create({data:{id:randomUUID(),tripId:trip.id,regulatoryStatus:'APPROVED',permitStatus:'APPROVED'}});
  await db.boatResourceCompliance.create({data:{id:randomUUID(),resourceId:boat.id,registrationNumber:'fixture',registrationStatus:'VERIFIED',navigationLicenseNumber:'fixture',navigationLicenseExpiresAt:endsAt,safetyCertificateExpiresAt:endsAt,passengerLimit:1}});
  asset=await db.marineAsset.create({data:{organizationId:randomUUID(),calendarResourceId:boat.id,name:'Disposable A14 asset',assetType:'DIVE_BOAT',status:'ACTIVE',documents:{create:REQUIRED_MARINE_DOCUMENTS.map(documentType=>({documentType,status:'VERIFIED',expiresAt:endsAt}))}}});
  const event=await db.calendarEvent.create({data:{type:'TRIP',referenceType:'TRIP',referenceId:trip.id,title:trip.title,startsAt,endsAt,status:'ACTIVE'}});
  await db.calendarAllocation.create({data:{eventId:event.id,resourceId:boat.id,startsAt,endsAt,status:'ACTIVE'}});

  for(const [actor,status] of [[null,401],[reader,403]]){assert.equal((await request(actor)).status,status);assert.equal(await grants(),0);assert.equal(await snapshots(),0);checks++;}
  const good=await request(admin);assert.equal(good.status,201,JSON.stringify(good));assert.equal(good.body.readiness.status,'READY');assert.equal(await grants(),1);assert.equal(await snapshots(),1);checks++;

  // Every snapshot created while evaluating a failed grant must roll back.
  const auditFailure=new Error('Injected audit storage failure'),before={grants:await grants(),snapshots:await snapshots()};
  audit.record=async()=>{throw auditFailure;};
  await assert.rejects(()=>clearance.grant(admin.id,trip.id),e=>e===auditFailure);
  assert.deepEqual({grants:await grants(),snapshots:await snapshots()},before);checks++;
  audit.record=record;

  // A committed adverse decision immediately before the write transaction must
  // be read inside it, even when an unrelated later MAX timestamp is unchanged.
  let injected=false;
  runtime.serializable=async work=>{if(!injected){injected=true;await db.tripComplianceReview.update({where:{tripId:trip.id},data:{regulatoryStatus:'REJECTED'}});}return serializable(work);};
  await assert.rejects(()=>clearance.grant(admin.id,trip.id),e=>e.getStatus()===409);
  assert(injected);assert.deepEqual({grants:await grants(),snapshots:await snapshots()},before);checks++;
  runtime.serializable=serializable;
  for(const state of ['ENABLED','REVIEW','DISABLED']){
   await setPolicy('COMPLIANCE','REGULATORY_REVIEW',state);
   assert.equal((await request(admin)).status,409);assert.deepEqual({grants:await grants(),snapshots:await snapshots()},before);checks++;
  }
  await db.tripComplianceReview.update({where:{tripId:trip.id},data:{regulatoryStatus:'APPROVED'}});

  // Expiry changes readiness without changing any updatedAt timestamp. Current
  // clearance/revision alone cannot authorize CLOSE/COMPLETE in that case.
  await db.boatResourceCompliance.update({where:{resourceId:boat.id},data:{navigationLicenseExpiresAt:new Date('2000-01-01')}});
  const latest=await db.auditEvent.findFirst({where:{resource:'Trip',resourceId:trip.id,action:'OPERATIONAL_CLEARANCE_GRANTED'},orderBy:{occurredAt:'desc'}});
  // Append a test event after fixture revisions; do not rewrite audit history.
  // This deliberately makes the new readiness check decisive.
  const current=await db.auditEvent.create({data:{action:latest.action,resource:'Trip',resourceId:trip.id,metadata:{fixture:true},occurredAt:new Date('2091-01-01')}});
  const expiryBefore={grants:await grants(),snapshots:await snapshots()};
  for(const method of ['assertCurrent','assertReadinessUnchanged']){
   await assert.rejects(()=>serializable(tx=>clearance[method](trip.id,method==='assertCurrent'?current.id:new Date('2090-01-01'),tx)),e=>e.getStatus()===409);
   assert.deepEqual({grants:await grants(),snapshots:await snapshots()},expiryBefore);checks++;
  }
  await db.boatResourceCompliance.update({where:{resourceId:boat.id},data:{navigationLicenseExpiresAt:endsAt}});
  // A source-bound requirement remains mandatory under every generic state.
  // These are disposable synthetic adoption records, never real legal proof.
  const setBinding=async(category,ruleKey,value)=>db.$executeRaw`UPDATE "PolicyControl" SET "metadata"=${JSON.stringify(value)}::jsonb,"updatedAt"=clock_timestamp() WHERE "category"=${category} AND "ruleKey"=${ruleKey}`;
  const call=async(path,method,body)=>{const r=await fetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer '+token(admin.id)},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};};
  await setBinding('COMPLIANCE','PERMIT_REQUIRED',binding('COMPLIANCE','PERMIT_REQUIRED'));
  for(const state of ['ENABLED','REVIEW','DISABLED']){
   await setPolicy('COMPLIANCE','PERMIT_REQUIRED',state);
   await db.tripComplianceReview.update({where:{tripId:trip.id},data:{permitStatus:'PENDING'}});
   const count={grants:await grants(),snapshots:await snapshots()};
   assert.equal((await request(admin)).status,409);assert.deepEqual({grants:await grants(),snapshots:await snapshots()},count);checks++;
   await db.tripComplianceReview.update({where:{tripId:trip.id},data:{permitStatus:'APPROVED'}});
   assert.equal((await request(admin)).status,201);assert.equal(await grants(),count.grants+1);checks++;
  }
  for(const [path,method,body] of [
   ['/admin/policies/COMPLIANCE/PERMIT_REQUIRED/state','PATCH',{state:'DISABLED'}],
   ['/admin/policies','POST',{category:'COMPLIANCE',ruleKey:'PERMIT_REQUIRED',labelAr:'Disposable only',state:'DISABLED'}],
  ]){assert.equal((await call(path,method,body)).status,403);checks++;}
  const expired=binding('COMPLIANCE','PERMIT_REQUIRED');expired.mandatoryRequirement.source.reviewDueAt='2000-01-01T00:00:00.000Z';
  await setBinding('COMPLIANCE','PERMIT_REQUIRED',expired);
  const staleCount={grants:await grants(),snapshots:await snapshots()};
  const pending=await request(admin);assert.equal(pending.status,409);assert.equal(pending.body.code,'MANDATORY_SOURCE_REVIEW_REQUIRED');assert.deepEqual({grants:await grants(),snapshots:await snapshots()},staleCount);checks++;
  await setBinding('COMPLIANCE','PERMIT_REQUIRED',null);
  await setBinding('WEATHER','WEATHER_GATE',binding('WEATHER','WEATHER_GATE'));
  await setPolicy('WEATHER','WEATHER_GATE','DISABLED');
  assert.equal((await request(admin)).status,409);assert.deepEqual({grants:await grants(),snapshots:await snapshots()},staleCount);checks++;
  assert.equal((await call('/trips/admin/weather-gate','PATCH',{enabled:false,mode:'ADVISORY'})).status,403);checks++;
  const response=await fetch(base+'/admin/operational-controls',{headers:{authorization:'Bearer '+token(admin.id)}}),controls=await response.json(),control=controls.find(r=>r.id==='WEATHER.WEATHER_GATE');
  assert.equal(control.state,'ENABLED');assert.equal(control.canDisable,false);
  assert.equal((await call('/admin/operational-controls/WEATHER.WEATHER_GATE','PATCH',{state:'DISABLED',reason:'Synthetic mandatory disable must fail',expectedRevision:control.revision})).status,403);checks++;
  console.log(`Clearance snapshot HTTP/PostgreSQL: ${checks} groups PASS; real grant, authority denial, committed adverse-decision interleaving, disabled/review/enabled blocks, expired-proof recheck, audit/snapshot rollback; no providers.`);
 }finally{
  runtime.serializable=serializable;audit.record=record;
  await runtime.$disconnect();
  if(asset){await db.marineReadinessSnapshot.deleteMany({where:{marineAssetId:asset.id}});await db.marineAssetDocument.deleteMany({where:{marineAssetId:asset.id}});await db.marineAsset.delete({where:{id:asset.id}});}
  if(trip){await db.auditEvent.deleteMany({where:{resource:'Trip',resourceId:trip.id}});await db.calendarAllocation.deleteMany({where:{event:{referenceType:'TRIP',referenceId:trip.id}}});await db.calendarEvent.deleteMany({where:{referenceType:'TRIP',referenceId:trip.id}});await db.crewAssignment.deleteMany({where:{tripId:trip.id}});await db.safetyChecklist.deleteMany({where:{tripId:trip.id}});await db.tripComplianceReview.deleteMany({where:{tripId:trip.id}});await db.trip.delete({where:{id:trip.id}});}
  if(boat){await db.boatResourceCompliance.deleteMany({where:{resourceId:boat.id}});await db.calendarResource.delete({where:{id:boat.id}});}
  if(crew)await db.calendarResource.delete({where:{id:crew.id}});
  for(const [category,ruleKey] of rules){const old=originals.find(r=>r.category===category&&r.ruleKey===ruleKey);if(old){await db.$executeRaw`UPDATE "PolicyControl" SET "metadata"=${JSON.stringify(old.metadata)}::jsonb WHERE "category"=${category} AND "ruleKey"=${ruleKey}`;await db.policyControl.update({where:{category_ruleKey:{category,ruleKey}},data:{state:old.state,updatedAt:old.updatedAt}});}else await db.policyControl.deleteMany({where:{category,ruleKey}});}
  if(weather)await db.operationalSetting.update({where:{key:'WEATHER_GATE'},data:{value:weather.value,updatedAt:weather.updatedAt}});else await db.operationalSetting.deleteMany({where:{key:'WEATHER_GATE'}});
 }
}
