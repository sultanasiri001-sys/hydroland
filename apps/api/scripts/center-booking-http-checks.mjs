import {randomUUID} from 'node:crypto';

// Invoked only by the parent harness after its CI + loopback API/database guards.
export async function checkCenterBookings(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check){
 const trips=[],bookingIds=[],resources=[],events=[],tag='BookingManagerCI-'+randomUUID();
 const weatherBefore=await db.operationalSetting.findUnique({where:{key:'WEATHER_GATE'}});
 const policyBefore=await db.$queryRaw`SELECT * FROM "PolicyControl" WHERE "category"='BOOKING' AND "ruleKey"='PARTICIPANT_ELIGIBILITY'`;
 const call=async(token,path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json().catch(()=>null)}};
 const path=id=>'/center/me/bookings'+(id?'/'+id:'');
 const preview=async id=>{const r=await call(ta,path(id));check(r.status===200,'Booking preview succeeds: '+JSON.stringify(r));return r.body};
 const command=(p,action='CONFIRM',extra={})=>({action,requestId:randomUUID(),expectedState:p.stateToken,...(action==='CANCEL'?{reason:'إلغاء تشغيلي موثق في اختبار معزول',financialAcknowledged:true}:{}),...extra});
 const apply=(id,body,token=ta)=>call(token,path(id)+'/actions','POST',body);
 const makeTrip=async(org=a.org.id,capacity=3)=>{const t=await db.trip.create({data:{organizationId:org,title:tag,type:'SHORE',status:'OPEN',capacity,startsAt:new Date(Date.now()+86400000),endsAt:new Date(Date.now()+90000000)}});trips.push(t.id);await db.operationalSetting.create({data:{key:'trip-price:'+t.id,value:{pricePerSeatMinor:1000,currency:'SAR'}}});await db.safetyChecklist.create({data:{tripId:t.id,decision:'ALLOWED',items:{},decidedAt:new Date()}});return t};
 const makeBooking=async(trip,account,status='PENDING',seats=1)=>{const row=await db.booking.create({data:{tripId:trip.id,accountId:account.id,status,seats}});bookingIds.push(row.id);for(let n=0;n<seats;n++)await db.bookingParticipant.create({data:{bookingId:row.id,fullName:'مشارك حجز '+n,eligibilityStatus:'ELIGIBLE',identitySnapshot:{private:'SECRET_IDENTITY'},emergencySnapshot:{private:'SECRET_EMERGENCY'}}});return row};
 const pay=booking=>db.payment.create({data:{bookingId:booking.id,accountId:booking.accountId,status:'CAPTURED',amountMinor:booking.seats*1000,currency:'SAR',idempotencyKey:randomUUID(),providerReference:randomUUID()}});
 try{
  await db.operationalSetting.upsert({where:{key:'WEATHER_GATE'},create:{key:'WEATHER_GATE',value:{enabled:false}},update:{value:{enabled:false}}});
  const customer=await personAccount('booking-manager-customer'),other=await personAccount('booking-manager-other'),admin=await personAccount('booking-manager-admin');
  await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE'}});const adminToken=await tokenFor(admin.id),customerToken=await tokenFor(customer.id);
  const trip=await makeTrip(),foreignTrip=await makeTrip(b.org.id),booking=await makeBooking(trip,customer),foreign=await makeBooking(foreignTrip,other);
  let p=await preview(booking.id),c=command(p);
  check(p.blockers.includes('PAYMENT_REQUIRED')&&!p.actions.includes('CONFIRM')&&p.actions.includes('CANCEL'),'Unpaid booking exposes reason and cannot confirm');
  check((await apply(booking.id,c)).status===409,'Payment enforced inside shared mutation');
  check((await call(adminToken,'/trips/admin/'+trip.id+'/bookings/'+booking.id+'/confirm','PATCH')).status===409,'Admin also requires payment');
  const payment=await pay(booking),invoice=await db.invoice.create({data:{paymentId:payment.id,status:'PAID',number:'BOOKING-'+randomUUID()}});
  p=await preview(booking.id);c=command(p);
  check(p.actions.includes('CONFIRM')&&p.paymentSatisfied&&p.requiredAmountMinor===1000,'Captured amount unlocks eligible booking');
  const safe=JSON.stringify(p);for(const secret of ['SECRET_IDENTITY','SECRET_EMERGENCY',payment.providerReference,'accountId','providerReference','email'])check(!safe.includes(secret),'Private booking data excluded: '+secret);
  for(const [token,status] of [[null,401],[tb,404],[ts,403]]){check((await call(token,path(booking.id))).status===status,'Scoped detail authorization');check((await apply(booking.id,c,token)).status===status,'Scoped mutation authorization');}
  check((await call(ta,path(foreign.id))).status===404,'Foreign booking inaccessible');check((await call(ta,path()+'?tripId='+foreignTrip.id)).status===404,'Foreign trip filter inaccessible');
  check((await call(ts,path())).status===403,'Staff cannot list customer identities');check((await call(null,path())).status===401,'Anonymous directory rejected');
  for(const role of ['DRAFT','PENDING_REVIEW','REJECTED','SUSPENDED','ARCHIVED']){
   await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:role}});
   for(const result of [await call(ta,path()),await call(ta,path(booking.id)),await apply(booking.id,c)])check(result.status===403,'Exact active role required for '+role);
  }
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'SUSPENDED'}});check((await apply(booking.id,c)).status===403,'Membership revocation wins over existing preview');await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});
  await db.organization.update({where:{id:a.org.id},data:{status:'SUSPENDED'}});check((await call(ta,path())).status===403,'Suspended center directory denied');await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});
  for(const extra of [{action:'ELIGIBLE'},{organizationId:b.org.id},{requestId:'wrong'},{expectedState:'old'},{financialAcknowledged:'true'},{reason:[]}])check((await apply(booking.id,{...c,...extra})).status===400,'Reject invalid mutation field '+Object.keys(extra)[0]);
  check((await apply(booking.id,command(p,'CANCEL',{reason:'x'}))).status===400,'Cancellation reason required');check((await apply(booking.id,command(p,'CANCEL',{financialAcknowledged:false}))).status===400,'Cancellation financial follow-up acknowledged');
  for(const query of ['page=0','page=1.5','pageSize=51','page=100001','status=WRONG','q='+('x'.repeat(121)),'organizationId='+b.org.id,'q[]=x'])check((await call(ta,path()+'?'+query)).status===400,'Reject invalid directory query '+query.slice(0,25));
  let list=await call(ta,path()+'?q='+tag+'&pageSize=1');check(list.status===200&&list.body.total===1&&list.body.items[0].id===booking.id,'Directory scopes before search and pagination');
  check((await call(ta,path()+'?q='+encodeURIComponent(customer.email))).body.total===0,'Directory does not search private emails');
  check((await call(ta,path()+'?q=%25')).body.total===0,'Search treats wildcard literally');
  await db.payment.update({where:{id:payment.id},data:{status:'REFUNDED'}});check((await apply(booking.id,c)).status===409,'Changed payment invalidates saved preview');p=await preview(booking.id);check(p.blockers.includes('PAYMENT_REQUIRED'),'Refunded payment does not satisfy payment gate');await db.payment.update({where:{id:payment.id},data:{status:'CAPTURED'}});
  const participant=await db.bookingParticipant.findFirst({where:{bookingId:booking.id}});p=await preview(booking.id);c=command(p);await db.bookingParticipant.update({where:{id:participant.id},data:{eligibilityStatus:'PENDING'}});check((await apply(booking.id,c)).status===409,'Participant changes invalidate confirmation preview');p=await preview(booking.id);check(p.blockers.includes('PARTICIPANT_ELIGIBILITY_PENDING'),'Unreviewed participants block confirmation');
  await db.$executeRaw`INSERT INTO "PolicyControl"("id","category","ruleKey","labelAr","state","createdAt","updatedAt") VALUES(${randomUUID()},'BOOKING','PARTICIPANT_ELIGIBILITY','CI participant','REVIEW',NOW(),NOW()) ON CONFLICT("category","ruleKey") DO UPDATE SET "state"='REVIEW',"updatedAt"=NOW()`;
  p=await preview(booking.id);check(p.actions.includes('CONFIRM')&&p.policyReview.required,'Review policy exposes explicit review issues');check((await apply(booking.id,command(p))).status===409,'Review issues need acknowledgment');
  await db.$executeRaw`UPDATE "PolicyControl" SET "state"='ENABLED',"updatedAt"=NOW() WHERE "category"='BOOKING' AND "ruleKey"='PARTICIPANT_ELIGIBILITY'`;
  check((await apply(booking.id,command(p,'CONFIRM',{policyReviewAcknowledged:true}))).status===409,'Changed policy cannot reuse a looser preview');await db.bookingParticipant.update({where:{id:participant.id},data:{eligibilityStatus:'ELIGIBLE'}});
  await db.safetyChecklist.updateMany({where:{tripId:trip.id},data:{decision:'DEFERRED'}});p=await preview(booking.id);check(p.blockers.includes('SAFETY_APPROVAL'),'Safety rejection blocks confirmation');await db.safetyChecklist.updateMany({where:{tripId:trip.id},data:{decision:'ALLOWED'}});
  await db.operationalSetting.update({where:{key:'WEATHER_GATE'},data:{value:{enabled:true,mode:'ENFORCE'}}});p=await preview(booking.id);check(p.blockers.includes('WEATHER_GATE'),'Unapproved weather blocks confirmation');check((await apply(booking.id,command(p))).status===409,'Weather gate cannot be skipped by center');await db.operationalSetting.update({where:{key:'WEATHER_GATE'},data:{value:{enabled:false}}});
  await db.roleAssignment.create({data:{accountId:other.id,role:'STAFF',status:'ACTIVE'}});
  const resource=await db.calendarResource.create({data:{type:'CREW',referenceId:other.id,name:'Booking crew'}});resources.push(resource.id);const event=await db.calendarEvent.create({data:{organizationId:a.org.id,type:'TRIP',referenceType:'TRIP',referenceId:trip.id,title:'Booking crew',startsAt:trip.startsAt,endsAt:trip.endsAt}});events.push(event.id);await db.calendarAllocation.create({data:{eventId:event.id,resourceId:resource.id,startsAt:trip.startsAt,endsAt:trip.endsAt}});
  p=await preview(booking.id);c=command(p);
  if(!/^[a-f0-9-]{36}$/.test(booking.id))throw new Error('Invalid CI fixture ID');
  await db.$executeRawUnsafe(`ALTER TABLE "Notification" ADD CONSTRAINT booking_ci_notice_failure CHECK (("payload"->>'bookingId') IS DISTINCT FROM '${booking.id}') NOT VALID`);
  try{
   check((await apply(booking.id,c)).status===500,'Simulated notification persistence failure aborts confirmation');
   check((await db.booking.findUnique({where:{id:booking.id}})).status==='PENDING','Notification failure rolls back booking state');
   check(await db.crewAssignment.count({where:{tripId:trip.id}})===0&&await db.auditEvent.count({where:{resource:'Booking',resourceId:booking.id,action:'BOOKING_CONFIRMED'}})===0,'Notification failure rolls back crew assignment and audit');
  }finally{await db.$executeRawUnsafe('ALTER TABLE "Notification" DROP CONSTRAINT booking_ci_notice_failure');}
  const results=await Promise.all([apply(booking.id,c),apply(booking.id,c)]);check(results.every(r=>r.status===201),'Concurrent identical confirmation replays safely: '+JSON.stringify(results));
  check((await apply(booking.id,c)).body.alreadyApplied===true,'Retry after lost response is idempotent');
  check((await apply(booking.id,{...c,reason:'Changed request meaning'})).status===409,'Request ID cannot change meaning');
  check(await db.auditEvent.count({where:{resource:'Booking',resourceId:booking.id,action:'BOOKING_CONFIRMED'}})===1,'Confirmation audit once');
  check(await db.notification.count({where:{type:'BOOKING_CONFIRMED',payload:{path:['bookingId'],equals:booking.id}}})===1,'Customer confirmation notice once');
  check(await db.crewAssignment.count({where:{tripId:trip.id,resourceId:resource.id}})===1,'Crew assignment saved in confirmation transaction');
  check(await db.notification.count({where:{type:'TRIP_CREW_ASSIGNMENT',payload:{path:['bookingId'],equals:booking.id}}})===1,'Crew notice once');
  check((await db.booking.findUnique({where:{id:booking.id}})).status==='CONFIRMED','Confirmed state persisted');
  p=await preview(booking.id);check(!p.actions.includes('CONFIRM')&&p.actions.includes('CANCEL'),'Confirmed booking exposes cancellation only');
  let cancel=command(p,'CANCEL');const cancelResult=await apply(booking.id,cancel);check(cancelResult.status===201&&cancelResult.body.financialActionExecuted===false,'Center cancellation saved without refund');check((await apply(booking.id,cancel)).body.alreadyApplied===true,'Cancellation retry replays');
  check((await db.payment.findUnique({where:{id:payment.id}})).status==='CAPTURED'&&(await db.invoice.findUnique({where:{id:invoice.id}})).status==='PAID','Cancellation preserves payment/invoice state');check(await db.bookingParticipant.count({where:{bookingId:booking.id}})===1,'Participant history retained');
  check(await db.auditEvent.count({where:{resource:'Booking',resourceId:booking.id,action:'BOOKING_CANCELLED'}})===1,'Cancellation audit once');check((await preview(booking.id)).actions.length===0,'Cancelled booking has no actions');
  const raceTrip=await makeTrip(a.org.id,1),r1=await makeBooking(raceTrip,customer),r2=await makeBooking(raceTrip,other);await pay(r1);await pay(r2);const c1=command(await preview(r1.id)),c2=command(await preview(r2.id));const race=await Promise.all([apply(r1.id,c1),apply(r2.id,c2)]);check(race.filter(r=>r.status===201).length===1&&race.filter(r=>r.status===409).length===1,'Concurrent confirmations cannot exceed trip capacity');check(await db.booking.count({where:{tripId:raceTrip.id,status:'CONFIRMED'}})===1,'Capacity race commits only one booking');
  const terminal=await makeTrip(),last=await makeBooking(terminal,customer);await pay(last);await db.trip.update({where:{id:terminal.id},data:{status:'COMPLETED'}});p=await preview(last.id);check(p.actions.length===0,'Completed trip blocks booking mutations');check((await apply(last.id,command(p,'CANCEL'))).status===409,'Cannot cancel completed-trip booking');
  await db.trip.update({where:{id:terminal.id},data:{status:'OPEN',startsAt:new Date(Date.now()-3600000)}});check((await preview(last.id)).actions.length===0,'Started trip blocks individual mutation');
  const free=await makeTrip(),freeBooking=await makeBooking(free,customer);await db.operationalSetting.update({where:{key:'trip-price:'+free.id},data:{value:{pricePerSeatMinor:0,currency:'SAR'}}});const adminConfirm=await call(adminToken,'/trips/admin/'+free.id+'/bookings/'+freeBooking.id+'/confirm','PATCH');check(adminConfirm.status===200&&adminConfirm.body.status==='CONFIRMED','Legacy admin confirms explicit free price through shared service');
  const selfCancel=await call(customerToken,'/trips/bookings/'+freeBooking.id+'/cancel','PATCH');check(selfCancel.status===200&&selfCancel.body.status==='CANCELLED','Owner cancellation uses shared transaction');check((await call(tb,'/trips/bookings/'+freeBooking.id+'/cancel','PATCH')).status===404,'Owner cancellation remains private');
  list=await call(ta,path()+'?q='+tag+'&pageSize=1');check(list.body.total===5&&list.body.totalPages===5&&list.body.items.length===1,'All booking states counted before pagination');const lastPage=await call(ta,path()+'?q='+tag+'&page=999&pageSize=1');check(lastPage.body.page===5&&lastPage.body.items.length===1,'Directory clamps stale page after changes');check(list.body.counts.reduce((n,row)=>n+row.count,0)===5,'Summary counts are independent of displayed page');
  const cancelledList=await call(ta,path()+'?q='+tag+'&status=CANCELLED');check(cancelledList.body.total===2&&cancelledList.body.items.every(r=>r.status==='CANCELLED'),'Status filter includes exact matches');
 }finally{
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});
  if(weatherBefore)await db.operationalSetting.update({where:{key:'WEATHER_GATE'},data:{value:weatherBefore.value}});else await db.operationalSetting.deleteMany({where:{key:'WEATHER_GATE'}});
  if(policyBefore[0])await db.$executeRaw`UPDATE "PolicyControl" SET "state"=${policyBefore[0].state},"updatedAt"=${policyBefore[0].updatedAt} WHERE "category"='BOOKING' AND "ruleKey"='PARTICIPANT_ELIGIBILITY'`;else await db.$executeRaw`DELETE FROM "PolicyControl" WHERE "category"='BOOKING' AND "ruleKey"='PARTICIPANT_ELIGIBILITY'`;
  await db.invoice.deleteMany({where:{payment:{bookingId:{in:bookingIds}}}});await db.payment.deleteMany({where:{bookingId:{in:bookingIds}}});await db.bookingParticipant.deleteMany({where:{bookingId:{in:bookingIds}}});await db.booking.deleteMany({where:{id:{in:bookingIds}}});await db.crewAssignment.deleteMany({where:{tripId:{in:trips}}});await db.calendarAllocation.deleteMany({where:{eventId:{in:events}}});await db.calendarEvent.deleteMany({where:{id:{in:events}}});await db.calendarResource.deleteMany({where:{id:{in:resources}}});await db.safetyChecklist.deleteMany({where:{tripId:{in:trips}}});await db.operationalSetting.deleteMany({where:{key:{in:trips.map(id=>'trip-price:'+id)}}});await db.trip.deleteMany({where:{id:{in:trips}}});
 }
}
