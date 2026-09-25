import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.BOOKING_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+1800})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`};
const auth=token=>({authorization:`Bearer ${token}`});
const json=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);return body};
const people=[],accounts=[];let trip=null,bookingId=null,calendarResourceId=null,calendarEventId=null;let previousWeather=null;
const makeAccount=async label=>{const person=await db.person.create({data:{firstName:'Booking',lastName:label}});people.push(person);const account=await db.account.create({data:{personId:person.id,email:`booking-${label.toLowerCase()}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);return{person,account}};

try{
  const adminPair=await makeAccount('Admin'),renterPair=await makeAccount('Renter'),otherPair=await makeAccount('Other');
  const admin=adminPair.account,renter=renterPair.account,other=otherPair.account;
  await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',scope:{}}});
  await db.credential.create({data:{personId:renterPair.person.id,issuer:'HYDROLAND E2E',title:'Open Water Diver',credentialNumber:`OW-${suffix}`,issuedAt:new Date(),verificationStatus:'VERIFIED'}});
  await db.diverProfile.create({data:{accountId:renter.id,medicalFitnessStatus:'FIT',medicalClearanceExpiresAt:new Date(Date.now()+30*86400000)}});
  const adminToken=tokenFor(admin.id),renterToken=tokenFor(renter.id),otherToken=tokenFor(other.id);

  previousWeather=await db.operationalSetting.findUnique({where:{key:'WEATHER_GATE'}});
  await db.operationalSetting.upsert({where:{key:'WEATHER_GATE'},create:{key:'WEATHER_GATE',value:{enabled:true,mode:'ENFORCE',provider:'E2E'}},update:{value:{enabled:true,mode:'ENFORCE',provider:'E2E'}}});

  trip=await db.trip.create({data:{title:`Booking Runtime E2E ${suffix}`,type:'SHORE_DIVE',startsAt:new Date(Date.now()+2*86400000),endsAt:new Date(Date.now()+2*86400000+3*3600000),capacity:2,status:'OPEN'}});
  const safety=await db.safetyChecklist.create({data:{tripId:trip.id,decision:'ALLOWED',items:{weather:{provider:'E2E',decision:'DEFERRED',reason:'Weather blocks booking runtime test'}},decidedAt:new Date()}});

  let response=await fetch(`${base}/trips/admin/calendar/resources`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({type:'SITE',name:`Booking E2E Site ${suffix}`})});
  const calendarResource=await json(response);calendarResourceId=calendarResource.id;
  if(!calendarResourceId||calendarResource.type!=='SITE'||calendarResource.active!==true)throw new Error('Calendar resource creation mismatch');

  response=await fetch(`${base}/trips/admin/calendar/${trip.id}/allocations`,{method:'POST',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({resourceIds:[calendarResourceId]})});
  const allocations=await json(response);
  if(!Array.isArray(allocations)||allocations.length!==1||allocations[0].tripId!==trip.id||allocations[0].resourceId!==calendarResourceId)throw new Error('Trip calendar allocation response mismatch');
  const event=await db.calendarEvent.findUnique({where:{referenceType_referenceId:{referenceType:'TRIP',referenceId:trip.id}}});calendarEventId=event?.id||null;
  if(!event||event.status!=='ACTIVE'||event.title!==trip.title)throw new Error('Trip CalendarEvent was not persisted from allocation workflow');
  const persistedAllocation=await db.calendarAllocation.findFirst({where:{eventId:event.id,resourceId:calendarResourceId,status:'ACTIVE'}});
  if(!persistedAllocation)throw new Error('CalendarAllocation was not persisted through CalendarEvent');

  response=await fetch(`${base}/trips/admin/calendar/resources/${calendarResourceId}/status`,{method:'PATCH',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({active:false})});
  if(response.status!==409)throw new Error(`Disabling actively allocated resource expected 409, got ${response.status}`);

  response=await fetch(`${base}/trips/${trip.id}/bookings`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({seats:2})});
  if(response.status!==401)throw new Error(`Anonymous booking expected 401, got ${response.status}`);

  response=await fetch(`${base}/trips/${trip.id}/bookings`,{method:'POST',headers:{...auth(renterToken),'content-type':'application/json'},body:JSON.stringify({seats:2})});
  if(response.status!==409)throw new Error(`Weather-blocked booking expected 409, got ${response.status}`);
  const blockedCount=await db.booking.count({where:{tripId:trip.id}});if(blockedCount!==0)throw new Error('Weather-blocked booking mutated persistence');

  await db.safetyChecklist.update({where:{id:safety.id},data:{items:{weather:{provider:'E2E',decision:'ALLOWED',reason:'Weather cleared'}},decidedAt:new Date()}});
  response=await fetch(`${base}/trips/${trip.id}/bookings`,{method:'POST',headers:{...auth(renterToken),'content-type':'application/json'},body:JSON.stringify({seats:2})});
  const booking=await json(response);bookingId=booking.id;
  if(booking.status!=='PENDING'||booking.seats!==2||booking.participants?.length!==2)throw new Error('Two-seat booking did not create pending booking and two participants');
  const primary=booking.participants.find(row=>row.accountId===renter.id),companion=booking.participants.find(row=>row.accountId===null);
  if(primary?.eligibilityStatus!=='ELIGIBLE'||companion?.eligibilityStatus!=='PENDING')throw new Error('Participant eligibility initialization mismatch');

  response=await fetch(`${base}/trips/${trip.id}/bookings`,{method:'POST',headers:{...auth(otherToken),'content-type':'application/json'},body:JSON.stringify({seats:1})});
  if(response.status!==409)throw new Error(`Capacity overflow expected 409, got ${response.status}`);

  response=await fetch(`${base}/trips/bookings/mine`,{headers:auth(renterToken)});const mine=await json(response);
  if(!mine.some(row=>row.id===bookingId&&row.seats===2))throw new Error('Owner cannot read own two-seat booking');
  response=await fetch(`${base}/trips/bookings/${bookingId}/cancel`,{method:'PATCH',headers:auth(otherToken)});
  if(response.status!==404)throw new Error(`Cross-user action cancellation expected 404, got ${response.status}`);

  response=await fetch(`${base}/trips/admin/${trip.id}/bookings/${bookingId}/confirm`,{method:'PATCH',headers:auth(adminToken)});
  if(response.status!==409)throw new Error(`Incomplete participant eligibility expected 409, got ${response.status}`);
  if((await db.booking.findUniqueOrThrow({where:{id:bookingId}})).status!=='PENDING')throw new Error('Failed eligibility confirmation mutated booking');

  response=await fetch(`${base}/trips/admin/${trip.id}/bookings/${bookingId}/participants/${companion.id}/eligibility`,{method:'PATCH',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({status:'ELIGIBLE'})});
  await json(response);

  await db.safetyChecklist.update({where:{id:safety.id},data:{items:{weather:{provider:'E2E',decision:'DEFERRED',reason:'Weather changed before confirmation'}},decidedAt:new Date()}});
  response=await fetch(`${base}/trips/admin/${trip.id}/bookings/${bookingId}/confirm`,{method:'PATCH',headers:auth(adminToken)});
  if(response.status!==409)throw new Error(`Weather recheck before confirmation expected 409, got ${response.status}`);
  if((await db.booking.findUniqueOrThrow({where:{id:bookingId}})).status!=='PENDING')throw new Error('Weather-blocked confirmation mutated booking');

  await db.safetyChecklist.update({where:{id:safety.id},data:{items:{weather:{provider:'E2E',decision:'ALLOWED',reason:'Weather cleared before confirmation'}},decidedAt:new Date()}});
  response=await fetch(`${base}/trips/admin/${trip.id}/bookings/${bookingId}/confirm`,{method:'PATCH',headers:auth(adminToken)});const confirmed=await json(response);
  if(confirmed.status!=='CONFIRMED'||confirmed.policyReview?.states?.weather!=='ENABLED')throw new Error('Admin confirmation did not persist confirmed state with weather policy evidence');

  response=await fetch(`${base}/trips/bookings/${bookingId}/cancel`,{method:'PATCH',headers:auth(renterToken)});const cancelled=await json(response);
  if(cancelled.status!=='CANCELLED')throw new Error('Owner action cancellation route did not cancel booking');
  const persisted=await db.booking.findUniqueOrThrow({where:{id:bookingId}});if(persisted.status!=='CANCELLED'||persisted.seats!==2)throw new Error('Final booking cancellation persistence mismatch');

  response=await fetch(`${base}/trips/admin/${trip.id}/status`,{method:'PATCH',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({status:'CANCELLED'})});
  const cancelledTrip=await json(response);if(cancelledTrip.status!=='CANCELLED')throw new Error('Admin trip cancellation did not persist CANCELLED status');
  const releasedEvent=await db.calendarEvent.findUnique({where:{id:event.id}}),releasedAllocation=await db.calendarAllocation.findUnique({where:{id:persistedAllocation.id}});
  if(releasedEvent?.status!=='INACTIVE'||releasedAllocation?.status!=='INACTIVE')throw new Error('Trip cancellation did not release CalendarEvent and CalendarAllocation');

  response=await fetch(`${base}/trips/admin/calendar/resources/${calendarResourceId}/status`,{method:'PATCH',headers:{...auth(adminToken),'content-type':'application/json'},body:JSON.stringify({active:false})});
  const disabledResource=await json(response);if(disabledResource.active!==false)throw new Error('Released calendar resource could not be disabled after trip cancellation');

  console.log('Booking HTTP/DB E2E passed: calendar event allocation/release, resource protection, auth, weather booking gate, multi-seat participants, capacity, ownership, participant eligibility, weather recheck on confirmation and self-cancel persistence.');
} finally {
  const personIds=people.map(row=>row.id),accountIds=accounts.map(row=>row.id);
  if(personIds.length)await db.auditEvent.deleteMany({where:{actorId:{in:personIds}}}).catch(()=>{});
  const resourceIds=[trip?.id,bookingId,calendarResourceId].filter(Boolean);
  if(resourceIds.length)await db.auditEvent.deleteMany({where:{resourceId:{in:resourceIds}}}).catch(()=>{});
  if(accountIds.length)await db.notification.deleteMany({where:{accountId:{in:accountIds}}}).catch(()=>{});
  if(trip){await db.crewAssignment.deleteMany({where:{tripId:trip.id}}).catch(()=>{});await db.bookingParticipant.deleteMany({where:{booking:{tripId:trip.id}}}).catch(()=>{});await db.payment.deleteMany({where:{booking:{tripId:trip.id}}}).catch(()=>{});await db.booking.deleteMany({where:{tripId:trip.id}}).catch(()=>{});await db.safetyChecklist.deleteMany({where:{tripId:trip.id}}).catch(()=>{});}
  if(calendarEventId)await db.calendarAllocation.deleteMany({where:{eventId:calendarEventId}}).catch(()=>{});
  if(calendarEventId)await db.calendarEvent.delete({where:{id:calendarEventId}}).catch(()=>{});
  if(calendarResourceId)await db.calendarResource.delete({where:{id:calendarResourceId}}).catch(()=>{});
  if(trip)await db.trip.delete({where:{id:trip.id}}).catch(()=>{});
  if(previousWeather)await db.operationalSetting.update({where:{key:'WEATHER_GATE'},data:{value:previousWeather.value}}).catch(()=>{});else await db.operationalSetting.delete({where:{key:'WEATHER_GATE'}}).catch(()=>{});
  for(const account of accounts.reverse()){await db.diverProfile.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{});}
  for(const person of people.reverse()){await db.credential.deleteMany({where:{personId:person.id}}).catch(()=>{});await db.person.delete({where:{id:person.id}}).catch(()=>{});}
  await db.$disconnect();
}
