import {checkCenterOverview} from './center-overview-http-checks.mjs';
import {checkCenterSafetyWorkspace} from './center-safety-workspace-http-checks.mjs';
import {checkCenterBookings} from './center-booking-http-checks.mjs';
import {checkCenterCustomers} from './center-customer-http-checks.mjs';
import {checkCenterTripLifecycle} from './center-trip-lifecycle-http-checks.mjs';
import {checkCenterTeam} from './center-team-http-checks.mjs';
import {checkCenterTeamManagement} from './center-team-management-http-checks.mjs';
import {checkCenterTrainingAssignments} from './center-training-assignment-http-checks.mjs';
import {checkCenterTrainingSessions} from './center-training-session-http-checks.mjs';
import {checkCenterReports} from './center-reports-http-checks.mjs';
import {checkCenterTripManagement} from './center-trip-management-http-checks.mjs';
import {checkCenterBusinessProfile} from './center-business-profile-http-checks.mjs';
import {checkCenterLicensePlatformReview} from './center-license-platform-review-http-checks.mjs';
import assert from 'node:assert/strict';
import {checkCenterLicenseRegistrationRace} from './center-license-registration-race-checks.mjs';
import {checkCenterLicenseReview} from './center-license-review-http-checks.mjs';
import {checkCenterLicenseCreation} from './center-license-create-http-checks.mjs';
import {checkCenterLicenses} from './center-license-http-checks.mjs';
import {checkCenterEquipment} from './center-equipment-http-checks.mjs';
import {PrismaClient} from '@prisma/client';
import {createHash,createHmac,randomUUID,randomBytes} from 'node:crypto';

