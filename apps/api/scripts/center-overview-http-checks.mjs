import {randomUUID} from 'node:crypto';

// Parent harness restricts this fixture to CI and loopback PostgreSQL/API.
export async function checkCenterOverview(db,{base,b,ownerB,ts,personAccount,tokenFor},check){
 const owner=await personAccount('home-owner'),other=await personAccount('home-inactive');
 const org=await db.organization.create({data:{kind:'DIVE_CENTER',status:'ACTIVE',displayName:'Home '+randomUUID(),ownerId:owner.id}});
 const member=await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 const token=await tokenFor(owner.id),trips=[],resources=[],incidents=[];let scopeAdded=false;
 const read=async(auth=token,query='')=>{const response=await fetch(base+'/center/me/overview'+query,{headers:auth?{authorization:'Bearer '+auth}:{}});return{status:response.status,body:await response.json()}};
 const trip=async(startsAt,status='OPEN',organizationId=org.id)=>{const row=await db.trip.create({data:{organizationId,title:'Home trip '+trips.length,type:'BOAT',capacity:8,status,startsAt,endsAt:new Date(startsAt.getTime()+3600000)}});trips.push(row.id);return row};
 try{
  let r=await read();check(r.status===200&&r.body.center.id===org.id,'Home binds exact managed center');
  check(Object.values(r.body.metrics).every(n=>n===0||n===1)&&r.body.metrics.activeMembers===1&&r.body.metrics.totalTrips===0,'Empty center has real zero counters and its owner');
  check(r.body.schedule.trips.total===0&&r.body.schedule.training.total===0&&r.body.licenses.total===0&&r.body.safety.openIncidents===0,'Empty center returns empty summaries');
  check((await read(null)).status===401&&(await read(ts)).status===403,'Home denies guest and ordinary staff');
  check((await read(token,'?organizationId='+b.org.id)).status===400,'Home rejects requested foreign scope');
  check(r.body.equipment.available===false&&r.body.equipment.total===null,'Missing inventory scope is unavailable, never a false zero');
  await db.$executeRaw`ALTER TABLE "EquipmentBarcode" ADD COLUMN "organizationId" TEXT`;scopeAdded=true;
  const now=Date.now(),day=new Date(now+3*3600000).toISOString().slice(0,10),start=new Date(day+'T00:00:00+03:00').getTime();
  const future=[];for(let n=1;n<=7;n++)future.push(await trip(new Date(now+n*86400000)));
  const today=await trip(new Date(start+3600000),'COMPLETED');await trip(new Date(now+86400000),'CANCELLED');await trip(new Date(now+86400000),'DRAFT');const foreign=await trip(new Date(now+86400000),'OPEN',b.org.id);
  await db.booking.createMany({data:[{tripId:future[0].id,accountId:owner.id,status:'PENDING',seats:2},{tripId:today.id,accountId:owner.id,status:'CONFIRMED',seats:3},{tripId:today.id,accountId:ownerB.id,status:'CANCELLED',seats:7},{tripId:foreign.id,accountId:ownerB.id,status:'PENDING',seats:6}]});
  await db.account.update({where:{id:other.id},data:{status:'SUSPENDED'}});await db.organizationMember.create({data:{organizationId:org.id,accountId:other.id,status:'ACTIVE',role:'STAFF'}});
  const enrollment=await db.trainingEnrollment.create({data:{centerOrganizationId:org.id,studentAccountId:owner.id,instructorAccountId:owner.id,courseCode:'HOME-COURSE',status:'ACTIVE'}});
  const record=await db.trainingRecord.create({data:{enrollmentId:enrollment.id}});
  for(let n=1;n<=7;n++)await db.trainingSession.create({data:{trainingRecordId:record.id,instructorAccountId:owner.id,startsAt:new Date(now+n*86400000),endsAt:n===7?null:new Date(now+n*86400000+3600000),status:'SCHEDULED'}});
  await db.trainingSession.create({data:{trainingRecordId:record.id,instructorAccountId:owner.id,startsAt:new Date(now-3600000),status:'IN_PROGRESS'}});
  for(const status of ['CANCELLED','COMPLETED'])await db.trainingSession.create({data:{trainingRecordId:record.id,instructorAccountId:owner.id,startsAt:new Date(now+86400000),status}});
  for(const [tripId,status,severity] of [[future[0].id,'OPEN','CRITICAL'],[future[0].id,'UNDER_REVIEW','HIGH'],[future[0].id,'RESOLVED','CRITICAL'],[future[0].id,'CLOSED','LOW'],[null,'OPEN','CRITICAL'],[foreign.id,'OPEN','CRITICAL']]){const row=await db.safetyIncident.create({data:{tripId,status,severity,reportedByAccountId:owner.id,title:'PRIVATE_INCIDENT',description:'PRIVATE_NARRATIVE',resolutionNotes:'PRIVATE_REVIEW'}});incidents.push(row.id)}
  const unit=await db.orgUnit.create({data:{organizationId:org.id,type:'CENTER',code:'HOME',nameAr:'وحدة المركز'}}),bytes=Buffer.from('home fixture');
  const asset=await db.organizationDocumentAsset.create({data:{organizationId:org.id,kind:'LICENSE',mimeType:'application/pdf',byteSize:bytes.length,sha256:'0'.repeat(64),content:bytes}});
  for(const [offset,status,type,pending] of [[-1,'REGISTERED','LICENSE',false],[0,'REGISTERED','PERMIT',false],[10,'REGISTERED','CERTIFICATE',true],[40,'REGISTERED','REGULATORY_APPROVAL',false],[null,'DRAFT','LICENSE',false],[-1,'ARCHIVED','LICENSE',false],[-1,'REGISTERED','INTERNAL_MEMO',false]])await db.administrativeRecord.create({data:{organizationId:org.id,unitId:unit.id,type,status,ownerAccountId:owner.id,referenceNumber:randomUUID(),subject:'PRIVATE_LICENSE',licenseAssetId:offset===null?null:asset.id,licenseIssuedAt:offset===null?null:new Date('2020-01-01'),licenseExpiresAt:offset===null?null:new Date(new Date(day+'T00:00:00Z').getTime()+offset*86400000),licenseReviewStatus:pending?'PENDING':null}});
  for(const [scope,stock,active] of [[org.id,'AVAILABLE',true],[org.id,'QUARANTINED',true],[org.id,'MAINTENANCE',false],[b.org.id,'AVAILABLE',true]]){const resource=await db.calendarResource.create({data:{type:'EQUIPMENT',name:'PRIVATE_EQUIPMENT',active}});resources.push(resource.id);const code=randomUUID();await db.$executeRaw`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","stockStatus","organizationId") VALUES(${randomUUID()},${resource.id},${code},${code},${code},${stock},${scope})`}
  for(const keyType of ['TEXT','UUID']){
   if(keyType==='UUID')await db.$executeRaw`ALTER TABLE "EquipmentBarcode" ALTER COLUMN "organizationId" TYPE UUID USING "organizationId"::uuid`;
   r=await read();check(r.status===200,'Home supports inventory scope '+keyType+': '+JSON.stringify(r.body));
   check(r.body.metrics.newBookings===1&&r.body.metrics.tripsToday===1&&r.body.metrics.activeMembers===1&&r.body.metrics.totalTrips===10,'Counters exclude other center, cancelled bookings and inactive accounts');
   check(r.body.operations.draftTrips===1&&r.body.operations.confirmedBookingsToday===1&&r.body.operations.confirmedSeatsToday===3,'Today distinguishes bookings from seats');
   check(r.body.date===day&&r.body.timeZone==='Asia/Riyadh'&&Number.isFinite(Date.parse(r.body.generatedAt)),'Home carries Riyadh day and snapshot timestamp');
   check(r.body.schedule.trips.total===7&&r.body.schedule.trips.items.length===5&&r.body.schedule.trips.items[0].id===future[0].id,'Upcoming trips are ordered and limited with complete count');
   check(r.body.schedule.training.total===8&&r.body.schedule.training.items.length===5&&r.body.schedule.training.items[0].courseCode==='HOME-COURSE','Training summary includes active scheduled sessions with bounded list');
   check(r.body.safety.openIncidents===2&&r.body.safety.criticalIncidents===1,'Safety counts exclude closed, resolved, unlinked and foreign incidents');
   check(JSON.stringify(r.body.licenses)===JSON.stringify({total:5,expired:1,expiringSoon:2,incomplete:1,pendingReview:1}),'License validity uses full calendar dates, archive/type scope and approval status');
   check(r.body.equipment.available&&r.body.equipment.total===3&&r.body.equipment.groups.some(row=>row.status==='MAINTENANCE'&&!row.active),'Equipment status and inactive flag retain meaning');
   const serialized=JSON.stringify(r.body);check(!serialized.includes('PRIVATE_')&&!serialized.includes(owner.id)&&!serialized.includes(ownerB.id)&&!serialized.includes(other.id),'Home omits identities, narratives, license subjects and equipment identifiers');
  }
  await db.organizationMember.update({where:{id:member.id},data:{status:'SUSPENDED'}});check((await read()).status===403,'Same-session membership revocation clears home access');await db.organizationMember.update({where:{id:member.id},data:{status:'ACTIVE'}});
  for(const data of [{status:'SUSPENDED'},{status:'ACTIVE',kind:'DIVE_SCHOOL'}]){await db.organization.update({where:{id:org.id},data});check((await read()).status===403,'Home requires exact active center kind')}
  await db.organization.update({where:{id:org.id},data:{status:'ACTIVE',kind:'DIVE_CENTER'}});
  await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'DIVE_CENTER'}},data:{status:'SUSPENDED'}});check((await read()).status===403,'Home rechecks exact active role');await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  check((await read()).status===200,'Restored home authority recovers without widening scope');
 }finally{
  await db.safetyIncident.deleteMany({where:{id:{in:incidents}}});await db.booking.deleteMany({where:{tripId:{in:trips}}});await db.trip.deleteMany({where:{id:{in:trips}}});
  await db.trainingRecord.deleteMany({where:{enrollment:{centerOrganizationId:org.id}}});await db.trainingEnrollment.deleteMany({where:{centerOrganizationId:org.id}});
  if(resources.length){await db.$executeRaw`DELETE FROM "EquipmentBarcode" WHERE "resourceId"=ANY(${resources}::text[])`;await db.calendarResource.deleteMany({where:{id:{in:resources}}})}
  if(scopeAdded)await db.$executeRaw`ALTER TABLE "EquipmentBarcode" DROP COLUMN "organizationId"`;
  await db.administrativeRecord.deleteMany({where:{organizationId:org.id}});await db.organizationDocumentAsset.deleteMany({where:{organizationId:org.id}});await db.orgUnit.deleteMany({where:{organizationId:org.id}});await db.organizationMember.deleteMany({where:{organizationId:org.id}});await db.organization.delete({where:{id:org.id}});
 }
}
