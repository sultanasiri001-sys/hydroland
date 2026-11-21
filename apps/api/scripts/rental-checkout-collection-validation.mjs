import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';

assert.notEqual(process.env.NODE_ENV,'production','Acceptance fixtures must never run in production');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname),'A disposable loopback database is required');
const dist=process.env.RENTAL_COLLECTION_TEST_DIST||fileURLToPath(new URL('../dist/',import.meta.url));
const load=file=>import(pathToFileURL(join(dist,file)));
const {DatabaseService}=await load('database/database.service.js');
const {AuditService}=await load('audit/audit.service.js');
const {NotificationsService}=await load('notifications/notifications.service.js');
const {EquipmentRentalService}=await load('trips/equipment-rental.service.js');
const {EquipmentRentalHandoverService}=await load('trips/equipment-rental-handover.service.js');
const {EquipmentInspectionService}=await load('trips/equipment-inspection.service.js');
const {PolicyControlService}=await load('trips/policy-control.service.js');
const {MoyasarPaymentProviderService}=await load('payments/moyasar-payment-provider.service.js');
const {RentalCheckoutService}=await load('payments/rental-checkout.service.js');
const {FinancePersistenceService}=await load('finance/finance-persistence.service.js');

const db=new DatabaseService(),audit=new AuditService(db),notifications=new NotificationsService(db);
const rentals=new EquipmentRentalService(db,audit,notifications);
const inspections=new EquipmentInspectionService(db,audit,new PolicyControlService(db,audit));
const handover=new EquipmentRentalHandoverService(db,audit,notifications,inspections);
const invoices=new Map(),payments=new Map(),requests=[];
let dropNextInvoice=false,heldPaymentRead=null;
const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):null;
  requests.push({method:req.method,url:req.url,body});
  assert.equal(req.headers.authorization,'Basic '+Buffer.from('synthetic_rental_provider_key:').toString('base64'));
  const reply=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(req.method==='POST'&&req.url==='/v1/invoices'){
    const id=randomUUID(),invoice={...body,id,status:'initiated',url:'https://checkout.moyasar.com/invoices/'+id,payments:[]};
    invoices.set(id,invoice);
    if(dropNextInvoice){dropNextInvoice=false;req.socket.destroy();return;}
    reply(201,invoice);return;
  }
  const invoiceMatch=req.url.match(/^\/v1\/invoices\/([a-f0-9-]+)$/);
  if(req.method==='GET'&&invoiceMatch&&invoices.has(invoiceMatch[1])){reply(200,invoices.get(invoiceMatch[1]));return;}
  const paymentMatch=req.url.match(/^\/v1\/payments\/([a-f0-9-]+)$/);
  if(req.method==='GET'&&paymentMatch&&payments.has(paymentMatch[1])){
    const snapshot=structuredClone(payments.get(paymentMatch[1]));
    if(heldPaymentRead?.id===paymentMatch[1]){const held=heldPaymentRead;heldPaymentRead=null;held.seen();await held.release;}
    reply(200,snapshot);return;
  }
  reply(404,{message:'synthetic fixture missing'});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
