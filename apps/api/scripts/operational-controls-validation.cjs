const assert=require('node:assert/strict');
const {OperationalControlsService}=require('../dist/trips/operational-controls.service');
const {OPERATIONAL_CONTROLS}=require('../dist/trips/operational-controls.catalog');
const {sessionControls}=require('../dist/governance/training-session-policy');
const {trainingOperationalPolicy,DEFAULT_TRAINING_POLICY}=require('../dist/governance/training-operational-policy');
const {TrainingSessionService}=require('../dist/governance/training-session.service');
const {StoreOfferingsService}=require('../dist/store/store-offerings.service');
function harness(){
 let state={rows:[],weather:{value:{enabled:false,mode:'ENFORCE'},updatedAt:new Date(1)},audits:[]},active=true,failAudit=false;
 const tx={roleAssignment:{findFirst:async()=>active?{id:'admin-role'}:null},$queryRaw:async(strings)=>strings.join('').includes('OperationalSetting')?[structuredClone(state.weather)]:structuredClone(state.rows),$executeRaw:async(strings,...values)=>{
  if(strings.join('').includes('INSERT INTO "OperationalSetting"'))state.weather={value:JSON.parse(values[0]),updatedAt:new Date(state.weather.updatedAt.getTime()+1)};
  else {const [category,ruleKey,,policyState]=values,old=state.rows.find(r=>r.category===category&&r.ruleKey===ruleKey);if(old){old.state=policyState;old.updatedAt=new Date(old.updatedAt.getTime()+1)}else state.rows.push({category,ruleKey,state:policyState,updatedAt:new Date(1)});}
 }};
 const db={serializable:async fn=>{const before=structuredClone(state);try{return await fn(tx)}catch(e){state=before;throw e}}};
 const audit={record:async(data,client)=>{assert.equal(client,tx);if(failAudit)throw new Error('audit unavailable');state.audits.push(data)}};
 return {service:new OperationalControlsService(db,audit),state:()=>state,active:value=>active=value,failAudit:value=>failAudit=value};
}
(async()=>{
 assert.equal(new Set(OPERATIONAL_CONTROLS.map(c=>c.id)).size,OPERATIONAL_CONTROLS.length);
 const h=harness(),initial=await h.service.list();assert.equal(h.state().rows.length,0);assert.equal(h.state().audits.length,0);
 assert.equal(initial.find(c=>c.id==='WEATHER.WEATHER_GATE').state,'DISABLED');
 const update=async(id,state)=>{const previous=(await h.service.list()).find(c=>c.id===id);return h.service.change('admin',id,{state,reason:'Controlled operational validation',expectedRevision:previous.revision})};
 const weather=await update('WEATHER.WEATHER_GATE','ENABLED');assert.equal(weather.state,'ENABLED');assert.deepEqual(h.state().weather.value,{enabled:true,mode:'ENFORCE',provider:'STORMGLASS'});
 await update('WEATHER.WEATHER_GATE','DISABLED');assert.equal(h.state().weather.value.enabled,false);assert.equal(h.state().weather.value.mode,'ADVISORY');
 await assert.rejects(()=>h.service.change('admin',weather.id,{state:'ENABLED',reason:'Stale read must not write',expectedRevision:weather.revision}),/تغير الإعداد/);
 const count=h.state().audits.length;h.failAudit(true);await assert.rejects(()=>update('TRAINING.ATTENDANCE_REQUIRED','DISABLED'),/audit unavailable/);assert.equal((await h.service.list()).find(c=>c.id==='TRAINING.ATTENDANCE_REQUIRED').state,'ENABLED');assert.equal(h.state().audits.length,count);h.failAudit(false);
 h.active(false);await assert.rejects(()=>update('TRAINING.CAPACITY_LIMIT','DISABLED'),/مسؤول/);h.active(true);
 await assert.rejects(()=>h.service.change('admin','SECURITY.ACCOUNT_STATUS',{state:'DISABLED',reason:'Unknown control must not write',expectedRevision:'a'.repeat(64)}),/غير موجود/);
 await assert.rejects(()=>h.service.change('admin',weather.id,{state:'DISABLED',reason:'short',expectedRevision:weather.revision}),/10/);
 const now=new Date('2030-01-01T10:00:00Z'),course={status:'ACTIVE',record:{status:'IN_PROGRESS',certificate:null}},session={status:'SCHEDULED',startsAt:new Date('2030-01-01T12:00:00Z'),endsAt:new Date('2030-01-01T13:00:00Z'),evidence:null};
 assert(!sessionControls(course,session,now).actions.includes('OPEN'));
 const relaxed={...DEFAULT_TRAINING_POLICY,sessionTimeWindow:false,attendanceRequired:false};
 assert(sessionControls(course,session,now,relaxed).actions.includes('OPEN'));
 assert(sessionControls(course,{...session,status:'CHECK_IN_OPEN'},now,relaxed).actions.includes('START'));
 assert(!sessionControls(course,{...session,status:'CHECK_IN_OPEN'},now,{...relaxed,attendanceRequired:true}).actions.includes('START'));
 assert(!sessionControls(course,{...session,endsAt:new Date('2029-01-01')},now,relaxed).actions.includes('OPEN'));
 const completed=sessionControls(course,{...session,status:'IN_PROGRESS',evidence:{startedAt:now.toISOString()}},now,relaxed);assert(completed.actions.includes('COMPLETE'));assert.equal(completed.attendance.studentCheckedIn,false);assert.equal(completed.attendance.instructorCheckedIn,false);
 assert.deepEqual(sessionControls({...course,status:'COMPLETED',record:{status:'COMPLETED',certificate:{id:'cert'}}},session,now,relaxed).actions,[]);
 let conflictState='ENABLED',conflictReads=0;
 const conflictDb={$queryRaw:async()=>[{ruleKey:'SCHEDULE_CONFLICT',state:conflictState}],trainingSession:{findFirst:async()=>{conflictReads++;return{id:'conflict'}}}};
 const sessions=new TrainingSessionService({}, {}, {});await assert.rejects(()=>sessions.assertAvailable(conflictDb,'i','s',now,new Date('2030-01-02')),/تعارض/);conflictState='DISABLED';await sessions.assertAvailable(conflictDb,'i','s',now,new Date('2030-01-02'));assert.equal(conflictReads,1);
 assert.deepEqual(await trainingOperationalPolicy({$queryRaw:async()=>[]}),DEFAULT_TRAINING_POLICY);
 let capacityState='ENABLED',enrollments=0;
 const db={$queryRaw:async()=>[{ruleKey:'CAPACITY_LIMIT',state:capacityState}],account:{findFirst:async()=>({id:'student'})},storeCourseOffer:{findFirst:async()=>({id:'course',capacity:1,courseCode:'TEST',startsAt:now,endsAt:now})},trainingEnrollment:{findFirst:async()=>null,count:async()=>1,create:async({data})=>{enrollments++;return{id:'enrollment',...data}}},auditEvent:{create:async()=>({})}};db.serializable=fn=>fn(db);
 const offers=new StoreOfferingsService(db);await assert.rejects(()=>offers.enroll('student','course'),/اكتملت/);capacityState='DISABLED';const enrolled=await offers.enroll('student','course');assert.equal(enrollments,1);assert.equal(enrolled.metadata.financialActionExecuted,false);assert.equal(enrolled.metadata.operationalPolicy.capacityLimit,false);
 assert(h.state().audits.every(a=>a.actorId==='admin'&&a.metadata.reason));
 console.log('Operational controls passed: read-only defaults, effective weather state, atomic audit rollback, stale revision, revoked admin, training timing/attendance/conflicts/capacity and truthful evidence.');
})().catch(error=>{console.error(error);process.exitCode=1});
