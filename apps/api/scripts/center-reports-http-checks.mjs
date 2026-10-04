import {randomUUID} from 'node:crypto';
export async function checkCenterReports(db,{base,a,b,ownerA,ownerB,ta,tb,ts},check){
 const trips=[],bookings=[],payments=[];
 const read=async(token,path='/reports?from=2032-01-02&to=2032-01-02')=>{const r=await fetch(base+'/center/me'+path,{headers:token?{authorization:'Bearer '+token}:{}});return{status:r.status,body:await r.json().catch(()=>null)}};
 const trip=async(org,startsAt,status='OPEN',capacity=4)=>{const t=await db.trip.create({data:{organizationId:org,title:'Report fixture',type:'BOAT',startsAt:new Date(startsAt),endsAt:new Date(new Date(startsAt).getTime()+3600000),status,capacity}});trips.push(t.id);return t};
 const booking=async(t,accountId,status,seats)=>{const v=await db.booking.create({data:{tripId:t.id,accountId,status,seats}});bookings.push(v.id);return v};
 const payment=async(v,status,currency,amountMinor)=>{const p=await db.payment.create({data:{bookingId:v.id,accountId:v.accountId,status,currency,amountMinor,idempotencyKey:randomUUID()}});payments.push(p.id)};
 try{
  check((await read()).status===401,'Anonymous cannot read center reports');check((await read(ts)).status===403,'Staff cannot read manager reports');
  for(const query of ['from=invalid&to=2032-01-02','from=2032-02-30&to=2032-03-01','from=2032-02-02&to=2032-01-02','from=2030-01-01&to=2032-01-01','from[]=2032-01-02&to=2032-01-02'])check((await read(ta,'/reports?'+query)).status===400,'Invalid report range rejected '+query);
  await trip(a.org.id,'2032-01-01T20:59:59Z');const first=await trip(a.org.id,'2032-01-01T21:00:00Z');const last=await trip(a.org.id,'2032-01-02T20:59:59Z','COMPLETED',8);await trip(a.org.id,'2032-01-02T21:00:00Z');const other=await trip(b.org.id,'2032-01-02T06:00:00Z','OPEN',99);
  const confirmed=await booking(first,ownerA.id,'CONFIRMED',2),pending=await booking(first,ownerB.id,'PENDING',1),cancelled=await booking(last,ownerA.id,'CANCELLED',1),foreign=await booking(other,ownerB.id,'CONFIRMED',5);
  await payment(confirmed,'CAPTURED','SAR',10000);await payment(pending,'PENDING','SAR',20000);await payment(confirmed,'CAPTURED','USD',300);await payment(cancelled,'REFUNDED','SAR',5000);await payment(foreign,'CAPTURED','SAR',900000);
  let r=await read(ta);check(r.status===200&&r.body.center.id===a.org.id,'Report binds managed center');check(r.body.period.timeZone==='Asia/Riyadh'&&r.body.period.basis==='TRIP_START_DATE','Report declares Saudi trip-date basis');
  check(r.body.trips.reduce((n,row)=>n+row.count,0)===2&&r.body.trips.reduce((n,row)=>n+row.capacity,0)===12,'Report includes start boundary and excludes next-day boundary');
  check(r.body.bookings.find(row=>row.status==='CONFIRMED')?.seats===2&&r.body.bookings.find(row=>row.status==='PENDING')?.count===1&&r.body.bookings.find(row=>row.status==='CANCELLED')?.seats===1,'Booking states and seats remain separate');
  check(r.body.payments.length===4&&r.body.payments.find(row=>row.status==='CAPTURED'&&row.currency==='SAR')?.amountMinor===10000,'Captured total excludes pending, refund and other center');check(r.body.payments.find(row=>row.currency==='USD')?.amountMinor===300,'Currencies never combine');
  check(!JSON.stringify(r.body).includes(ownerA.id)&&!JSON.stringify(r.body).includes(confirmed.id),'Aggregates omit customer and booking identifiers');
  r=await read(tb);check(r.body.trips.reduce((n,row)=>n+row.capacity,0)===99&&r.body.payments[0].amountMinor===900000,'Second center report remains isolated');
  r=await read(ta,'/reports?from=2040-01-01&to=2040-01-01');check(r.body.trips.length===0&&r.body.bookings.length===0&&r.body.payments.length===0,'Empty period returns empty aggregates');
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ARCHIVED'}});check((await read(ta)).status===403,'Same-session revoked role loses report access');await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  const before=(await read(ta,'/overview')).body;const day=new Date(Date.now()+3*3600000).toISOString().slice(0,10),start=new Date(day+'T00:00:00+03:00').getTime();
  for(const offset of [-1,0,86400000-1,86400000])await trip(a.org.id,new Date(start+offset).toISOString());
  await trip(a.org.id,new Date(start+3600000).toISOString(),'COMPLETED');await trip(a.org.id,new Date(start+7200000).toISOString(),'CANCELLED');
  r=await read(ta,'/overview');check(r.body.metrics.tripsToday===before.metrics.tripsToday+3&&r.body.timeZone==='Asia/Riyadh'&&r.body.date===day,'Overview uses Riyadh midnight independent of server timezone');
 }finally{
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});await db.payment.deleteMany({where:{id:{in:payments}}});await db.booking.deleteMany({where:{id:{in:bookings}}});await db.trip.deleteMany({where:{id:{in:trips}}});
 }
}
