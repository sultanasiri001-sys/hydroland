'use strict';

// Real PostgreSQL triggers and worker decisions, with synthetic PDFs and a
// recording-only transport. Every fixture is rolled back; no provider is contacted.
const assert = require('node:assert/strict');
const {randomUUID, createHash} = require('node:crypto');
const {PrismaClient} = require('@prisma/client');
const {PDFDocument} = require('pdf-lib');
const {captureTripBookingContract} = require('../dist/commerce/trip-booking-contract');
const {AccountInvoicesService} = require('../dist/payments/account-invoices.service');
const {OrganizationBookingInvoiceService} = require('../dist/payments/organization-booking-invoice.service');
const {CustomerNoticeEmailWorker} = require('../dist/integrations/customer-notice-email.worker');

const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const prisma = new PrismaClient();
const rollback = new Error('ROLLBACK_SYNTHETIC_ORGANIZATION_INVOICE_NOTICES');
const environmentKeys = ['HYDROLAND_CUSTOMER_EMAIL_MONTHLY_CAP_HALALAS', 'HYDROLAND_CUSTOMER_EMAIL_MAX_ATTEMPT_HALALAS',
  'HYDROLAND_EMAIL_FROM', 'HYDROLAND_EMAIL_TEST_RECIPIENT'];
const priorEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
process.env.HYDROLAND_CUSTOMER_EMAIL_MONTHLY_CAP_HALALAS = '100';
process.env.HYDROLAND_CUSTOMER_EMAIL_MAX_ATTEMPT_HALALAS = '1';
process.env.HYDROLAND_EMAIL_FROM = 'Synthetic <sender@example.invalid>';
delete process.env.HYDROLAND_EMAIL_TEST_RECIPIENT;

