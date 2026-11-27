// Actual Nest HTTP guards/controllers and PostgreSQL; every provider request is intercepted in this process.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const databaseUrl=new URL(process.env.DATABASE_URL||'postgresql://missing');
assert(['127.0.0.1','localhost','[::1]'].includes(databaseUrl.hostname)&&databaseUrl.pathname==='/customer_channels_test'
  &&process.env.CUSTOMER_CHANNEL_DB_TEST_CONFIRM==='DISPOSABLE_LOOPBACK_ONLY','Requires disposable loopback customer_channels_test');
const require=createRequire(import.meta.url);
const {Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
const load=(file,name)=>require('../dist/'+file+'.js')[name];
const DatabaseModule=load('database/database.module','DatabaseModule'),DatabaseService=load('database/database.service','DatabaseService');
const AuthModule=load('auth/auth.module','AuthModule'),AuthService=load('auth/auth.service','AuthService');
const AdminModule=load('admin/admin.module','AdminModule'),AuditModule=load('audit/audit.module','AuditModule');
const CustomerNoticePreferenceController=load('notifications/customer-notice-preference.controller','CustomerNoticePreferenceController');
const CustomerChannelReviewController=load('notifications/customer-notice-preference.controller','CustomerChannelReviewController');
const CustomerNoticePreferenceService=load('notifications/customer-notice-preference.service','CustomerNoticePreferenceService');
const CustomerChannelWorker=load('integrations/customer-channel.worker','CustomerChannelWorker');
const CustomerChannelTransport=load('integrations/customer-channel.transport','CustomerChannelTransport');
const UnifonicMessagingService=load('integrations/unifonic-messaging.service','UnifonicMessagingService');
const IntegrationService=load('integrations/integration.service','IntegrationService'),IntegrationController=load('integrations/integration.controller','IntegrationController');
const EmailDeliveryService=load('integrations/email-delivery.service','EmailDeliveryService'),CustomerNoticeEmailWorker=load('integrations/customer-notice-email.worker','CustomerNoticeEmailWorker');
const NotificationsController=load('notifications/notifications.controller','NotificationsController'),NotificationsService=load('notifications/notifications.service','NotificationsService');
const {channelPolicy,isQuiet}=require('../dist/notifications/customer-channel.domain.js');
Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:'fixture-customer-channel-auth-secret-long-32',MFA_ENCRYPTION_KEY:'fixture-customer-channel-encryption-long-32'});
delete process.env.HYDROLAND_CUSTOMER_CHANNEL_POLICY;
assert.equal(channelPolicy('SMS','fixture'),null);
await new CustomerChannelWorker(new Proxy({},{get(){throw Error('Disabled worker must not access the database');}}),{}).poll();
class FixtureModule{}
Module({imports:[DatabaseModule,AuthModule,AdminModule,AuditModule],controllers:[CustomerNoticePreferenceController,CustomerChannelReviewController,NotificationsController,IntegrationController],
  providers:[CustomerNoticePreferenceService,CustomerChannelTransport,UnifonicMessagingService,IntegrationService,EmailDeliveryService,NotificationsService]})(FixtureModule);
