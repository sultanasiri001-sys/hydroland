import { PrismaClient } from '@prisma/client';
import { createHmac, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const base=process.env.NOTIFICATIONS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
for(const url of [new URL(base),new URL(process.env.DATABASE_URL||'postgresql://missing')]){
  assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Notifications E2E requires a local API and test database');
}
const secret=process.env.JWT_SECRET;
assert(secret,'JWT_SECRET required');
const db=new PrismaClient(),accounts=[],people=[];
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`};
const call=(token,path='',method='GET',body)=>fetch(base+'/notifications'+path,{method,headers:{...(token?{authorization:`Bearer ${token}`} :{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const json=async response=>{const body=await response.json();assert(response.ok,`Unexpected HTTP ${response.status}: ${JSON.stringify(body)}`);return body};

try{
  for(const name of ['Owner','Other']){
    const person=await db.person.create({data:{firstName:name,lastName:'Notifications E2E'}});people.push(person.id);
    accounts.push(await db.account.create({data:{personId:person.id,email:`notifications-${randomUUID()}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}}));
  }
  const [owner,other]=accounts,token=tokenFor(owner.id),otherToken=tokenFor(other.id);
  const ordinary=await db.notification.create({data:{accountId:owner.id,type:'MESSAGE_RECEIVED',status:'SENT',payload:{title:'رسالة جديدة'}}});
  const foreign=await db.notification.create({data:{accountId:other.id,type:'MESSAGE_RECEIVED',status:'SENT',payload:{title:'رسالة خاصة بحساب آخر'}}});
  const challenges=[];
  for(const type of ['AUTH_EMAIL_VERIFICATION','AUTH_PASSWORD_RESET']){
    challenges.push(await db.notification.create({data:{accountId:owner.id,type,payload:{purpose:type,delivery:'EMAIL',expiresAt:new Date(Date.now()+600_000).toISOString()}}}));
  }

  assert.equal((await call(null)).status,401);
  assert.equal((await call(null,'/safety-test','POST')).status,401);
  assert.equal((await call(null,`/${ordinary.id}/read`,'POST')).status,401);
  assert.deepEqual((await json(await call(token))).map(row=>row.id),[ordinary.id],'List only in-app notifications belonging to the caller');
  assert.equal((await call(token,`/${foreign.id}/read`,'POST')).status,404);
  assert.equal((await db.notification.findUniqueOrThrow({where:{id:foreign.id}})).status,'SENT');
  for(const challenge of challenges){
    assert.equal((await call(token,`/${challenge.id}/read`,'POST')).status,404,'An auth challenge cannot be consumed as a notification');
    assert.deepEqual(await db.notification.findUniqueOrThrow({where:{id:challenge.id}}),challenge,'Auth challenge remains unchanged');
  }

  const results=await Promise.all(Array.from({length:4},()=>call(token,'/safety-test','POST',{
    accountId:other.id,type:'SAFETY_ALERT',payload:{isTest:false,areaLabel:'Injected area'},
  }).then(json)));
  assert.equal(results.filter(result=>result.created).length,1,'Concurrent test requests create exactly one notification');
  assert.equal(new Set(results.map(result=>result.notification.id)).size,1);
  const demo=results[0].notification;
  assert.equal(demo.accountId,owner.id,'Recipient is always the authenticated caller');
  assert.equal(demo.type,'SAFETY_TEST');assert.equal(demo.status,'SENT');
  assert.equal(demo.payload.isTest,true);assert.equal(demo.payload.areaLabel,'منطقة الرأس');
  assert.match(demo.payload.message,/لا تعني وجود خطر فعلي/);
  assert.equal(await db.notification.count({where:{accountId:other.id,type:'SAFETY_TEST'}}),0,'No test is broadcast to other accounts');
  assert.equal((await call(otherToken,`/${demo.id}/read`,'POST')).status,404);
  assert((await json(await call(token))).some(row=>row.id===demo.id),'Demo is persisted and listed');
  await json(await call(token,`/${demo.id}/read`,'POST'));
  assert.equal((await db.notification.findUniqueOrThrow({where:{id:demo.id}})).status,'READ');
  const reused=await json(await call(token,'/safety-test','POST'));
  assert.equal(reused.created,false);assert.equal(reused.notification.status,'READ','Retrying the same test does not undo read status');

  await db.notification.update({where:{id:demo.id},data:{createdAt:new Date(Date.now()-65_000)}});
  const next=await json(await call(token,'/safety-test','POST'));
  assert.equal(next.created,true);assert.notEqual(next.notification.id,demo.id,'A later explicit test can create a new notification');
  assert.equal((await json(await call(otherToken))).length,1,'Other account still sees only its own original notification');
  console.log('Notifications HTTP/DB E2E passed: authentication, ownership, auth challenge isolation, concurrent self-only safety tests, fixed simulation content, persistence and read status.');
}finally{
  const ids=accounts.map(account=>account.id);
  await db.notification.deleteMany({where:{accountId:{in:ids}}});
  await db.account.deleteMany({where:{id:{in:ids}}});
  await db.person.deleteMany({where:{id:{in:people}}});
  await db.$disconnect();
}
