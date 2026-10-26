import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const url=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
if(process.env.CI!=='true'||process.env.NODE_ENV!=='test'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!url.pathname.endsWith('_availability_ci'))throw new Error('CI, NODE_ENV=test and isolated loopback *_availability_ci database required');
const require=createRequire(import.meta.url);
const {DatabaseService}=require('../dist/database/database.service.js');
const {AuditService}=require('../dist/audit/audit.service.js');
const {CalendarAllocationService}=require('../dist/trips/calendar-allocation.service.js');
const {CrewAssignmentService}=require('../dist/trips/crew-assignment.service.js');
const db=new DatabaseService(),audit=new AuditService(db),calendar=new CalendarAllocationService(db,audit);
// Qualification is orthogonal to conflict detection; fixture permits all active roles.
const crew=new CrewAssignmentService(db,{state:async()=> 'DISABLED'},audit);
let checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('PASS',label);};
const conflict=async(work,label)=>{await assert.rejects(work,error=>error?.getStatus?.()===409,label);checks++;console.log('PASS',label);};
const time=(hour=0)=>({startsAt:new Date(Date.UTC(2037,0,1,6+hour)),endsAt:new Date(Date.UTC(2037,0,1,7+hour))});
const account=()=>db.account.create({data:{email:`alias-${randomUUID()}@example.invalid`,passwordHash:'not-a-login',status:'ACTIVE',person:{create:{firstName:'Alias',lastName:'Fixture'}}}});
const resource=(referenceId,type='INSTRUCTOR')=>db.calendarResource.create({data:{type,name:'Alias fixture',referenceId}});
const trip=(hour=0)=>db.trip.create({data:{title:'Alias fixture',type:'TEST',capacity:1,status:'DRAFT',...time(hour)}});
try{
 const actor=await account(),instructor=await resource(actor.id),captain=await resource(actor.id,'CAPTAIN');
 const first=await trip(),second=await trip();
 await calendar.allocate(actor.id,first.id,[instructor.id]);
 await conflict(()=>calendar.allocate(actor.id,second.id,[captain.id]),'same account cannot occupy overlapping trips through distinct human-role resource IDs');
 check(await db.calendarEvent.count({where:{referenceType:'TRIP',referenceId:second.id}})===0,'alias rejection rolls back the second event');
 await conflict(()=>calendar.assertResourcesAvailable([captain.id],time().startsAt,time().endsAt),'advisory availability catches human aliases');
 await calendar.allocate(actor.id,first.id,[instructor.id,captain.id]);
 check((await calendar.tripAllocations(first.id)).length===2,'same trip may retain multiple roles for one account');
 await calendar.assertResourcesAvailable([captain.id],time().startsAt,time().endsAt,first.id);
 check(true,'explicit same-trip exclusion remains valid');
 const adjacent=await trip(1);await calendar.allocate(actor.id,adjacent.id,[captain.id]);
 check(true,'adjacent human-alias intervals remain available');
 const other=await account(),otherResource=await resource(other.id,'CAPTAIN');
 await calendar.allocate(actor.id,second.id,[otherResource.id]);
 check(true,'different accounts may overlap even when roles match');
 const equipmentA=await resource(actor.id,'EQUIPMENT'),equipmentB=await resource(actor.id,'EQUIPMENT');
 await calendar.allocate(actor.id,(await trip()).id,[equipmentA.id]);
 await calendar.allocate(actor.id,(await trip()).id,[equipmentB.id]);
 check(true,'distinct non-human assets are not conflated by referenceId');
 const currentPolicy=await db.policyControl.findUnique({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}}});
 for(const state of ['DISABLED','REVIEW']){
  await db.policyControl.upsert({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}},create:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT',labelAr:'Alias fixture',state},update:{state}});
  const blocked=await trip();await conflict(()=>calendar.allocate(actor.id,blocked.id,[captain.id]),`training ${state} does not disable trip-to-trip human conflicts`);
 }
 if(currentPolicy)await db.policyControl.update({where:{id:currentPolicy.id},data:{state:currentPolicy.state}});
 else await db.policyControl.delete({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}}});
 const old=await account(),oldResource=await resource(old.id),replacementTrip=await trip();
 await calendar.allocate(old.id,replacementTrip.id,[oldResource.id]);
 const assignment=await db.crewAssignment.create({data:{tripId:replacementTrip.id,resourceId:oldResource.id,accountId:old.id,roleType:'INSTRUCTOR',status:'PENDING'}});
 const eligible=await crew.eligibleResources(replacementTrip.id,oldResource.id,old.id);
 check(!eligible.rows.some(row=>row.referenceId===actor.id),'candidate selection excludes accounts reserved through another role');
 await conflict(()=>crew.replaceAssignment(assignment,{id:instructor.id,type:'INSTRUCTOR',referenceId:actor.id,name:instructor.name},'REASSIGNED'),'automatic replacement rechecks canonical account aliases inside transaction');
 check((await db.crewAssignment.findUniqueOrThrow({where:{id:assignment.id}})).status==='PENDING','alias conflict leaves original crew assignment unchanged');
 await calendar.allocate(actor.id,first.id,[]);
 const freed=await trip();await calendar.allocate(actor.id,freed.id,[captain.id]);
 check(true,'explicit release frees the account for another role');

 const originalSerializable=db.serializable.bind(db);
 for(let round=0;round<3;round++){
  const person=await account(),left=await resource(person.id),right=await resource(person.id,'CREW'),a=await trip(10+round),b=await trip(10+round);
  let arrivals=0,release;const gate=new Promise(resolve=>{release=resolve;});const timer=setTimeout(()=>release(),10000);
  db.serializable=work=>originalSerializable(tx=>work(new Proxy(tx,{get(target,key){const model=Reflect.get(target,key);if(key!=='calendarAllocation')return model;return new Proxy(model,{get(delegate,method){const fn=Reflect.get(delegate,method);if(method==='findFirst')return async args=>{const rows=await fn.call(delegate,args);arrivals++;if(arrivals===2)release();if(arrivals<=2)await gate;return rows;};return typeof fn==='function'?fn.bind(delegate):fn;}});}})));
  let results;try{results=await Promise.allSettled([calendar.allocate(person.id,a.id,[left.id]),calendar.allocate(person.id,b.id,[right.id])]);}finally{clearTimeout(timer);db.serializable=originalSerializable;}
  check(arrivals>=2,'both alias writers reached the real shared-account predicate read');
  check(results.filter(r=>r.status==='fulfilled').length===1&&results.filter(r=>r.status==='rejected'&&r.reason?.getStatus?.()===409).length===1,'simultaneous alias writes have exactly one winner');
  check(await db.calendarAllocation.count({where:{resourceId:{in:[left.id,right.id]},status:'ACTIVE'}})===1,'concurrent alias loser leaves no second active allocation');
  check(await db.auditEvent.count({where:{resourceId:{in:[a.id,b.id]},action:'TRIP_CALENDAR_RESOURCES_CHANGED'}})===1,'concurrent alias loser leaves no false audit');
 }
 console.log(`Calendar human aliases: ${checks} checks passed.`);
}finally{await db.$disconnect();}