let app,base,db,serial=0,fixtureNo=0,holdNext=null,uncertainNext=null,reuseNext=null;
const requests=[],receipts=new Map(),nativeFetch=globalThis.fetch;
const pendingReleases=[];
const within=promise=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Fixture did not reach the expected concurrency boundary')),10000);timer.unref();})]);
const response=data=>Response.json(data);
globalThis.fetch=async(input,options={})=>{
  const url=new URL(String(input));
  if(['127.0.0.1','localhost','[::1]'].includes(url.hostname))return nativeFetch(input,options);
  if(url.href==='https://el.cloud.unifonic.com/rest/SMS/messages'){
    const form=options.body,entry={channel:'SMS',id:String(++serial),reference:form.get('CorrelationID'),recipient:'+'+form.get('Recipient'),text:form.get('Body')};
    requests.push(entry);
    if(holdNext?.channel==='SMS'){const held=holdNext;holdNext=null;held.entered();await held.wait;}
    if(uncertainNext==='SMS'){uncertainNext=null;throw Error('Synthetic lost response after submission');}
    return response({success:true,data:{MessageID:entry.id,CorrelationID:entry.reference,Recipient:form.get('Recipient'),Status:'Queued'}});
  }
  if(url.href==='https://apis.unifonic.com/v1/messages'){
    const body=JSON.parse(options.body),entry={channel:'WHATSAPP',id:randomUUID(),reference:body.referenceId,recipient:body.recipient.contact,body};requests.push(entry);
    if(holdNext?.channel==='WHATSAPP'){const held=holdNext;holdNext=null;held.entered();await held.wait;}
    if(uncertainNext==='WHATSAPP'){uncertainNext=null;throw Error('Synthetic lost response after submission');}
    receipts.set(entry.id,{messageId:entry.id,referenceId:entry.reference,contact:entry.recipient,channel:'whatsapp',senderApplicationId:process.env.UNIFONIC_WHATSAPP_APPLICATION_ID,status:'DELIVERED'});
    return response({messageId:entry.id,status:'QUEUED'});
  }
  if(url.origin==='https://apis.unifonic.com'&&url.pathname==='/v1/messages/status')return response([receipts.get(url.searchParams.get('messageIds'))]);
  if(url.href==='https://exp.host/--/api/v2/push/send'){
    const body=JSON.parse(options.body),entry={channel:'PUSH',id:reuseNext||randomUUID(),body};reuseNext=null;requests.push(entry);
    if(holdNext?.channel==='PUSH'){const held=holdNext;holdNext=null;held.entered();await held.wait;}
    if(uncertainNext==='PUSH'){uncertainNext=null;throw Error('Synthetic lost response after submission');}
    receipts.set(entry.id,{status:'ok'});return response({data:[{id:entry.id,status:'ok'}]});
  }
  if(url.href==='https://exp.host/--/api/v2/push/getReceipts'){
    const {ids}=JSON.parse(options.body);return response({data:receipts.get(ids[0])===undefined?{}:{[ids[0]]:receipts.get(ids[0])}});
  }
  throw Error('Test denied an unexpected non-loopback network request');
};
const configuredAccounts=[],configuredPhones=[];
function configure(){
  Object.assign(process.env,{HYDROLAND_CUSTOMER_CHANNEL_POLICY:'BOOKING_INVOICE_V1',HYDROLAND_CUSTOMER_PHONE_VERIFICATION_ENABLED:'true',
    HYDROLAND_INTEGRATION_SMS_STATUS:'SANDBOX',HYDROLAND_SMS_PROVIDER:'UNIFONIC',UNIFONIC_SMS_APPSID:'fixture',UNIFONIC_SMS_SENDER_ID:'Fixture',
    UNIFONIC_SMS_DLR_ACCOUNT_ID:'fixture-sms-account',HYDROLAND_WEBHOOK_SMS_SECRET:'fixture-signed-gateway-secret',
    HYDROLAND_INTEGRATION_WHATSAPP_STATUS:'SANDBOX',HYDROLAND_WHATSAPP_PROVIDER:'UNIFONIC',UNIFONIC_WHATSAPP_PUBLIC_ID:'fixture-public',UNIFONIC_WHATSAPP_SECRET:'fixture-secret',
    UNIFONIC_WHATSAPP_APPLICATION_ID:'fixture-wa-app',HYDROLAND_WHATSAPP_APPROVED_TEMPLATES:'booking_notice:ar,invoice_notice:ar',EXPO_ACCESS_TOKEN:'fixture-access-token'});
  for(const channel of ['SMS','WHATSAPP','PUSH']){
    const p='HYDROLAND_CUSTOMER_CHANNEL_'+channel+'_';
    Object.assign(process.env,{[p+'ENABLED']:'true',[p+'PROVIDER_VERIFIED']:'true',[p+'MONTHLY_CAP_HALALAS']:'100000',[p+'MAX_ATTEMPT_HALALAS']:'2',[p+'ALLOWED_ACCOUNT_IDS']:configuredAccounts.join(',')});
  }
  Object.assign(process.env,{HYDROLAND_CUSTOMER_CHANNEL_SMS_DLR_GATEWAY_VERIFIED:'true',HYDROLAND_CUSTOMER_CHANNEL_SMS_CONTENT_APPROVED:'true',
    HYDROLAND_CUSTOMER_CHANNEL_SMS_TEST_RECIPIENTS:configuredPhones.join(','),HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_TEST_RECIPIENTS:configuredPhones.join(','),
    HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_LANGUAGE:'ar',HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_BOOKING_TEMPLATE:'booking_notice',HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_INVOICE_TEMPLATE:'invoice_notice',
    HYDROLAND_CUSTOMER_CHANNEL_PUSH_MODE:'SANDBOX',HYDROLAND_CUSTOMER_CHANNEL_PUSH_PROJECT_ID:'12345678-1234-1234-1234-123456789abc'});
}
function accessToken(accountId,sessionId){
  const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),now=Math.floor(Date.now()/1000);
  const part=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:accountId,sid:sessionId,iat:now,exp:now+900});
  return part+'.'+createHmac('sha256',process.env.JWT_SECRET).update(part).digest('base64url');
}
async function fixture(){
  const account=await db.account.create({data:{email:randomUUID()+'@example.invalid',passwordHash:'fixture',status:'ACTIVE',emailVerifiedAt:new Date(),person:{create:{firstName:'Synthetic',lastName:'Channels'}}}});
  const refreshToken=randomUUID()+randomUUID(),session=await db.session.create({data:{accountId:account.id,tokenHash:createHash('sha256').update(refreshToken).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
  const phone='+1555000'+String(++fixtureNo).padStart(4,'0');configuredAccounts.push(account.id);configuredPhones.push(phone);configure();
  return {id:account.id,sessionId:session.id,token:accessToken(account.id,session.id),refreshToken,phone};
}
async function api(actor,path,body,expected=200){
  const result=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(actor?{authorization:'Bearer '+actor.token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await result.json().catch(()=>null);assert.equal(result.status,expected,`${path}: ${JSON.stringify(data)}`);return data;
}
const prefix='/notifications/delivery';
const get=actor=>api(actor,prefix+'/preferences');
async function save(actor,changes){
  const previous=await get(actor),fields=['email','sms','whatsapp','push','bookings','invoices','quietStart','quietEnd','timeZone'];
  return api(actor,prefix+'/preferences',{expectedRevision:previous.revision,...Object.fromEntries(fields.map(k=>[k,previous[k]])),...changes,confirmed:true});
}
async function challenge(actor,phone=actor.phone){return api(actor,prefix+'/phone/challenges',{phone,confirmed:true});}
function challengeCode(id){const item=requests.findLast(r=>r.reference==='hydroland-phone/'+id);assert(item);return item.text.match(/\d{6}/)[0];}
async function prove(actor){const item=await challenge(actor);return api(actor,prefix+'/phone/challenges/'+item.challengeId+'/verify',{code:challengeCode(item.challengeId),confirmed:true});}
const newWorker=()=>new CustomerChannelWorker(db,app.get(CustomerChannelTransport));
const rows=sourceId=>db.$queryRaw`SELECT * FROM "CustomerChannelDispatch" WHERE "sourceId"=${sourceId} ORDER BY channel`;
const due=sourceId=>db.$executeRaw`UPDATE "CustomerChannelDispatch" SET "nextAttemptAt"=to_timestamp(0) WHERE "sourceId"=${sourceId}`;
const budget=async channel=>(await db.$queryRaw`SELECT COALESCE(sum("reservedHalalas"),0)::int AS n FROM "CustomerChannelBudget" WHERE channel=${channel}`)[0].n;
const device=actor=>db.$queryRaw`SELECT "pushRegistrationId","pushTokenHash","pushTokenCiphertext" FROM "Session" WHERE id::text=${actor.sessionId}`;
const eventSends=channel=>requests.filter(r=>r.channel===channel&&(channel==='PUSH'||r.reference?.startsWith('hydroland-notice/')));
let trip;
async function booking(actor){
  const b=await db.booking.create({data:{accountId:actor.id,tripId:trip.id,status:'CONFIRMED'}});
  await db.notification.create({data:{accountId:actor.id,type:'BOOKING_CONFIRMED',status:'SENT',payload:{bookingId:b.id}}});return b;
}
async function invoice(actor,issued=true){
  const order=await db.storeOrder.create({data:{accountId:actor.id,totalMinor:500}});
  const payment=await db.storePayment.create({data:{orderId:order.id,accountId:actor.id,amountMinor:500,idempotencyKey:randomUUID()}});
  const native=await db.storeInvoice.create({data:{paymentId:payment.id,number:'fixture-'+randomUUID(),status:issued?'ISSUED':'DRAFT'}});
  return {id:order.id,invoiceId:native.id};
}
async function dlr(entry,overrides={}){
  const payload={accountId:process.env.UNIFONIC_SMS_DLR_ACCOUNT_ID,productName:'sms',eventName:'dlr',body:{messageId:entry.id,correlationId:entry.reference,destinationAddress:entry.recipient.slice(1),submitUnitCount:'1',deliveredUnitCount:'1',finalStatus:'DELIVRD',...overrides}};
  const raw=JSON.stringify(payload),stamp=String(Date.now()),signature=createHmac('sha256',process.env.HYDROLAND_WEBHOOK_SMS_SECRET).update(stamp+'.'+raw).digest('hex');
  const result=await fetch(base+'/integrations/SMS/webhooks',{method:'POST',headers:{'Content-Type':'application/json','x-hydroland-timestamp':stamp,'x-hydroland-signature':'sha256='+signature,'x-hydroland-event-id':randomUUID(),'x-hydroland-event-type':'dlr'},body:raw});assert.equal(result.status,201);
}
function hold(channel){let entered,release;const started=new Promise(r=>{entered=r;}),wait=new Promise(r=>{release=r;});holdNext={channel,entered,wait};pendingReleases.push(release);return {started,release};}
let groups=0;const pass=message=>{groups++;console.log('PASS customer channels: '+message);};
try{
  app=await NestFactory.create(FixtureModule,{logger:false,rawBody:true});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');base=(await app.getUrl())+'/api/v1';db=app.get(DatabaseService);
  trip=await db.trip.create({data:{title:'Synthetic notification trip',type:'SHORE',capacity:100,startsAt:new Date(),endsAt:new Date(Date.now()+86400000)}});
  const owner=await fixture(),other=await fixture();
  await api(null,prefix+'/preferences',undefined,401);await api(other,'/admin/customer-channel-deliveries',undefined,403);
  const initial=await get(owner);assert.equal(initial.revision,0);assert.equal(initial.email,true);assert.equal(initial.sms,false);assert.equal(initial.push,false);
  await api(owner,prefix+'/preferences',{...initial,accountId:other.id,confirmed:true},400);
  await assert.rejects(()=>save(owner,{sms:true}),/400/);
  delete process.env.HYDROLAND_CUSTOMER_CHANNEL_POLICY;const beforeOff=requests.length;
  await api(owner,prefix+'/phone/challenges',{phone:owner.phone,confirmed:true},503);assert.equal(requests.length,beforeOff);configure();
  pass('default email retained; optional channels off; private HTTP routes and strict account-bound input');

  const first=await challenge(owner),code=challengeCode(first.challengeId);
  await api(other,prefix+'/phone/challenges/'+first.challengeId+'/verify',{code,confirmed:true},400);
  const verified=await api(owner,prefix+'/phone/challenges/'+first.challengeId+'/verify',{code,confirmed:true});assert.equal(verified.phoneVerified,true);assert.equal(verified.sms,false);
  await api(owner,prefix+'/phone/challenges/'+first.challengeId+'/verify',{code,confirmed:true},400);
  const [stored]=await db.$queryRaw`SELECT * FROM "CustomerPhoneChallenge" WHERE id=${first.challengeId}`;
  assert(!JSON.stringify(stored).includes(owner.phone));assert.notEqual(stored.codeHash,code);assert.equal(stored.state,'CONSUMED');
  assert(!JSON.stringify(await get(owner)).includes(owner.phone));
  pass('OTP proves the exact account/session phone without opting in; no clear phone/code persisted or returned; replay rejected');

  const locked=await fixture(),bad=await challenge(locked),badCode=challengeCode(bad.challengeId),wrong=badCode==='000000'?'111111':'000000';
  for(let i=0;i<5;i++)await api(locked,prefix+'/phone/challenges/'+bad.challengeId+'/verify',{code:wrong,confirmed:true},400);
  await api(locked,prefix+'/phone/challenges/'+bad.challengeId+'/verify',{code:badCode,confirmed:true},400);
  assert.deepEqual(await db.$queryRaw`SELECT attempts,state FROM "CustomerPhoneChallenge" WHERE id=${bad.challengeId}`,[{attempts:5,state:'EXPIRED'}]);
  const expired=await challenge(locked);await db.$executeRaw`UPDATE "CustomerPhoneChallenge" SET "expiresAt"=to_timestamp(0) WHERE id=${expired.challengeId}`;
  await api(locked,prefix+'/phone/challenges/'+expired.challengeId+'/verify',{code:challengeCode(expired.challengeId),confirmed:true},400);
  const stale=await challenge(locked);await save(locked,{email:false});
  await api(locked,prefix+'/phone/challenges/'+stale.challengeId+'/verify',{code:challengeCode(stale.challengeId),confirmed:true},400);
  await api(locked,prefix+'/phone/challenges',{phone:locked.phone,confirmed:true},403);
  pass('five finite attempts, code expiry, preference revision invalidation and account/phone hourly quota');

  const revoked=await fixture(),pending=await challenge(revoked);await db.session.update({where:{id:revoked.sessionId},data:{revokedAt:new Date()}});
  await api(revoked,prefix+'/phone/challenges/'+pending.challengeId+'/verify',{code:challengeCode(pending.challengeId),confirmed:true},401);
  const a=await fixture(),b=await fixture();configuredPhones.push(a.phone);configure();const ca=await challenge(a),cb=await challenge(b,a.phone);
  const samePhone=await Promise.all([a,b].map((actor,i)=>fetch(base+prefix+'/phone/challenges/'+[ca,cb][i].challengeId+'/verify',{method:'POST',headers:{authorization:'Bearer '+actor.token,'Content-Type':'application/json'},body:JSON.stringify({code:challengeCode([ca,cb][i].challengeId),confirmed:true})}).then(r=>r.status)));
  assert.deepEqual(samePhone.sort(),[200,400]);
  pass('revoked sessions cannot prove a number; simultaneous different accounts cannot claim the same verified phone');

  await save(owner,{sms:true,whatsapp:true,push:true});const pushToken='ExpoPushToken[synthetic-owner-device]';
  await api(owner,'/notifications/device/register',{token:pushToken});const [binding]=await device(owner);assert(binding.pushRegistrationId);
  await api(owner,'/notifications/device/register',{token:pushToken});assert.equal((await device(owner))[0].pushRegistrationId,binding.pushRegistrationId);
  const confirmed=await booking(owner);await db.notification.create({data:{accountId:owner.id,type:'BOOKING_CONFIRMED',status:'SENT',payload:{bookingId:confirmed.id}}});assert.equal((await rows(confirmed.id)).length,3);
  await db.notification.create({data:{accountId:other.id,type:'BOOKING_CONFIRMED',status:'SENT',payload:{bookingId:confirmed.id}}});assert.equal((await rows(confirmed.id)).length,3);
  const draft=await invoice(owner,false);assert.equal((await rows(draft.id)).length,0);
  await db.storeInvoice.update({where:{id:draft.invoiceId},data:{status:'ISSUED'}});await db.storeInvoice.update({where:{id:draft.invoiceId},data:{status:'PAID'}});assert.equal((await rows(draft.id)).length,3);
  const fake=randomUUID();await db.notification.create({data:{accountId:owner.id,type:'INVOICE_ISSUED',status:'SENT',payload:{sourceType:'STORE_ORDER',sourceId:fake}}});assert.equal((await rows(fake)).length,0);
  pass('canonical confirmed booking and issued invoice enqueue once per channel/device; draft, replay and foreign sources excluded');

  const fresh=await api(null,'/auth/refresh',{refreshToken:owner.refreshToken});owner.refreshToken=fresh.refreshToken;owner.token=fresh.accessToken;owner.sessionId=(await app.get(AuthService).authenticateAccessToken(fresh.accessToken)).sessionId;
  assert.equal((await device(owner))[0].pushRegistrationId,binding.pushRegistrationId);
  const budgets=await Promise.all(['SMS','WHATSAPP','PUSH'].map(budget));
  await Promise.all([newWorker().poll(),newWorker().poll(),newWorker().poll()]);
  for(const id of [confirmed.id,draft.id])assert((await rows(id)).every(r=>r.state==='PROVIDER_ACCEPTED'));
  for(const channel of ['SMS','WHATSAPP','PUSH'])assert.equal(eventSends(channel).length,2);
  assert.deepEqual(await Promise.all(['SMS','WHATSAPP','PUSH'].map(budget)),budgets.map(v=>v+4));
  const payload=eventSends('PUSH')[0].body[0];assert.equal(payload.ttl,0);assert.equal(payload.data,undefined);assert(!JSON.stringify(payload).includes(confirmed.id));
  assert(!JSON.stringify(await api(owner,prefix+'/deliveries')).includes('providerId'));assert.deepEqual((await api(other,prefix+'/deliveries')).items,[]);
  pass('parallel workers make one bounded attempt; native refresh preserves device identity; payload and customer history remain private');

  for(const entry of eventSends('SMS'))await dlr(entry,{destinationAddress:other.phone.slice(1)});
  await due(confirmed.id);await due(draft.id);await newWorker().poll();
  assert((await rows(confirmed.id)).find(r=>r.channel==='SMS').state==='PROVIDER_ACCEPTED');
  for(const entry of eventSends('SMS'))await Promise.all([dlr(entry),dlr(entry)]);
  await due(confirmed.id);await due(draft.id);await newWorker().poll();
  for(const id of [confirmed.id,draft.id]){
    const delivered=await rows(id);assert.equal(delivered.find(r=>r.channel==='SMS').state,'PROVIDER_DELIVERED');assert.equal(delivered.find(r=>r.channel==='WHATSAPP').state,'PROVIDER_DELIVERED');assert.equal(delivered.find(r=>r.channel==='PUSH').state,'PUSH_SERVICE_CONFIRMED');
  }
  const sendsAfterReceipts=requests.length;await newWorker().poll();assert.equal(requests.length,sendsAfterReceipts);
  pass('SMS DLR exact recipient/reference and replay, WhatsApp exact status record and Expo service receipt reconciled without claiming device display');

  const quietNow=new Date();const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(quietNow);
  const minute=Number(parts.find(x=>x.type==='hour').value)*60+Number(parts.find(x=>x.type==='minute').value);
  await save(owner,{quietStart:(minute+1439)%1440,quietEnd:(minute+2)%1440});const quiet=await booking(owner),beforeQuiet=requests.length,beforeBudget=await budget('SMS');
  await newWorker().poll();assert.equal(requests.length,beforeQuiet);assert.equal(await budget('SMS'),beforeBudget);assert((await rows(quiet.id)).every(r=>r.reason==='QUIET_HOURS'));
  await save(owner,{quietStart:null,quietEnd:null});await due(quiet.id);await newWorker().poll();assert((await rows(quiet.id)).every(r=>r.state==='SUPPRESSED'));
  assert.equal(isQuiet({quietStart:1320,quietEnd:420,timeZone:'UTC'},new Date('2026-01-01T23:00:00Z')),true);
  assert.equal(isQuiet({quietStart:1320,quietEnd:420,timeZone:'UTC'},new Date('2026-01-01T12:00:00Z')),false);
  pass('quiet hours defer without spend; changed consent invalidates queued snapshots; overnight time windows work');

  const cancelled=await booking(owner),voided=await invoice(owner);await db.booking.update({where:{id:cancelled.id},data:{status:'CANCELLED'}});await db.storeInvoice.update({where:{id:voided.invoiceId},data:{status:'VOID'}});
  const beforeNative=requests.length;await newWorker().poll();assert.equal(requests.length,beforeNative);for(const id of [cancelled.id,voided.id])assert((await rows(id)).every(r=>r.state==='SUPPRESSED'&&r.reason==='SOURCE_UNAVAILABLE'));
  pass('cancelled booking and voided original invoice suppress all channels at the final native-source check');

  await save(owner,{sms:true,whatsapp:false,push:false});const budgetA=await booking(owner),budgetB=await booking(owner),already=await budget('SMS'),smsBefore=eventSends('SMS').length;
  process.env.HYDROLAND_CUSTOMER_CHANNEL_SMS_MONTHLY_CAP_HALALAS=String(already+2);await Promise.all([newWorker().poll(),newWorker().poll()]);
  assert.equal(eventSends('SMS').length,smsBefore+1);assert.equal(await budget('SMS'),already+2);
  const budgetRows=[...(await rows(budgetA.id)),...(await rows(budgetB.id))];assert.equal(budgetRows.filter(r=>r.reason==='BUDGET_LIMIT'&&r.state==='PENDING').length,1);configure();
  await db.$executeRaw`UPDATE "CustomerChannelDispatch" SET state='SUPPRESSED' WHERE reason='BUDGET_LIMIT'`;
  pass('parallel events cannot exceed the approved monthly cap; no unbudgeted provider attempt');

  await save(owner,{sms:false,whatsapp:true,push:false});const uncertain=await booking(owner);uncertainNext='WHATSAPP';const waBefore=eventSends('WHATSAPP').length;
  await newWorker().poll();assert.equal((await rows(uncertain.id))[0].state,'REVIEW_REQUIRED');await due(uncertain.id);await newWorker().poll();assert.equal(eventSends('WHATSAPP').length,waBefore+1);
  const abandoned=await booking(owner);await db.$executeRaw`UPDATE "CustomerChannelDispatch" SET state='RESERVED',"updatedAt"=to_timestamp(0) WHERE "sourceId"=${abandoned.id}`;await newWorker().poll();assert.equal((await rows(abandoned.id))[0].state,'REVIEW_REQUIRED');
  const mismatch=await booking(owner);await newWorker().poll();const [mismatchRow]=await rows(mismatch.id);receipts.set(mismatchRow.providerId,{...receipts.get(mismatchRow.providerId),referenceId:'hydroland-notice/'+randomUUID()});await due(mismatch.id);await newWorker().poll();assert.equal((await rows(mismatch.id))[0].state,'REVIEW_REQUIRED');
  pass('unknown transport outcome and abandoned reservation never resend; a foreign WhatsApp reference cannot confirm delivery');

  await save(owner,{sms:false,whatsapp:false,push:true});const duplicate=await booking(owner),oldPush=(await rows(confirmed.id)).find(r=>r.channel==='PUSH');reuseNext=oldPush.providerId;
  await newWorker().poll();assert.equal((await rows(duplicate.id))[0].reason,'PROVIDER_ID_REUSED');assert.equal((await rows(confirmed.id)).find(r=>r.channel==='PUSH').state,'REVIEW_REQUIRED');
  const missing=await booking(owner);await newWorker().poll();const [missingRow]=await rows(missing.id);receipts.delete(missingRow.providerId);await db.$executeRaw`UPDATE "CustomerChannelDispatch" SET "receiptChecks"=12,"nextAttemptAt"=to_timestamp(0) WHERE id=${missingRow.id}`;await newWorker().poll();assert.equal((await rows(missing.id))[0].reason,'RECEIPT_UNCONFIRMED');
  pass('a reused provider ticket invalidates both associations; missing receipt checks are finite and never resend');

  const acceptedBeforeLogout=await booking(owner);await newWorker().poll();const [late]=await rows(acceptedBeforeLogout.id);const queuedBeforeLogout=await booking(owner);
  await api(null,'/auth/logout',{refreshToken:owner.refreshToken},204);assert.deepEqual((await device(owner))[0],{pushRegistrationId:null,pushTokenHash:null,pushTokenCiphertext:null});
  await api(other,'/notifications/device/register',{token:pushToken});const switched=(await device(other))[0];receipts.set(late.providerId,{status:'error',details:{error:'DeviceNotRegistered'}});
  await due(acceptedBeforeLogout.id);const pushBefore=eventSends('PUSH').length;await newWorker().poll();assert.equal(eventSends('PUSH').length,pushBefore);assert.equal((await rows(queuedBeforeLogout.id))[0].reason,'DEVICE_REVOKED');assert.deepEqual((await device(other))[0],switched);
  pass('logout clears native enrollment, queued push is suppressed, late rejection cannot revoke the next account device');

  await db.roleAssignment.create({data:{accountId:other.id,role:'ADMIN',status:'ACTIVE'}});const review=await api(other,'/admin/customer-channel-deliveries');assert(review.items.some(r=>r.id===mismatchRow.id));
  const closed=await api(other,'/admin/customer-channel-deliveries/'+mismatchRow.id+'/close',{reason:'Reviewed synthetic ambiguous attempt without resend.',confirmed:true});assert.equal(closed.resend,false);assert.equal(closed.state,'SUPPRESSED');
  await api(other,'/admin/customer-channel-deliveries/'+mismatchRow.id+'/close',{reason:'Do not duplicate this close.',confirmed:true},409);
  pass('active administrator can close an audited review without resending or claiming delivery');

  const emailOwner=await fixture();await db.customerNoticeEmail.updateMany({data:{state:'SUPPRESSED'}});
  process.env.HYDROLAND_CUSTOMER_EMAIL_MONTHLY_CAP_HALALAS='10000';process.env.HYDROLAND_CUSTOMER_EMAIL_MAX_ATTEMPT_HALALAS='2';delete process.env.HYDROLAND_EMAIL_TEST_RECIPIENT;
  const emailRequests=[];let holdEmail;
  const email={publicConfig:()=>({enabled:true}),sendCustomerNotice:async input=>{emailRequests.push(input);if(holdEmail){const h=holdEmail;holdEmail=null;h.entered();await h.wait;}return {messageId:randomUUID()};}};
  const mailWorker=()=>new CustomerNoticeEmailWorker(db,email);
  await booking(emailOwner);await mailWorker().poll();assert.equal(emailRequests.length,1,'Existing no-preference email must still send');
  await save(emailOwner,{email:false});await booking(emailOwner);await mailWorker().poll();assert.equal(emailRequests.length,1);
  await save(emailOwner,{email:true,quietStart:(minute+1439)%1440,quietEnd:(minute+2)%1440});const quietEmail=await booking(emailOwner);await mailWorker().poll();assert.equal(emailRequests.length,1);
  await db.customerNoticeEmail.updateMany({where:{sourceId:quietEmail.id},data:{state:'SUPPRESSED'}});await save(emailOwner,{quietStart:null,quietEnd:null});
  const mailRace=await booking(emailOwner);let entered,release;const enteredPromise=new Promise(r=>{entered=r;}),wait=new Promise(r=>{release=r;});holdEmail={entered,wait};
  pendingReleases.push(release);const sending=mailWorker().poll();await within(enteredPromise);let preferenceCommitted=false;const withdrawing=save(emailOwner,{email:false}).then(r=>{preferenceCommitted=true;return r;});
  await new Promise(r=>setTimeout(r,40));assert.equal(preferenceCommitted,false,'Withdrawal must serialize with the already-started provider request');release();await sending;await withdrawing;
  assert.equal((await db.customerNoticeEmail.findFirstOrThrow({where:{sourceId:mailRace.id}})).state,'PROVIDER_ACCEPTED');
  await booking(emailOwner);await mailWorker().poll();assert.equal(emailRequests.length,2);
  pass('existing email defaults preserved; explicit opt-out and quiet hours respected; concurrent withdrawal serializes with a current send');

  const nativeOwner=await fixture();await prove(nativeOwner);await save(nativeOwner,{whatsapp:true});const nativeInvoice=await invoice(nativeOwner),gate=hold('WHATSAPP');
  const nativeSending=newWorker().poll();await within(gate.started);let voidCommitted=false;
  const voiding=db.storeInvoice.update({where:{id:nativeInvoice.invoiceId},data:{status:'VOID'}}).then(()=>{voidCommitted=true;});await new Promise(r=>setTimeout(r,40));assert.equal(voidCommitted,false);gate.release();await nativeSending;await voiding;
  const pendingPhone=await booking(nativeOwner);const p=await get(nativeOwner);await api(nativeOwner,prefix+'/phone/remove',{expectedRevision:p.revision,confirmed:true});const beforeRemove=requests.length;await newWorker().poll();assert.equal(requests.length,beforeRemove);assert.equal((await rows(pendingPhone.id))[0].state,'SUPPRESSED');
  pass('native invoice void waits for an in-flight checked send; removing the verified phone suppresses queued notices');
  console.log(`PASS ${groups} actual HTTP/PostgreSQL customer-channel groups; no real provider traffic, device receipt, or human acceptance asserted.`);
}finally{
  for(const release of pendingReleases)release();
  globalThis.fetch=nativeFetch;
  if(app)await app.close();
}