// Explicit fixture configuration, never copied from merchant configuration.
process.env.HYDROLAND_PAYMENT_PROVIDER='MOYASAR';
process.env.MOYASAR_SECRET_KEY='synthetic_rental_provider_key';
process.env.MOYASAR_API_BASE_URL=`http://127.0.0.1:${server.address().port}/v1/`;
process.env.HYDROLAND_PUBLIC_WEB_ORIGIN='https://synthetic-rental.example.invalid';
const provider=new MoyasarPaymentProviderService({requireOperational(){return {status:'SANDBOX'};},async recordProviderSignal(){}});
const checkout=new RentalCheckoutService(db,audit,provider,inspections),ledger=new FinancePersistenceService(db);
const accountIds=[],personIds=[],organizationIds=[],resourceIds=[],rentalIds=[],financeEntryIds=[],financeAccountIds=[],orgUnitIds=[],positionIds=[],employmentIds=[];
let checks=0;
const check=()=>checks++;
const rejected=status=>error=>{assert.equal(typeof error.getStatus,'function',error.stack);assert.equal(error.getStatus(),status,error.message);return true;};
const postCount=()=>requests.filter(row=>row.method==='POST').length;
async function account(label){
  const person=await db.person.create({data:{firstName:'SYNTHETIC Checkout',lastName:label}});personIds.push(person.id);
  const row=await db.account.create({data:{personId:person.id,email:'rental-checkout-'+randomUUID()+'@example.invalid',passwordHash:'unusable-fixture',status:'ACTIVE'}});accountIds.push(row.id);return row.id;
}
async function makeCenter(owner,label){
  const org=await db.organization.create({data:{ownerId:owner,kind:'DIVE_CENTER',status:'ACTIVE',displayName:'SYNTHETIC '+label,
    legalName:'SYNTHETIC Legal '+label,registrationNumber:'SYN-'+randomUUID(),address:'SYNTHETIC isolated warehouse'}});organizationIds.push(org.id);return org.id;
}
async function bindAccountant(actor,organizationId){
  const center=await db.orgUnit.create({data:{organizationId,type:'CENTER',code:'SYN-CTR',nameAr:'مركز تجريبي'}});orgUnitIds.push(center.id);
  const position=await db.position.create({data:{orgUnitId:center.id,code:'CENTER_ACCOUNTANT',titleAr:'محاسب تجريبي'}});positionIds.push(position.id);
  const row=await db.employment.create({data:{accountId:actor,organizationId,orgUnitId:center.id,positionId:position.id,workerClass:'EMPLOYEE',status:'ACTIVE'}});employmentIds.push(row.id);return row.id;
}
async function makeAsset(centerId,actor){
  const resource=await db.calendarResource.create({data:{type:'EQUIPMENT',name:'SYNTHETIC rental '+randomUUID()}});resourceIds.push(resource.id);
  const code='SYN-'+randomUUID();
  await db.$executeRaw`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","stockStatus","organizationId")
    VALUES(${randomUUID()},${resource.id},${code},${code},${'qr:'+code},'AVAILABLE',${centerId})`;
  await inspections.record(actor,resource.id,{status:'PASS',serviceExpiresAt:new Date(Date.now()+30*86400000).toISOString(),notes:'SYNTHETIC isolated inspection'});
  return {resourceId:resource.id,unitPriceSar:50,code};
}
let owner,customer,other,approver,poster,accountant,otherAccountant,centerA,centerB,employment;
async function makeRental(){
  const item=await makeAsset(centerA,owner);
  const rental=await rentals.create(owner,{renterAccountId:customer,scheduledHandoverAt:new Date(Date.now()+86400000).toISOString(),
    dueAt:new Date(Date.now()+3*86400000).toISOString(),items:[item]});rentalIds.push(rental.id);return {rental,item};
}
async function start(fixture){
  const quote=await checkout.quote(customer,fixture.rental.id);
  const input={quoteHash:quote.quoteHash,acceptedPolicyVersion:quote.policyVersion,idempotencyKey:'test-rental:'+fixture.rental.id};
  return {input,state:await checkout.checkout(customer,fixture.rental.id,input)};
}
async function providerCapture(rentalId){
  const journal=await db.commerceCheckout.findUniqueOrThrow({where:{sourceType_sourceId:{sourceType:'EQUIPMENT_RENTAL',sourceId:rentalId}}});
  const invoice=invoices.get(journal.providerInvoiceId);assert.ok(invoice);
  const payment={id:randomUUID(),invoice_id:invoice.id,status:'paid',amount:invoice.amount,currency:invoice.currency,captured:0,refunded:0,
    updated_at:new Date().toISOString(),refunded_at:null,source:{number:'DO-NOT-PERSIST',token:'DO-NOT-PERSIST'}};
  payments.set(payment.id,payment);invoice.status='paid';invoice.payments=[payment];return {invoice,payment};
}
async function entryFor(rentalId,{referenceId=rentalId,post=true,amountMinor=5000}={}){
  const account=await ledger.createAccount({organizationId:centerA,name:'SYNTHETIC rental revenue '+randomUUID(),currency:'SAR'});financeAccountIds.push(account.id);
  const entry=await ledger.createEntry({organizationId:centerA,financeAccountId:account.id,type:'REVENUE',amountMinor,currency:'SAR',
    referenceType:'EQUIPMENT_RENTAL_COLLECTION',referenceId,description:'SYNTHETIC no money movement',requestedByAccountId:owner});financeEntryIds.push(entry.id);
  if(post){await ledger.decideEntry(entry.id,approver,true,'SYNTHETIC independent approval');await ledger.postEntry(entry.id,poster);}
  return entry;
}
try{
  [owner,customer,other,approver,poster,accountant,otherAccountant]=await Promise.all(['Owner','Customer','Other','Approver','Poster','Accountant','Other accountant'].map(account));
  await db.roleAssignment.create({data:{accountId:owner,role:'ADMIN',status:'ACTIVE'}});
  centerA=await makeCenter(owner,'A');centerB=await makeCenter(owner,'B');
  employment=await bindAccountant(accountant,centerA);await bindAccountant(otherAccountant,centerB);

  const badItem=await makeAsset(centerA,owner),future=new Date(Date.now()+3*86400000).toISOString();
  await assert.rejects(rentals.create(owner,{renterAccountId:customer,dueAt:future,items:[badItem]}),rejected(400));check();
  await assert.rejects(rentals.create(owner,{renterAccountId:customer,scheduledHandoverAt:future,dueAt:future,items:[badItem]}),rejected(400));check();
  await assert.rejects(rentals.create(owner,{renterAccountId:customer,scheduledHandoverAt:new Date(Date.now()+86400000).toISOString(),dueAt:future,items:[{...badItem,unitPriceSar:0.001}]}),rejected(400));check();
  const otherItem=await makeAsset(centerB,owner);
  await assert.rejects(rentals.create(owner,{renterAccountId:customer,scheduledHandoverAt:new Date(Date.now()+86400000).toISOString(),dueAt:future,items:[badItem,otherItem]}),rejected(409));check();
  await db.$executeRaw`UPDATE "EquipmentBarcode" SET "organizationId"=NULL WHERE "resourceId"=${badItem.resourceId}`;
  await assert.rejects(rentals.create(owner,{renterAccountId:customer,scheduledHandoverAt:new Date(Date.now()+86400000).toISOString(),dueAt:future,items:[badItem]}),rejected(409));check();

  const first=await makeRental(),quote=await checkout.quote(customer,first.rental.id);
  assert.equal(quote.snapshot.scheduledHandoverAt,first.rental.scheduledHandoverAt.toISOString());
  assert.notEqual(quote.snapshot.scheduledHandoverAt,first.rental.dueAt.toISOString());check();
  assert.equal(quote.snapshot.invoiceReadiness,'COMMERCIAL_RECORD_ONLY');
  assert.equal(quote.snapshot.issuer.legalName,'SYNTHETIC Legal A');check();
  await assert.rejects(checkout.quote(other,first.rental.id),rejected(404));check();
  const input={quoteHash:quote.quoteHash,acceptedPolicyVersion:quote.policyVersion,idempotencyKey:'test-rental:'+first.rental.id};
  await assert.rejects(checkout.checkout(customer,first.rental.id,{...input,quoteHash:'bad'}),rejected(409));
  assert.equal(postCount(),0);check();
  await assert.rejects(checkout.checkout(customer,first.rental.id,{...input,acceptedPolicyVersion:undefined}),rejected(409));check();
  const simultaneous=await Promise.all([checkout.checkout(customer,first.rental.id,input),checkout.checkout(customer,first.rental.id,input)]);
  assert.equal(postCount(),1);assert.ok(simultaneous.some(row=>row.status==='PENDING'));check();
  await checkout.checkout(customer,first.rental.id,input);assert.equal(postCount(),1);check();
  await assert.rejects(checkout.checkout(customer,first.rental.id,{...input,idempotencyKey:'another-request-key'}),rejected(409));assert.equal(postCount(),1);check();
  const originalInvoice=[...invoices.values()][0];
  assert.equal(originalInvoice.expired_at,first.rental.holdExpiresAt.toISOString());
  assert.equal(originalInvoice.metadata.hydroland_source_id,first.rental.id);
  assert.equal(originalInvoice.metadata.hydroland_customer_account_id,customer);
  assert.equal(originalInvoice.metadata.hydroland_organization_id,centerA);check();
  assert.equal(await db.commerceCollectionEvidence.count({where:{sourceId:first.rental.id}}),0);
  await assert.rejects(handover.confirmPayment(owner,first.rental.id),rejected(409));check();
  await assert.rejects(checkout.refresh(other,first.rental.id),rejected(404));check();
  const collected=await providerCapture(first.rental.id);
  const observed=await checkout.refresh(customer,first.rental.id);
  assert.equal(observed.status,'CAPTURED');assert.equal(observed.collectionVerified,false);
  assert.equal((await rentals.get(first.rental.id)).paymentStatus,'PENDING');check();
  const goodEntry=await entryFor(first.rental.id);
  for(const actor of [owner,customer,otherAccountant])await assert.rejects(checkout.publishCollection(actor,first.rental.id,goodEntry.id),rejected(403));check();
  await db.employment.update({where:{id:employment},data:{status:'SUSPENDED'}});
  await assert.rejects(checkout.publishCollection(accountant,first.rental.id,goodEntry.id),rejected(403));
  await db.employment.update({where:{id:employment},data:{status:'ACTIVE'}});check();
  const wrongEntry=await entryFor(first.rental.id,{referenceId:randomUUID()});
  await assert.rejects(checkout.publishCollection(accountant,first.rental.id,wrongEntry.id),rejected(409));check();
  const pendingEntry=await entryFor(first.rental.id,{post:false});
  await assert.rejects(checkout.publishCollection(accountant,first.rental.id,pendingEntry.id),rejected(409));check();
  const receipt=await checkout.publishCollection(accountant,first.rental.id,goodEntry.id);
  assert.equal(receipt.status,'COLLECTION_VERIFIED');assert.equal((await rentals.get(first.rental.id)).paymentStatus,'PENDING');check();
  const replay=await checkout.publishCollection(accountant,first.rental.id,goodEntry.id);
  assert.equal(replay.collectionEvidenceId,receipt.collectionEvidenceId);
  assert.equal(await db.commerceCollectionEvidence.count({where:{sourceId:first.rental.id}}),1);
  assert.equal(await db.auditEvent.count({where:{action:'RENTAL_COLLECTION_VERIFIED',resourceId:first.rental.id}}),1);check();
  const stored=await db.commerceCollectionEvidence.findUniqueOrThrow({where:{id:receipt.collectionEvidenceId}});
  assert.ok(!JSON.stringify(stored).includes('DO-NOT-PERSIST'));
  assert.equal(stored.financeEntryId,goodEntry.id);check();
  await handover.confirmPayment(owner,first.rental.id);
  await handover.scan(owner,first.rental.id,{handoverCondition:'Synthetic baseline',code:first.item.code});
  assert.equal((await rentals.get(first.rental.id)).status,'ACTIVE');check();

  const webhook=await checkout.handleVerifiedProviderEvent({id:randomUUID(),type:'payment_paid',secret_token:'[verified]',live:false,data:{invoice_id:collected.invoice.id,status:'failed'}});
  assert.equal(webhook.handled,true);assert.equal(webhook.status,'CAPTURED');check();
  let observeHeld,releaseHeld;
  const heldSeen=new Promise(resolve=>{observeHeld=resolve;});
  heldPaymentRead={id:collected.payment.id,seen:observeHeld,release:new Promise(resolve=>{releaseHeld=resolve;})};
  const oldRefresh=checkout.refresh(customer,first.rental.id);
  await heldSeen;
  collected.payment.status='refunded';collected.payment.refunded=1250;collected.payment.refunded_at=new Date().toISOString();collected.payment.updated_at=new Date().toISOString();
  collected.invoice.status='refunded';
  const refunded=await checkout.refresh(customer,first.rental.id);
  assert.equal(refunded.status,'RECONCILIATION_REQUIRED');assert.equal(refunded.collectionVerified,false);
  releaseHeld();
  const lateOldResponse=await oldRefresh;
  assert.equal(lateOldResponse.status,'RECONCILIATION_REQUIRED','A held old paid response cannot resurrect a newer observed refund');check();
  await assert.rejects(handover.confirmPayment(owner,first.rental.id),rejected(409));
  await assert.rejects(handover.scan(owner,first.rental.id,{handoverCondition:'Synthetic baseline',code:first.item.code}),rejected(409));check();
  assert.equal((await db.commerceCollectionEvidence.findUniqueOrThrow({where:{id:receipt.collectionEvidenceId}})).providerRefundedMinor,0,'Original collection proof remains immutable');check();
  collected.payment.status='paid';collected.payment.refunded=0;collected.payment.refunded_at=null;collected.payment.updated_at=new Date().toISOString();
  collected.invoice.status='paid';
  const regressed=await checkout.refresh(customer,first.rental.id);
  assert.equal(regressed.status,'RECONCILIATION_REQUIRED','A new paid response cannot erase a known cumulative refund');
  const retained=await db.commerceCheckout.findUniqueOrThrow({where:{providerPaymentId:collected.payment.id}});
  assert.equal(retained.providerResult.payment.refundedMinor,1250);check();

  const lost=await makeRental(),lostQuote=await checkout.quote(customer,lost.rental.id);
  const lostInput={quoteHash:lostQuote.quoteHash,acceptedPolicyVersion:lostQuote.policyVersion,idempotencyKey:'lost-rental:'+lost.rental.id};
  dropNextInvoice=true;const beforeLost=postCount();
  await assert.rejects(checkout.checkout(customer,lost.rental.id,lostInput),rejected(503));
  const lostReplay=await checkout.checkout(customer,lost.rental.id,lostInput);
  assert.equal(lostReplay.status,'RECONCILIATION_REQUIRED');assert.equal(postCount(),beforeLost+1);check();
  const lostInvoice=[...invoices.values()].find(invoice=>invoice.metadata.hydroland_source_id===lost.rental.id);
  await assert.rejects(checkout.reconcileInvoice(otherAccountant,lost.rental.id,lostInvoice.id),rejected(403));check();
  const recovered=await checkout.reconcileInvoice(accountant,lost.rental.id,lostInvoice.id);
  assert.equal(recovered.status,'PENDING');assert.equal(postCount(),beforeLost+1);check();

  const reconciling=await makeRental();await start(reconciling);const reconcilingPayment=await providerCapture(reconciling.rental.id);
  let seenReconciliation,releaseReconciliation;
  const reconciliationHeld=new Promise(resolve=>{seenReconciliation=resolve;});
  heldPaymentRead={id:reconcilingPayment.payment.id,seen:seenReconciliation,release:new Promise(resolve=>{releaseReconciliation=resolve;})};
  const revokeDuringRead=checkout.reconcileInvoice(accountant,reconciling.rental.id,reconcilingPayment.invoice.id);
  const deniedReconciliation=assert.rejects(revokeDuringRead,rejected(403));
  await reconciliationHeld;await db.employment.update({where:{id:employment},data:{status:'SUSPENDED'}});
  releaseReconciliation();await deniedReconciliation;
  const unchangedReconciliation=await db.commerceCheckout.findUniqueOrThrow({where:{sourceType_sourceId:{sourceType:'EQUIPMENT_RENTAL',sourceId:reconciling.rental.id}}});
  assert.equal(unchangedReconciliation.status,'PENDING');assert.equal(unchangedReconciliation.providerPaymentId,null);
  await db.employment.update({where:{id:employment},data:{status:'ACTIVE'}});check();

  const wrong=await makeRental();await start(wrong);const wrongPayment=await providerCapture(wrong.rental.id);
  wrongPayment.invoice.metadata.hydroland_source_id=first.rental.id;
  await assert.rejects(checkout.refresh(customer,wrong.rental.id),rejected(503));
  assert.equal((await rentals.get(wrong.rental.id)).paymentStatus,'PENDING');
  assert.equal(await db.commerceCollectionEvidence.count({where:{sourceId:wrong.rental.id}}),0);check();

  const late=await makeRental();await start(late);const latePayment=await providerCapture(late.rental.id);
  // Advance both the original fixture hold and its provider expiry together;
  // the service still refuses late captures even when the binding is exact.
  const expired=new Date(Date.now()-1000);
  await db.$executeRaw`UPDATE "EquipmentRental" SET "holdExpiresAt"=${expired}::timestamptz WHERE "id"=${late.rental.id}`;
  latePayment.invoice.expired_at=expired.toISOString();
  const lateState=await checkout.refresh(customer,late.rental.id);
  assert.equal(lateState.status,'RECONCILIATION_REQUIRED');
  const lateEntry=await entryFor(late.rental.id);
  await assert.rejects(checkout.publishCollection(accountant,late.rental.id,lateEntry.id),rejected(409));
  assert.equal((await rentals.get(late.rental.id)).paymentStatus,'PENDING');check();

  const legacy=await makeRental();
  await db.$executeRaw`UPDATE "EquipmentRental" SET "scheduledHandoverAt"=NULL,"contractSnapshot"=NULL WHERE "id"=${legacy.rental.id}`;
  await assert.rejects(checkout.quote(customer,legacy.rental.id),rejected(409));check();
  assert.equal(requests.filter(row=>row.method==='POST').every(row=>row.url==='/v1/invoices'),true);
  assert.equal(await db.financeEntry.count({where:{id:{in:financeEntryIds}}}),financeEntryIds.length,'Publisher creates no parallel or automatic ledger entries');check();
  console.log(JSON.stringify({result:'PASS',checks,postgresql:true,providerTransport:'loopback HTTP only',providerInvoicePosts:postCount(),
    actualMerchantCalls:0,realMoneyMovement:false,legitimateCollectionPublisher:true,scopeAndLedgerApprovalVerified:true}));
}finally{
  await db.commerceCollectionEvidence.deleteMany({where:{sourceType:'EQUIPMENT_RENTAL',sourceId:{in:rentalIds}}});
  await db.commerceCheckout.deleteMany({where:{sourceType:'EQUIPMENT_RENTAL',sourceId:{in:rentalIds}}});
  await db.financeApproval.deleteMany({where:{financeEntryId:{in:financeEntryIds}}});
  await db.financeEntry.deleteMany({where:{id:{in:financeEntryIds}}});
  await db.financeAccount.deleteMany({where:{id:{in:financeAccountIds}}});
  await db.$executeRaw`DELETE FROM "EquipmentRentalItem" WHERE "rentalId"=ANY(${rentalIds}::text[])`;
  await db.$executeRaw`DELETE FROM "EquipmentRental" WHERE "id"=ANY(${rentalIds}::text[])`;
  await db.$executeRaw`DELETE FROM "EquipmentMovement" WHERE "resourceId"=ANY(${resourceIds}::text[])`;
  await db.$executeRaw`DELETE FROM "EquipmentInspection" WHERE "resourceId"=ANY(${resourceIds}::text[])`;
  await db.$executeRaw`DELETE FROM "EquipmentBarcode" WHERE "resourceId"=ANY(${resourceIds}::text[])`;
  await db.calendarResource.deleteMany({where:{id:{in:resourceIds}}});
  await db.employment.deleteMany({where:{id:{in:employmentIds}}});
  await db.position.deleteMany({where:{id:{in:positionIds}}});
  await db.orgUnit.deleteMany({where:{id:{in:orgUnitIds}}});
  await db.organization.deleteMany({where:{id:{in:organizationIds}}});
  await db.notification.deleteMany({where:{accountId:{in:accountIds}}});
  await db.auditEvent.deleteMany({where:{OR:[{actorId:{in:personIds}},{resourceId:{in:[...rentalIds,...financeEntryIds]}}]}});
  await db.roleAssignment.deleteMany({where:{accountId:{in:accountIds}}});
  await db.account.deleteMany({where:{id:{in:accountIds}}});
  await db.person.deleteMany({where:{id:{in:personIds}}});
  await db.$disconnect();
  await new Promise(resolve=>server.close(resolve));
}
