import {randomUUID} from 'node:crypto';
export async function checkCenterTeamManagement(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check){
 if(process.env.CI!=='true'||!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)||!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw new Error('CI loopback API and database required');
 const request=async(token,path,body,method=body?'PATCH':'GET')=>{const response=await fetch(base+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()}};
 const actor=await personAccount('manage-'+randomUUID()),pro=await personAccount('manage-pro-'+randomUUID()),student=await personAccount('manage-student-'+randomUUID());
 await db.roleAssignment.create({data:{accountId:pro.id,role:'INSTRUCTOR',status:'ACTIVE'}});
 let member=await db.organizationMember.create({data:{organizationId:a.org.id,accountId:actor.id,role:'STAFF',status:'ACTIVE'}});
 let instructor=await db.organizationMember.create({data:{organizationId:a.org.id,accountId:pro.id,role:'INSTRUCTOR',status:'ACTIVE'}});
 await db.organizationMember.create({data:{organizationId:b.org.id,accountId:pro.id,role:'INSTRUCTOR',status:'ACTIVE'}});
 const tp=await tokenFor(pro.id),studentToken=await tokenFor(student.id),actorToken=await tokenFor(actor.id);
 const manage=(row,action='SUSPEND',extra={},token=ta)=>request(token,`/center/me/team/${row.id}`,{action,reason:'اختبار تعديل العضوية',expectedUpdatedAt:new Date(row.updatedAt).toISOString(),...extra});
 const refresh=row=>db.organizationMember.findUniqueOrThrow({where:{id:row.id}});
 const enrollments=[];
 try{
  check((await manage(member,'SUSPEND',{},null)).status===401,'anonymous team mutation denied');
  check((await manage(member,'SUSPEND',{},ts)).status===403,'ordinary staff cannot manage team');
  check((await manage(member,'SUSPEND',{},tb)).status===404,'cross-center team mutation denied');
  check((await manage(a.member)).status===403,'owner membership protected');
  const pending=await db.organizationMember.create({data:{organizationId:a.org.id,accountId:student.id,role:'STAFF',status:'PENDING'}});
  check((await manage(pending,'REACTIVATE')).status===409,'management cannot activate an unaccepted invitation');
  check((await manage(pending,'CHANGE_ROLE',{role:'OPERATOR'})).status===409,'pending invitation role cannot change behind invitee consent');
  const admin=await personAccount('manage-admin-'+randomUUID());
  const adminMember=await db.organizationMember.create({data:{organizationId:a.org.id,accountId:admin.id,role:'ADMIN',status:'ACTIVE'}});
  check((await manage(adminMember)).status===403,'manager membership protected from ordinary team changes');
  for(const extra of [{action:'DELETE'},{reason:''},{reason:'x'.repeat(1001)},{expectedUpdatedAt:'bad'},{organizationId:b.org.id},{role:'OWNER'},{action:'CHANGE_ROLE',role:'ADMIN'},{action:'CHANGE_ROLE',role:'OWNER'}])check((await manage(member,'SUSPEND',extra)).status===400,'invalid management input denied '+JSON.stringify(extra).slice(0,90));
  check((await manage(member,'SUSPEND',{expectedUpdatedAt:'2000-01-01T00:00:00Z'})).status===409,'stale membership revision denied');
  check((await manage(member,'CHANGE_ROLE',{role:'INSTRUCTOR'})).status===409,'role change cannot grant professional approval');
  let result=await manage(member,'CHANGE_ROLE',{role:'OPERATOR'});check(result.status===200&&result.body.role==='OPERATOR','ordinary role change persists');
  check((await refresh(member)).role==='OPERATOR','role stored in database');member=result.body;
  check(await db.roleAssignment.count({where:{accountId:actor.id,role:{in:['ADMIN','REVIEWER','INSTRUCTOR']}}})===0,'membership update does not grant platform roles');
  const createEnrollment=async(center,code)=>{
   const row=await db.trainingEnrollment.create({data:{studentAccountId:student.id,instructorAccountId:pro.id,centerOrganizationId:center,status:'ACTIVE',courseCode:code}});enrollments.push(row.id);
   const record=await db.trainingRecord.create({data:{enrollmentId:row.id}});
   const stage=await db.trainingStage.create({data:{trainingRecordId:record.id,stageType:'THEORY',deliveryMode:'CLASSROOM',sequence:1}});
   const skill=await db.trainingSkill.create({data:{trainingStageId:stage.id,skillCode:code,name:code}});
   const session=await db.trainingSession.create({data:{trainingRecordId:record.id,instructorAccountId:pro.id,startsAt:new Date('2030-01-01T06:00:00Z')}});
   return {row,record,stage,skill,session};
  };
  const own=await createEnrollment(a.org.id,'TEAM-A'),other=await createEnrollment(b.org.id,'TEAM-B'),independent=await createEnrollment(null,'TEAM-INDEPENDENT');
  await db.roleAssignment.upsert({where:{accountId_role:{accountId:ownerA.id,role:'INSTRUCTOR'}},create:{accountId:ownerA.id,role:'INSTRUCTOR',status:'ACTIVE'},update:{status:'ACTIVE'}});
  const ownerEnrollment=await db.trainingEnrollment.create({data:{studentAccountId:student.id,centerOrganizationId:a.org.id,courseCode:'TEAM-OWNER',status:'ACTIVE'}});enrollments.push(ownerEnrollment.id);
  check((await request(ta,`/training/enrollments/${ownerEnrollment.id}/instructor`,{instructorAccountId:ownerA.id})).status===200,'qualified center owner can also teach without losing ownership');
  check((await request(ta,'/center/me/professionals')).body.some(row=>row.accountId===ownerA.id),'qualified owner appears among center professionals');
  check((await request(ta,'/training/professional/me/assignments')).body.some(row=>row.enrollmentId===ownerEnrollment.id),'professional portal includes qualified owner assignments');
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'INSTRUCTOR'}},data:{status:'SUSPENDED'}});
  check((await request(ta,`/training/enrollments/${ownerEnrollment.id}/instructor`,{instructorAccountId:ownerA.id})).status===409,'center ownership alone cannot grant instructor qualification');
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'INSTRUCTOR'}},data:{status:'ACTIVE'}});
  const earning=await db.instructorEarning.create({data:{trainingEnrollmentId:own.row.id,instructorAccountId:pro.id,centerOrganizationId:a.org.id,amountMinor:5000}});
  check((await request(actorToken,`/training/enrollments/${own.row.id}`)).status===200,'active operator has center training scope');
  result=await manage(member);check(result.status===200&&result.body.status==='SUSPENDED','manager suspends ordinary membership');member=result.body;
  check((await request(actorToken,`/training/enrollments/${own.row.id}`)).status===403,'operator suspension revokes center training access in same session');
  result=await manage(member,'REACTIVATE');check(result.status===200&&result.body.status==='ACTIVE','manager reactivates ordinary membership');member=result.body;
  check((await request(actorToken,`/training/enrollments/${own.row.id}`)).status===200,'operator reactivation restores only existing scope');
  const team=(await request(ta,'/center/me/team')).body,visible=team.find(row=>row.membershipId===instructor.id);
  check(visible.canChangeRole&&visible.canSuspend&&!visible.canReactivate&&visible.openTrainingEnrollments===1&&visible.openTrainingSessions===1,'roster exposes actions and actual unfinished center assignments');
  check(!('accountId' in visible)&&!JSON.stringify(visible).includes(pro.email),'team management metadata preserves identity privacy');
  check(!team.find(row=>row.membershipId===a.member.id).canChangeRole,'owner has no mutation controls');
  check((await request(tp,`/training/enrollments/${own.row.id}`)).status===200,'active center instructor can read own assignment');
  result=await manage(instructor);check(result.status===200,'instructor suspension succeeds even with unfinished work');instructor=result.body;
  check(await db.auditEvent.count({where:{action:'organization.member_suspended',resourceId:a.org.id,metadata:{path:['memberId'],equals:instructor.id}}})===1,'suspension records one audit');
  check(await db.notification.count({where:{accountId:pro.id,type:'ORGANIZATION_MEMBERSHIP_CHANGED'}})===1,'suspension records one member notification');
  check((await db.roleAssignment.findUnique({where:{accountId_role:{accountId:pro.id,role:'INSTRUCTOR'}}})).status==='ACTIVE','center suspension preserves platform instructor role');
  check((await db.trainingEnrollment.findUnique({where:{id:own.row.id}})).instructorAccountId===pro.id,'suspension preserves enrollment history');
  check((await db.trainingSession.findUnique({where:{id:own.session.id}})).status==='SCHEDULED','suspension does not silently cancel a scheduled session');
  check((await request(tp,`/training/enrollments/${own.row.id}`)).status===403,'suspended instructor cannot read center enrollment');
  for(const [path,body,method] of [
   [`/training/enrollments/${own.row.id}/status`,{status:'COMPLETED'}],
   [`/training/records/${own.record.id}/progress`,{progressPercent:100}],
   [`/training/records/${own.record.id}/stages`,{stageType:'THEORY',deliveryMode:'CLASSROOM',sequence:2},'POST'],
   [`/training/stages/${own.stage.id}/skills`,{skillCode:'FORGED',name:'forged'},'POST'],
   [`/training/skills/${own.skill.id}/assessment`,{status:'COMPETENT'}],
   [`/training/sessions/${own.session.id}/status`,{status:'COMPLETED'}],
   [`/training/professional/me/sessions/${own.session.id}/attendance`,{action:'OPEN'}],
   [`/training/professional/me/records/${own.record.id}/certificate-recommendation`,{},'POST'],
  ])check((await request(tp,path,body,method)).status===403,'revoked center membership blocks '+path);
  for(const path of ['assignments','skills','schedule','certificates']){
   const r=await request(tp,'/training/professional/me/'+path);
   check(r.status===200&&!JSON.stringify(r.body).includes('TEAM-A')&&JSON.stringify(r.body).includes('TEAM-B')&&JSON.stringify(r.body).includes('TEAM-INDEPENDENT'),'professional '+path+' excludes suspended center but preserves other work');
  }
  check(!(await request(ta,'/center/me/professionals')).body.some(row=>row.accountId===pro.id),'suspended member disappears from active professionals');
  check((await request(tp,'/training/professional/me/earnings')).body.entries.some(row=>row.id===earning.id),'own financial history remains visible');
  check((await request(tp,`/training/enrollments/${other.row.id}`)).status===200&&(await request(tp,`/training/enrollments/${independent.row.id}`)).status===200,'other center and independent training remain authorized');
  check((await request(studentToken,`/training/enrollments/${own.row.id}`)).status===200,'student retains access to own training');
  check((await request(ta,`/training/enrollments/${own.row.id}/instructor`,{instructorAccountId:pro.id})).status===409,'legacy assignment cannot select suspended center member');
  check((await request(ta,`/training/records/${own.record.id}/sessions`,{instructorAccountId:pro.id,startsAt:'2030-01-02T06:00:00Z'},'POST')).status===409,'new sessions cannot select suspended center member');
  check((await request(studentToken,'/training/enrollments',{courseCode:'FORGED',centerOrganizationId:a.org.id,instructorAccountId:pro.id},'POST')).status===400,'self enrollment cannot forge instructor assignment');
  check((await request(studentToken,'/training/enrollments',{courseCode:'FORGED',studentAccountId:pro.id},'POST')).status===400,'self enrollment cannot forge student identity');
  await db.roleAssignment.update({where:{accountId_role:{accountId:pro.id,role:'INSTRUCTOR'}},data:{status:'SUSPENDED'}});
  check((await manage(instructor,'REACTIVATE')).status===409,'reactivation rechecks active professional role');
  await db.roleAssignment.update({where:{accountId_role:{accountId:pro.id,role:'INSTRUCTOR'}},data:{status:'ACTIVE'}});
  await db.account.update({where:{id:pro.id},data:{status:'SUSPENDED'}});
  check((await manage(instructor,'REACTIVATE')).status===409,'reactivation cannot enable suspended account');
  await db.account.update({where:{id:pro.id},data:{status:'ACTIVE'}});
  await db.roleAssignment.create({data:{accountId:pro.id,role:'ADMIN',status:'ACTIVE'}});
  check((await manage(instructor,'REACTIVATE')).status===409,'reactivation preserves executive separation');
  await db.roleAssignment.delete({where:{accountId_role:{accountId:pro.id,role:'ADMIN'}}});
  result=await manage(instructor,'REACTIVATE');check(result.status===200,'eligible instructor can reactivate');instructor=result.body;
  check((await request(tp,`/training/enrollments/${own.row.id}`)).status===200,'reactivation restores same-session center access');
  check((await request(ta,`/training/enrollments/${own.row.id}/instructor`,{instructorAccountId:pro.id})).status===200,'active eligible instructor can be assigned');
  result=await manage(instructor,'CHANGE_ROLE',{role:'STAFF'});check(result.status===200,'instructor can change to ordinary staff role');instructor=result.body;
  check((await request(tp,`/training/enrollments/${own.row.id}`)).status===403,'changing instructor membership role revokes assigned-instructor access');
  check(!(await request(tp,'/training/professional/me/assignments')).body.some(row=>row.enrollmentId===own.row.id),'role change also filters professional assignment list');
  member=await refresh(member);
  const races=await Promise.all([manage(member),manage(member,'CHANGE_ROLE',{role:'VIEWER'})]);
  check(races.filter(row=>row.status===200).length===1&&races.filter(row=>row.status===409).length===1,'concurrent membership mutations have one winner');
  check((await manage(member)).status===409,'old revision cannot replay a membership change');
  member=await refresh(member);
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'SUSPENDED'}});
  check((await manage(member,'CHANGE_ROLE',{role:member.role==='VIEWER'?'STAFF':'VIEWER'})).status===403,'manager global-role revocation blocks same-session mutation');
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'SUSPENDED'}});
  check((await manage(member,'CHANGE_ROLE',{role:member.role==='VIEWER'?'STAFF':'VIEWER'})).status===403,'manager membership revocation blocks same-session mutation');
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});
 }finally{
  await db.instructorEarning.deleteMany({where:{trainingEnrollmentId:{in:enrollments}}});
  await db.trainingRecord.deleteMany({where:{enrollmentId:{in:enrollments}}});
  await db.trainingEnrollment.deleteMany({where:{id:{in:enrollments}}});
 }
}