const base=process.env.CENTER_SAFETY_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const databaseUrl=process.env.DATABASE_URL;
const secret=process.env.JWT_SECRET;
const loopback=host=>['127.0.0.1','localhost','[::1]'].includes(host);
if(process.env.CI!=='true'||!databaseUrl||!secret||!loopback(new URL(base).hostname)||!loopback(new URL(databaseUrl).hostname))throw new Error('Center safety fixtures require CI and loopback API/PostgreSQL. Never run against production.');
const db=new PrismaClient(),tag=randomUUID();
const ids={people:[],accounts:[],organizations:[],trips:[]};
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const personAccount=async label=>{
  const person=await db.person.create({data:{firstName:'CenterSafety',lastName:label}});ids.people.push(person.id);
  const account=await db.account.create({data:{personId:person.id,email:`center-safety-${label}-${tag}@example.invalid`,passwordHash:'ci-fixture',status:'ACTIVE',emailVerifiedAt:new Date()}});ids.accounts.push(account.id);
  await db.roleAssignment.create({data:{accountId:account.id,role:'DIVE_CENTER',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'CENTER_SAFETY_CI'}}});
  return account;
};
const tokenFor=async accountId=>{
  const session=await db.session.create({data:{accountId,tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)}});
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),now=Math.floor(Date.now()/1000);
  const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:accountId,sid:session.id,iat:now,exp:now+900});
  return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');
};
const read=async(token,path='/me/safety',method='GET')=>{
  const response=await fetch(base+'/center'+path,{
    method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(method==='PATCH'?{'content-type':'application/json'}:{})},
    ...(method==='PATCH'?{body:JSON.stringify({movementType:'TRANSFER',toLocation:'CI-DENIED'})}:{}),
  });
  return {status:response.status,body:await response.json().catch(()=>null)};
};
const centerFor=async owner=>{
  const org=await db.organization.create({data:{displayName:'Center safety CI '+owner.id,kind:'DIVE_CENTER',status:'ACTIVE',ownerId:owner.id}});ids.organizations.push(org.id);
  const member=await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
  const trip=await db.trip.create({data:{organizationId:org.id,title:'Scoped trip '+org.id,type:'BOAT',capacity:4,status:'OPEN',startsAt:new Date('2030-01-01T07:00:00Z'),endsAt:new Date('2030-01-01T11:00:00Z')}});ids.trips.push(trip.id);
  const checklist=await db.safetyChecklist.create({data:{tripId:trip.id,items:{weather_review:true},decision:'REVIEW_REQUIRED',notes:'CI scope fixture'}});
  const incident=await db.safetyIncident.create({data:{tripId:trip.id,reportedByAccountId:owner.id,severity:'LOW',title:'Incident '+org.id,description:'Private reporter narrative must not be returned'}});
  return {org,member,trip,checklist,incident};
};
try{
  const ownerA=await personAccount('owner-a'),ownerB=await personAccount('owner-b'),staff=await personAccount('staff');
  const a=await centerFor(ownerA),b=await centerFor(ownerB);
  await db.organizationMember.create({data:{organizationId:a.org.id,accountId:staff.id,role:'STAFF',status:'ACTIVE'}});
  const unlinked=await db.safetyIncident.create({data:{reportedByAccountId:ownerA.id,severity:'LOW',title:'Unlinked incident',description:'Must not appear in any center view'}});
  const [ta,tb,ts]=await Promise.all([tokenFor(ownerA.id),tokenFor(ownerB.id),tokenFor(staff.id)]);
  check((await read()).status===401,'Anonymous read must be rejected');
  let r=await read(ta);check(r.status===200,'Active center owner must read safety');
  check(r.body.checklists.length===1&&r.body.checklists[0].id===a.checklist.id,'Center A checklist isolation');
  check(r.body.incidents.length===1&&r.body.incidents[0].id===a.incident.id,'Center A incident isolation');
  check(r.body.checklists[0].updatedAt&&r.body.checklists[0].trip.title===a.trip.title,'Checklist must provide UI date and trip fields');
  check(!r.body.incidents.some(item=>item.id===unlinked.id),'Unlinked incident must remain outside center scope');
  for(const field of ['reportedByAccountId','resolvedByAccountId','description','resolutionNotes'])check(!(field in r.body.incidents[0]),'Do not expose private incident field '+field);
  r=await read(tb);check(r.status===200&&r.body.incidents.length===1&&r.body.incidents[0].id===b.incident.id,'Center B must not receive center A incident');
  check(r.body.checklists.length===1&&r.body.checklists[0].id===b.checklist.id,'Center B checklist isolation');
  check((await read(ts)).status===403,'An ordinary staff membership must not grant manager access');
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'SUSPENDED'}});
  check((await read(ta)).status===403,'Suspended manager membership must be denied immediately');
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});
  await db.organization.update({where:{id:a.org.id},data:{status:'SUSPENDED'}});
  check((await read(ta)).status===403,'Suspended center must be denied even with an active manager');
  await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});
  r=await read(ta);check(r.status===200&&r.body.incidents[0].id===a.incident.id,'Restored authority must recover without widening scope');

  // Keep the organization and manager membership active while changing only the
  // portal role. Reuse the same token to prove per-request server enforcement.
  const missingResourceId=randomUUID();
  const routes=[
    ['/me/overview'],['/me/safety'],['/me/documents'],['/me/customers'],
    ['/me/team'],['/me/professionals'],['/me/trips'],[`/me/trips/${a.trip.id}/bookings`],
    [`/me/licenses/${missingResourceId}/register`,'PATCH'],[`/me/licenses/${missingResourceId}/reviews`,'POST'],
    [`/me/license-reviews/${missingResourceId}/assign`,'PATCH'],[`/me/license-reviews/${missingResourceId}/decision`,'PATCH'],
    ['/me/licenses','POST'],[`/me/licenses/${missingResourceId}/renew`,'POST'],
    [`/me/licenses/${missingResourceId}/attachment`],[`/me/licenses/${missingResourceId}/attachment`,'PATCH'],
    ['/me/equipment'],[`/me/equipment/lookup/${missingResourceId}`],
    [`/me/equipment/${missingResourceId}/history`],[`/me/equipment/${missingResourceId}/move`,'PATCH'],
  ];
  await db.roleAssignment.create({data:{accountId:ownerA.id,role:'INSTRUCTOR',status:'ACTIVE'}});
  for(const status of ['DRAFT','PENDING_REVIEW','REJECTED','SUSPENDED','ARCHIVED']){
    await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status}});
    for(const [path,method] of routes){
      r=await read(ta,path,method);
      check(r.status===403,`${status} center role must deny ${method||'GET'} ${path}, got ${r.status}`);
    }
  }
  await db.roleAssignment.delete({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}}});
  for(const [path,method] of routes){
    r=await read(ta,path,method);
    check(r.status===403,`An unrelated active role must not replace missing DIVE_CENTER for ${path}, got ${r.status}`);
  }
  await db.roleAssignment.create({data:{accountId:ownerA.id,role:'DIVE_CENTER',status:'ACTIVE',activeAt:new Date()}});
  for(const [path] of routes.slice(0,8)){
    check((await read(ta,path)).status===200,`Restored center role must recover scoped read ${path}`);
  }

  // Review the center document-list contract with real, isolated records. This
  // verifies metadata/read scope only; it is not an upload/download acceptance.
  const assetFor=async organizationId=>{
    const content=Buffer.from('PRIVATE-CENTER-ASSET:'+organizationId);
    return db.organizationDocumentAsset.create({data:{organizationId,kind:'LICENSE',mimeType:'application/pdf',byteSize:content.length,sha256:createHash('sha256').update(content).digest('hex'),content}});
  };
  const assetA=await assetFor(a.org.id),assetB=await assetFor(b.org.id);
  const licenseTypes=['LICENSE','PERMIT','CERTIFICATE','REGULATORY_APPROVAL'];
  for(const [center,owner] of [[a,ownerA],[b,ownerB]]){
    const unit=await db.orgUnit.create({data:{organizationId:center.org.id,type:'CENTER',code:'CENTER-DOCS',nameAr:'وحدة اختبار المركز'}});
    for(const type of [...licenseTypes,'INTERNAL_MEMO']){
      await db.administrativeRecord.create({data:{organizationId:center.org.id,unitId:unit.id,ownerAccountId:owner.id,type,referenceNumber:`${center.org.id}-${type}`,subject:`${type} ${center.org.id}`,status:'REGISTERED'}});
    }
  }
  r=await read(ta,'/me/documents');
  check(r.status===200&&r.body.assets.length===1&&r.body.assets[0].id===assetA.id,'Center A must see only its document asset');
  check(!('content' in r.body.assets[0])&&!('organizationId' in r.body.assets[0]),'Document list must not return binary content or unnecessary organization identifiers');
  check(r.body.assets[0].byteSize===assetA.byteSize&&r.body.assets[0].sha256===assetA.sha256,'Document metadata must reflect persisted asset');
  check(r.body.licenses.length===4&&licenseTypes.every(type=>r.body.licenses.some(row=>row.type===type)),'Center document list must include all four regulatory record types and exclude internal memos');
  check(r.body.licenses.every(row=>row.referenceNumber.startsWith(a.org.id)&&row.status==='REGISTERED'),'Center A licenses must retain own reference and status');
  check(r.body.licenses.every(row=>!('ownerAccountId' in row)&&!('unitId' in row)&&!('organizationId' in row)),'License list must minimize administrative identifiers');
  r=await read(tb,'/me/documents');
  check(r.status===200&&r.body.assets.length===1&&r.body.assets[0].id===assetB.id,'Center B must not receive center A document metadata');
  check(r.body.licenses.length===4&&r.body.licenses.every(row=>row.referenceNumber.startsWith(b.org.id)),'Center B license list must remain isolated');
  check((await read(ts,'/me/documents')).status===403,'Ordinary staff must not read center manager documents');
  check((await read(undefined,'/me/documents')).status===401,'Anonymous document listing must be denied');

  await checkCenterEquipment(db,{base,a,b,ownerA,ta,tb,ts},check);

  await checkCenterLicenses(db,{base,a,b,ownerA,staff,ta,tb,ts},check);

  await checkCenterLicenseCreation(db,{base,a,b,ownerA,ta,tb,ts},check);
  await checkCenterLicensePlatformReview(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check);

  await checkCenterLicenseReview(db,{base,a,b,ownerA,staff,ta,tb,ts},check);
  await checkCenterLicenseRegistrationRace({base,a,ownerA,ta},check);
  await checkCenterBusinessProfile(db,{base,a,b,ownerA,ta,tb,ts},check);

  await checkCenterTripManagement(db,{base,a,b,ownerA,ta,tb,ts},check);
  await checkCenterTripLifecycle(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check);

  await checkCenterSafetyWorkspace(db,{base,a,b,ownerA,ownerB,ta,tb,ts,personAccount,tokenFor},check);

  await checkCenterBookings(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check);

  await checkCenterCustomers(db,{base,a,b,ownerA,ta,tb,ts,personAccount},check);

  await checkCenterOverview(db,{base,b,ownerB,ts,personAccount,tokenFor},check);

  await checkCenterReports(db,{base,a,b,ownerA,ownerB,ta,tb,ts},check);

  await checkCenterTeam(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check);
  await checkCenterTeamManagement(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check);
  await checkCenterTrainingAssignments(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check);
  await checkCenterTrainingSessions(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check);

  console.log(`Center safety and portal authorization HTTP/PostgreSQL E2E: ${checks}/${checks} passed (exact active role across 20 routes, same-session revocation/recovery, center isolation document metadata privacy, equipment movements/inspection gates/audit and TEXT/UUID center scope).`);
}finally{
  await db.administrativeRecord.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.orgUnit.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.organizationDocumentAsset.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.safetyIncident.deleteMany({where:{reportedByAccountId:{in:ids.accounts}}});
  await db.safetyChecklist.deleteMany({where:{tripId:{in:ids.trips}}});
  await db.trip.deleteMany({where:{id:{in:ids.trips}}});
  await db.organizationMember.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.organization.deleteMany({where:{id:{in:ids.organizations}}});
  await db.notification.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.roleAssignment.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.session.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.account.deleteMany({where:{id:{in:ids.accounts}}});
  // Retain test actors referenced by append-only audit records in this disposable CI database.
  await db.person.deleteMany({where:{id:{in:ids.people},auditEvents:{none:{}}}});
  await db.$disconnect();
}
