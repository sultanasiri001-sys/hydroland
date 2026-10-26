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
const {CalendarAllocationService}=require('../dist/trips/calendar-allocation.service.js');
const {CrewAssignmentService}=require('../dist/trips/crew-assignment.service.js');
const {PolicyControlService}=require('../dist/trips/policy-control.service.js');
const db=new DatabaseService(),audit=new AuditService(db),sessions=new TrainingSessionService(db,audit,new TrainingAuthorizationService(db));
const calendar=new CalendarAllocationService(db,audit);
const crew=new CrewAssignmentService(db,new PolicyControlService(db,audit),audit);
const assignments=new TrainingAssignmentService(db,audit,new TrainingAuthorizationService(db),sessions);
let checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('PASS',label);};
const conflict=async(work,label)=>{await assert.rejects(work,error=>error?.getStatus?.()===409,label);checks++;console.log('PASS',label);};
const time=(hour=0)=>({startsAt:new Date(Date.UTC(2036,0,1,6+hour)),endsAt:new Date(Date.UTC(2036,0,1,7+hour))});
const account=()=>db.account.create({data:{email:`availability-${randomUUID()}@example.invalid`,passwordHash:'not-a-login',status:'ACTIVE',person:{create:{firstName:'Availability',lastName:'Fixture'}},roleAssignments:{create:{role:'INSTRUCTOR',status:'ACTIVE'}}}});
const resource=accountId=>db.calendarResource.create({data:{type:'INSTRUCTOR',name:'Availability fixture',referenceId:accountId}});
const enrollment=async(instructorId,studentId)=>db.trainingEnrollment.create({data:{studentAccountId:studentId,instructorAccountId:instructorId,courseCode:'AVAILABILITY-FIXTURE',record:{create:{}}},include:{record:true}});
const trip=(hour=0)=>db.trip.create({data:{title:'Availability fixture',type:'TEST',capacity:1,status:'DRAFT',...time(hour)}});
const schedule=(row,hour=0,extra={})=>sessions.create(row.instructorAccountId,row.record.id,{instructorAccountId:row.instructorAccountId,requestId:randomUUID(),expectedUpdatedAt:row.updatedAt.toISOString(),reason:'Local availability test',startsAt:time(hour).startsAt.toISOString(),endsAt:time(hour).endsAt.toISOString(),...extra},false);
try{
 console.log('Database time zone:',await db.$queryRaw`SHOW timezone`);
 const [instructor,student]=await Promise.all([account(),account()]),r=await resource(instructor.id);
 const firstTrip=await trip(),firstCourse=await enrollment(instructor.id,student.id);
 await calendar.allocate(instructor.id,firstTrip.id,[r.id]);
  const persisted=await db.calendarAllocation.findFirstOrThrow({where:{resourceId:r.id}});
  check(persisted.startsAt.getTime()===firstTrip.startsAt.getTime()&&persisted.endsAt.getTime()===firstTrip.endsAt.getTime(),'UTC allocation times match trip regardless of database session time zone');
  await conflict(()=>schedule(firstCourse),'trip allocation blocks overlapping training creation');
  check(await db.trainingSession.count({where:{trainingRecordId:firstCourse.record.id}})===0,'rejected training leaves no session');
  const secondCourse=await enrollment(instructor.id,student.id),secondSession=await schedule(secondCourse,2),secondTrip=await trip(2);
  await conflict(()=>calendar.allocate(instructor.id,secondTrip.id,[r.id]),'training blocks overlapping trip allocation');
  check(await db.calendarEvent.count({where:{referenceType:'TRIP',referenceId:secondTrip.id}})===0,'rejected allocation rolls back calendar event');
  await conflict(()=>calendar.assertResourcesAvailable([r.id],time(2).startsAt,time(2).endsAt),'read-only availability check includes training');
  const adjacentTrip=await trip(3);await calendar.allocate(instructor.id,adjacentTrip.id,[r.id]);
  check(true,'half-open intervals permit adjacent trip after training');
  const adjacentCourse=await enrollment(instructor.id,student.id);await schedule(adjacentCourse,4);
  check(true,'half-open intervals permit adjacent training after trip');
  const offsetCourse=await enrollment(instructor.id,student.id);
  await conflict(()=>schedule(offsetCourse,0,{startsAt:'2036-01-01T09:00:00+03:00',endsAt:'2036-01-01T10:00:00+03:00'}),'timezone offsets normalize to the same UTC collision');
  await assert.rejects(()=>schedule(offsetCourse,5,{startsAt:'2036-01-01T11:00:00'}),error=>error?.getStatus?.()===400);
  check(true,'timezone-less training input remains invalid');

  const other=await account(),otherResource=await resource(other.id),parallelTrip=await trip(2);
  await calendar.allocate(other.id,parallelTrip.id,[otherResource.id]);
  check(true,'unrelated accounts may use the same interval');
  const studentResource=await resource(student.id),studentTrip=await trip(2);
  await conflict(()=>calendar.allocate(student.id,studentTrip.id,[studentResource.id]),'a training student cannot simultaneously be trip crew');
  const studentBusyTrip=await trip(6);await calendar.allocate(student.id,studentBusyTrip.id,[studentResource.id]);
  const studentCourse=await enrollment(other.id,student.id);
  await conflict(()=>schedule(studentCourse,6),'student trip allocation blocks training with another instructor');
  const captain=await db.calendarResource.create({data:{type:'CAPTAIN',name:'Same account captain',referenceId:instructor.id}}),captainTrip=await trip(2);
  await conflict(()=>calendar.allocate(instructor.id,captainTrip.id,[captain.id]),'canonical account mapping catches a different human resource role');
  const missing=await db.calendarResource.create({data:{type:'INSTRUCTOR',name:'Legacy missing account'}}),missingTrip=await trip(8);
  await conflict(()=>calendar.allocate(instructor.id,missingTrip.id,[missing.id]),'unmapped human resource fails closed');
  const unknown=await db.calendarResource.create({data:{type:'CREW',name:'Legacy unknown account',referenceId:randomUUID()}});
  await conflict(()=>calendar.allocate(instructor.id,missingTrip.id,[unknown.id]),'unknown human account reference fails closed');
  const equipment=await db.calendarResource.create({data:{type:'EQUIPMENT',name:'Unrelated equipment',referenceId:instructor.id}}),equipmentTrip=await trip(2);
  await calendar.allocate(instructor.id,equipmentTrip.id,[equipment.id]);
  check(true,'non-human reference IDs are not reinterpreted as accounts');

  await db.trainingSession.update({where:{id:secondSession.id},data:{status:'CANCELLED'}});
  await calendar.allocate(instructor.id,secondTrip.id,[r.id]);
  check(true,'cancelled training releases its interval');
  await calendar.allocate(instructor.id,firstTrip.id,[]);
  await schedule(firstCourse);
  check(true,'explicitly released trip allocation permits training');
  const completeCourse=await enrollment(other.id,(await account()).id),completeSession=await schedule(completeCourse,9);
  await db.trainingSession.update({where:{id:completeSession.id},data:{status:'COMPLETED'}});
  await calendar.allocate(other.id,(await trip(9)).id,[otherResource.id]);
  check(true,'completed training releases its interval');

  const openInstructor=await account(),openResource=await resource(openInstructor.id),openCourse=await enrollment(openInstructor.id,(await account()).id);
  const open=await schedule(openCourse,10);
  await db.trainingSession.update({where:{id:open.id},data:{endsAt:null}});
  const nullEndTrip=await trip(12);await conflict(()=>calendar.allocate(openInstructor.id,nullEndTrip.id,[openResource.id]),'legacy null-end session conservatively blocks later trip');
  await db.trainingSession.update({where:{id:open.id},data:{status:'IN_PROGRESS',endsAt:time(10).endsAt}});
  const runningTrip=await trip(20);await conflict(()=>calendar.allocate(openInstructor.id,runningTrip.id,[openResource.id]),'in-progress session remains unavailable past planned end');

  const replacementTrip=await trip(10);
  const oldResource=await resource((await account()).id);
  await calendar.allocate(other.id,replacementTrip.id,[oldResource.id]);
  const assignment=await db.crewAssignment.create({data:{tripId:replacementTrip.id,resourceId:oldResource.id,accountId:oldResource.referenceId,roleType:'INSTRUCTOR',status:'PENDING'}});
  await conflict(()=>crew.replaceAssignment(assignment,{id:openResource.id,type:'INSTRUCTOR',referenceId:openInstructor.id,name:openResource.name},'REASSIGNED'),'automatic replacement rechecks training in the write transaction');
  check((await db.crewAssignment.findUnique({where:{id:assignment.id}})).status==='PENDING','rejected replacement preserves prior assignment');
  await db.policyControl.create({data:{category:'CREW',ruleKey:'QUALIFICATION',labelAr:'Local availability fixture',state:'DISABLED'}});
  const eligible=await crew.eligibleResources(replacementTrip.id);
  check(eligible.rows.some(row=>row.id===otherResource.id),'candidate fixture permits a free otherwise-qualified instructor');
  check(!eligible.rows.some(row=>row.referenceId===openInstructor.id),'candidate selection excludes busy training accounts');
  const replacement=await crew.replaceAssignment(assignment,{id:otherResource.id,type:'INSTRUCTOR',referenceId:other.id,name:otherResource.name},'REASSIGNED');
  check(Boolean(replacement?.id)&&(await db.calendarAllocation.count({where:{resourceId:otherResource.id,event:{referenceId:replacementTrip.id},status:'ACTIVE'}}))===1,'free automatic replacement retains the existing successful flow');

  const owner=await account(),centerInstructor=await account(),targetInstructor=await account(),centerStudent=await account();
  await db.roleAssignment.create({data:{accountId:owner.id,role:'DIVE_CENTER',status:'ACTIVE'}});
  const center=await db.organization.create({data:{displayName:'Availability center fixture',kind:'DIVE_CENTER',status:'ACTIVE',ownerId:owner.id,members:{create:[{accountId:owner.id,role:'OWNER',status:'ACTIVE'},{accountId:centerInstructor.id,role:'INSTRUCTOR',status:'ACTIVE'},{accountId:targetInstructor.id,role:'INSTRUCTOR',status:'ACTIVE'}]}}});
  let centerCourse=await enrollment(centerInstructor.id,centerStudent.id);
  centerCourse=await db.trainingEnrollment.update({where:{id:centerCourse.id},data:{centerOrganizationId:center.id},include:{record:true}});
  const centerSession=await schedule(centerCourse,40),centerResource=await resource(centerInstructor.id),targetResource=await resource(targetInstructor.id);
  await calendar.allocate(owner.id,(await trip(41)).id,[centerResource.id]);
  await calendar.allocate(owner.id,(await trip(40)).id,[targetResource.id]);
  const currentSession=await db.trainingSession.findUniqueOrThrow({where:{id:centerSession.id}});
  await conflict(()=>sessions.reschedule(owner.id,centerSession.id,{startsAt:time(41).startsAt.toISOString(),endsAt:time(41).endsAt.toISOString(),reason:'Conflict fixture',expectedUpdatedAt:currentSession.updatedAt.toISOString()}),'reschedule cannot move training into a trip allocation');
  check((await db.trainingSession.findUniqueOrThrow({where:{id:centerSession.id}})).startsAt.getTime()===time(40).startsAt.getTime(),'rejected reschedule retains original interval');
  const reassign={instructorAccountId:targetInstructor.id,expectedUpdatedAt:currentSession.updatedAt.toISOString(),reason:'Conflict fixture'};
  await conflict(()=>assignments.assignSession(owner.id,centerSession.id,reassign),'session reassignment cannot select trip-busy instructor');
  const currentCourse=await db.trainingEnrollment.findUniqueOrThrow({where:{id:centerCourse.id}});
  await conflict(()=>assignments.assignEnrollment(owner.id,centerCourse.id,{...reassign,expectedUpdatedAt:currentCourse.updatedAt.toISOString(),transferUpcomingSessions:true},true),'bulk instructor transfer cannot bypass calendar availability');
  check((await db.trainingEnrollment.findUniqueOrThrow({where:{id:centerCourse.id}})).instructorAccountId===centerInstructor.id,'rejected bulk transfer rolls back lead instructor');

  const liveTimes={startsAt:new Date(Date.now()-300000),endsAt:new Date(Date.now()+3600000)};
  const live=await db.trainingSession.create({data:{trainingRecordId:centerCourse.record.id,instructorAccountId:centerInstructor.id,status:'CHECK_IN_OPEN',...liveTimes,evidence:{instructorCheckInAt:new Date().toISOString(),studentCheckInAt:new Date().toISOString()}}});
  const historicalTrip=await db.trip.create({data:{title:'Legacy overlap fixture',type:'TEST',capacity:1,...liveTimes}});
  await db.calendarEvent.create({data:{type:'TRIP',referenceType:'TRIP',referenceId:historicalTrip.id,title:'Legacy overlap fixture',...liveTimes,allocations:{create:{resourceId:centerResource.id,...liveTimes}}}});
  await conflict(()=>sessions.act(owner.id,live.id,{action:'START',reason:'Conflict fixture',expectedUpdatedAt:live.updatedAt.toISOString()}),'starting a legacy conflicting session rechecks the calendar');
  check((await db.trainingSession.findUniqueOrThrow({where:{id:live.id}})).status==='CHECK_IN_OPEN','rejected start leaves lifecycle unchanged');

  const summerInstructor=await account(),summerResource=await resource(summerInstructor.id),summerStudent=await account();
  const summerTimes={startsAt:new Date('2036-07-01T06:00:00Z'),endsAt:new Date('2036-07-01T07:00:00Z')};
  const summerTrip=await db.trip.create({data:{title:'Summer timezone fixture',type:'TEST',capacity:1,...summerTimes}});
  await calendar.allocate(summerInstructor.id,summerTrip.id,[summerResource.id]);
  const summerAllocation=await db.calendarAllocation.findFirstOrThrow({where:{resourceId:summerResource.id}});
  check(summerAllocation.startsAt.getTime()===summerTimes.startsAt.getTime(),'summer/DST allocation stores the same UTC instant');
  const summerCourse=await enrollment(summerInstructor.id,summerStudent.id);
  await conflict(()=>schedule(summerCourse,0,{startsAt:'2036-07-01T02:00:00-04:00',endsAt:'2036-07-01T03:00:00-04:00'}),'explicit daylight-saving offset resolves to the same conflict');

  for(const state of ['DISABLED','REVIEW']){
   await db.$executeRaw`INSERT INTO "PolicyControl"("id","category","ruleKey","labelAr","state","createdAt","updatedAt") VALUES(${randomUUID()},'TRAINING','SCHEDULE_CONFLICT','Local availability fixture',${state},NOW(),NOW()) ON CONFLICT("category","ruleKey") DO UPDATE SET "state"=EXCLUDED."state"`;
   const policyInstructor=await account(),policyResource=await resource(policyInstructor.id),policyStudent=await account();
   const policyTrip=await trip(15);await calendar.allocate(policyInstructor.id,policyTrip.id,[policyResource.id]);
   await schedule(await enrollment(policyInstructor.id,policyStudent.id),15);
   await schedule(await enrollment(policyInstructor.id,policyStudent.id),16);
   await calendar.allocate(policyInstructor.id,(await trip(16)).id,[policyResource.id]);
   check(true,`existing ${state} training conflict policy remains non-enforcing in both directions`);
  }
  await db.$executeRaw`UPDATE "PolicyControl" SET "state"='ENABLED' WHERE "category"='TRAINING' AND "ruleKey"='SCHEDULE_CONFLICT'`;

  // Hold both transactions AFTER their real availability reads, forcing both to
  // observe no cross-domain reservation before either writes (not just a race in JS).
  const originalSerializable=db.serializable.bind(db);
  for(let round=0;round<3;round++){
   const raceInstructor=await account(),raceResource=await resource(raceInstructor.id),raceCourse=await enrollment(raceInstructor.id,(await account()).id),raceTrip=await trip(30+round);
   let arrivals=0,release;const gate=new Promise(resolve=>{release=resolve;});
   const timer=setTimeout(()=>release(),10000);
   const barrier=async()=>{arrivals++;if(arrivals===2)release();if(arrivals<=2)await gate;};
   db.serializable=work=>originalSerializable(tx=>work(new Proxy(tx,{get(target,key){
    const model=Reflect.get(target,key);
    if(!['calendarAllocation','trainingSession'].includes(key))return model;
    return new Proxy(model,{get(delegate,method){const fn=Reflect.get(delegate,method);if((key==='calendarAllocation'&&method==='findFirst')||(key==='trainingSession'&&method==='findMany'))return async args=>{const rows=await fn.call(delegate,args);await barrier();return rows;};return typeof fn==='function'?fn.bind(delegate):fn;}});
   }})));
   let outcomes;
   try{outcomes=await Promise.allSettled([schedule(raceCourse,30+round),calendar.allocate(raceInstructor.id,raceTrip.id,[raceResource.id])]);}finally{clearTimeout(timer);db.serializable=originalSerializable;}
   check(arrivals>=2,'both concurrent transactions reached their cross-domain reads');
   check(outcomes.filter(row=>row.status==='fulfilled').length===1&&outcomes.filter(row=>row.status==='rejected'&&row.reason?.getStatus?.()===409).length===1,'simultaneous trip/training writes have one winner and one conflict');
   const count=await db.trainingSession.count({where:{trainingRecordId:raceCourse.record.id}})+await db.calendarAllocation.count({where:{resourceId:raceResource.id,status:'ACTIVE'}});
   check(count===1,'concurrent loser leaves no second reservation');
  }
 console.log(`Calendar/training availability: ${checks} checks passed.`);
}finally{await db.$disconnect();}
