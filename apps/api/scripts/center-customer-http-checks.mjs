import {randomUUID} from 'node:crypto';
export async function checkCenterCustomers(db,{base,a,b,ownerA,ta,tb,ts,personAccount},check){
 const tag='Clients-'+randomUUID(),tripIds=[],bookingIds=[],enrollmentIds=[];
 const request=async(token,path='',query='')=>{const r=await fetch(base+'/center/me/customers'+path+query,{headers:token?{authorization:'Bearer '+token}:{}});return{status:r.status,body:await r.json().catch(()=>null)}};
 const query='?q='+encodeURIComponent(tag);
 const trip=async organizationId=>{const r=await db.trip.create({data:{organizationId,title:'Customer scoped trip '+organizationId,type:'SHORE',status:'OPEN',capacity:12,startsAt:new Date('2031-01-01T06:00:00Z'),endsAt:new Date('2031-01-01T09:00:00Z')}});tripIds.push(r.id);return r};
 const book=async(tripId,accountId,status,seats,createdAt='2026-01-01T00:00:00Z')=>{const r=await db.booking.create({data:{tripId,accountId,status,seats,createdAt:new Date(createdAt)}});bookingIds.push(r.id);return r};
 const enroll=async(studentAccountId,centerOrganizationId,status,courseCode='OPEN_WATER')=>{const r=await db.trainingEnrollment.create({data:{studentAccountId,centerOrganizationId,status,courseCode,enrolledAt:new Date('2026-02-01T00:00:00Z'),metadata:{private:'PRIVATE-STUDENT-DATA'}}});enrollmentIds.push(r.id);return r};
 try{
  const customer=await personAccount(tag+'-first'),sameName=await personAccount(tag+'-same-name'),student=await personAccount(tag+'-student'),foreign=await personAccount(tag+'-foreign'),unlinked=await personAccount(tag+'-unlinked');
  for(const [account,name] of [[customer,tag+' عميل'],[sameName,tag+' عميل'],[student,tag+' طالب%'],[foreign,tag+' خارج المركز']])await db.person.update({where:{id:account.personId},data:{firstName:name,lastName:''}});
  const first=await trip(a.org.id),second=await trip(a.org.id),other=await trip(b.org.id);
  const cb=await book(first.id,customer.id,'CONFIRMED',2),cancelled=await book(second.id,customer.id,'CANCELLED',4),pending=await book(first.id,sameName.id,'PENDING',1);
  await book(other.id,customer.id,'CONFIRMED',9);await book(other.id,foreign.id,'CONFIRMED',3);
  await db.bookingParticipant.create({data:{bookingId:cb.id,fullName:'PRIVATE-PARTICIPANT',identitySnapshot:{private:'PRIVATE-IDENTITY'},emergencySnapshot:{phone:'PRIVATE-PHONE'}}});
  const enrollment=await enroll(customer.id,a.org.id,'ACTIVE');await db.trainingRecord.create({data:{enrollmentId:enrollment.id,status:'IN_PROGRESS',progressPercent:40}});
  await enroll(customer.id,a.org.id,'COMPLETED');await enroll(customer.id,b.org.id,'ACTIVE','FOREIGN-COURSE');await enroll(student.id,a.org.id,'PENDING');await enroll(foreign.id,b.org.id,'ACTIVE');
  let r=await request(ta,'',query);check(r.status===200&&r.body.total===3,'Directory unifies booking owners and training-only students');
  check(r.body.items.filter(x=>x.displayName===tag+' عميل').length===2,'Distinct accounts with the same name are not merged');
  let row=r.body.items.find(x=>x.customerId===customer.id);check(row.bookingCount===2&&row.confirmedBookings===1&&row.cancelledBookings===1&&row.totalSeats===6&&row.nonCancelledSeats===2,'Accurate historical counts exclude cancelled seats from non-cancelled total');
  check(row.trainingCount===2&&row.activeTraining===1&&row.completedTraining===1,'Training aggregates exclude other centers');
  check(r.body.items.find(x=>x.customerId===student.id).bookingCount===0,'Training-only customer is visible');
  const serialized=JSON.stringify(r.body);for(const secret of ['PRIVATE-',customer.email,'passwordHash','identitySnapshot','emergencySnapshot','roleAssignments'])check(!serialized.includes(secret),'Directory excludes private field '+secret);
  check((await request(ta,'',query+'&source=BOOKING')).body.total===2,'Booking source filter');check((await request(ta,'',query+'&source=TRAINING')).body.total===2,'Training source filter');
  check((await request(ta,'','?q='+encodeURIComponent('%'))).body.items.every(x=>x.displayName.includes('%')),'Search treats wildcard percent literally');
  check((await request(ta,'','?q='+encodeURIComponent("' OR 1=1 --"))).body.total===0,'Bound search does not execute SQL fragments');
  check((await request(ta,'','?q='+encodeURIComponent(customer.email))).body.total===0,'Directory does not search private account identifiers');
  r=await request(ta,'',query+'&pageSize=1');const firstId=r.body.items[0].customerId;check(r.body.total===3&&r.body.items.length===1&&r.body.totalPages===3,'List pagination preserves total');
  const page2=await request(ta,'',query+'&pageSize=1&page=2');check(page2.body.items.length===1&&page2.body.items[0].customerId!==firstId,'Stable secondary ordering avoids duplicate page rows');
  check((await request(ta,'',query+'&pageSize=2&page=999')).body.page===2,'Out-of-range list page clamps to available data');
  for(const invalid of ['?page=0','?page=-1','?page=1.5','?pageSize=51','?pageSize=0','?page=100001','?source=FOREIGN','?organizationId='+b.org.id,'?q='+('x'.repeat(121)),'?source[]=ALL'])check((await request(ta,'',invalid)).status===400,'Invalid query rejected '+invalid.slice(0,30));
  for(const [token,status] of [[null,401],[ts,403]]){check((await request(token,'',query)).status===status,'List protects manager scope');check((await request(token,'/'+customer.id)).status===status,'Detail protects manager scope');}
  check((await request(ta,'/'+foreign.id)).status===404,'Foreign-only customer detail hidden');check((await request(ta,'/'+unlinked.id)).status===404,'Unlinked active account is not a customer');
  r=await request(ta,'/'+customer.id);check(r.status===200&&r.body.bookings.total===2&&r.body.training.total===2,'Customer detail includes both own-center histories');
  check(r.body.bookings.items.every(x=>[first.id,second.id].includes(x.trip.id))&&!r.body.training.items.some(x=>x.courseCode==='FOREIGN-COURSE'),'Shared customer detail excludes other center activity');
  check(r.body.training.items.find(x=>x.id===enrollment.id).record.progressPercent===40,'Training detail exposes operational progress');
  for(const secret of ['PRIVATE-',customer.email,'studentAccountId','accountId','metadata','identitySnapshot'])check(!JSON.stringify(r.body).includes(secret),'Detail excludes private field '+secret);
  r=await request(tb,'/'+customer.id);check(r.status===200&&r.body.bookings.total===1&&r.body.bookings.items[0].seats===9&&r.body.training.total===1,'Other center sees only its own activity for shared customer');
  check((await request(ta,'/'+customer.id,'?bookingsPage=0')).status===400,'History query validation');
  for(const status of ['DRAFT','PENDING_REVIEW','REJECTED','SUSPENDED','ARCHIVED']){await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status}});check((await request(ta,'',query)).status===403,'Inactive exact role blocks list '+status);check((await request(ta,'/'+customer.id)).status===403,'Inactive exact role blocks detail '+status);}
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'SUSPENDED'}});check((await request(ta,'/'+customer.id)).status===403,'Membership revocation denies detail');await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});
  await db.organization.update({where:{id:a.org.id},data:{status:'SUSPENDED'}});check((await request(ta,'',query)).status===403,'Suspended center denies directory');await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});
  // Reproduce the former take:1000 truncation with one customer's real booking history.
  const bulk=Array.from({length:1001},()=>({id:randomUUID(),organizationId:a.org.id,title:'Full customer history',type:'SHORE',status:'OPEN',capacity:2,startsAt:new Date('2032-01-01T06:00:00Z'),endsAt:new Date('2032-01-01T09:00:00Z')}));tripIds.push(...bulk.map(x=>x.id));await db.trip.createMany({data:bulk});
  const activity=bulk.map(t=>({id:randomUUID(),tripId:t.id,accountId:customer.id,status:'CONFIRMED',seats:1,createdAt:new Date('2026-03-01T00:00:00Z')}));bookingIds.push(...activity.map(x=>x.id));await db.booking.createMany({data:activity});
  r=await request(ta,'',query);row=r.body.items.find(x=>x.customerId===customer.id);check(row.bookingCount===1003&&row.confirmedBookings===1002,'Aggregates include all history beyond 1000 bookings');check(r.body.total===3,'Older customers remain discoverable beyond the first 1000 bookings');
  r=await request(ta,'/'+customer.id);check(r.body.bookings.total===1003&&r.body.bookings.items.length===20&&r.body.bookings.totalPages===51,'Long history is bounded without truncating counts');
  const firstPageIds=r.body.bookings.items.map(x=>x.id);r=await request(ta,'/'+customer.id,'?bookingsPage=2');check(r.body.bookings.items.every(x=>!firstPageIds.includes(x.id)),'History pagination has deterministic tie order');
  r=await request(ta,'/'+customer.id,'?bookingsPage=999');check(r.body.bookings.page===51&&r.body.bookings.items.length===3,'Last history page remains accessible');
  const extra=Array.from({length:21},()=>({id:randomUUID(),studentAccountId:student.id,centerOrganizationId:a.org.id,courseCode:'OPEN_WATER',status:'PENDING'}));enrollmentIds.push(...extra.map(x=>x.id));await db.trainingEnrollment.createMany({data:extra});r=await request(ta,'/'+student.id,'?trainingPage=2');check(r.body.training.total===22&&r.body.training.items.length===2&&r.body.training.page===2,'Training history pages independently from booking history');
  await db.booking.delete({where:{id:pending.id}});check((await request(ta,'/'+sameName.id)).status===404,'Access disappears when the last center relationship is removed');
 }finally{
  await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.trainingRecord.deleteMany({where:{enrollmentId:{in:enrollmentIds}}});await db.trainingEnrollment.deleteMany({where:{id:{in:enrollmentIds}}});await db.bookingParticipant.deleteMany({where:{bookingId:{in:bookingIds}}});await db.booking.deleteMany({where:{id:{in:bookingIds}}});await db.trip.deleteMany({where:{id:{in:tripIds}}});
 }
}
