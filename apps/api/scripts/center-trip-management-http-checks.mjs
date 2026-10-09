import {randomUUID} from 'node:crypto';
export async function checkCenterTripManagement(db,{base,a,b,ownerA,ta,tb,ts},check){
 const ids=[randomUUID(),randomUUID()];
 const body={requestId:ids[0],title:'رحلة المركز المحفوظة',type:'BOAT',startsAt:'2031-02-03T06:00:00.000Z',endsAt:'2031-02-03T10:00:00.000Z',capacity:6,pricePerSeatMinor:12550,locationName:'موقع المركز',latitude:18.2,longitude:41.5};
 const request=async(token,path,method='POST',data=body)=>{const r=await fetch(base+'/center/me/trips'+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(data)})});return{status:r.status,body:await r.json().catch(()=>null)}};
 try{
  check((await request(null,'')).status===401,'Anonymous cannot create center trip');
  check((await request(ts,'')).status===403,'Ordinary staff cannot create center trip');
  for(const invalid of [{title:[]},{type:'INVALID'},{startsAt:'2031-02-03T06:00'},{endsAt:'2030-01-01T00:00:00Z'},{capacity:0},{capacity:1.5},{pricePerSeatMinor:-1},{pricePerSeatMinor:'12550'},{latitude:91},{longitude:null},{organizationId:b.org.id},{status:'OPEN'},{requestId:'invalid'}])check((await request(ta,'','POST',{...body,...invalid})).status===400,'Invalid trip input rejected '+Object.keys(invalid)[0]);
  check(!await db.trip.findUnique({where:{id:ids[0]}}),'Invalid create leaves no trip');
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ARCHIVED'}});check((await request(ta,'')).status===403,'Revoked role cannot create trip');await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.organization.update({where:{id:a.org.id},data:{status:'SUSPENDED'}});check((await request(ta,'')).status===403,'Suspended center cannot create trip');await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});
  let result=await request(ta,'');check(result.status===201&&result.body.organizationId===a.org.id&&result.body.status==='DRAFT','Save binds trip to active center without publishing');
  check(result.body.price.pricePerSeatMinor===12550&&result.body.price.currency==='SAR'&&result.body.location.latitude===18.2,'Trip price and location saved atomically');
  check((await request(ta,'')).body.id===ids[0],'Retry returns original trip');
  check(await db.auditEvent.count({where:{resourceId:ids[0],action:'CENTER_TRIP_CREATED'}})===1,'Retry cannot duplicate create audit');
  check((await request(ta,'','POST',{...body,title:'different'})).status===409,'Same request ID cannot silently replace data');
  const list=await request(ta,'','GET');check(list.body.some(row=>row.id===ids[0]&&row.updatedAt&&row.location?.locationName===body.locationName&&row.price?.pricePerSeatMinor===12550),'Center list returns authoritative edit data');
  check(!(await request(tb,'','GET')).body.some(row=>row.id===ids[0]),'Other center cannot list new trip');
  const {requestId,...values}=body;let revision=result.body.updatedAt;
  check((await request(tb,'/'+ids[0],'PATCH',{...values,expectedUpdatedAt:revision})).status===404,'Other center cannot edit trip');
  check((await request(ts,'/'+ids[0],'PATCH',{...values,expectedUpdatedAt:revision})).status===403,'Staff cannot edit trip');
  check((await request(tb,'/'+ids[0]+'/publish','POST',{expectedUpdatedAt:revision})).status===404,'Other center cannot publish trip');
  check((await request(ts,'/'+ids[0]+'/publish','POST',{expectedUpdatedAt:revision})).status===403,'Staff cannot publish trip');
  result=await request(ta,'/'+ids[0],'PATCH',{...values,title:'رحلة معدلة',pricePerSeatMinor:0,expectedUpdatedAt:revision});check(result.status===200&&result.body.title==='رحلة معدلة'&&result.body.price.pricePerSeatMinor===0,'Saved trip editable with explicit free price');
  check((await request(ta,'/'+ids[0],'PATCH',{...values,expectedUpdatedAt:revision})).status===409,'Stale edit cannot overwrite trip');
  check((await request(ta,'/'+ids[0]+'/publish','POST',{expectedUpdatedAt:revision})).status===409,'Stale revision cannot publish trip');
  revision=result.body.updatedAt;
  const concurrent=await Promise.all([1,2].map(()=>request(ta,'/'+ids[0]+'/publish','POST',{expectedUpdatedAt:revision})));check(concurrent.filter(r=>r.status===201).length===1&&concurrent.filter(r=>r.status===409).length===1,'Concurrent publishing produces one transition');
  const published=await db.trip.findUniqueOrThrow({where:{id:ids[0]}});check(published.status==='OPEN'&&published.organizationId===a.org.id,'Published trip retains center ownership');
  check(await db.auditEvent.count({where:{resourceId:ids[0],action:'CENTER_TRIP_PUBLISHED'}})===1,'Publish audit recorded once');
  check(await db.safetyChecklist.count({where:{tripId:ids[0]}})===0,'Publishing does not forge safety approval');
  check(await db.auditEvent.count({where:{resourceId:ids[0],action:{in:['OPERATIONAL_CLEARANCE_GRANTED','OPERATIONAL_REVIEW_APPROVED']}}})===0,'Publishing does not grant operational clearance');
  check((await request(ta,'/'+ids[0],'PATCH',{...values,expectedUpdatedAt:published.updatedAt})).status===409,'Published trip cannot be edited through saved-trip endpoint');
  const simultaneous=await Promise.all([1,2].map(()=>request(ta,'','POST',{...body,requestId:ids[1]})));check(simultaneous.every(r=>r.status===201&&r.body.id===ids[1]),'Concurrent create retries return one saved trip');
  const second=await db.trip.findUniqueOrThrow({where:{id:ids[1]}});
  await db.operationalSetting.delete({where:{key:'trip-price:'+ids[1]}});check((await request(ta,'/'+ids[1]+'/publish','POST',{expectedUpdatedAt:second.updatedAt})).status===409,'Missing price blocks publication');
  await db.operationalSetting.create({data:{key:'trip-price:'+ids[1],value:{pricePerSeatMinor:100,currency:'SAR'}}});await db.$executeRaw`DELETE FROM "TripOperationalLocation" WHERE "tripId"::text=${ids[1]}`;check((await request(ta,'/'+ids[1]+'/publish','POST',{expectedUpdatedAt:second.updatedAt})).status===409,'Missing location blocks publication');
  check((await request(ta,'/'+ids[0],'DELETE',{expectedUpdatedAt:published.updatedAt})).status===409,'Published trips retain their history and use cancellation');
  check((await request(tb,'/'+ids[1],'DELETE',{expectedUpdatedAt:second.updatedAt})).status===404,'Other center cannot delete draft');
  check((await request(ts,'/'+ids[1],'DELETE',{expectedUpdatedAt:second.updatedAt})).status===403,'Staff cannot delete draft');
  check((await request(ta,'/'+ids[1],'DELETE',{expectedUpdatedAt:'2000-01-01T00:00:00.000Z'})).status===409,'Stale revision cannot delete draft');
  const event=await db.calendarEvent.create({data:{type:'TRIP',referenceType:'TRIP',referenceId:ids[1],title:'Draft allocation',startsAt:second.startsAt,endsAt:second.endsAt,organizationId:a.org.id}});
  check((await request(ta,'/'+ids[1],'DELETE',{expectedUpdatedAt:second.updatedAt})).status===409,'Operational calendar record blocks draft deletion');
  await db.calendarEvent.delete({where:{id:event.id}});
  check((await request(ta,'/'+ids[1],'DELETE',{expectedUpdatedAt:second.updatedAt})).status===200,'Unused draft can be deleted by its center');
  check(await db.trip.count({where:{id:ids[1]}})===0,'Draft deletion persisted');
 }finally{
  await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.operationalSetting.deleteMany({where:{key:{in:ids.map(id=>'trip-price:'+id)}}});await db.auditEvent.deleteMany({where:{resourceId:{in:ids}}});await db.trip.deleteMany({where:{id:{in:ids}}});
 }
}

