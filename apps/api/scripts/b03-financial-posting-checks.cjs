const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {resolve} = require('node:path');

module.exports = async function verify(ctx) {
  const {db,build,entitlements,owner,buyer,collector,approver,poster,center,foreignCenter,financeAccount,bookingFixture,account}=ctx;
  assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM,'DISPOSABLE_LOOPBACK_ONLY');
  const url=new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.match(url.pathname,/^\/commerce_test_[a-z0-9_]+$/);
  const {WalletPostingService}=require(resolve(build,'wallet/wallet-posting.service.js'));
  const {WalletService}=require(resolve(build,'wallet/wallet.service.js'));
  const {LoyaltyPostingService}=require(resolve(build,'rewards/loyalty-posting.service.js'));
  const {InstructorPostingService}=require(resolve(build,'finance/posting/instructor-posting.service.js'));
  const {offerQuote,earnPoints}=require(resolve(build,'rewards/loyalty-rules.js'));
  const wallets=new WalletPostingService(db), view=new WalletService(db);
  const loyalty=new LoyaltyPostingService(db,entitlements), trainers=new InstructorPostingService(db);
  const results=[];
  async function check(label,run){await run();results.push(label);console.log('PASS',label);}
  async function receipt(type,referenceType,referenceId,amountMinor) {
    const when=new Date();
    return db.financeEntry.create({data:{organizationId:center.id,financeAccountId:financeAccount.id,type,
      status:'POSTED',amountMinor,currency:'SAR',referenceType,referenceId,requestedByAccountId:collector.id,
      approvedByAccountId:approver.id,postedByAccountId:poster.id,createdAt:when,approvedAt:when,postedAt:when,
      approvals:{create:{requestedByAccountId:collector.id,decidedByAccountId:approver.id,status:'APPROVED',createdAt:when,decidedAt:when}}}});
  }
  const initial=process.env.HYDROLAND_B03_LEDGER_POSTING;
  delete process.env.HYDROLAND_B03_LEDGER_POSTING;
  try{
    await check('disabled posting does not create balances',async()=>{
      await assert.rejects(wallets.post(owner.id,randomUUID()),e=>e.getStatus?.()===503);
      assert.equal((await view.mine(buyer.id)).balanceMinor,0);
    });
    process.env.HYDROLAND_B03_LEDGER_POSTING='enabled';
    const source=await receipt('REVENUE','WALLET_FUNDING',buyer.id,10000);
    const purchase=await receipt('EXPENSE','WALLET_PURCHASE',buyer.id,3000);
    let debit;
    await check('wallet posts a confirmed credit and debit once, including simultaneous replay',async()=>{
      await assert.rejects(wallets.post(buyer.id,source.id),e=>e.getStatus?.()===403);
      const same=await Promise.all([wallets.post(owner.id,source.id),wallets.post(owner.id,source.id)]);
      assert.equal(same[0].id,same[1].id);debit=await wallets.post(owner.id,purchase.id);
      assert.equal((await view.mine(buyer.id)).balanceMinor,7000);
    });
    await check('wallet partial refunds match original purchase and limit',async()=>{
      const refund=await receipt('REFUND','WALLET_PURCHASE_REFUND',debit.id,1000);
      const first=await wallets.post(owner.id,refund.id);assert.equal((await wallets.post(owner.id,refund.id)).id,first.id);
      await assert.rejects(wallets.post(owner.id,(await receipt('REFUND','WALLET_PURCHASE_REFUND',debit.id,2001)).id));
      await assert.rejects(wallets.post(owner.id,(await receipt('EXPENSE','WALLET_PURCHASE',buyer.id,8001)).id));
      assert.equal((await view.mine(buyer.id)).balanceMinor,8000);assert.equal((await view.entries(buyer.id)).length,3);
    });
    const month=new Date(Date.now()+10800000).toISOString().slice(0,7);
    await check('monthly issuance budget follows center forecasts',async()=>{
      assert.equal((await loyalty.budget(owner.id,month,center.id,[])).capMinor,15000);
      assert.equal((await loyalty.budget(owner.id,month,center.id,[{organizationId:foreignCenter.id,eligibleMinor:3000000}])).capMinor,30000);
      await loyalty.budget(owner.id,month,center.id,[]);
    });
    const trip=await db.trip.create({data:{organizationId:center.id,title:'Test reward source',type:'BOAT_DIVE',capacity:2,
      startsAt:new Date(Date.now()-172800000),endsAt:new Date(Date.now()-86400000),status:'COMPLETED'}});
    const f=await bookingFixture(trip,1,30000);
    const claim=()=>loyalty.earnTrip(owner.id,center.id,f.booking.id,100,'verified-cost-worksheet');
    await check('unperformed or unallocated booking does not award points',async()=>{
      await assert.rejects(claim());
    });
    await db.auditEvent.create({data:{actorId:owner.personId,action:'TRIP_COMPLETED',resource:'Trip',resourceId:trip.id,
      occurredAt:new Date(Date.now()-43200000),metadata:{status:'COMPLETED',attendedParticipantIds:f.participants.map(p=>p.id),absentParticipantIds:[]}}});
    const preview=await entitlements.readTripForOwner(owner.id,center.id,f.booking.id);
    await entitlements.approveTripAllocation(owner.id,center.id,f.booking.id,{financeAccountId:financeAccount.id,
      commissionAmountMinor:1000,otherDeductionsMinor:0,expectedEvidenceHash:preview.allocationEvidenceHash});
    await check('cash basis, margin and one payer award of 150 points for SAR 300',async()=>{
      await assert.rejects(loyalty.earnTrip(owner.id,center.id,f.booking.id,900,'insufficient-margin'));
      assert.equal(earnPoints(28000),140);
      const [a,b]=await Promise.all([claim(),claim()]);assert.equal(a.id,b.id);assert.equal(a.points,150);
      assert.equal((await db.rewardAccount.findUniqueOrThrow({where:{accountId:buyer.id}})).points,150);
      assert.equal((await db.loyaltyMonth.findUniqueOrThrow({where:{id:month}})).issuedMinor,150);
    });
    await check('issuance stops at the limit and points from a prior month remain usable',async()=>{
      const stored=await db.loyaltyMonth.findUniqueOrThrow({where:{id:month}});
      // Prior-period outstanding points exist independently of the current month's issuance cap.
      const historical=await db.rewardAccount.update({where:{accountId:buyer.id},data:{points:{increment:650}}});
      await db.rewardEntry.create({data:{rewardAccountId:historical.id,type:'EARN',points:650,balanceAfter:historical.points,
        idempotencyKey:randomUUID(),referenceType:'HISTORICAL_BOOKING',referenceId:randomUUID(),metadata:{month:'2020-01'}}});
      const second=await db.trip.create({data:{organizationId:center.id,title:'Test ceiling',type:'BOAT_DIVE',capacity:1,
        startsAt:new Date(Date.now()-172800000),endsAt:new Date(Date.now()-86400000),status:'COMPLETED'}});
      const g=await bookingFixture(second,1,30000);
      await db.auditEvent.create({data:{actorId:owner.personId,action:'TRIP_COMPLETED',resource:'Trip',resourceId:second.id,
        occurredAt:new Date(Date.now()-43200000),metadata:{attendedParticipantIds:g.participants.map(x=>x.id),absentParticipantIds:[]}}});
      const ready=await entitlements.readTripForOwner(owner.id,center.id,g.booking.id);
      await entitlements.approveTripAllocation(owner.id,center.id,g.booking.id,{financeAccountId:financeAccount.id,
        commissionAmountMinor:1000,otherDeductionsMinor:0,expectedEvidenceHash:ready.allocationEvidenceHash});
      await db.loyaltyMonth.update({where:{id:month},data:{issuedMinor:stored.capMinor-149}});
      await assert.rejects(loyalty.earnTrip(owner.id,center.id,g.booking.id,0,'cost-register'),/budget exhausted/i);
      assert.equal((await db.rewardAccount.findUniqueOrThrow({where:{accountId:buyer.id}})).points,800);
    });
    await check('general, center and joint sponsorship preserve customer and supplier amounts',async()=>{
      for(const [platformBps,net] of [[10000,30000],[0,28000],[5000,29000]]){
        const q=offerQuote({priceMinor:30000,pointsCost:30000,platformBps},2000);
        assert.equal(q.cashDueMinor,28000);assert.equal(q.supplierBeforeCommissionMinor,net);
        assert.equal(q.platformContributionMinor+q.cashDueMinor,net);
      }
    });
    const offer=await loyalty.propose(owner.id,center.id,{title:'تصوير تجريبي',priceMinor:1500,pointsCost:1000,
      platformBps:5000,platformCap:250,centerCap:250});
    await check('unapproved offer is unavailable and published offer discloses exact cash price',async()=>{
      await assert.rejects(loyalty.quote(buyer.id,offer.id));await loyalty.approve(owner.id,offer.id);
      const q=await loyalty.quote(buyer.id,offer.id);assert.equal(q.heldPoints,800);assert.equal(q.cashDueMinor,200);
      assert.equal(q.bonusMinor,500);assert.equal(q.centerContributionMinor,250);assert.equal(q.supplierBeforeCommissionMinor,1250);
    });
    let hold;
    await check('reserve, cancel and restore campaign budget and available points',async()=>{
      const q=await loyalty.quote(buyer.id,offer.id);
      const a=await loyalty.reserve(buyer.id,offer.id,'first-try',q.heldPoints,q.cashDueMinor);
      assert.equal((await loyalty.quote(buyer.id,offer.id)).heldPoints,0);
      await loyalty.cancel(buyer.id,a.id);
      assert.equal((await loyalty.quote(buyer.id,offer.id)).heldPoints,800);
      const failed=await loyalty.reserve(buyer.id,offer.id,'provider-failed',800,200);
      await loyalty.beginPayment(buyer.id,failed.id);
      const evidence=await db.auditEvent.create({data:{action:'LOYALTY_PAYMENT_FAILED',resource:'LoyaltyReservation',resourceId:failed.id,
        metadata:{accountId:buyer.id,amountMinor:200,currency:'SAR',organizationId:center.id,providerReference:'TEST-FAILED'}}});
      await loyalty.failedPayment(owner.id,failed.id,evidence.id);
      assert.equal((await loyalty.quote(buyer.id,offer.id)).heldPoints,800);
      hold=await loyalty.reserve(buyer.id,offer.id,'confirmed-order',800,200);
      assert.equal((await loyalty.reserve(buyer.id,offer.id,'confirmed-order',800,200)).id,hold.id);
    });
    await check('exact top-up settles once without issuing points on the purchase',async()=>{
      await loyalty.beginPayment(buyer.id,hold.id);await assert.rejects(loyalty.cancel(buyer.id,hold.id));
      const wrong=await receipt('REVENUE','LOYALTY_OFFER_TOPUP',hold.id,199);
      await assert.rejects(loyalty.finish(owner.id,hold.id,wrong.id));
      const valid=await receipt('REVENUE','LOYALTY_OFFER_TOPUP',hold.id,200);
      await loyalty.finish(owner.id,hold.id,valid.id);await loyalty.finish(owner.id,hold.id,valid.id);
      assert.equal((await db.rewardAccount.findUniqueOrThrow({where:{accountId:buyer.id}})).points,0);
      assert.equal(await db.rewardEntry.count({where:{referenceId:hold.id}}),1);
    });
    await check('a regular trip checkout spends 2000 points, charges SAR 280, pays the supplier on SAR 300 and awards 140 points',async()=>{
      const {TripsService}=require(resolve(build,'trips/trips.service.js'));
      const {BookingParticipantService}=require(resolve(build,'trips/booking-participant.service.js'));
      const {PaymentsService}=require(resolve(build,'payments/payments.service.js'));
      const {PaymentContractService}=require(resolve(build,'commerce/payment-contract.service.js'));
      const {releaseRefundedBookingPoints}=require(resolve(build,'rewards/booking-points.js'));
      const member=await account('discount-buyer');
      const seed=await db.rewardAccount.create({data:{accountId:member.id,points:2000}});
      await db.rewardEntry.create({data:{rewardAccountId:seed.id,type:'EARN',points:2000,balanceAfter:2000,idempotencyKey:randomUUID(),referenceType:'HISTORICAL_BOOKING',referenceId:randomUUID()}});
      await db.loyaltyMonth.update({where:{id:month},data:{issuedMinor:150}});
      const controls={decision:async()=>({state:'ENABLED',enforce:false,review:false,bypass:false})};
      const audit={record:async()=>({})};
      const trips=new TripsService(null,db,{settings:async()=>({enabled:false}),evaluateReview:()=>({blocking:false})},
        {latest:async()=>null},new BookingParticipantService(db,controls,audit),controls,audit);
      const contracts=new PaymentContractService(db);
      const localProvider={createInvoice:async args=>({id:randomUUID(),status:'paid',amount:args.amountMinor,
        currency:'SAR',url:'http://localhost/mock',metadata:{hydroland_payment_id:args.paymentId,hydroland_booking_id:args.bookingId},
        payments:[{id:randomUUID(),amount:args.amountMinor,currency:'SAR',status:'paid'}]})};
      const payments=new PaymentsService(db,controls,audit,{requireOperational:()=>{}},localProvider,contracts);
      const startsAt=new Date(Date.now()+1600);
      const t=await db.trip.create({data:{organizationId:center.id,title:'Ordinary points checkout',type:'SHORE_DIVE',
        capacity:2,status:'OPEN',startsAt,endsAt:new Date(startsAt.getTime()+50)}});
      await db.operationalSetting.create({data:{key:'trip-price:'+t.id,value:{pricePerSeatMinor:15000,currency:'SAR'}}});
      await assert.rejects(trips.book(member.id,t.id,2,{points:2000,cashDueMinor:27000}));
      const booked=await trips.book(member.id,t.id,2,{points:2000,cashDueMinor:28000});
      assert.equal(booked.contractSnapshot.amountMinor,28000);assert.equal(booked.contractSnapshot.bookingPoints.points,2000);
      const quote=await contracts.quote(member.id,booked.id);
      const charge=await payments.create(member.id,{bookingId:booked.id,idempotencyKey:randomUUID(),policyAcceptance:{version:quote.policyVersion,quoteHash:quote.quoteHash}});
      assert.equal(charge.amountMinor,28000);assert.equal(charge.status,'CAPTURED');
      await receipt('REVENUE','TRIP_PAYMENT_COLLECTION',charge.id,28000);
      const invoice=await db.invoice.findUniqueOrThrow({where:{paymentId:charge.id}});
      assert.equal(invoice.contractSnapshot.bookingPoints.listMinor,30000);assert.equal(invoice.contractSnapshot.amountMinor,28000);
      await new Promise(r=>setTimeout(r,Math.max(0,t.endsAt.getTime()-Date.now()+40)));
      await db.booking.update({where:{id:booked.id},data:{status:'CONFIRMED'}});await db.trip.update({where:{id:t.id},data:{status:'COMPLETED'}});
      await db.auditEvent.create({data:{action:'TRIP_COMPLETED',resource:'Trip',resourceId:t.id,
        metadata:{attendedParticipantIds:booked.participants.map(p=>p.id),absentParticipantIds:[]}}});
      const summary=await entitlements.readTripForOwner(owner.id,center.id,booked.id);
      assert.equal(summary.eligibleGrossAmountMinor,30000,JSON.stringify(summary.blockers));
      await entitlements.approveTripAllocation(owner.id,center.id,booked.id,{financeAccountId:financeAccount.id,
        commissionAmountMinor:1500,otherDeductionsMinor:0,expectedEvidenceHash:summary.allocationEvidenceHash});
      const reward=await loyalty.earnTrip(owner.id,center.id,booked.id,0,'confirmed-costs');
      assert.equal(reward.points,140);
      const rid=randomUUID();await db.serializable(tx=>releaseRefundedBookingPoints(tx,charge,rid,0,14000));
      await db.serializable(tx=>releaseRefundedBookingPoints(tx,charge,rid,0,14000));
      assert.equal((await db.rewardAccount.findUniqueOrThrow({where:{accountId:member.id}})).points,1140);
    });
    const instructor=await account('trainer');
    let settled;
    for(const [revision,mode,rateBps,fixedMinor,expected] of [
      [1,'FIXED',0,2500,2500],[2,'PERCENTAGE',1000,0,1000],[3,'FIXED_PLUS_PERCENTAGE',1000,2500,3500],[4,'SALARY_ONLY',0,0,0]]){
      await check('instructor agreement '+mode+' binds course, collection and immutable revision',async()=>{
        const agreement=await db.instructorCompensationAgreement.create({data:{organizationId:center.id,instructorAccountId:instructor.id,
          revision,mode,rateBps,fixedMinor,currency:'SAR',recordedByAccountId:owner.id,recordedAt:new Date(Date.now()-1000),
          earningTiming:expected?'بعد تنفيذ الدورة':null,reversalTerms:expected?'عكس المبلغ الذي يقره المركز عند الاسترداد':null}});
        const course=await db.trainingEnrollment.create({data:{centerOrganizationId:center.id,instructorAccountId:instructor.id,
          studentAccountId:buyer.id,courseCode:'QA',status:'COMPLETED',completedAt:new Date()}});
        const collected=await receipt('REVENUE','TRAINING_ENROLLMENT_COLLECTION',course.id,10000);
        const args=[owner.id,course.id,agreement.id,collected.id,'center-completion:'+course.id];
        const {earning}=await trainers.accrue(...args);if(!expected){assert.equal(earning,null);return;}
        assert.equal(earning.amountMinor,expected);assert.equal((await trainers.accrue(...args)).earning.id,earning.id);
        if(revision===1) {
          const returned=await receipt('REFUND','TRAINING_ENROLLMENT_REFUND',course.id,10000);
          await trainers.reverse(owner.id,earning.id,returned.id,2500,'center-full-reversal');
          assert.equal((await db.instructorEarning.findUniqueOrThrow({where:{id:earning.id}})).status,'VOIDED');
        }
        if(revision===3) settled={earning,course};
      });
    }
    const {earning,course}=settled;
    const terminal=async(attempt,action)=>db.auditEvent.create({data:{resource:'InstructorTransferAttempt',resourceId:attempt.id,action,
      metadata:{earningId:earning.id,instructorAccountId:instructor.id,organizationId:center.id,
        amountMinor:earning.amountMinor,currency:'SAR',providerReference:'SYNTHETIC-'+randomUUID()}}});
    await check('hold, independent review, failed attempt, authorized retry, settlement and reversal',async()=>{
      await trainers.review(owner.id,earning.id,'HOLD','review-hold');
      await assert.rejects(trainers.prepare(owner.id,earning.id,randomUUID()));
      await trainers.review(owner.id,earning.id,'PAYABLE','review-ready');
      const first=await trainers.prepare(owner.id,earning.id,randomUUID());
      await assert.rejects(trainers.prepare(owner.id,earning.id,randomUUID()));
      assert.equal((await trainers.reconcile(owner.id,first.id,(await terminal(first,'INSTRUCTOR_TRANSFER_FAILED')).id)).status,'FAILED');
      await trainers.review(owner.id,earning.id,'PAYABLE','review-retry');
      const retry=await trainers.prepare(owner.id,earning.id,randomUUID());
      const proof=await terminal(retry,'INSTRUCTOR_TRANSFER_CONFIRMED');
      const paid=await receipt('SETTLEMENT','INSTRUCTOR_PAYOUT',retry.id,earning.amountMinor);
      await trainers.reconcile(owner.id,retry.id,proof.id,paid.id);
      await trainers.reconcile(owner.id,retry.id,proof.id,paid.id);
      const row=await db.instructorEarning.findUniqueOrThrow({where:{id:earning.id}});
      assert.equal(row.status,'SETTLED');assert.equal(row.settledAt.getTime(),proof.occurredAt.getTime());
      const returned=await receipt('REFUND','TRAINING_ENROLLMENT_REFUND',course.id,3000);
      const recovery=await trainers.reverse(owner.id,earning.id,returned.id,1000,'partial-recovery-approved');
      assert.equal(recovery.stage,'RECOVERY_REQUIRED');assert.equal((await db.instructorEarning.findUniqueOrThrow({where:{id:earning.id}})).amountMinor,3500);
      const recovered=await receipt('REVENUE','INSTRUCTOR_PAYOUT_RECOVERY',returned.id,1000);
      const bank=await db.auditEvent.create({data:{action:'INSTRUCTOR_RECOVERY_CONFIRMED',resource:'InstructorRecovery',
        resourceId:returned.id,metadata:{instructorAccountId:instructor.id,organizationId:center.id,amountMinor:1000,currency:'SAR',providerReference:'TEST-RECOVERY'}}});
      assert.equal((await trainers.recover(owner.id,returned.id,recovered.id,bank.id)).stage,'RECOVERED');
      assert.equal((await trainers.recover(owner.id,returned.id,recovered.id,bank.id)).settledEntryId,recovered.id);

    });
    console.log(JSON.stringify({suite:'B03-financial-postings',passed:results.length,results,realTransfers:0,externalCalls:0}));
  }finally{if(initial===undefined)delete process.env.HYDROLAND_B03_LEDGER_POSTING;else process.env.HYDROLAND_B03_LEDGER_POSTING=initial;}
};
