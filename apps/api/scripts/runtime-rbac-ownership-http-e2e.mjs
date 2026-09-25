import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.RBAC_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const auth=t=>({authorization:`Bearer ${t}`});
let trip,userA,userB,admin,people=[];
try{
  const mk=async(label)=>{const p=await db.person.create({data:{firstName:'RBAC',lastName:label}});people.push(p);return db.account.create({data:{personId:p.id,email:`rbac-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}})};
  userA=await mk('UserA'); userB=await mk('UserB'); admin=await mk('Admin');
  await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',scope:{}}});
  const ta=tokenFor(userA.id),tb=tokenFor(userB.id),tadmin=tokenFor(admin.id);

  let r=await fetch(base+'/admin/overview'); if(r.status!==401)throw new Error('Anonymous admin route expected 401, got '+r.status);
  r=await fetch(base+'/admin/overview',{headers:auth(ta)}); if(r.status!==403)throw new Error('Normal user admin route expected 403, got '+r.status);
  r=await fetch(base+'/admin/overview',{headers:auth(tadmin)}); if(!r.ok)throw new Error('Admin route rejected active ADMIN: '+r.status+' '+await r.text());
  await db.roleAssignment.update({where:{accountId_role:{accountId:admin.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
  r=await fetch(base+'/admin/overview',{headers:auth(tadmin)}); if(r.status!==403)throw new Error('Same-session revoked ADMIN expected 403, got '+r.status);
  await db.roleAssignment.update({where:{accountId_role:{accountId:admin.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
  r=await fetch(base+'/admin/overview',{headers:auth(tadmin)}); if(!r.ok)throw new Error('Reactivated ADMIN route failed: '+r.status+' '+await r.text());

  trip=await db.trip.create({data:{title:'RBAC ownership E2E '+suffix,type:'BOAT_DIVE',startsAt:new Date(Date.now()+86400000),endsAt:new Date(Date.now()+90000000),capacity:4,status:'OPEN'}});
  const booking=await db.booking.create({data:{tripId:trip.id,accountId:userA.id,seats:1,status:'PENDING'}});
  const participant=await db.bookingParticipant.create({data:{bookingId:booking.id,accountId:userA.id,fullName:'Owner Participant',eligibilityStatus:'PENDING'}});

  r=await fetch(base+'/trips/bookings/'+booking.id+'/participants',{headers:auth(tb)}); if(r.status!==404)throw new Error('Cross-user participant read expected 404, got '+r.status);
  r=await fetch(base+'/trips/bookings/'+booking.id+'/participants/'+participant.id,{method:'PATCH',headers:{...auth(tb),'content-type':'application/json'},body:JSON.stringify({fullName:'Unauthorized Change'})}); if(r.status!==404)throw new Error('Cross-user participant update expected 404, got '+r.status);
  r=await fetch(base+'/trips/bookings/'+booking.id,{method:'DELETE',headers:auth(tb)}); if(r.status!==404)throw new Error('Cross-user cancellation expected 404, got '+r.status);
  const unchanged=await db.booking.findUniqueOrThrow({where:{id:booking.id}}); if(unchanged.status!=='PENDING')throw new Error('Denied cross-user cancellation mutated booking');
  const unchangedP=await db.bookingParticipant.findUniqueOrThrow({where:{id:participant.id}}); if(unchangedP.fullName!=='Owner Participant')throw new Error('Denied cross-user participant update mutated data');

  r=await fetch(base+'/trips/bookings/'+booking.id+'/participants',{headers:auth(ta)}); if(!r.ok)throw new Error('Owner participant read failed '+r.status+' '+await r.text());
  r=await fetch(base+'/trips/bookings/'+booking.id+'/participants/'+participant.id,{method:'PATCH',headers:{...auth(ta),'content-type':'application/json'},body:JSON.stringify({fullName:'Owner Updated'})}); if(!r.ok)throw new Error('Owner participant update failed '+r.status+' '+await r.text());
  r=await fetch(base+'/trips/bookings/'+booking.id,{method:'DELETE',headers:auth(ta)}); if(!r.ok)throw new Error('Owner cancellation failed '+r.status+' '+await r.text());
  const cancelled=await db.booking.findUniqueOrThrow({where:{id:booking.id}}); if(cancelled.status!=='CANCELLED')throw new Error('Owner cancellation not persisted');
  console.log('Runtime RBAC/ownership E2E passed: admin isolation, same-session role revocation/reactivation, cross-user read/update/cancel denial, owner success.');
} finally {
  if(trip){await db.auditEvent.deleteMany({where:{resourceId:{in:(await db.bookingParticipant.findMany({where:{booking:{tripId:trip.id}},select:{id:true}})).map(x=>x.id)}}});await db.bookingParticipant.deleteMany({where:{booking:{tripId:trip.id}}});await db.auditEvent.deleteMany({where:{resource:'Booking',metadata:{path:['tripId'],equals:trip.id}}}).catch(()=>{});await db.booking.deleteMany({where:{tripId:trip.id}});await db.trip.delete({where:{id:trip.id}}).catch(()=>{});}
  for(const a of [admin,userB,userA].filter(Boolean)){await db.roleAssignment.deleteMany({where:{accountId:a.id}});await db.session.deleteMany({where:{accountId:a.id}});await db.account.delete({where:{id:a.id}}).catch(()=>{});}
  for(const p of people.reverse())await db.person.delete({where:{id:p.id}}).catch(()=>{});
  await db.$disconnect();
}