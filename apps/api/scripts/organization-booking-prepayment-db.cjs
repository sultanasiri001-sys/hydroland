// Invoked inside the disposable, rollback-only organization mandate transaction.
'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { captureTripBookingContract, tripBookingPaymentRequirement, satisfiesTripBookingPayment } = require('../dist/commerce/trip-booking-contract');
const { PaymentContractService } = require('../dist/commerce/payment-contract.service');
const { OrganizationBookingCheckoutService } = require('../dist/payments/organization-booking-checkout.service');

module.exports = async function checkPrepayment(tx, db, org, platform, creator, accountant, delegate, independent) {
  const seller = await tx.organization.create({data:{kind:'DIVE_CENTER', status:'ACTIVE', ownerId:accountant.id, displayName:'Test supplier'}});
  const center = await tx.orgUnit.create({data:{organizationId:seller.id,type:'CENTER',code:'PREPAY-TEST',nameAr:'مركز تجريبي'}});
  const position = await tx.position.create({data:{orgUnitId:center.id,code:'CENTER_ACCOUNTANT',titleAr:'محاسب'}});
  await tx.employment.create({data:{organizationId:seller.id,orgUnitId:center.id,positionId:position.id,accountId:accountant.id,workerClass:'EMPLOYEE',status:'ACTIVE'}});
  async function book() {
    const now = new Date(), id = randomUUID();
    const trip = await tx.trip.create({data:{title:'Original organization trip',type:'SHORE_DIVE',status:'OPEN',capacity:4,
      startsAt:new Date(now.getTime()+86400000*10),endsAt:new Date(now.getTime()+86400000*11),organizationId:seller.id}});
    const resource=await tx.calendarResource.create({data:{type:'SITE',name:'Synthetic site '+id}});
    await tx.calendarEvent.create({data:{organizationId:seller.id,referenceType:'TRIP',referenceId:trip.id,type:'TRIP',title:trip.title,
      startsAt:trip.startsAt,endsAt:trip.endsAt,allocations:{create:{resourceId:resource.id,startsAt:trip.startsAt,endsAt:trip.endsAt}}}});
    const snapshot = captureTripBookingContract({bookingId:id,accountId:creator.id,buyerOrganizationId:org.id,seats:2,
      createdAt:now,price:{pricePerSeatMinor:5000,currency:'SAR',configured:true},trip:{...trip,organization:seller}});
    return tx.booking.create({data:{id,tripId:trip.id,accountId:creator.id,organizationId:org.id,status:'PENDING',seats:2,contractSnapshot:snapshot}});
  }
  const booking = await book(), contracts = new PaymentContractService(db);
  let creates=0, lose=false;
  const invoices = new Map(), payments = new Map();
  const provider = {
    async createInvoice(input) {
      creates++;
      const id=randomUUID(), row={id,status:'initiated',currency:'SAR',amount:input.amountMinor,url:'https://example.invalid/checkout/'+id,
        metadata:{hydroland_payment_id:input.paymentId,hydroland_booking_id:input.bookingId,hydroland_buyer_organization_id:input.organizationPayment.buyerOrganizationId,
          hydroland_delegate_account_id:input.organizationPayment.delegateAccountId},payments:[]};
      invoices.set(id,row);
      if(lose)throw Error('Synthetic lost provider response');
      return structuredClone(row);
    },
    async fetchInvoice(id){return structuredClone(invoices.get(id));},
    async fetchPayment(id,binding){const p=payments.get(id);assert.equal(p.invoiceId,binding.invoiceId);assert.equal(p.amountMinor,binding.amountMinor);return structuredClone(p);},
  };
  const service = new OrganizationBookingCheckoutService(db,contracts,{requireOperational(key){assert.equal(key,'PAYMENT_PSP');}},provider);
  const errorCode = status => e => e.getStatus?.() === status;
  const makeInput = q => ({requestId:randomUUID(),quoteHash:q.quoteHash,policyVersion:q.policyVersion});
  const checkout = (input,actor=delegate.id,id=booking.id) => service.checkout(actor,org.id,id,input);
  const quote = await service.quote(delegate.id,org.id,booking.id), input=makeInput(quote);
  assert.equal(quote.snapshot.customerAccountId,creator.id);assert.equal(quote.snapshot.issuer.organizationId,seller.id);
  await assert.rejects(()=>checkout(input,creator.id),errorCode(403));
  await assert.rejects(()=>checkout({...input,quoteHash:'incorrect'}),errorCode(409));
  assert.equal(creates,0);
  const event = await tx.calendarEvent.findUniqueOrThrow({where:{referenceType_referenceId:{referenceType:'TRIP',referenceId:booking.tripId}}});
  await tx.calendarEvent.update({where:{id:event.id},data:{status:'CANCELLED'}});
  await assert.rejects(()=>checkout(input),errorCode(409));
  assert.equal(creates,0);
  await tx.calendarEvent.update({where:{id:event.id},data:{status:'ACTIVE'}});
  const first=await checkout(input);
  assert.equal(first.status,'PENDING');assert(first.checkoutUrl);
  assert.equal((await checkout({...input,requestId:randomUUID()})).paymentId,first.paymentId);
  assert.equal(creates,1);
  const invoice=[...invoices.values()][0],pid=randomUUID();
  invoice.status='paid';invoice.payments=[{id:pid,status:'paid',amount:10000,currency:'SAR'}];
  payments.set(pid,{id:pid,status:'paid',invoiceId:invoice.id,currency:'SAR',amountMinor:10000,capturedMinor:10000,
    refundedMinor:0,refundedAt:null,updatedAt:new Date().toISOString()});
  const paidAttempt=invoice.payments[0];
  for (const ambiguous of ['authorized','verified']) {
    invoice.payments=[paidAttempt,{...paidAttempt,id:randomUUID(),status:ambiguous}];
    await assert.rejects(()=>service.refresh(delegate.id,org.id,booking.id),errorCode(409));
  }
  invoice.status='expired';invoice.payments=[{...paidAttempt,status:'initiated'}];
  await assert.rejects(()=>service.refresh(delegate.id,org.id,booking.id),errorCode(409));
  invoice.status='refunded';invoice.payments=[paidAttempt];
  await assert.rejects(()=>service.refresh(delegate.id,org.id,booking.id),errorCode(409));
  assert.equal((await tx.payment.findUniqueOrThrow({where:{id:first.paymentId}})).status,'PENDING');
  assert.equal(await tx.invoice.count({where:{paymentId:first.paymentId}}),0);
  invoice.status='paid';
  assert.equal((await service.refresh(delegate.id,org.id,booking.id)).status,'CAPTURED');
  const paid=await tx.payment.findUniqueOrThrow({where:{id:first.paymentId}});
  assert.equal(paid.accountId,delegate.id);
  assert(satisfiesTripBookingPayment(paid,tripBookingPaymentRequirement(booking)));
  const draft=await tx.invoice.findUniqueOrThrow({where:{paymentId:paid.id}});
  assert.equal(draft.status,'DRAFT');assert.equal(draft.contractSnapshot.issuer.organizationId,seller.id);
  assert.equal(draft.contractSnapshot.buyerOrganizationId,org.id);
  const entryAccount=await tx.financeAccount.create({data:{organizationId:seller.id,name:'Synthetic SAR ledger',currency:'SAR'}});
  const when=new Date();
  const entry=await tx.financeEntry.create({data:{organizationId:seller.id,financeAccountId:entryAccount.id,type:'REVENUE',status:'POSTED',amountMinor:10000,currency:'SAR',
    referenceType:'TRIP_PAYMENT_COLLECTION',referenceId:paid.id,requestedByAccountId:creator.id,approvedByAccountId:independent.id,postedByAccountId:accountant.id,
    createdAt:new Date(when.getTime()-1000),approvedAt:when,postedAt:when,approvals:{create:{createdAt:new Date(when.getTime()-500),requestedByAccountId:creator.id,decidedByAccountId:independent.id,status:'APPROVED',decidedAt:when}}}});
  await assert.rejects(()=>service.matchLedger(delegate.id,org.id,booking.id,entry.id),errorCode(403));
  const matched=await service.matchLedger(accountant.id,org.id,booking.id,entry.id);
  assert(!matched.alreadyApplied);assert((await service.matchLedger(accountant.id,org.id,booking.id,entry.id)).alreadyApplied);
  const { CenterServiceEntitlementService } = require('../dist/commerce/center-service-entitlement.service');
  const { FinanceAccessService } = require('../dist/finance/finance-access.service');
  const entitlement = new CenterServiceEntitlementService(db,new FinanceAccessService(db));
  const readiness = await entitlement.readTrip(accountant.id,center.id,booking.id);
  assert.equal(readiness.collectionFinanceEntryId,entry.id);
  assert(readiness.blockers.includes('TRIP_NOT_COMPLETED'));
  for (const code of ['VERIFIED_COLLECTION_REQUIRED','POSTED_COLLECTION_LEDGER_REQUIRED','PAYMENT_ORIGINAL_CONTRACT_BINDING_REQUIRED']) {
    assert(!readiness.blockers.includes(code),code);
  }
  const second=await book();
  const nextInput=makeInput(await service.quote(delegate.id,org.id,second.id));lose=true;
  await assert.rejects(()=>checkout(nextInput,delegate.id,second.id),errorCode(409));
  await assert.rejects(()=>checkout(nextInput,delegate.id,second.id),errorCode(409));
  assert.equal(creates,2);
  const originalInvoice=[...invoices.values()][1];
  await assert.rejects(()=>service.recover(platform.id,org.id,second.id,invoice.id),errorCode(409));
  await assert.rejects(()=>service.recover(creator.id,org.id,second.id,originalInvoice.id),errorCode(403));
  const recovered=await service.recover(platform.id,org.id,second.id,originalInvoice.id);
  assert.equal(recovered.status,'PENDING');assert.equal(recovered.checkoutUrl,null);assert.equal(creates,2);
  payments.get(pid).refundedMinor=500;payments.get(pid).refundedAt=new Date().toISOString();
  await service.refresh(delegate.id,org.id,booking.id);
  assert(!satisfiesTripBookingPayment(await tx.payment.findUniqueOrThrow({where:{id:first.paymentId}}),tripBookingPaymentRequirement(booking)));
};
