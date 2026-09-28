import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

// This test writes isolated fixtures and uses a loopback-only fake provider.
// Refuse non-local databases even if an operator accidentally supplies production env.
const databaseUrl=new URL(process.env.DATABASE_URL||'postgresql://missing');
assert(['localhost','127.0.0.1','[::1]'].includes(databaseUrl.hostname),'Outbox E2E requires a local test database');
const require=createRequire(import.meta.url);
const { AuthEmailOutboxWorker }=require('../dist/auth/auth-email-outbox.worker.js');
const { AuthService }=require('../dist/auth/auth.service.js');
const { EmailDeliveryService }=require('../dist/integrations/email-delivery.service.js');
const { IntegrationService }=require('../dist/integrations/integration.service.js');
const db=new PrismaClient();
const attempts=[],auditEvents=[],providerErrors=[];
let rejectNext=false;
const provider=createServer(async(req,res)=>{
  try{
    assert.equal(req.method,'POST');
    assert.equal(req.url,'/emails');
    assert.equal(req.headers.authorization,'Bearer outbox-e2e-key');
    let body='';
    for await(const chunk of req)body+=chunk;
    const payload=JSON.parse(body);
    assert(payload.to.every(to=>to.endsWith('@example.invalid')),'Only synthetic recipients are permitted');
    attempts.push({key:req.headers['idempotency-key'],payload});
    res.setHeader('content-type','application/json');
    if(rejectNext){rejectNext=false;res.writeHead(503);res.end('{"message":"temporary failure"}');return;}
    res.end(JSON.stringify({id:'outbox-test-message-'+attempts.length}));
  }catch(error){providerErrors.push(error);res.writeHead(500);res.end('{}');}
});
provider.listen(0,'127.0.0.1');
await once(provider,'listening');
Object.assign(process.env,{
  JWT_SECRET:'outbox-e2e-only-secret-at-least-32-characters',
  HYDROLAND_INTEGRATION_EMAIL_STATUS:'SANDBOX',
  HYDROLAND_EMAIL_PROVIDER:'RESEND',
  RESEND_API_KEY:'outbox-e2e-key',
  RESEND_API_BASE_URL:'http://127.0.0.1:'+provider.address().port,
  HYDROLAND_EMAIL_FROM:'HYDROLAND <no-reply@example.invalid>',
  HYDROLAND_PUBLIC_WEB_ORIGIN:'https://web.example.invalid',
});
const integrations=new IntegrationService({record:async()=>{}});
const delivery=new EmailDeliveryService(integrations,{record:async event=>auditEvents.push(event)});
const auth=new AuthService(db,{},{}); // MFA/Google are not used by challenge delivery or consumption.
const worker=new AuthEmailOutboxWorker(db,auth,delivery,integrations);
let account;
const now=Date.now();
const future=new Date(now+20*60_000).toISOString();
const past=new Date(now-60_000).toISOString();
const basePayload={purpose:'VERIFY_EMAIL',expiresAt:future,delivery:'EMAIL',version:1};
const row=(id)=>db.notification.findUniqueOrThrow({where:{id}});
const insert=(payload={},extra={})=>db.notification.create({data:{
  accountId:account.id,type:'AUTH_EMAIL_VERIFICATION',payload:{...basePayload,...payload},...extra,
}});
const attemptsFor=id=>attempts.filter(attempt=>attempt.key==='hydroland-auth/'+id);
const tokenFor=(id,param)=>{
  const text=attemptsFor(id).at(-1).payload.text;
  const link=new URL(text.split('\n').find(line=>line.startsWith('https://')));
  assert.equal(link.origin,'https://web.example.invalid');
  const token=link.searchParams.get(param);
  assert(token,'Email must contain the expected challenge link');
  return token;
};