async function run(tx) {
  const db = {serializable: fn => fn(tx), $transaction: fn => fn(tx), $queryRaw: tx.$queryRaw.bind(tx),
    $executeRaw: tx.$executeRaw.bind(tx), account: tx.account, customerNoticeEmail: tx.customerNoticeEmail};
  const original = new AccountInvoicesService(db), finalizer = new OrganizationBookingInvoiceService(db);
  const actors = [];
  for (const name of ['buyer','accountant','payer','independent']) {
    actors.push(await tx.account.create({data:{email:randomUUID()+'@example.invalid',passwordHash:'fixture',
      status:'ACTIVE',emailVerifiedAt:new Date(),person:{create:{firstName:'Synthetic',lastName:name}}}}));
  }
  const [buyer, accountant, payer, independent] = actors;
  const seller = await tx.organization.create({data:{ownerId:accountant.id,kind:'DIVE_CENTER',status:'ACTIVE',
    displayName:'Synthetic supplier',legalName:'Synthetic supplier',address:'Synthetic address',registrationNumber:'SYNTHETIC-'+randomUUID()}});
  const org = await tx.organization.create({data:{ownerId:buyer.id,kind:'COMPANY',status:'ACTIVE',
    displayName:'Synthetic purchaser',legalName:'Synthetic purchaser',address:'Synthetic buyer address'}});
  await tx.organizationMember.create({data:{organizationId:org.id,accountId:buyer.id,status:'ACTIVE',role:'OWNER'}});
  await tx.roleAssignment.create({data:{accountId:buyer.id,role:'ORGANIZATION',status:'ACTIVE'}});
  const center = await tx.orgUnit.create({data:{organizationId:seller.id,type:'CENTER',code:'B12-NOTICE',nameAr:'مركز اختبار'}});
  const position = await tx.position.create({data:{orgUnitId:center.id,code:'CENTER_ACCOUNTANT',titleAr:'محاسب'}});
  await tx.employment.create({data:{organizationId:seller.id,orgUnitId:center.id,positionId:position.id,
    accountId:accountant.id,workerClass:'EMPLOYEE',status:'ACTIVE'}});
  await tx.operationalSetting.create({data:{key:'organization-financial-profile:'+seller.id,
    value:{currency:'SAR',taxStatus:'EXEMPT',registrationStatus:'REGISTERED',revision:1}}});
  const ledgerAccount = await tx.financeAccount.create({data:{organizationId:seller.id,name:'Synthetic collection',currency:'SAR'}});
  const pdf = await PDFDocument.create();pdf.addPage().drawText('SYNTHETIC INVOICE NOTICE ACCEPTANCE');
  const bytes = Buffer.from(await pdf.save()), sha256 = createHash('sha256').update(bytes).digest('hex');
  const file = {buffer:bytes,mimetype:'application/pdf'};

  async function fixture({organizational=true, status='DRAFT', collection=true}={}) {
    const now = new Date(), bookingId = randomUUID();
    const trip = await tx.trip.create({data:{title:'Synthetic invoice notice trip',type:'SHORE_DIVE',status:'OPEN',capacity:2,
      startsAt:new Date(now.getTime()+86400000),endsAt:new Date(now.getTime()+90000000),organizationId:seller.id}});
    const originalContract = captureTripBookingContract({bookingId,accountId:buyer.id,buyerOrganizationId:organizational?org.id:null,
      seats:1,createdAt:now,price:{pricePerSeatMinor:10000,currency:'SAR',configured:true},trip:{...trip,organization:seller}});
    const booking = await tx.booking.create({data:{id:bookingId,tripId:trip.id,accountId:buyer.id,
      organizationId:organizational?org.id:null,seats:1,contractSnapshot:originalContract}});
    const contract = {...originalContract,termsAcceptanceStatus:'ACCEPTED',termsAcceptedAt:now.toISOString(),
      acceptedQuoteHash:createHash('sha256').update(JSON.stringify(originalContract)).digest('hex'),
      ...(organizational?{organizationPaymentAuthorization:{source:'ORGANIZATION_BOOKING_PREPAYMENT',
        buyerOrganizationId:org.id,bookingId,delegateAccountId:payer.id}}:{})};
    const payment = await tx.payment.create({data:{bookingId,accountId:organizational?payer.id:buyer.id,amountMinor:10000,currency:'SAR',
      status:'CAPTURED',idempotencyKey:randomUUID(),providerReference:randomUUID(),moyasarPaymentId:randomUUID(),contractSnapshot:contract}});
    const invoice = await tx.invoice.create({data:{paymentId:payment.id,number:'SYNTHETIC-'+randomUUID(),status,
      ...(status==='DRAFT'?{}:{issuedAt:now}),contractSnapshot:contract}});
    const key = {sourceType:'TRIP_PAYMENT',sourceId:payment.id};
    if (organizational && collection) {
      const entry = await tx.financeEntry.create({data:{organizationId:seller.id,financeAccountId:ledgerAccount.id,
        type:'REVENUE',status:'POSTED',amountMinor:10000,currency:'SAR',referenceType:'TRIP_PAYMENT_COLLECTION',referenceId:payment.id,
        requestedByAccountId:payer.id,approvedByAccountId:independent.id,postedByAccountId:accountant.id,approvedAt:now,postedAt:now,
        approvals:{create:{requestedByAccountId:payer.id,decidedByAccountId:independent.id,status:'APPROVED',decidedAt:now}}}});
      await tx.commerceCollectionEvidence.create({data:{sourceType:'ORGANIZATION_BOOKING_PREPAYMENT',sourceId:booking.id,
        organizationId:seller.id,customerAccountId:payer.id,amountMinor:10000,currency:'SAR',provider:'MOYASAR',
        providerPaymentId:payment.moyasarPaymentId,providerInvoiceId:payment.providerReference,providerCapturedMinor:10000,
        providerRefundedMinor:0,providerVerifiedAt:now,providerSnapshot:{paymentId:payment.id},financeEntryId:entry.id,contractSnapshot:contract}});
    }
    return {booking,payment,invoice,key};
  }
  const mailWhere = (sourceId, sourceType='TRIP_PAYMENT') => ({event:'INVOICE_ISSUED',sourceType,sourceId,accountId:buyer.id});
  const inboxWhere = sourceId => ({type:'INVOICE_ISSUED',accountId:buyer.id,payload:{path:['sourceId'],equals:sourceId}});
  const counts = async sourceId => [await tx.customerNoticeEmail.count({where:mailWhere(sourceId)}),await tx.notification.count({where:inboxWhere(sourceId)})];
  async function approve(row) {
    const preview = await finalizer.preview(accountant.id,row.payment.id);
    assert.equal(preview.canFinalize,true,JSON.stringify(preview.blockers));
    const input = {issuedAt:new Date(Date.now()-1000).toISOString(),expectedEvidenceHash:preview.expectedEvidenceHash,originalInvoiceVerified:true};
    const receipt = await finalizer.finalize(accountant.id,row.payment.id,input);
    assert.equal(receipt.status,'FINALIZED');
    return input;
  }

  const current = await fixture();
  await original.attach(accountant.id,current.key,'ORG-'+randomUUID(),file);
  assert.deepEqual(await counts(current.payment.id),[0,0],'An organizational DRAFT PDF must not announce issuance');
  const input = await approve(current);
  assert.deepEqual(await counts(current.payment.id),[1,1],'Native PAID after finalization must queue one intended invoice notice');
  await finalizer.finalize(accountant.id,current.payment.id,input);
  await tx.invoice.update({where:{id:current.invoice.id},data:{status:'PAID'}});
  assert.deepEqual(await counts(current.payment.id),[1,1],'Replays must preserve one inbox and email record');

  // A draft upload from an older version may already have a pending email.
  const legacyDraft = await fixture();
  await original.attach(accountant.id,legacyDraft.key,'ORG-LEGACY-DRAFT-'+randomUUID(),file);
  const priorInbox = await tx.notification.create({data:{accountId:buyer.id,type:'INVOICE_ISSUED',status:'SENT',
    payload:{sourceType:'TRIP_PAYMENT',sourceId:legacyDraft.payment.id,title:'Synthetic historical notice'}}});
  const queued = await tx.customerNoticeEmail.create({data:{...mailWhere(legacyDraft.payment.id),attempts:1,nextAttemptAt:new Date(0)}});
  const recorded = [];
  const transport = {async sendCustomerNotice(message){recorded.push(message);return {messageId:randomUUID()};}};
  const worker = new CustomerNoticeEmailWorker(db,transport);
  const budgetBefore = await tx.customerNoticeEmailBudget.findMany();
  await worker.deliver(queued);
  assert.equal(recorded.length,0,'An organizational draft must never reach the transport');
  const deferred = await tx.customerNoticeEmail.findUniqueOrThrow({where:{id:queued.id}});
  assert.equal(deferred.state,'PENDING');assert.equal(deferred.firstAttemptAt,null);assert.equal(deferred.providerMessageId,null);
  assert(deferred.nextAttemptAt > new Date());
  assert.equal(deferred.createdAt.getTime(),queued.createdAt.getTime());
  assert.deepEqual(await tx.customerNoticeEmailBudget.findMany(),budgetBefore,'Draft deferral must not charge the mail budget');
  assert(await tx.notification.findUnique({where:{id:priorInbox.id}}),'Historical inbox evidence remains intact');
  await approve(legacyDraft);
  assert.deepEqual(await counts(legacyDraft.payment.id),[1,1]);
  await worker.deliver(await tx.customerNoticeEmail.findUniqueOrThrow({where:{id:queued.id}}));
  assert.equal(recorded.length,1);assert.equal(recorded[0].to,buyer.email);
  assert.equal((await tx.customerNoticeEmail.findUniqueOrThrow({where:{id:queued.id}})).state,'PROVIDER_ACCEPTED');
  await worker.deliver(await tx.customerNoticeEmail.findUniqueOrThrow({where:{id:queued.id}}));
  assert.equal(recorded.length,1,'The preserved outbox identity must not send twice');

  const personal = await fixture({organizational:false,collection:false});
  await original.attach(accountant.id,personal.key,'PERSONAL-'+randomUUID(),file);
  assert.deepEqual(await counts(personal.payment.id),[1,1],'Personal PDF issuance keeps its existing behavior');
  const legacyIssued = await fixture({status:'ISSUED',collection:false});
  assert.equal(await tx.organizationBookingInvoiceFinalization.count({where:{paymentId:legacyIssued.payment.id}}),0);
  assert.deepEqual(await counts(legacyIssued.payment.id),[1,1],'Previously issued organization invoices need no replacement finalization');
  await worker.deliver(await tx.customerNoticeEmail.findFirstOrThrow({where:mailWhere(legacyIssued.payment.id)}));
  assert.equal(recorded.length,2,'The worker must continue to accept a native-issued legacy invoice');

  const order = await tx.storeOrder.create({data:{accountId:buyer.id,totalMinor:10000}});
  const storePayment = await tx.storePayment.create({data:{orderId:order.id,accountId:buyer.id,amountMinor:10000,idempotencyKey:randomUUID()}});
  const storeInvoice = await tx.storeInvoice.create({data:{paymentId:storePayment.id,number:'STORE-'+randomUUID(),status:'DRAFT'}});
  await tx.accountInvoiceDocument.create({data:{sourceType:'STORE_ORDER',sourceId:order.id,sellerId:seller.id,
    number:storeInvoice.number,content:bytes,sha256,attachedBy:accountant.id}});
  await tx.storeInvoice.update({where:{id:storeInvoice.id},data:{status:'PAID'}});
  assert.equal(await tx.customerNoticeEmail.count({where:mailWhere(order.id,'STORE_ORDER')}),1);
  assert.equal(await tx.notification.count({where:inboxWhere(order.id)}),1);
  assert.equal(recorded.length,2,'All transport calls use the recording-only test double');
}

(async()=>{
  try {
    try {await prisma.$transaction(async tx=>{await run(tx);throw rollback;},{timeout:60000,isolationLevel:'Serializable'});}
    catch(error){if(error!==rollback)throw error;}
    console.log('PASS B12 invoice notice: draft PDF = 0, accountant finalization = 1, replay = 1; legacy draft held without send or budget and resumed once; legacy issued, personal and store behavior preserved.');
  } finally {
    await prisma.$disconnect();
    for(const key of environmentKeys){if(priorEnvironment[key]===undefined)delete process.env[key];else process.env[key]=priorEnvironment[key];}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
