import {randomUUID} from 'node:crypto';
export async function checkCenterTrainingAssignments(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check){
 if(process.env.CI!=='true'||!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)||!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw new Error('CI loopback API and database required');
 const request=async(token,path,body,method=body?'PATCH':'GET')=>{const response=await fetch(base+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()}};
 const student=await personAccount('assignment-student-'+randomUUID()),pros=[];
 for(let i=0;i<4;i++){
  const account=await personAccount('assignment-pro-'+i+'-'+randomUUID());
  await db.roleAssignment.create({data:{accountId:account.id,role:'INSTRUCTOR',status:'ACTIVE'}});
  const member=await db.organizationMember.create({data:{organizationId:i===3?b.org.id:a.org.id,accountId:account.id,role:'INSTRUCTOR',status:'ACTIVE'}});pros.push({...account,member});
 }
 const [oldToken,newToken]=await Promise.all([tokenFor(pros[0].id),tokenFor(pros[1].id)]),ids=[];
 const course=async(label,center=a.org.id)=>{
  const row=await db.trainingEnrollment.create({data:{studentAccountId:student.id,centerOrganizationId:center,instructorAccountId:pros[0].id,status:'ACTIVE',courseCode:label,metadata:{privateMarker:'DO_NOT_RETURN'}}});ids.push(row.id);
  const record=await db.trainingRecord.create({data:{enrollmentId:row.id}});return {...row,record};
 };
 const session=(row,status='SCHEDULED',instructorAccountId=pros[0].id,startsAt=new Date('2035-01-01T06:00:00Z'),evidence)=>db.trainingSession.create({data:{trainingRecordId:row.record.id,instructorAccountId,status,startsAt,evidence}});
 const current=id=>db.trainingEnrollment.findUniqueOrThrow({where:{id}});
 const payload=(row,target=pros[1].id,extra={})=>({instructorAccountId:target,reason:'إعادة توزيع التكليف',expectedUpdatedAt:new Date(row.updatedAt).toISOString(),transferUpcomingSessions:true,...extra});
 const assign=(row,target=pros[1].id,extra={},token=ta)=>request(token,`/center/me/training/enrollments/${row.id}/instructor`,payload(row,target,extra));
 const assignSession=(row,target=pros[1].id,extra={},token=ta)=>{const input=payload(row,target,extra);delete input.transferUpcomingSessions;return request(token,`/center/me/training/sessions/${row.id}/instructor`,input)};
 try{
  const own=await course('ASSIGN-A'),foreign=await course('ASSIGN-B',b.org.id);
  const future=await session(own),substitute=await session(own,'SCHEDULED',pros[2].id),completed=await session(own,'COMPLETED'),cancelled=await session(own,'CANCELLED');
  const stage=await db.trainingStage.create({data:{trainingRecordId:own.record.id,stageType:'THEORY',deliveryMode:'CLASSROOM',sequence:1}});
  const skill=await db.trainingSkill.create({data:{trainingStageId:stage.id,skillCode:'SKILL-ONE',name:'مهارة سابقة'}});
  check((await request(oldToken,`/training/skills/${skill.id}/assessment`,{status:'COMPETENT'})).status===200,'original instructor records actual skill sign-off');
  const signed=await db.trainingSkill.findUniqueOrThrow({where:{id:skill.id}});
  const earning=await db.instructorEarning.create({data:{trainingEnrollmentId:own.id,instructorAccountId:pros[0].id,centerOrganizationId:a.org.id,amountMinor:12000}});
  check((await request(null,'/center/me/training')).status===401,'anonymous center training read denied');
  check((await request(ts,'/center/me/training')).status===403,'ordinary staff cannot inspect center training');
  let r=await request(ta,'/center/me/training');
  check(r.status===200&&r.body.enrollments.some(row=>row.id===own.id)&&!r.body.enrollments.some(row=>row.id===foreign.id),'training list is center scoped');
  check(!JSON.stringify(r.body).includes(student.email)&&!JSON.stringify(r.body).includes('DO_NOT_RETURN')&&!JSON.stringify(r.body).includes('studentAccountId')&&!JSON.stringify(r.body).includes('evidence'),'list excludes personal contacts, raw evidence and arbitrary metadata');
  check(r.body.instructors.some(row=>row.accountId===pros[1].id)&&!r.body.instructors.some(row=>row.accountId===pros[3].id),'candidate list excludes other center instructors');
  check(r.body.enrollments.find(row=>row.id===own.id).record.sessions.find(row=>row.id===completed.id).canAssign===false,'completed session has no reassign control');
  check((await assign(own,undefined,{},null)).status===401,'anonymous assignment denied');
  check((await assign(own,undefined,{},ts)).status===403,'staff assignment denied');
  check((await assign(own,undefined,{},tb)).status===404,'other center cannot assign course');
  for(const extra of [{organizationId:b.org.id},{studentAccountId:student.id},{instructorAccountId:'bad'},{reason:''},{reason:'x'.repeat(1001)},{expectedUpdatedAt:'bad'},{transferUpcomingSessions:'true'}])check((await assign(own,undefined,extra)).status===400,'invalid assignment fields denied');
  check((await assign(own,pros[3].id)).status===409,'foreign center instructor rejected');
  await db.organizationMember.update({where:{id:pros[1].member.id},data:{status:'SUSPENDED'}});
  check((await assign(own)).status===409,'membership revocation after listing is enforced at save');
  await db.organizationMember.update({where:{id:pros[1].member.id},data:{status:'ACTIVE'}});
  await db.roleAssignment.update({where:{accountId_role:{accountId:pros[1].id,role:'INSTRUCTOR'}},data:{status:'SUSPENDED'}});
  check((await assign(own)).status===409,'instructor role revocation enforced at save');
  await db.roleAssignment.update({where:{accountId_role:{accountId:pros[1].id,role:'INSTRUCTOR'}},data:{status:'ACTIVE'}});
  await db.account.update({where:{id:pros[1].id},data:{status:'SUSPENDED'}});
  check((await assign(own)).status===409,'inactive instructor account rejected');
  await db.account.update({where:{id:pros[1].id},data:{status:'ACTIVE'}});
  r=await assign(own);check(r.status===200&&r.body.transferredSessionCount===1,'course assignment moves only old instructor upcoming scheduled sessions');
  check((await current(own.id)).instructorAccountId===pros[1].id,'course instructor persisted');
  check((await db.trainingSession.findUnique({where:{id:future.id}})).instructorAccountId===pros[1].id,'eligible future session transferred');
  check((await db.trainingSession.findUnique({where:{id:substitute.id}})).instructorAccountId===pros[2].id,'different session instructor preserved');
  for(const row of [completed,cancelled])check((await db.trainingSession.findUnique({where:{id:row.id}})).instructorAccountId===pros[0].id,'historical session instructor preserved');
  const after=await db.trainingSkill.findUnique({where:{id:skill.id}});check(after.signedOffByInstructorId===signed.signedOffByInstructorId&&after.signedOffAt.getTime()===signed.signedOffAt.getTime(),'reassignment preserves original skill signature');
  check((await db.instructorEarning.findUnique({where:{id:earning.id}})).instructorAccountId===pros[0].id,'financial history is not reassigned');
  check(await db.auditEvent.count({where:{resourceId:own.id,action:'training.instructor_assigned'}})===1,'assignment audit recorded once');
  check(await db.notification.count({where:{type:'TRAINING_ASSIGNMENT_CHANGED',payload:{path:['enrollmentId'],equals:own.id}}})===3,'new, former instructor and student notified atomically');
  check((await assign(own)).status===409,'replay with stale course revision cannot duplicate assignment');
  check((await request(oldToken,`/training/enrollments/${own.id}`)).status===403,'former instructor no longer reads course after reassignment');
  check((await request(newToken,`/training/enrollments/${own.id}`)).status===200,'new instructor can read assigned course');
  const latest=await current(own.id);r=await assign(latest);check(r.status===200&&r.body.transferredSessionCount===0,'same target with current revision is a no-op');
  check(await db.auditEvent.count({where:{resourceId:own.id,action:'training.instructor_assigned'}})===1,'no-op does not duplicate audit');

  const keep=await course('ASSIGN-KEEP'),kept=await session(keep);
  r=await assign(keep,pros[1].id,{transferUpcomingSessions:false});check(r.status===200&&r.body.transferredSessionCount===0,'explicit keep-sessions choice respected');
  check((await db.trainingSession.findUnique({where:{id:kept.id}})).instructorAccountId===pros[0].id,'kept session retains original instructor');
  const solo=await course('ASSIGN-SOLO'),single=await session(solo);
  r=await assignSession(single);check(r.status===200,'individual upcoming session can be reassigned');
  const parent=await current(solo.id);check(parent.instructorAccountId===pros[0].id&&parent.updatedAt.getTime()!==solo.updatedAt.getTime(),'session reassignment preserves course instructor and advances aggregate revision');
  check((await assign(solo)).status===409,'old course revision invalidated by session change');
  check((await assignSession(single)).status===409,'old session revision rejected');
  check((await assignSession(await db.trainingSession.findUnique({where:{id:single.id}}),pros[2].id,{},tb)).status===404,'cross-center session reassignment denied');
  const running=await course('ASSIGN-RUNNING'),runningSession=await session(running,'IN_PROGRESS');
  check((await assign(running)).status===409,'running session blocks course reassignment');
  check((await assignSession(runningSession)).status===409,'running session cannot be reassigned');
  const evidenced=await course('ASSIGN-EVIDENCE'),evidenceSession=await session(evidenced,'SCHEDULED',pros[0].id,undefined,{instructorCheckInAt:new Date().toISOString()});
  check((await assignSession(evidenceSession)).status===409,'attendance evidence blocks reassignment even with scheduled status');
  check((await assign(evidenced)).status===409,'attendance evidence also blocks bulk reassignment');
  const past=await course('ASSIGN-PAST'),pastSession=await session(past,'SCHEDULED',pros[0].id,new Date('2020-01-01T00:00:00Z'));
  check((await assignSession(pastSession)).status===409,'elapsed session cannot be reassigned');
  for(const status of ['COMPLETED','CANCELLED']){
   const closed=await course('ASSIGN-'+status);const changed=await db.trainingEnrollment.update({where:{id:closed.id},data:{status}});
   check((await assign(changed)).status===409,'closed enrollment cannot be reassigned '+status);
   check((await request(ta,`/training/enrollments/${closed.id}/instructor`,payload(changed))).status===409,'legacy endpoint uses same closed-enrollment rules');
  }
  const race=await course('ASSIGN-RACE'),results=await Promise.all([assign(race,pros[1].id),assign(race,pros[2].id)]);
  check(results.filter(row=>row.status===200).length===1&&results.filter(row=>row.status===409).length===1,'concurrent course changes have one winner');
  check(await db.auditEvent.count({where:{resourceId:race.id,action:'training.instructor_assigned'}})===1,'concurrent course changes create one audit');
  const raceSession=await session(race),sessionResults=await Promise.all([assignSession(raceSession,pros[1].id),assignSession(raceSession,pros[2].id)]);
  check(sessionResults.filter(row=>row.status===200).length===1&&sessionResults.filter(row=>row.status===409).length===1,'concurrent session changes have one winner');

  // A new lead instructor can recommend completed training without rewriting
  // earlier instructors' signed assessments.
  await db.trainingRecord.update({where:{id:own.record.id},data:{status:'COMPLETED',progressPercent:100}});
  await db.trainingSession.updateMany({where:{trainingRecordId:own.record.id},data:{status:'COMPLETED'}});
  await db.trainingSkill.update({where:{id:skill.id},data:{signedOffAt:null}});
  r=await request(newToken,'/training/professional/me/certificates');check(r.body.find(row=>row.trainingRecordId===own.record.id)?.readyForRecommendation===false,'missing historical signature date blocks readiness');
  check((await request(newToken,`/training/professional/me/records/${own.record.id}/certificate-recommendation`,{},'POST')).status===409,'recommendation cannot accept an incomplete historical signature');
  await db.trainingSkill.update({where:{id:skill.id},data:{signedOffAt:signed.signedOffAt}});
  r=await request(newToken,'/training/professional/me/certificates');check(r.body.find(row=>row.trainingRecordId===own.record.id)?.readyForRecommendation===true,'readiness accepts preserved earlier instructor signatures');
  r=await request(newToken,`/training/professional/me/records/${own.record.id}/certificate-recommendation`,{},'POST');check(r.status===201&&r.body.status==='RECOMMENDED','new instructor can recommend course with preserved earlier signatures');
  check((await assign(await current(own.id),pros[2].id)).status===409,'certificate history prevents later assignment rewrite');

  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'SUSPENDED'}});
  check((await request(ta,'/center/me/training')).status===403,'same-session manager role revocation blocks read');
  check((await assign(await current(keep.id),pros[2].id)).status===403,'same-session manager role revocation blocks assignment');
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  const padding=Array.from({length:52},(_,i)=>({id:randomUUID(),studentAccountId:student.id,centerOrganizationId:a.org.id,courseCode:'PAGE-'+i}));ids.push(...padding.map(row=>row.id));await db.trainingEnrollment.createMany({data:padding});
  const first=await request(ta,'/center/me/training'),second=await request(ta,'/center/me/training?cursor='+first.body.nextCursor);
  check(first.body.enrollments.length===50&&first.body.nextCursor&&second.status===200,'large center list is paginated');
  check(!second.body.enrollments.some(row=>first.body.enrollments.some(item=>item.id===row.id)),'pages do not repeat enrollments');
  check((await request(tb,'/center/me/training?cursor='+first.body.nextCursor)).status===404,'pagination cursor cannot expose another center');
 }finally{
  await db.trainingCertificate.deleteMany({where:{trainingRecord:{enrollmentId:{in:ids}}}});
  await db.instructorEarning.deleteMany({where:{trainingEnrollmentId:{in:ids}}});
  await db.trainingRecord.deleteMany({where:{enrollmentId:{in:ids}}});
  await db.trainingEnrollment.deleteMany({where:{id:{in:ids}}});
 }
}
