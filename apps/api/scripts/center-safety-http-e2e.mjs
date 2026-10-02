import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {createHmac,randomUUID,randomBytes} from 'node:crypto';

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
const read=async token=>{const response=await fetch(base+'/center/me/safety',{headers:token?{authorization:'Bearer '+token}:{}});return {status:response.status,body:await response.json().catch(()=>null)};};
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
  console.log(`Center safety HTTP/PostgreSQL E2E: ${checks}/${checks} passed (ownership, payload minimization, suspension and recovery).`);
}finally{
  await db.safetyIncident.deleteMany({where:{reportedByAccountId:{in:ids.accounts}}});
  await db.safetyChecklist.deleteMany({where:{tripId:{in:ids.trips}}});
  await db.trip.deleteMany({where:{id:{in:ids.trips}}});
  await db.organizationMember.deleteMany({where:{organizationId:{in:ids.organizations}}});
  await db.organization.deleteMany({where:{id:{in:ids.organizations}}});
  await db.roleAssignment.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.session.deleteMany({where:{accountId:{in:ids.accounts}}});
  await db.account.deleteMany({where:{id:{in:ids.accounts}}});
  await db.person.deleteMany({where:{id:{in:ids.people}}});
  await db.$disconnect();
}
