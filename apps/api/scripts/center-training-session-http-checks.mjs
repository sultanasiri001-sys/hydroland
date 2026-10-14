import {randomUUID} from 'node:crypto';
export async function checkCenterTrainingSessions(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check){
 if(process.env.CI!=='true'||!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)||!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw new Error('CI loopback API and database required');
 const request=async(token,path,body,method=body?'PATCH':'GET')=>{const r=await fetch(base+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}};
 const students=await Promise.all([personAccount('session-student-'+randomUUID()),personAccount('session-student2-'+randomUUID())]),pros=[],ids=[];
 for(let i=0;i<3;i++){const account=await personAccount('session-pro-'+i+'-'+randomUUID());await db.roleAssignment.create({data:{accountId:account.id,role:'INSTRUCTOR',status:'ACTIVE'}});const member=await db.organizationMember.create({data:{organizationId:i===2?b.org.id:a.org.id,accountId:account.id,role:'INSTRUCTOR',status:'ACTIVE'}});pros.push({...account,member})}
 const [tp,tp2,studentToken]=await Promise.all([tokenFor(pros[0].id),tokenFor(pros[1].id),tokenFor(students[0].id)]);
 const course=async(code,student=students[0].id,center=a.org.id)=>{const row=await db.trainingEnrollment.create({data:{studentAccountId:student,centerOrganizationId:center,instructorAccountId:pros[0].id,courseCode:code}});ids.push(row.id);return row};
 const enrollment=id=>db.trainingEnrollment.findUniqueOrThrow({where:{id}}),session=id=>db.trainingSession.findUniqueOrThrow({where:{id}});
 const interval=(hour=0)=>({startsAt:new Date(Date.parse('2036-01-01T06:00:00Z')+hour*3600000).toISOString(),endsAt:new Date(Date.parse('2036-01-01T07:00:00Z')+hour*3600000).toISOString()});
 const payload=(row,extra={})=>({instructorAccountId:pros[0].id,...interval(),requestId:randomUUID(),expectedUpdatedAt:row.updatedAt.toISOString(),reason:'جدولة تدريب المركز',...extra});
 const create=(row,input=payload(row),token=ta)=>request(token,`/center/me/training/enrollments/${row.id}/sessions`,input,'POST');
 const schedule=(row,extra={},token=ta)=>request(token,`/center/me/training/sessions/${row.id}/schedule`,{...interval(4),reason:'تعديل الموعد',expectedUpdatedAt:row.updatedAt.toISOString(),...extra});
 const act=(row,action,extra={},token=ta)=>request(token,`/center/me/training/sessions/${row.id}/actions`,{action,reason:'توثيق إجراء الجلسة',expectedUpdatedAt:row.updatedAt.toISOString(),...extra});
 try{
  const own=await course('SESSION-A'),other=await course('SESSION-OTHER',students[1].id),foreign=await course('SESSION-B',students[1].id,b.org.id),input=payload(own);
  check((await create(own,input,null)).status===401,'anonymous session creation denied');
  check((await create(own,input,ts)).status===403,'staff session creation denied');
  check((await create(own,input,tb)).status===404,'foreign center session creation denied');
  for(const extra of [{organizationId:b.org.id},{status:'COMPLETED'},{evidence:{studentCheckInAt:'forged'}},{instructorAccountId:'bad'},{requestId:'bad'},{reason:''},{reason:'x'.repeat(1001)},{expectedUpdatedAt:'bad'},{startsAt:'2036-01-01T06:00'},{startsAt:'2036-02-30T06:00:00Z'},{startsAt:'2036-01-01T24:00:00Z'},{startsAt:'2020-01-01T06:00:00Z'},{endsAt:input.startsAt}])check((await create(own,{...input,...extra})).status===400,'invalid session creation payload rejected');
  check((await create(own,{...input,instructorAccountId:pros[2].id})).status===409,'foreign instructor cannot receive session');
  await db.organizationMember.update({where:{id:pros[0].member.id},data:{status:'SUSPENDED'}});
  check((await create(own,input)).status===409,'instructor membership is rechecked during scheduling');
  await db.organizationMember.update({where:{id:pros[0].member.id},data:{status:'ACTIVE'}});
  let r=await create(own,input);check(r.status===201&&r.body.id===input.requestId,'center saves new session directly');
  let first=await session(input.requestId);const record=await db.trainingRecord.findUniqueOrThrow({where:{enrollmentId:own.id}});
  check(record.status==='SCHEDULED'&&first.endsAt.toISOString()===input.endsAt,'first session creates scheduled training record and retains end time');
  check((await enrollment(own.id)).status==='PENDING','scheduling alone does not claim training has started');
  check(await db.auditEvent.count({where:{resourceId:first.id,action:'training.session_created'}})===1,'creation has atomic audit');
  check(await db.notification.count({where:{type:'TRAINING_SESSION_CHANGED',payload:{path:['sessionId'],equals:first.id}}})===2,'student and instructor receive one creation notice each');
  r=await create(own,input);check(r.status===201&&r.body.replayed===true,'exact create retry recovers committed response despite parent revision change');
  check((await create(own,Object.fromEntries(Object.entries(input).reverse()))).body.replayed===true,'idempotent replay is independent of JSON key order');
  check(await db.trainingSession.count({where:{trainingRecordId:record.id}})===1,'retried create does not duplicate session');
  check((await create(own,{...input,reason:'طلب مختلف'})).status===409,'idempotency key cannot be reused for different input');
  check((await create(foreign,{...payload(foreign),requestId:first.id,instructorAccountId:pros[2].id},tb)).status===409,'idempotency key cannot expose another center session');
  check((await create(own,payload(own,{...interval(2)}))).status===409,'stale enrollment revision rejects new session');
  check((await create(await enrollment(own.id),payload(await enrollment(own.id),{instructorAccountId:pros[1].id}))).status===409,'student overlap rejected even with different instructor');
  check((await create(other,payload(other))).status===409,'instructor overlap rejected for a different student');
  const adjacentInput=payload(await enrollment(own.id),interval(1));r=await create(await enrollment(own.id),adjacentInput);check(r.status===201,'adjacent non-overlapping intervals accepted');
  const adjacent=await session(adjacentInput.requestId);
  const parallelInput=payload(other,{instructorAccountId:pros[1].id});r=await create(other,parallelInput);check(r.status===201,'different instructor and student may train in parallel');
  const parallel=await session(parallelInput.requestId);
  r=await request(ta,`/center/me/training/sessions/${parallel.id}/instructor`,{instructorAccountId:pros[0].id,expectedUpdatedAt:parallel.updatedAt.toISOString(),reason:'اختبار التعارض'});
  check(r.status===409&&(await session(parallel.id)).instructorAccountId===pros[1].id,'reassignment uses same instructor availability guard');
  // The other course already has this lead; switch its lead before testing an
  // actual bulk transfer into a conflicting interval.
  await db.trainingEnrollment.update({where:{id:other.id},data:{instructorAccountId:pros[1].id}});
  r=await request(ta,`/center/me/training/enrollments/${other.id}/instructor`,{instructorAccountId:pros[0].id,expectedUpdatedAt:(await enrollment(other.id)).updatedAt.toISOString(),reason:'نقل متعارض',transferUpcomingSessions:true});
  check(r.status===409&&(await enrollment(other.id)).instructorAccountId===pros[1].id,'bulk transfer conflict rolls back lead instructor change');
  check((await schedule(first,{},tb)).status===404,'foreign center cannot reschedule');
  check((await schedule(first,{...interval(1)})).status===409,'reschedule overlap rejected');
  r=await schedule(first);check(r.status===200,'scheduled session can change date');
  check((await session(first.id)).startsAt.toISOString()===interval(4).startsAt,'rescheduled date persisted');
  check((await schedule(first)).status===409,'stale reschedule cannot overwrite new date');
  check(await db.auditEvent.count({where:{resourceId:first.id,action:'training.session_rescheduled'}})===1,'reschedule audit recorded once');
  first=await session(first.id);
  const outcomes=await Promise.all([schedule(first,interval(6)),schedule(first,interval(8))]);
  check(outcomes.filter(x=>x.status===200).length===1&&outcomes.filter(x=>x.status===409).length===1,'concurrent reschedules have one winner');
  check((await act(await session(first.id),'OPEN')).status===409,'future attendance cannot be opened years before its time');
  const freshCourse=await enrollment(own.id),race=await Promise.all([create(freshCourse,payload(freshCourse,interval(10))),create(freshCourse,payload(freshCourse,interval(12)))]);
  check(race.filter(x=>x.status===201).length===1&&race.filter(x=>x.status===409).length===1,'concurrent creations invalidate the stale parent view');
  const duplicateCourse=await course('SESSION-RETRY-RACE'),duplicateInput=payload(duplicateCourse,interval(22));
  const duplicateResults=await Promise.all([create(duplicateCourse,duplicateInput),create(duplicateCourse,duplicateInput)]);
  check(duplicateResults.every(row=>row.status===201)&&duplicateResults.filter(row=>row.body.replayed).length===1,'concurrent duplicate creates recover one committed session');
  check(await db.trainingSession.count({where:{id:duplicateInput.requestId}})===1&&await db.auditEvent.count({where:{resourceId:duplicateInput.requestId,action:'training.session_created'}})===1,'duplicate creation race produces one session and audit');
  const foreignRecord=await db.trainingRecord.findUniqueOrThrow({where:{enrollmentId:other.id}}),foreignStage=await db.trainingStage.create({data:{trainingRecordId:foreignRecord.id,stageType:'THEORY',deliveryMode:'CLASSROOM',sequence:1}});
  check((await create(await enrollment(own.id),payload(await enrollment(own.id),{...interval(14),trainingStageId:foreignStage.id}))).status===400,'foreign training stage rejected');
  const stage=await db.trainingStage.create({data:{trainingRecordId:record.id,stageType:'THEORY',deliveryMode:'CLASSROOM',sequence:1}});
  r=await create(await enrollment(own.id),payload(await enrollment(own.id),{...interval(14),trainingStageId:stage.id}));check(r.status===201&&(await session(r.body.id)).trainingStageId===stage.id,'own training stage linkage accepted');

  const liveCourse=await course('SESSION-LIVE'),liveInput=payload(liveCourse,{startsAt:new Date(Date.now()+600000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString()});
  r=await create(liveCourse,liveInput);check(r.status===201,'upcoming live session scheduled');
  let live=await session(r.body.id);
  check((await act(live,'START')).status===409,'start cannot skip attendance opening');
  check((await request(ta,`/training/sessions/${live.id}/status`,{status:'COMPLETED',expectedUpdatedAt:live.updatedAt.toISOString(),reason:'تجاوز'})).status===409,'legacy status route cannot skip lifecycle');
  check((await request(ta,`/training/sessions/${live.id}/status`,{status:'COMPLETED',expectedUpdatedAt:live.updatedAt.toISOString(),reason:'تجاوز',evidence:{studentCheckInAt:'forged'}})).status===400,'legacy status route rejects forged attendance evidence');
  r=await act(live,'OPEN');check(r.status===200,'attendance opens within 30 minute window');
  check((await schedule(await session(live.id))).status===409,'opening attendance locks scheduled date');
  await db.trainingEnrollment.update({where:{id:liveCourse.id},data:{instructorAccountId:pros[1].id}});
  live=await session(live.id);
  check((await request(tp2,`/training/professional/me/sessions/${live.id}/attendance`,{action:'INSTRUCTOR_CHECK_IN',expectedUpdatedAt:live.updatedAt.toISOString()})).status===403,'lead instructor cannot impersonate assigned session instructor');
  check((await request(studentToken,`/training/professional/me/sessions/${live.id}/attendance`,{action:'INSTRUCTOR_CHECK_IN',expectedUpdatedAt:live.updatedAt.toISOString()})).status===403,'student cannot check in as instructor');
  r=await request(tp,`/training/professional/me/sessions/${live.id}/attendance`,{action:'INSTRUCTOR_CHECK_IN',expectedUpdatedAt:live.updatedAt.toISOString()});check(r.status===200,'assigned instructor records their own attendance');
  live=await session(live.id);const instructorStamp=live.evidence.instructorCheckInAt;
  check(live.evidence.instructorCheckInSource==='SELF'&&live.evidence.instructorCheckInByAccountId===pros[0].id&&Math.abs(Date.now()-Date.parse(instructorStamp))<60000,'self attendance records server time and real actor');
  check((await act(live,'INSTRUCTOR_CHECK_IN')).status===409,'existing attendance cannot be overwritten');
  check((await act(live,'START')).status===409,'start requires student attendance');
  r=await act(live,'STUDENT_CHECK_IN');check(r.status===200,'center records student attendance');
  live=await session(live.id);
  check(live.evidence.studentCheckInSource==='CENTER'&&live.evidence.studentCheckInByAccountId===ownerA.id&&live.evidence.instructorCheckInAt===instructorStamp,'center provenance is explicit and prior self attendance preserved');
  check((await act(live,'START')).status===409,'both attendances do not allow training to start before scheduled time');
  // Advance the isolated fixture clock without sleeping or forging HTTP evidence.
  live=await db.trainingSession.update({where:{id:live.id},data:{startsAt:new Date(Date.now()-60000)}});
  const listed=await request(ta,'/center/me/training');const visible=listed.body.enrollments.find(row=>row.id===liveCourse.id).record.sessions.find(row=>row.id===live.id);
  check(visible.actions.includes('START')&&visible.attendance.studentRecordedByCenter&&!JSON.stringify(visible).includes(ownerA.id)&&!JSON.stringify(visible).includes('evidence'),'list returns safe attendance summary and current actions');
  r=await act(live,'START');check(r.status===200&&r.body.status==='IN_PROGRESS','attended session starts at scheduled time');
  check((await enrollment(liveCourse.id)).status==='ACTIVE'&&(await db.trainingRecord.findUnique({where:{enrollmentId:liveCourse.id}})).status==='IN_PROGRESS','starting session activates course and record without completing skills');
  r=await act(await session(live.id),'COMPLETE');check(r.status===200&&r.body.status==='COMPLETED','active attended session completes');
  live=await session(live.id);check(live.evidence.instructorCheckInAt===instructorStamp&&live.evidence.endedAt&&live.endsAt.toISOString()===liveInput.endsAt,'completion preserves attendance and planned end separately from actual end');
  check((await db.trainingRecord.findUnique({where:{enrollmentId:liveCourse.id}})).status==='IN_PROGRESS','session completion does not certify or auto-complete entire course');
  check((await act(live,'OPEN')).status===409&&(await act(live,'CANCEL')).status===409,'completed session cannot be reopened or cancelled');
  r=await act(adjacent,'CANCEL');check(r.status===200&&(await session(adjacent.id)).status==='CANCELLED','future session can be cancelled without deleting history');
  check((await act(await session(adjacent.id),'CANCEL')).status===409,'cancel cannot duplicate audit or notice');

  const concurrentCourse=await course('SESSION-ATTENDANCE-RACE',students[1].id),concurrentRecord=await db.trainingRecord.create({data:{enrollmentId:concurrentCourse.id,status:'SCHEDULED'}});
  const concurrent=await db.trainingSession.create({data:{trainingRecordId:concurrentRecord.id,instructorAccountId:pros[1].id,status:'CHECK_IN_OPEN',startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+3600000),evidence:{checkInOpenedAt:new Date().toISOString()}}});
  const attendanceRace=await Promise.all([act(concurrent,'INSTRUCTOR_CHECK_IN'),act(concurrent,'STUDENT_CHECK_IN')]);
  check(attendanceRace.filter(x=>x.status===200).length===1&&attendanceRace.filter(x=>x.status===409).length===1,'simultaneous attendance edits do not lose evidence');
  let latest=await session(concurrent.id);await act(latest,latest.evidence.instructorCheckInAt?'STUDENT_CHECK_IN':'INSTRUCTOR_CHECK_IN');latest=await session(concurrent.id);
  check(latest.evidence.instructorCheckInAt&&latest.evidence.studentCheckInAt,'refresh and retry preserves both attendance entries');
  await db.organizationMember.update({where:{id:pros[1].member.id},data:{status:'SUSPENDED'}});
  check((await act(latest,'START')).status===409,'instructor suspension after attendance prevents starting');
  await db.organizationMember.update({where:{id:pros[1].member.id},data:{status:'ACTIVE'}});
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'SUSPENDED'}});
  check((await act(latest,'START')).status===403,'manager role revocation blocks center action');
  check((await request(ta,`/training/sessions/${latest.id}/status`,{status:'IN_PROGRESS',reason:'تجاوز مسار قديم',expectedUpdatedAt:latest.updatedAt.toISOString()})).status===403,'legacy endpoint cannot bypass manager role revocation');
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await act(latest,'CANCEL');
  for(const status of ['SUSPENDED','COMPLETED','CANCELLED']){
   const closed=await db.trainingEnrollment.update({where:{id:own.id},data:{status}});
   check((await create(closed,payload(closed,interval(20)))).status===409,'closed or suspended enrollment cannot schedule '+status);
  }
 }finally{
  await db.trainingCertificate.deleteMany({where:{trainingRecord:{enrollmentId:{in:ids}}}});
  await db.trainingRecord.deleteMany({where:{enrollmentId:{in:ids}}});await db.trainingEnrollment.deleteMany({where:{id:{in:ids}}});
 }
}
