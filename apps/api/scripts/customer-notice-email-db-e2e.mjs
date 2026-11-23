import {reconcileCustomerEmail} from './reconcile-customer-email.mjs';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const url=new URL(process.env.DATABASE_URL||'postgresql://missing');
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.pathname==='/commerce_notice_test','Requires disposable local commerce_notice_test');
const require=createRequire(import.meta.url);
const { DatabaseService }=require('../dist/database/database.service.js');
const { CustomerNoticeEmailWorker }=require('../dist/integrations/customer-notice-email.worker.js');
const { EmailDeliveryService }=require('../dist/integrations/email-delivery.service.js');
const { IntegrationService }=require('../dist/integrations/integration.service.js');
const { AccountInvoicesService }=require('../dist/payments/account-invoices.service.js');
const { NotificationsService }=require('../dist/notifications/notifications.service.js');
const db=new DatabaseService(), requests=[];
let rejectNext=true;
const provider=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  requests.push({key:req.headers['idempotency-key'],body:JSON.parse(raw)});
  if(rejectNext){rejectNext=false;res.writeHead(503);res.end('{}');return;}
  requests.at(-1).id=randomUUID(); res.end(JSON.stringify({id:requests.at(-1).id}));
});
provider.listen(0,'127.0.0.1');await once(provider,'listening');
Object.assign(process.env,{NODE_ENV:'test',HYDROLAND_INTEGRATION_EMAIL_STATUS:'SANDBOX',HYDROLAND_EMAIL_PROVIDER:'RESEND',
  RESEND_API_BASE_URL:'http://127.0.0.1:'+provider.address().port,RESEND_API_KEY:'local-fixture',
  HYDROLAND_EMAIL_FROM:'Hydroland <sender@example.invalid>',HYDROLAND_PUBLIC_WEB_ORIGIN:'https://web.example.invalid'});
process.env.HYDROLAND_CUSTOMER_EMAIL_MONTHLY_CAP_HALALAS='10';
process.env.HYDROLAND_CUSTOMER_EMAIL_MAX_ATTEMPT_HALALAS='2';
delete process.env.HYDROLAND_EMAIL_TEST_RECIPIENT;
const noopAudit={record:async()=>{}};
const email=new EmailDeliveryService(new IntegrationService(noopAudit),noopAudit);
const worker=()=>new CustomerNoticeEmailWorker(db,email);
const inbox=new NotificationsService(db), invoices=new AccountInvoicesService(db);
const fixtureAccount=()=>db.account.create({data:{email:randomUUID()+'@example.invalid',status:'ACTIVE',emailVerifiedAt:new Date(),
  person:{create:{firstName:'Synthetic',lastName:'Customer'}},passwordHash:'fixture'}});
