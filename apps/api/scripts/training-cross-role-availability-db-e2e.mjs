import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
if(process.env.CI!=='true'||process.env.NODE_ENV!=='test'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!url.pathname.endsWith('_availability_ci'))throw new Error('CI, NODE_ENV=test and isolated loopback *_availability_ci database required');
const require=createRequire(import.meta.url);
const {DatabaseService}=require('../dist/database/database.service.js');
const {AuditService}=require('../dist/audit/audit.service.js');
const {TrainingAuthorizationService}=require('../dist/governance/training-authorization.service.js');
const {TrainingSessionService}=require('../dist/governance/training-session.service.js');
const {TrainingAssignmentService}=require('../dist/governance/training-assignment.service.js');
const db=new DatabaseService(),audit=new AuditService(db),authorization=new TrainingAuthorizationService(db),sessions=new TrainingSessionService(db,audit,authorization),assignments=new TrainingAssignmentService(db,audit,authorization,sessions);
let checks=0,center;
const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('PASS',label);};
const conflict=async(work,label)=>{await assert.rejects(work,error=>error?.getStatus?.()===409,label);checks++;console.log('PASS',label);};
const interval=(hour=0)=>({startsAt:new Date(Date.UTC(2038,0,1,6+hour)),endsAt:new Date(Date.UTC(2038,0,1,7+hour))});
const inputTimes=hour=>Object.fromEntries(Object.entries(interval(hour)).map(([k,v])=>[k,v.toISOString()]));
const account=async()=>{const row=await db.account.create({data:{email:`training-role-${randomUUID()}@example.invalid`,passwordHash:'not-a-login',status:'ACTIVE',person:{create:{firstName:'Training',lastName:'Role fixture'}},roleAssignments:{create:{role:'INSTRUCTOR',status:'ACTIVE'}}}});if(center)await db.organizationMember.create({data:{organizationId:center.id,accountId:row.id,role:'INSTRUCTOR',status:'ACTIVE'}});return row;};
const course=(instructorAccountId,studentAccountId)=>db.trainingEnrollment.create({data:{instructorAccountId,studentAccountId,centerOrganizationId:center.id,courseCode:'CROSS-ROLE-FIXTURE',record:{create:{}}},include:{record:true}});
let owner;
const schedule=(row,hour=0,extra={})=>sessions.create(owner.id,row.id,{instructorAccountId:row.instructorAccountId,requestId:randomUUID(),expectedUpdatedAt:row.updatedAt.toISOString(),reason:'Local cross-role fixture',...inputTimes(hour),...extra},true);
const session=id=>db.trainingSession.findUniqueOrThrow({where:{id}});
const reschedule=(row,hour)=>sessions.reschedule(owner.id,row.id,{...inputTimes(hour),reason:'Local cross-role fixture',expectedUpdatedAt:row.updatedAt.toISOString()});
const originalSerializable=db.serializable.bind(db);
async function race(operations,label){
 let arrivals=0,release;const gate=new Promise(resolve=>{release=resolve;});const timer=setTimeout(()=>release(),10000);
 db.serializable=work=>originalSerializable(tx=>work(new Proxy(tx,{get(target,key){const model=Reflect.get(target,key);if(key!=='trainingSession')return model;return new Proxy(model,{get(delegate,method){const fn=Reflect.get(delegate,method);if(method==='findFirst')return async args=>{const result=await fn.call(delegate,args);if(args.where.AND&&args.where.status?.in){arrivals++;if(arrivals===2)release();if(arrivals<=2)await gate;}return result;};return typeof fn==='function'?fn.bind(delegate):fn;}});}})));
 let outcomes;try{outcomes=await Promise.allSettled(operations.map(work=>work()));}finally{clearTimeout(timer);db.serializable=originalSerializable;}
 check(arrivals>=2,`${label}: both actual participant-conflict reads reached`);
 check(outcomes.filter(row=>row.status==='fulfilled').length===1&&outcomes.filter(row=>row.status==='rejected'&&row.reason?.getStatus?.()===409).length===1,`${label}: exactly one success and one conflict`);
 return outcomes;
}
try{
 owner=await account();await db.roleAssignment.create({data:{accountId:owner.id,role:'DIVE_CENTER',status:'ACTIVE'}});
 center=await db.organization.create({data:{displayName:'Cross-role fixture',kind:'DIVE_CENTER',status:'ACTIVE',ownerId:owner.id,members:{create:{accountId:owner.id,role:'OWNER',status:'ACTIVE'}}}});
 const [a,b,c,d]=await Promise.all([account(),account(),account(),account()]);
 const first=await course(a.id,b.id),second=await course(b.id,c.id);await schedule(first);
 await conflict(()=>schedule(second),'student in an existing session cannot teach a different overlapping session');
 const reverse=await course(c.id,a.id);await conflict(()=>schedule(reverse),'instructor in an existing session cannot study in another overlapping session');
 check(await db.trainingSession.count({where:{trainingRecordId:{in:[second.record.id,reverse.record.id]}}})===0,'rejected cross-role creations leave no sessions');
 await schedule(await course(d.id,(await account()).id));check(true,'different canonical participants may train in parallel');
 await schedule(second,1);check(true,'cross-role participant may attend adjacent half-open session');
 const firstSession=await db.trainingSession.findFirstOrThrow({where:{trainingRecordId:first.record.id}});
 await db.trainingSession.update({where:{id:firstSession.id},data:{status:'CANCELLED'}});
 await schedule(reverse);check(true,'cancelled sessions release cross-role participants');
 await db.trainingSession.update({where:{id:(await db.trainingSession.findFirstOrThrow({where:{trainingRecordId:reverse.record.id}})).id},data:{status:'COMPLETED'}});
 const completedRelease=await course(a.id,b.id);await schedule(completedRelease);check(true,'completed sessions release cross-role participants');

 const [e,f,g]=await Promise.all([account(),account(),account()]),leftCourse=await course(e.id,f.id),rightCourse=await course(f.id,g.id);
 await race([()=>schedule(leftCourse,10),()=>schedule(rightCourse,10)],'concurrent cross-role create');
 check(await db.trainingSession.count({where:{trainingRecordId:{in:[leftCourse.record.id,rightCourse.record.id]}}})===1,'concurrent creation commits one session');
 const [h,i,j]=await Promise.all([account(),account(),account()]),resA=await course(h.id,i.id),resB=await course(i.id,j.id);
 const resASession=await session((await schedule(resA,12)).id),resBSession=await session((await schedule(resB,14)).id);
 await race([()=>reschedule(resASession,16),()=>reschedule(resBSession,16)],'concurrent cross-role reschedule');
 check(await db.trainingSession.count({where:{id:{in:[resASession.id,resBSession.id]},startsAt:interval(16).startsAt}})===1,'reschedule loser retains the previous interval');
 const [k,shared,l,m]=await Promise.all([account(),account(),account(),account()]),moveA=await course(k.id,shared.id),moveB=await course(l.id,m.id);
 const moveASession=await session((await schedule(moveA,20)).id),moveBSession=await session((await schedule(moveB,22)).id);
 await race([()=>reschedule(moveASession,22),()=>assignments.assignSession(owner.id,moveBSession.id,{instructorAccountId:shared.id,reason:'Cross-role assignment fixture',expectedUpdatedAt:moveBSession.updatedAt.toISOString()})],'concurrent cross-role reschedule/reassign');
 const afterA=await session(moveASession.id),afterB=await session(moveBSession.id);
 check(!(afterA.startsAt.getTime()===interval(22).startsAt.getTime()&&afterB.instructorAccountId===shared.id),'reschedule/reassignment cannot commit overlapping roles for one account');

 const [startInstructor,startStudent,nextStudent]=await Promise.all([account(),account(),account()]),liveCourse=await course(startInstructor.id,startStudent.id),nextCourse=await course(startStudent.id,nextStudent.id);
 const liveTimes={startsAt:new Date(Date.now()-300000),endsAt:new Date(Date.now()+3600000)};
 const live=await db.trainingSession.create({data:{trainingRecordId:liveCourse.record.id,instructorAccountId:startInstructor.id,status:'CHECK_IN_OPEN',...liveTimes,evidence:{instructorCheckInAt:new Date().toISOString(),studentCheckInAt:new Date().toISOString()}}});
 await race([()=>sessions.act(owner.id,live.id,{action:'START',reason:'Concurrent start fixture',expectedUpdatedAt:live.updatedAt.toISOString()}),()=>schedule(nextCourse,0,{startsAt:new Date(Date.now()+600000).toISOString(),endsAt:new Date(Date.now()+1800000).toISOString()})],'concurrent START/cross-role create');
 check((await session(live.id)).status==='IN_PROGRESS'&&await db.trainingSession.count({where:{trainingRecordId:nextCourse.record.id}})===0,'START preserves its session and overlapping cross-role create is rejected');
 await conflict(()=>schedule(nextCourse,50),'in-progress session conservatively blocks later cross-role scheduling');

 const [openInstructor,openStudent,openOther]=await Promise.all([account(),account(),account()]),openCourse=await course(openInstructor.id,openStudent.id),openTarget=await course(openStudent.id,openOther.id);
 await db.trainingSession.create({data:{trainingRecordId:openCourse.record.id,instructorAccountId:openInstructor.id,status:'SCHEDULED',startsAt:interval(50).startsAt,endsAt:null}});
 await conflict(()=>schedule(openTarget,52),'legacy null-end session remains open-ended across participant roles');

 const [legacyInstructor,legacyStudent,legacyOther]=await Promise.all([account(),account(),account()]),legacyCourse=await course(legacyInstructor.id,legacyStudent.id),legacyConflict=await course(legacyStudent.id,legacyOther.id);
 const legacy=await db.trainingSession.create({data:{trainingRecordId:legacyCourse.record.id,instructorAccountId:legacyInstructor.id,status:'CHECK_IN_OPEN',...liveTimes,evidence:{instructorCheckInAt:new Date().toISOString(),studentCheckInAt:new Date().toISOString()}}});
 await db.trainingSession.create({data:{trainingRecordId:legacyConflict.record.id,instructorAccountId:legacyStudent.id,status:'SCHEDULED',...liveTimes}});
 await conflict(()=>sessions.act(owner.id,legacy.id,{action:'START',reason:'Legacy cross-role fixture',expectedUpdatedAt:legacy.updatedAt.toISOString()}),'START rechecks legacy overlapping participant roles');
 check((await session(legacy.id)).status==='CHECK_IN_OPEN','rejected START does not advance status');

 const originalPolicy=await db.policyControl.findUnique({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}}});
 for(const state of ['DISABLED','REVIEW']){
  await db.policyControl.upsert({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}},create:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT',labelAr:'Role fixture',state},update:{state}});
  const [p,q,r]=await Promise.all([account(),account(),account()]);await schedule(await course(p.id,q.id),30);await schedule(await course(q.id,r.id),30);
  check(true,`${state} retains existing non-enforcing training conflict behavior`);
 }
 if(originalPolicy)await db.policyControl.update({where:{id:originalPolicy.id},data:{state:originalPolicy.state}});else await db.policyControl.delete({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}}});
 console.log(`Training cross-role availability: ${checks} checks passed.`);
}finally{await db.$disconnect();}