try{
  account=await db.account.create({data:{
    email:'outbox-e2e-'+randomUUID()+'@example.invalid',passwordHash:'fixture-only',
    person:{create:{firstName:'Outbox',lastName:'E2E'}},
  }});
  // More than one entire batch of EACH ineligible state must not starve later rows.
  const blockers=await db.notification.createManyAndReturn({data:[
    ...Array.from({length:25},(_,index)=>({
      accountId:account.id,type:'AUTH_EMAIL_VERIFICATION',createdAt:new Date(now-120_000+index),
      payload:{...basePayload,deliveryStatus:'SENT',deliveryAttempts:1},
    })),
    ...Array.from({length:25},(_,index)=>({
      accountId:account.id,type:'AUTH_EMAIL_VERIFICATION',createdAt:new Date(now-90_000+index),
      payload:{...basePayload,deliveryStatus:'DEFERRED',deliveryAttempts:1,nextDeliveryAttemptAt:future},
    })),
  ]});
  const fresh=await insert(); // Missing JSON paths must be included.
  const nullState=await insert({deliveryStatus:null,nextDeliveryAttemptAt:null});
  const retry=await insert({purpose:'RESET_PASSWORD',deliveryStatus:'DEFERRED',deliveryAttempts:2,nextDeliveryAttemptAt:past},{type:'AUTH_PASSWORD_RESET'});
  const expired=await insert({expiresAt:past});
  const expiredSent=await insert({expiresAt:past,deliveryStatus:'SENT'});
  const expiredDeferred=await insert({expiresAt:past,deliveryStatus:'DEFERRED',nextDeliveryAttemptAt:future});
  const unrelated=await insert({},{type:'BOOKING_CONFIRMED'});
  const consumed=await insert({},{status:'READ'});

  await worker.run();
  assert.equal(attempts.length,3,'Sent/deferred head rows must not block fresh, null-state, and due retry messages');
  for(const item of [fresh,nullState,retry]){
    const current=await row(item.id);
    assert.equal(current.status,'PENDING','Delivery must not consume the challenge');
    assert.equal(current.payload.deliveryStatus,'SENT');
    assert.equal(attemptsFor(item.id).length,1);
    assert(!Object.keys(current.payload).some(key=>key.toLowerCase().includes('token')),'Never persist bearer tokens');
  }
  assert.equal((await row(retry.id)).payload.deliveryAttempts,3);
  for(const item of [expired,expiredSent,expiredDeferred])assert.equal((await row(item.id)).status,'FAILED','Expired challenges must be retired without delivery');
  assert.equal((await row(unrelated.id)).status,'PENDING');
  assert.equal((await row(consumed.id)).status,'READ');
  for(const item of blockers)assert.deepEqual((await row(item.id)).payload,item.payload,'Ineligible challenges must remain unchanged');
  await worker.run();
  assert.equal(attempts.length,3,'Successful deliveries must not be sent again while awaiting verification');

  // A failed provider request backs off, then retries with exactly the same token and idempotency key.
  const failure=await insert();
  rejectNext=true;
  await worker.run();
  const deferred=await row(failure.id);
  assert.equal(deferred.payload.deliveryStatus,'DEFERRED');
  assert.equal(deferred.payload.deliveryAttempts,1);
  assert(Date.parse(deferred.payload.nextDeliveryAttemptAt)>Date.now());
  const failedAttempt=attemptsFor(failure.id)[0];
  await worker.run();
  assert.equal(attemptsFor(failure.id).length,1,'Do not retry ahead of the backoff deadline');
  await db.notification.update({where:{id:failure.id},data:{payload:{...deferred.payload,nextDeliveryAttemptAt:past}}});
  await worker.run();
  assert.equal((await row(failure.id)).payload.deliveryStatus,'SENT');
  assert.equal((await row(failure.id)).payload.deliveryAttempts,2);
  assert.deepEqual(attemptsFor(failure.id)[1],failedAttempt,'Retries must preserve the provider idempotency key and challenge link');

  // The provider lifecycle gate must remain fail-closed.
  const gated=await insert();
  process.env.HYDROLAND_INTEGRATION_EMAIL_STATUS='CONFIGURED';
  await worker.run();
  assert.equal(attemptsFor(gated.id).length,0);
  process.env.HYDROLAND_INTEGRATION_EMAIL_STATUS='SANDBOX';

  // Exercise the real Prisma query after a single injected database transport failure.
  let failPoll=true;
  const warnings=[];
  const recoveringWorker=new AuthEmailOutboxWorker({notification:{
    findMany:async args=>{
      if(failPoll){failPoll=false;throw new Error('sensitive provider/recipient fixture must not be logged');}
      return db.notification.findMany(args);
    },
    updateMany:args=>db.notification.updateMany(args),
  }},auth,delivery,integrations);
  recoveringWorker.logger.warn=message=>warnings.push(message);
  await assert.doesNotReject(()=>recoveringWorker.run(),'A temporary database outage must not reject a timer poll');
  assert.equal(warnings.length,1);
  assert(!warnings[0].includes('sensitive'));
  await recoveringWorker.run();
  assert.equal(attemptsFor(gated.id).length,1,'Worker must release its running guard and recover on the next poll');

  // Retain the bounded batch size and allow the next tick to drain the remainder.
  const burst=await db.notification.createManyAndReturn({data:Array.from({length:27},()=>({
    accountId:account.id,type:'AUTH_EMAIL_VERIFICATION',payload:basePayload,
  }))});
  const beforeBurst=attempts.length;
  await worker.run();
  assert.equal(attempts.length-beforeBurst,25,'Each poll may process at most 25 eligible messages');
  await worker.run();
  assert.equal(attempts.length-beforeBurst,27,'The next poll must reach messages behind already-sent rows');
  for(const item of burst)assert.equal(attemptsFor(item.id).length,1);

  // Consume links from actual provider request bodies using the real AuthService and database.
  const verifyToken=tokenFor(fresh.id,'verify_email');
  const tokens=await auth.confirmEmailVerification(verifyToken);
  assert(tokens.accessToken&&tokens.refreshToken);
  assert.equal((await row(fresh.id)).status,'READ');
  await assert.rejects(()=>auth.confirmEmailVerification(verifyToken),'Verification link must be single-use');
  const resetToken=tokenFor(retry.id,'reset_token');
  assert.deepEqual(await auth.resetPassword(resetToken,'Hydroland-Outbox-Renew-123!'),{passwordReset:true});
  await assert.rejects(()=>auth.resetPassword(resetToken,'Hydroland-Outbox-Replay-123!'),'Reset link must be single-use');
  assert.equal(await db.session.count({where:{accountId:account.id,revokedAt:null}}),0,'Password reset must revoke existing sessions');
  assert(!JSON.stringify(auditEvents).includes(verifyToken),'Audit metadata must not contain bearer tokens');
  assert(!JSON.stringify(auditEvents).includes(resetToken),'Audit metadata must not contain reset tokens');
  assert.deepEqual(providerErrors,[]);
  console.log('Auth email outbox PostgreSQL E2E passed: no queue starvation, missing/null JSON fields, expiry, bounded batches, retry idempotency/backoff, lifecycle gate, database recovery, and usable single-use verification/reset links.');
} finally {
  worker.onModuleDestroy();
  try{
    if(account){
      await db.session.deleteMany({where:{accountId:account.id}});
      await db.notification.deleteMany({where:{accountId:account.id}});
      await db.account.delete({where:{id:account.id}});
      await db.person.delete({where:{id:account.personId}});
    }
  }finally{
    await db.$disconnect();
    await new Promise(resolve=>provider.close(resolve));
  }
}