try{
  const buyer=await fixtureAccount(),other=await fixtureAccount();
  const trip=await db.trip.create({data:{title:'Synthetic trip',type:'SHORE',capacity:4,startsAt:new Date(),endsAt:new Date(Date.now()+60_000)}});
  const booking=await db.booking.create({data:{accountId:buyer.id,tripId:trip.id,status:'CONFIRMED'}});
  const confirmation={accountId:buyer.id,type:'BOOKING_CONFIRMED',status:'SENT',payload:{bookingId:booking.id}};
  const notice=await db.notification.create({data:confirmation});
  await inbox.read(buyer.id,notice.id);
  await db.notification.create({data:{...confirmation,accountId:other.id,type:'TRIP_CREW_ASSIGNMENT'}});
  assert.equal(await db.customerNoticeEmail.count({where:{sourceId:booking.id}}),1);
  await Promise.all([worker().poll(),worker().poll()]);
  assert.equal(requests.length,1);
  await db.customerNoticeEmail.updateMany({where:{sourceId:booking.id},data:{nextAttemptAt:new Date(0)}});
  await worker().poll();
  assert.equal(requests.length,2);
  assert.equal(requests[0].key,requests[1].key);assert.deepEqual(requests[0].body,requests[1].body);
  assert.match(requests[1].body.subject,/تم تأكيد حجزك/);assert.deepEqual(requests[1].body.to,[buyer.email]);
  assert.equal((await db.customerNoticeEmail.findFirstOrThrow({where:{sourceId:booking.id}})).state,'PROVIDER_ACCEPTED');

  const order=await db.storeOrder.create({data:{accountId:buyer.id,totalMinor:500}});
  const payment=await db.storePayment.create({data:{orderId:order.id,accountId:buyer.id,amountMinor:500,idempotencyKey:randomUUID()}});
  const invoice=await db.storeInvoice.create({data:{paymentId:payment.id,number:'test-'+randomUUID(),status:'DRAFT'}});
  const invoiceNotices=()=>db.notification.findMany({where:{type:'INVOICE_ISSUED',accountId:buyer.id,payload:{path:['sourceId'],equals:order.id}}});
  assert.equal((await invoiceNotices()).length,0);
  await db.storeInvoice.update({where:{id:invoice.id},data:{status:'ISSUED'}});
  await db.storeInvoice.update({where:{id:invoice.id},data:{status:'PAID'}});
  const [issued]=await invoiceNotices();assert(issued);await inbox.read(buyer.id,issued.id);
  const key={sourceType:'STORE_ORDER',sourceId:order.id};
  assert.equal((await invoiceNotices()).length,1);
  assert.equal((await invoices.list(buyer.id,'purchases',0,key)).items[0].number,invoice.number);
  assert.equal((await invoices.list(other.id,'all',0,key)).items.length,0);
  process.env.HYDROLAND_EMAIL_TEST_RECIPIENT=other.email;
  await worker().poll();assert.equal(requests.length,2,'Trial must never reroute another customer’s invoice');
  delete process.env.HYDROLAND_EMAIL_TEST_RECIPIENT;
  await db.customerNoticeEmail.updateMany({where:{sourceId:order.id},data:{nextAttemptAt:new Date(0)}});
  await Promise.all([worker().poll(),worker().poll()]);
  assert.equal(requests.length,3);
  const delivered=requests.at(-1).body;
  assert.deepEqual(delivered.to,[buyer.email]);assert.match(delivered.subject,/صدرت فاتورتك/);
  const link=new URL(delivered.text.split('\n').at(-1));
  assert.equal(link.origin,'https://web.example.invalid');
  const params=new URLSearchParams(link.hash.slice(1));
  assert.deepEqual(Object.fromEntries(params),{notice:'invoice',...key});
  await worker().poll();assert.equal(requests.length,3);

  // An attached original and an issued native invoice describe the same purchase.
  await db.accountInvoiceDocument.create({data:{...key,sellerId:'fixture',number:invoice.number,content:Buffer.from('%PDF-fixture'),sha256:'fixture',attachedBy:buyer.id}});
  assert.equal((await invoiceNotices()).length,1);
  assert.equal(await db.customerNoticeEmail.count({where:{sourceId:order.id}}),1);
  // The real seller upload is itself an issuance event, including a first PDF on a draft.
  const seller=await fixtureAccount();
  const center=await db.organization.create({data:{ownerId:seller.id,displayName:'Fixture center',kind:'DIVE_CENTER',status:'ACTIVE'}});
  await db.organizationMember.create({data:{organizationId:center.id,accountId:seller.id,status:'ACTIVE',role:'OWNER'}});
  await db.roleAssignment.create({data:{accountId:seller.id,role:'DIVE_CENTER',status:'ACTIVE'}});
  const tripPayment=await db.payment.create({data:{bookingId:booking.id,accountId:buyer.id,amountMinor:500,idempotencyKey:randomUUID(),
    status:'CAPTURED',contractSnapshot:{issuer:{organizationId:center.id}}}});
  const docKey={sourceType:'TRIP_PAYMENT',sourceId:tripPayment.id};
  const {PDFDocument}=require('pdf-lib');
  const pdf=await PDFDocument.create();pdf.addPage();
  const file={buffer:Buffer.from(await pdf.save()),mimetype:'application/pdf'};
  const number='PDF-'+randomUUID();
  await invoices.attach(seller.id,docKey,number,file);
  await invoices.attach(seller.id,docKey,number,file);
  assert.equal(await db.customerNoticeEmail.count({where:{sourceId:tripPayment.id}}),1);
  await worker().poll();
  assert.equal(requests.length,4);assert.deepEqual(requests[3].body.to,[buyer.email]);
  assert.deepEqual(await invoices.download(buyer.id,docKey),file.buffer);
  await assert.rejects(()=>invoices.download(other.id,docKey),e=>e.getStatus()===404);
  // Four transport attempts (including the ambiguous first attempt) have reserved eight halalas.
  // Two additional purchases race for the final two halalas on the same monthly ledger.
  for (const account of [buyer, other]) {
    const extra = await db.booking.create({data:{accountId:account.id,tripId:trip.id,status:'CONFIRMED'}});
    await db.notification.create({data:{...confirmation,accountId:account.id,payload:{bookingId:extra.id}}});
  }
  await Promise.all([worker().poll(), worker().poll()]);
  assert.equal(requests.length, 5);
  const budget = await db.$queryRaw`SELECT "reservedHalalas" FROM "CustomerNoticeEmailBudget"`;
  assert.deepEqual(budget, [{reservedHalalas:10}]);
  const waiting = await db.customerNoticeEmail.findMany({where:{state:'PENDING'}});
  assert.equal(waiting.length, 1);
  assert.equal(waiting[0].firstAttemptAt, null);
  async function retryWaiting() {
    await db.customerNoticeEmail.update({where:{id:waiting[0].id},data:{nextAttemptAt:new Date(0)}});
    await worker().poll();
  }
  delete process.env.HYDROLAND_CUSTOMER_EMAIL_MAX_ATTEMPT_HALALAS;
  await retryWaiting();
  assert.equal(requests.length, 5);
  process.env.HYDROLAND_CUSTOMER_EMAIL_MAX_ATTEMPT_HALALAS='2';
  process.env.HYDROLAND_CUSTOMER_EMAIL_MONTHLY_CAP_HALALAS='12';
  await retryWaiting();
  assert.equal(requests.length, 6);
  for (const [sourceId, sent] of [[booking.id, requests[1]],[order.id,requests[2]]]) {
    const outbox=await db.customerNoticeEmail.findFirstOrThrow({where:{sourceId}});
    assert.equal(outbox.providerMessageId,sent.id);
    const receipt=async (target,opts)=>{
      assert.equal(target,'https://api.resend.com/emails/'+sent.id);assert.equal(opts.method,'GET');
      return Response.json({object:'email',id:sent.id,to:sent.body.to,cc:[],bcc:[],last_event:'delivered'});
    };
    assert.equal(await reconcileCustomerEmail(db,outbox.id,'fixture',receipt),'RECORDED');
    assert.equal(await reconcileCustomerEmail(db,outbox.id,'fixture',()=>assert.fail('extra lookup')),'ALREADY_RECORDED');
    assert.equal(await db.auditEvent.count({where:{resourceId:outbox.id,action:'customer_email.provider_delivered'}}),1);
  }
  const ledger=await db.$queryRaw`SELECT "reservedHalalas" FROM "CustomerNoticeEmailBudget"`;
  assert.deepEqual(ledger,[{reservedHalalas:12}]); assert.equal(requests.length,6);
  console.log('PASS booking and invoice: source, recipient inbox, budgeted send, stored provider ID, matched delivery receipt, single audit, unchanged cost on replay.');
  console.log('PASS: customer inbox, booking email, issued invoice link, recipient isolation, restricted trial, concurrent workers and replay.');
}finally{await db.$disconnect();provider.closeAllConnections();await new Promise(resolve=>provider.close(resolve));}
