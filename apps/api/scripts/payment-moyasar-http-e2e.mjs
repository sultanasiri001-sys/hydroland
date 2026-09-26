import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const db=new PrismaClient();
const base=process.env.PAYMENT_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;
const providerSecret=process.env.MOYASAR_SECRET_KEY;
const webhookSecret=process.env.MOYASAR_WEBHOOK_SECRET;
if(!secret||!providerSecret||!webhookSecret)throw new Error('JWT_SECRET, MOYASAR_SECRET_KEY and MOYASAR_WEBHOOK_SECRET are required');
const suffix=Date.now().toString();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+1800})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`};
const auth=token=>({authorization:`Bearer ${token}`,'content-type':'application/json'});
const parseJson=async response=>{const body=await response.json().catch(()=>null);return{response,body}};
const expectOk=async response=>{const{body}=await parseJson(response);if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);return body};

let person=null,account=null,trip=null,booking=null,payment=null,providerServer=null;
const invoiceId='11111111-1111-4111-8111-111111111111';
let invoiceStatus='initiated';
let providerMetadata=null;
let createCalls=0,fetchCalls=0,cancelCalls=0;
const providerRequests=[];

try{
  providerServer=createServer(async(request,response)=>{
    const url=new URL(request.url||'/','http://127.0.0.1:3197');
    const expectedAuth=`Basic ${Buffer.from(`${providerSecret}:`).toString('base64')}`;
    providerRequests.push({method:request.method,path:url.pathname,authorization:request.headers.authorization});
    if(request.headers.authorization!==expectedAuth){response.writeHead(401,{'content-type':'application/json'});response.end(JSON.stringify({message:'unauthorized'}));return;}
    const readBody=()=>new Promise(resolve=>{let data='';request.on('data',chunk=>data+=chunk);request.on('end',()=>resolve(data?JSON.parse(data):{}));});
    if(request.method==='POST'&&url.pathname==='/v1/invoices'){
      createCalls+=1;const input=await readBody();providerMetadata=input.metadata;
      if(input.amount!==24690)throw new Error(`Provider received client-controlled amount: ${input.amount}`);
      if(input.currency!=='SAR')throw new Error(`Provider received unexpected currency: ${input.currency}`);
      response.writeHead(201,{'content-type':'application/json'});response.end(JSON.stringify({id:invoiceId,status:invoiceStatus,amount:input.amount,currency:input.currency,url:`https://pay.moyasar.test/invoices/${invoiceId}`,metadata:input.metadata}));return;
    }
    if(request.method==='GET'&&url.pathname===`/v1/invoices/${invoiceId}`){
      fetchCalls+=1;response.writeHead(200,{'content-type':'application/json'});response.end(JSON.stringify({id:invoiceId,status:invoiceStatus,amount:24690,currency:'SAR',url:`https://pay.moyasar.test/invoices/${invoiceId}`,metadata:providerMetadata}));return;
    }
    if(request.method==='PUT'&&url.pathname===`/v1/invoices/${invoiceId}/cancel`){cancelCalls+=1;response.writeHead(200,{'content-type':'application/json'});response.end(JSON.stringify({id:invoiceId,status:'canceled'}));return;}
    response.writeHead(404,{'content-type':'application/json'});response.end(JSON.stringify({message:'not found'}));
  });
  await new Promise((resolve,reject)=>{providerServer.once('error',reject);providerServer.listen(3197,'127.0.0.1',resolve)});

  person=await db.person.create({data:{firstName:'Payment',lastName:'E2E'}});
  account=await db.account.create({data:{personId:person.id,email:`payment-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});
  trip=await db.trip.create({data:{title:`Payment E2E ${suffix}`,type:'BOAT_DIVE',startsAt:new Date(Date.now()+86400000),endsAt:new Date(Date.now()+90000000),capacity:4,status:'OPEN'}});
  await db.operationalSetting.create({data:{key:`trip-price:${trip.id}`,value:{pricePerSeatMinor:12345,currency:'SAR'}}});
  booking=await db.booking.create({data:{tripId:trip.id,accountId:account.id,seats:2,status:'PENDING'}});
  const token=tokenFor(account.id);

  let response=await fetch(`${base}/payments`,{method:'POST',headers:auth(token),body:JSON.stringify({bookingId:booking.id,idempotencyKey:`payment-e2e:${suffix}`,amountMinor:1})});
  const created=await expectOk(response);payment=created;
  if(created.amountMinor!==24690||created.currency!=='SAR'||created.provider!=='MOYASAR'||created.providerReference!==invoiceId||created.status!=='PENDING')throw new Error(`Authoritative checkout mismatch: ${JSON.stringify(created)}`);
  if(createCalls!==1)throw new Error(`Expected one provider invoice creation, got ${createCalls}`);
  if(providerMetadata?.hydroland_payment_id!==created.id||providerMetadata?.hydroland_booking_id!==booking.id)throw new Error('Provider invoice metadata was not bound to local payment and booking');
  const persisted=await db.payment.findUniqueOrThrow({where:{id:created.id}});if(persisted.amountMinor!==24690)throw new Error('Client amount reached Payment persistence');

  response=await fetch(`${base}/payments`,{method:'POST',headers:auth(token),body:JSON.stringify({bookingId:booking.id,idempotencyKey:`payment-e2e:${suffix}`,amountMinor:999999})});
  const replay=await expectOk(response);if(replay.id!==created.id||replay.providerReference!==invoiceId||createCalls!==1)throw new Error('Payment idempotency created a duplicate provider invoice');

  const validWebhook=(id,type)=>({id,type,secret_token:webhookSecret,live:false,data:{invoice_id:invoiceId,amount:1,currency:'USD'}});
  response=await fetch(`${base}/payments/provider/moyasar/webhook`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(validWebhook('evt-payment-pending','payment_paid'))});
  const pendingWebhook=await expectOk(response);if(pendingWebhook.status!=='PENDING')throw new Error('Webhook event type overrode provider invoice state');
  const afterForgedEvent=await db.payment.findUniqueOrThrow({where:{id:created.id}});if(afterForgedEvent.status!=='PENDING')throw new Error('Forged webhook event mutated local payment state');

  response=await fetch(`${base}/payments/provider/moyasar/webhook`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...validWebhook('evt-payment-bad-secret','payment_paid'),secret_token:'wrong-secret'})});
  if(response.status!==401)throw new Error(`Invalid webhook secret expected 401, got ${response.status}`);

  providerMetadata={...providerMetadata,hydroland_payment_id:'tampered-local-id'};
  response=await fetch(`${base}/payments/${created.id}/refresh`,{method:'POST',headers:auth(token)});if(response.status!==409)throw new Error(`Provider metadata mismatch expected 409, got ${response.status}`);
  providerMetadata={hydroland_payment_id:created.id,hydroland_booking_id:booking.id};

  invoiceStatus='paid';
  response=await fetch(`${base}/payments/provider/moyasar/webhook`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(validWebhook('evt-payment-paid','payment_paid'))});
  const paidWebhook=await expectOk(response);if(paidWebhook.status!=='CAPTURED')throw new Error(`Verified paid provider invoice expected CAPTURED, got ${paidWebhook.status}`);
  const captured=await db.payment.findUniqueOrThrow({where:{id:created.id}});if(captured.status!=='CAPTURED')throw new Error('Verified provider paid state was not persisted');

  response=await fetch(`${base}/payments/${created.id}/refresh`,{method:'POST',headers:auth(token)});const refreshed=await expectOk(response);if(refreshed.status!=='CAPTURED'||refreshed.providerStatus!=='paid')throw new Error('Authenticated provider reconciliation did not preserve CAPTURED state');
  if(fetchCalls<4)throw new Error(`Expected provider GET verification across replay/webhooks/refresh, got ${fetchCalls}`);
  if(cancelCalls!==0)throw new Error('Normal idempotent payment flow unexpectedly cancelled an invoice');
  if(providerRequests.some(row=>row.authorization!==`Basic ${Buffer.from(`${providerSecret}:`).toString('base64')}`))throw new Error('Provider call used incorrect Basic authorization');

  console.log('Moyasar payment HTTP/DB E2E passed: server-owned pricing, provider metadata binding, idempotency, webhook secret enforcement, provider re-verification, tamper rejection and captured reconciliation.');
} finally {
  if(payment?.id)await db.auditEvent.deleteMany({where:{OR:[{resourceId:payment.id},{resource:'PaymentProviderWebhook'}]}}).catch(()=>{});
  if(payment?.id)await db.invoice.deleteMany({where:{paymentId:payment.id}}).catch(()=>{});
  if(booking?.id)await db.payment.deleteMany({where:{bookingId:booking.id}}).catch(()=>{});
  if(booking?.id)await db.bookingParticipant.deleteMany({where:{bookingId:booking.id}}).catch(()=>{});
  if(booking?.id)await db.booking.delete({where:{id:booking.id}}).catch(()=>{});
  if(trip?.id)await db.operationalSetting.deleteMany({where:{key:`trip-price:${trip.id}`}}).catch(()=>{});
  if(trip?.id)await db.trip.delete({where:{id:trip.id}}).catch(()=>{});
  if(account?.id){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.roleAssignment.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{});}
  if(person?.id)await db.person.delete({where:{id:person.id}}).catch(()=>{});
  if(providerServer)await new Promise(resolve=>providerServer.close(()=>resolve()));
  await db.$disconnect();
}
