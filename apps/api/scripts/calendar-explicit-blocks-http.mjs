import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Called only by the existing disposable HTTP/PostgreSQL acceptance harness.
export async function calendarExplicitBlocksAcceptance({db,base,admin,reader,token}){
 for(const value of [base,process.env.DATABASE_URL])assert(['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname),'Loopback fixtures only');
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');
 const rules=[['TRIP','SAFETY_CLEARANCE'],['COMPLIANCE','REGULATORY_REVIEW'],['COMPLIANCE','PERMIT_REQUIRED'],['WEATHER','WEATHER_GATE']];
 const originals=await db.policyControl.findMany({where:{OR:rules.map(([category,ruleKey])=>({category,ruleKey}))}});
 const weather=await db.operationalSetting.findUnique({where:{key:'WEATHER_GATE'}});
 const startsAt=new Date('2080-06-15T06:00:00Z'),endsAt=new Date('2080-06-15T07:00:00Z');
 const from='2080-06-15T00:00:00Z',to='2080-06-16T00:00:00Z';
 let trip,resource,checks=0;
 const call=async(path,actor=admin,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(actor?{authorization:'Bearer '+token(actor.id)}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()};};
 const setPolicy=(category,ruleKey,state)=>db.policyControl.upsert({where:{category_ruleKey:{category,ruleKey}},create:{category,ruleKey,state,labelAr:'Disposable explicit-decision fixture'},update:{state,updatedAt:new Date()}});
 const read=async()=>{const r=await call('/trips/admin/calendar?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to));assert.equal(r.status,200);const row=r.body.find(x=>x.id===trip.id);assert(row);return row;};
 const source=async()=>({safety:await db.safetyChecklist.findMany({where:{tripId:trip.id},orderBy:{id:'asc'}}),compliance:await db.tripComplianceReview.findUnique({where:{tripId:trip.id}})});
 const grants=()=>db.auditEvent.count({where:{resource:'Trip',resourceId:trip.id,action:{in:['OPERATIONAL_CLEARANCE_GRANTED','OPERATIONAL_REVIEW_APPROVED']}}});
 const grant=actor=>call('/trips/admin/'+trip.id+'/operational-clearance',actor,{reason:'Controlled explicit-decision acceptance review'});
 const assertBlocked=async()=>{const before=await grants(),saved=await source();assert.equal((await grant(admin)).status,409);assert.equal(await grants(),before);assert.deepEqual(await source(),saved);checks++;};
 try{
  await setPolicy('WEATHER','WEATHER_GATE','DISABLED');
  await db.operationalSetting.upsert({where:{key:'WEATHER_GATE'},create:{key:'WEATHER_GATE',value:{enabled:false,mode:'ADVISORY',provider:'STORMGLASS'}},update:{value:{enabled:false,mode:'ADVISORY',provider:'STORMGLASS'}}});
  trip=await db.trip.create({data:{title:'Disposable explicit safety/compliance fixture',type:'TEST',capacity:1,status:'OPEN',startsAt,endsAt}});
  resource=await db.calendarResource.create({data:{type:'CREW',name:'Disposable accepted-crew fixture',referenceId:admin.id}});
  await db.crewAssignment.create({data:{tripId:trip.id,resourceId:resource.id,accountId:admin.id,roleType:'CREW',status:'ACCEPTED'}});
  const safety=await db.safetyChecklist.create({data:{tripId:trip.id,decision:'ALLOWED',items:{fixture:true},decidedAt:new Date()}});
  await db.tripComplianceReview.create({data:{id:randomUUID(),tripId:trip.id,regulatoryStatus:'APPROVED',permitStatus:'APPROVED'}});
  const path='/trips/admin/calendar?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to);
  for(const [actor,status] of [[null,401],[reader,403]]){assert.equal((await call(path,actor)).status,status);assert.equal((await grant(actor)).status,status);checks+=2;}

  for(const state of ['ENABLED','REVIEW','DISABLED']){
   await setPolicy('TRIP','SAFETY_CLEARANCE',state);await setPolicy('COMPLIANCE','REGULATORY_REVIEW','DISABLED');await setPolicy('COMPLIANCE','PERMIT_REQUIRED','DISABLED');
   for(const decision of ['ALLOWED','REVIEW_REQUIRED','DEFERRED']){
    await db.safetyChecklist.update({where:{id:safety.id},data:{decision}});const saved=await source(),row=await read(),ok=decision!=='DEFERRED'&&(state!=='ENABLED'||decision==='ALLOWED');
    assert.equal(row.readiness.checks.safety,ok);assert.equal(row.readiness.blockers.includes('safety'),!ok);assert.equal(row.readiness.policyReview.issues.includes('SAFETY_DEFERRED'),decision==='DEFERRED');
    assert.equal(row.readiness.status,!ok?'NOT_READY':state==='REVIEW'&&decision!=='ALLOWED'?'REVIEW_REQUIRED':'READY');assert.deepEqual(await source(),saved);checks++;
    if(decision==='DEFERRED')await assertBlocked();
   }
  }
  await db.safetyChecklist.update({where:{id:safety.id},data:{decision:'ALLOWED'}});
  const cases=[['APPROVED','APPROVED'],['PENDING','APPROVED'],['APPROVED','PENDING'],['REJECTED','APPROVED'],['APPROVED','REJECTED'],['REJECTED','REJECTED']];
  for(const regulatory of ['ENABLED','REVIEW','DISABLED'])for(const permit of ['ENABLED','REVIEW','DISABLED']){
   await setPolicy('COMPLIANCE','REGULATORY_REVIEW',regulatory);await setPolicy('COMPLIANCE','PERMIT_REQUIRED',permit);
   for(const [regulatoryStatus,permitStatus] of cases){
    await db.tripComplianceReview.update({where:{tripId:trip.id},data:{regulatoryStatus,permitStatus}});const saved=await source(),row=await read();
    const rejected=regulatoryStatus==='REJECTED'||permitStatus==='REJECTED',ok=!rejected&&(regulatory!=='ENABLED'||regulatoryStatus==='APPROVED')&&(permit!=='ENABLED'||permitStatus==='APPROVED');
    assert.equal(row.readiness.checks.compliance,ok);assert.equal(row.readiness.blockers.includes('compliance'),!ok);assert.equal(row.readiness.policyReview.issues.includes('REGULATORY_BLOCK'),rejected);
    assert.equal(row.readiness.status,!ok?'NOT_READY':(regulatory==='REVIEW'&&regulatoryStatus!=='APPROVED')||(permit==='REVIEW'&&permitStatus!=='APPROVED')?'REVIEW_REQUIRED':'READY');assert.deepEqual(await source(),saved);checks++;
    if(rejected)await assertBlocked();
   }
  }

  // Optional missing approval remains optional; reads cannot create approval.
  await setPolicy('TRIP','SAFETY_CLEARANCE','DISABLED');await setPolicy('COMPLIANCE','REGULATORY_REVIEW','DISABLED');await setPolicy('COMPLIANCE','PERMIT_REQUIRED','DISABLED');
  await db.safetyChecklist.delete({where:{id:safety.id}});await db.tripComplianceReview.delete({where:{tripId:trip.id}});
  const empty=await read();assert.equal(empty.readiness.status,'READY');assert.equal(await db.safetyChecklist.count({where:{tripId:trip.id}}),0);assert.equal(await db.tripComplianceReview.count({where:{tripId:trip.id}}),0);checks++;
  assert.equal((await grant(admin)).status,201);checks++;

  // A later source decision replaces the prior decision, without erasing it.
  const deferred=await db.safetyChecklist.create({data:{tripId:trip.id,decision:'DEFERRED',items:{fixture:true}}});await assertBlocked();
  const replacement=await db.safetyChecklist.create({data:{tripId:trip.id,decision:'ALLOWED',items:{fixture:true},createdAt:new Date(deferred.createdAt.getTime()+1000)}});
  const fresh=await read();assert.equal(fresh.safety.decision,'ALLOWED');assert.equal(fresh.readiness.status,'READY');assert.equal((await db.safetyChecklist.findUniqueOrThrow({where:{id:deferred.id}})).decision,'DEFERRED');assert.equal(await db.safetyChecklist.count({where:{tripId:trip.id}}),2);checks++;
  assert(replacement.id!==deferred.id);
  const role=await db.roleAssignment.findUniqueOrThrow({where:{accountId_role:{accountId:admin.id,role:'ADMIN'}}});
  await db.roleAssignment.update({where:{id:role.id},data:{status:'SUSPENDED'}});
  try{assert.equal((await call(path)).status,403);assert.equal((await grant(admin)).status,403);checks+=2;}finally{await db.roleAssignment.update({where:{id:role.id},data:{status:role.status}});}
  console.log(`Calendar explicit prohibition HTTP/PostgreSQL passed: ${checks} acceptance groups; all three policy states; safety deferral and regulatory/permit rejection stay NOT_READY; clearance remains blocked; optional missing approval stays optional; source history preserved; fresh authority; no provider or financial action.`);
 }finally{
  if(trip){await db.auditEvent.deleteMany({where:{resource:'Trip',resourceId:trip.id}});await db.crewAssignment.deleteMany({where:{tripId:trip.id}});await db.safetyChecklist.deleteMany({where:{tripId:trip.id}});await db.tripComplianceReview.deleteMany({where:{tripId:trip.id}});await db.trip.delete({where:{id:trip.id}});}
  if(resource)await db.calendarResource.delete({where:{id:resource.id}});
  for(const [category,ruleKey] of rules){const old=originals.find(r=>r.category===category&&r.ruleKey===ruleKey);if(old)await db.policyControl.update({where:{category_ruleKey:{category,ruleKey}},data:{state:old.state,updatedAt:old.updatedAt}});else await db.policyControl.deleteMany({where:{category,ruleKey}});}
  if(weather)await db.operationalSetting.update({where:{key:'WEATHER_GATE'},data:{value:weather.value,updatedAt:weather.updatedAt}});else await db.operationalSetting.deleteMany({where:{key:'WEATHER_GATE'}});
 }
}
