import {PrismaClient} from '@prisma/client';
import {createHmac} from 'node:crypto';

const db=new PrismaClient();
const base=process.env.SAFETY_CHECKLIST_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,iat:now,exp:now+900});return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
const headers=token=>({authorization:'Bearer '+token,'content-type':'application/json'});
const expectOk=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error('HTTP '+response.status+': '+JSON.stringify(body));return body};
const people=[],accounts=[];let adminRole=null,reviewerRole=null,trip=null;
try{
 for(const name of ['admin','reviewer','user']){const person=await db.person.create({data:{firstName:name,lastName:'SafetyChecklistE2E'}});people.push(person);const account=await db.account.create({data:{personId:person.id,email:'safety-checklist-'+name+'-'+suffix+'@example.invalid',passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);}
 const admin=accounts[0],reviewer=accounts[1],user=accounts[2];
 adminRole=await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'SAFETY_CHECKLIST_E2E'}}});
 reviewerRole=await db.roleAssignment.create({data:{accountId:reviewer.id,role:'REVIEWER',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'SAFETY_CHECKLIST_E2E'}}});
 trip=await db.trip.create({data:{title:'Safety Checklist E2E',type:'BOAT',startsAt:new Date('2030-01-01T08:00:00.000Z'),endsAt:new Date('2030-01-01T12:00:00.000Z'),capacity:8,status:'OPEN'}});
 const adminToken=tokenFor(admin.id),reviewerToken=tokenFor(reviewer.id),userToken=tokenFor(user.id);
 const items={diver_credentials:true,equipment_ready:true,oxygen_first_aid:true,boat_fuel:true,weather_review:true,emergency_plan:true};
 let response=await fetch(base+'/trips/'+trip.id+'/safety',{method:'POST',headers:headers(userToken),body:JSON.stringify({items})});if(response.status!==403)throw new Error('Non-admin safety assessment expected 403, got '+response.status);
 response=await fetch(base+'/trips/'+trip.id+'/safety/history',{headers:headers(userToken)});if(response.status!==403)throw new Error('Non-reviewer history expected 403, got '+response.status);
 const submitted=await expectOk(await fetch(base+'/trips/'+trip.id+'/safety',{method:'POST',headers:headers(adminToken),body:JSON.stringify({items,notes:'All core checks completed'})}));if(submitted.decision!=='REVIEW_REQUIRED')throw new Error('All-passed assessment must await review');
 const history=await expectOk(await fetch(base+'/trips/'+trip.id+'/safety/history',{headers:headers(reviewerToken)}));if(!Array.isArray(history)||history[0]?.id!==submitted.id||history[0]?.items?.boat_fuel!==true)throw new Error('Reviewer history did not persist checklist items');
 const allowed=await expectOk(await fetch(base+'/trips/'+trip.id+'/safety/checklists/'+submitted.id+'/decision',{method:'PATCH',headers:headers(reviewerToken),body:JSON.stringify({decision:'ALLOWED',notes:'Approved after review'})}));if(allowed.decision!=='ALLOWED'||!allowed.decidedAt||allowed.notes!=='Approved after review')throw new Error('Reviewer allowed decision did not persist');
 const failedItems={...items,weather_review:false};
 const deferred=await expectOk(await fetch(base+'/trips/'+trip.id+'/safety',{method:'POST',headers:headers(adminToken),body:JSON.stringify({items:failedItems,notes:'Weather check failed'})}));if(deferred.decision!=='DEFERRED')throw new Error('Failed checklist item must defer operating decision');
 response=await fetch(base+'/trips/'+trip.id+'/safety/checklists/'+deferred.id+'/decision',{method:'PATCH',headers:headers(reviewerToken),body:JSON.stringify({decision:'INVALID'})});if(response.status!==400)throw new Error('Invalid safety decision expected 400, got '+response.status);
 console.log('Safety checklist HTTP/DB E2E passed: admin assessment, reviewer-only history and decision, persisted checklist evidence and failed-item defer.');
}finally{
 if(trip){await db.safetyChecklist.deleteMany({where:{tripId:trip.id}}).catch(()=>{});await db.trip.deleteMany({where:{id:trip.id}}).catch(()=>{});}
 if(adminRole)await db.roleAssignment.deleteMany({where:{id:adminRole.id}}).catch(()=>{});if(reviewerRole)await db.roleAssignment.deleteMany({where:{id:reviewerRole.id}}).catch(()=>{});
 for(const account of accounts){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.deleteMany({where:{id:account.id}}).catch(()=>{});}for(const person of people)await db.person.deleteMany({where:{id:person.id}}).catch(()=>{});await db.$disconnect();
}