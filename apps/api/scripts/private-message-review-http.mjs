import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import { DatabaseService } from '../dist/database/database.service.js';
import { AuditService } from '../dist/audit/audit.service.js';
import { PrivateMessageReviewService } from '../dist/messaging/private-message-review.service.js';

const url = new URL(process.env.DATABASE_URL);
const base = new URL(process.env.MESSAGING_E2E_BASE_URL);
assert.equal(url.hostname,'127.0.0.1');
assert.equal(base.hostname,'127.0.0.1');
assert.equal(url.pathname,'/a15test');
assert.equal(process.env.NODE_ENV,'test');
const db = new DatabaseService();
const review = new PrivateMessageReviewService(db,new AuditService(db));
const suffix=randomUUID();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
async function account(name,admin=false) {
  const p=await db.person.create({data:{firstName:name,lastName:'Fixture'}});
  const a=await db.account.create({data:{personId:p.id,email:name+'-'+suffix+'@example.invalid',passwordHash:'fixture',status:'ACTIVE',emailVerifiedAt:new Date()}});
  if(admin)await db.roleAssignment.create({data:{accountId:a.id,role:'ADMIN',status:'ACTIVE'}});
  const session=await db.session.create({data:{accountId:a.id,tokenHash:randomBytes(24).toString('hex'),expiresAt:new Date(Date.now()+3600000)}});
  const iat=Math.floor(Date.now()/1000);
  const payload=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:a.id,sid:session.id,iat,exp:iat+3600});
  return {...a,token:payload+'.'+createHmac('sha256',process.env.JWT_SECRET).update(payload).digest('base64url')};
}
async function call(a,path,body,expect=body===undefined?200:201){
  const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const value=await r.json(); assert.equal(r.status,expect,JSON.stringify(value));return value;
}
try{
  const owner=await account('owner',true),sender=await account('sender'),peer=await account('peer'),staff=await account('reviewer',true),stranger=await account('stranger',true);
  const org=await db.organization.create({data:{ownerId:owner.id,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',displayName:'Private review fixture'}});
  await db.operationalSetting.create({data:{key:'PLATFORM_STAFFING_ORGANIZATION:v1',value:{organizationId:org.id}}});
  const {id}=await call(sender,'/messages/conversations',{participantAccountIds:[peer.id]});
  const path='/messages/conversations/'+id;
  const send=body=>call(sender,path+'/messages',{body});
  const age=(id,hours)=>db.$executeRaw`UPDATE "Message" SET "withdrawnAt"=clock_timestamp()-(${hours}::int*interval '1 hour') WHERE id::text=${id}`;
  const exists=async id=>(await db.$queryRaw`SELECT 1 AS present FROM "WithdrawnMessageContent" WHERE "messageId"=${id}`).length;
  const a=await send('text A'),b=await send('text B'),c=await send('text C');
  const route=(m,act)=>path+'/messages/'+m.id+'/'+act;
  await call(peer,route(a,'withdraw'),{},403);
  await call(stranger,route(a,'report'),{},404);
  for(const m of [a,b,c])await call(sender,route(m,'withdraw'),{});
  await call(sender,route(a,'withdraw'),{});
  for(const member of [sender,peer]){
    const history=await call(member,path);
    assert.equal(history.messages.length,3);
    assert(history.messages.every(m=>m.withdrawnAt&&m.body===null&&m.mediaUrl===null));
    const list=await call(member,'/messages/conversations');
    assert.equal(list[0].latestMessage.body,null);
  }
  const exported=await call(sender,'/me/data-export/sent-messages',{},201);
  assert.equal(exported.records.length,0);
  const {caseId}=await call(peer,route(b,'report'),{});
  assert.equal((await call(peer,route(b,'report'),{})).caseId,caseId);
  const endpoint='/customer-service/admin/cases/'+caseId;
  await call(stranger,endpoint+'/message-evidence',undefined,403);
  await call(stranger,endpoint+'/assign',{assignedAccountId:stranger.id,dueAt:new Date(Date.now()+3600000).toISOString()},403);
  await call(owner,endpoint+'/assign',{assignedAccountId:staff.id,dueAt:new Date(Date.now()+3600000).toISOString()});
  assert.equal((await call(owner,endpoint+'/message-evidence')).body,'text B');
  assert.equal((await call(staff,endpoint+'/message-evidence')).body,'text B');
  assert.equal(await db.auditEvent.count({where:{resourceId:caseId,action:'message.case_evidence_read'}}),2);
  await age(a.id,721);await age(b.id,721);await age(c.id,719);
  await call(peer,route(a,'report'),{},409);
  await review.purgeExpired();
  assert.equal(await exists(a.id),0);assert.equal(await exists(b.id),1);assert.equal(await exists(c.id),1);
  await call(owner,endpoint+'/release-message-hold',{reason:'fixture closed'},409);
  await call(staff,endpoint+'/resolve',{message:'تمت المعالجة في الاختبار'});
  await call(peer,'/customer-service/cases/'+caseId+'/resolution-response',{decision:'ACCEPT',message:'قبول تجريبي للحل'});
  assert.equal((await call(owner,endpoint+'/release-message-hold',{reason:'انتهى سبب الحفظ في الاختبار'})).released,false);
  await call(owner,endpoint+'/release-message-hold',{reason:'انتهى سبب الحفظ في الاختبار'},409);
  assert.equal((await call(staff,endpoint+'/release-message-hold',{reason:'مراجعة انتهاء سبب الحفظ'})).released,true);
  await call(owner,endpoint+'/message-evidence',undefined,404);
  await review.purgeExpired();assert.equal(await exists(b.id),0);
  console.log('PASS: withdrawal hidden on both histories, preview and export; 30-day boundary; case-scoped access, audit, two-person release and purge.');
} finally { await db.$disconnect(); }
