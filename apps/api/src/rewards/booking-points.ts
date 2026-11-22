import { createRefundPolicySnapshot, evaluateCommerceRefund } from '../commerce/commerce-refund-policy';
import { BookingPoints, bookingDiscount } from '../commerce/trip-booking-contract';
import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { requirePostingEnabled } from '../finance/posting/ledger-proof';
import { minor, offerQuote } from './loyalty-rules';

type Tx = Prisma.TransactionClient;
export async function spendablePoints(tx: Tx, accountId: string) {
  const balance = await tx.rewardAccount.findUnique({where:{accountId}, select:{points:true}});
  const held = await tx.loyaltyReservation.aggregate({where:{accountId,status:{in:['HELD','AWAITING_PAYMENT']}},_sum:{heldPoints:true}});
  return (balance?.points ?? 0) - (held._sum.heldPoints ?? 0);
}
export async function centerParticipates(tx: Tx, organizationId: string) {
  return Boolean(await tx.loyaltyMonth.findFirst({where:{OR:[
    {forecasts:{path:['firstCenter'],equals:organizationId}},
    {forecasts:{path:['additional'],array_contains:[{organizationId}]}},
  ]},select:{id:true}}));
}
export async function spendOnBooking(tx: Tx, accountId: string, organizationId: string | null, bookingId: string,
  listMinor: number, selection: {points:number; cashDueMinor:number; offerId?:string}): Promise<BookingPoints> {
  requirePostingEnabled();
  if (!organizationId || !minor(listMinor) || !minor(selection?.points) || !selection.points || selection.points>listMinor
    || selection.cashDueMinor!==listMinor-selection.points) throw new ConflictException('Review the booking discount and remaining price.');
  if (selection.cashDueMinor>0 && selection.cashDueMinor<100) throw new ConflictException('Use points for the full price or leave at least SAR 1 for the payment provider.');
  const points = selection.points;
  if (!await centerParticipates(tx,organizationId) || points>await spendablePoints(tx,accountId))
    throw new ConflictException('Booking points are unavailable.');
  let centerShareMinor=0;
  if (selection.offerId) {
    const offer=await tx.loyaltyOffer.findFirst({where:{id:selection.offerId,organizationId,priceMinor:listMinor,
      pointsCost:listMinor,platformApprovedBy:{not:null}}});
    if (!offer) throw new ConflictException('The center offer does not cover this booking.');
    centerShareMinor=offerQuote(offer,points).centerContributionMinor;
    const budget=await tx.loyaltyOffer.updateMany({where:{id:offer.id,centerSpent:{lte:offer.centerCap-centerShareMinor}},
      data:{centerSpent:{increment:centerShareMinor}}});
    if (!budget.count) throw new ConflictException('Center discount budget exhausted.');
  }
  const balance=await tx.rewardAccount.update({where:{accountId},data:{points:{decrement:points}}});
  const offerId=selection.offerId??null;
  const entry=await tx.rewardEntry.create({data:{rewardAccountId:balance.id,type:'REDEEM',points,balanceAfter:balance.points,
    referenceType:'TRIP_BOOKING_DISCOUNT',referenceId:bookingId,idempotencyKey:'booking-discount:'+bookingId,
    metadata:{organizationId,accountId,centerShareMinor,listMinor,offerId}}});
  return {entryId:entry.id,points,centerShareMinor,listMinor,offerId};
}
export async function proofOfBookingPoints(tx:Tx,booking:{id:string;accountId:string;contractSnapshot:unknown},organizationId:string) {
  const discount=bookingDiscount(booking.contractSnapshot);
  if (!discount) return null;
  const row=await tx.rewardEntry.findUnique({where:{id:discount.entryId},include:{rewardAccount:{select:{accountId:true}}}});
  const meta=row?.metadata as Prisma.JsonObject|null;
  if (!row || row.rewardAccount.accountId!==booking.accountId || row.type!=='REDEEM' || row.points!==discount.points
    || row.referenceType!=='TRIP_BOOKING_DISCOUNT' || row.referenceId!==booking.id || meta?.organizationId!==organizationId
    || meta?.centerShareMinor!==discount.centerShareMinor || meta?.listMinor!==discount.listMinor || meta?.offerId!==discount.offerId) return null;
  return discount;
}

// The regular refund procedure adjudicates paid cancellations. A cancelled, never-collected booking releases its points in full.
export async function releaseUncollectedBookingPoints(tx:Tx,booking:{id:string;accountId:string;contractSnapshot:unknown},organizationId:string|null) {
  const d=organizationId && await proofOfBookingPoints(tx,booking,organizationId);
  if(!d) return;
  const existing=await tx.rewardEntry.findUnique({where:{idempotencyKey:'release-discount:'+booking.id}});
  if(existing) return;
  const payment=await tx.payment.findFirst({where:{bookingId:booking.id,status:{notIn:['FAILED','CANCELLED']}}});
  if(payment) return;
  const completed=await tx.auditEvent.findFirst({where:{action:'TRIP_COMPLETED',resource:'Trip',
    resourceId:(booking.contractSnapshot as {source:{offeringId:string}}).source.offeringId}});
  if(completed) return;
  let returned=d.points;
  const contract=booking.contractSnapshot as {recordedAt:string;source:{offeringId:string};originalSchedule:{startsAt:string}};
  const accepted=d.points===d.listMinor && await tx.auditEvent.findFirst({where:{action:'POINTS_BOOKING_TERMS_ACCEPTED',resource:'Booking',resourceId:booking.id}});
  if(accepted){
    const cancellation=await tx.auditEvent.findFirst({where:{resource:'Booking',resourceId:booking.id,
      action:{in:['BOOKING_SELF_CANCELLED','BOOKING_CANCELLED']}},orderBy:{occurredAt:'asc'}});
    const when=cancellation?.occurredAt??new Date();
    const snapshot=createRefundPolicySnapshot({kind:'TRIP',currency:'SAR',lineId:booking.id,grossAmountMinor:d.points,
      contractedAt:contract.recordedAt,contractedScheduledAt:contract.originalSchedule.startsAt});
    const facts=await tx.operationalSetting.findUnique({where:{key:'commerce-legal-classification:TRIP:'+contract.source.offeringId}});
    const f=facts?.value as {sourceId?:string;sourceType?:string;statutoryClassification?:'ELIGIBLE'|'EXEMPT';classification?:'ELIGIBLE'|'EXEMPT';evidenceReference?:string;exception?:any}|null;
    const classification=f?.sourceId===contract.source.offeringId && f.sourceType==='TRIP' && f.evidenceReference && (f.classification==='ELIGIBLE'||f.classification==='EXEMPT');
    const decision=evaluateCommerceRefund({snapshot,requestedAt:when.toISOString(),evidenceAsOf:new Date().toISOString(),
      cause:'CUSTOMER_CANCELLATION',collectedAmountMinor:d.points,refundedAmountMinor:0,evidence:{lineId:booking.id,
        consumption:when.getTime()<Date.parse(contract.originalSchedule.startsAt)?'NONE':'UNKNOWN',
        statutoryClassification:classification?f!.classification!:'UNKNOWN',...(classification?{legalEvidenceReference:f!.evidenceReference,statutoryException:f!.exception}:{})}});
    if(decision.refundAmountMinor===null || !decision.refundAmountMinor) {
      if(!await tx.auditEvent.findFirst({where:{action:'POINTS_BOOKING_REFUND_REVIEW',resource:'Booking',resourceId:booking.id}}))
        await tx.auditEvent.create({data:{action:'POINTS_BOOKING_REFUND_REVIEW',resource:'Booking',resourceId:booking.id,metadata:{reason:decision.reasonCode}}});
      return;
    }
    returned=decision.refundAmountMinor;
  }
  const balance=await tx.rewardAccount.update({where:{accountId:booking.accountId},data:{points:{increment:returned}}});
  await tx.rewardEntry.create({data:{rewardAccountId:balance.id,type:'ADJUSTMENT',points:returned,balanceAfter:balance.points,
    referenceType:'TRIP_BOOKING_DISCOUNT_RELEASE',referenceId:booking.id,idempotencyKey:'release-discount:'+booking.id,
    metadata:{originalEntryId:d.entryId,organizationId}}});
  if(d.offerId && d.centerShareMinor) await tx.loyaltyOffer.update({where:{id:d.offerId},data:{centerSpent:{decrement:Number(BigInt(d.centerShareMinor)*BigInt(returned)/BigInt(d.points))}}});
}

export async function releaseRefundedBookingPoints(tx:Tx, payment:{bookingId:string;accountId:string;amountMinor:number;contractSnapshot:unknown},
  operationId:string, previousCashRefund:number, cumulativeCashRefund:number) {
  const contract=payment.contractSnapshot as {issuer?:{organizationId?:string}}|null;
  if(!bookingDiscount(contract) || !contract?.issuer?.organizationId) return;
  const booking=await tx.booking.findUniqueOrThrow({where:{id:payment.bookingId}});
  const d=await proofOfBookingPoints(tx,booking,contract.issuer.organizationId);
  if(!d || booking.accountId!==payment.accountId || payment.amountMinor!==d.listMinor-d.points || payment.amountMinor<=0)
    throw new ConflictException('The original booking discount must be reconciled.');
  if(!minor(previousCashRefund)||!minor(cumulativeCashRefund)||previousCashRefund>cumulativeCashRefund||cumulativeCashRefund>payment.amountMinor)
    throw new ConflictException('Invalid cumulative booking refund.');
  const share=(value:number,amount:number)=>Number(BigInt(value)*BigInt(amount)/BigInt(payment.amountMinor));
  const restored=share(d.points,cumulativeCashRefund)-share(d.points,previousCashRefund);
  const proportionalCenter=(cash:number)=>Number(BigInt(d.centerShareMinor)*BigInt(share(d.points,cash))/BigInt(d.points));
  const center=proportionalCenter(cumulativeCashRefund)-proportionalCenter(previousCashRefund);
  const key='refund-booking-discount:'+operationId;
  if(await tx.rewardEntry.findUnique({where:{idempotencyKey:key}}))return;
  if(restored) {
    const balance=await tx.rewardAccount.update({where:{accountId:booking.accountId},data:{points:{increment:restored}}});
    await tx.rewardEntry.create({data:{rewardAccountId:balance.id,type:'ADJUSTMENT',points:restored,balanceAfter:balance.points,
      referenceType:'TRIP_BOOKING_DISCOUNT_REFUND',referenceId:operationId,idempotencyKey:key,
      metadata:{originalEntryId:d.entryId,bookingId:booking.id,previousCashRefund,cumulativeCashRefund}}});
  }
  if(d.offerId && center) await tx.loyaltyOffer.update({where:{id:d.offerId},data:{centerSpent:{decrement:center}}});
}

// Only the posted award for this purchase can be reversed. Existing holds stay covered.
export async function reverseRefundedTripAward(tx:Tx, payment:{bookingId:string;amountMinor:number;accountId:string}, operationId:string,
  before:number, after:number) {
  const award=await tx.rewardEntry.findUnique({where:{idempotencyKey:'loyalty:earned:TRIP:'+payment.bookingId},include:{rewardAccount:true}});
  if(!award || !payment.amountMinor || award.rewardAccount.accountId!==payment.accountId) return;
  const source=award.metadata as Prisma.JsonObject;
  if(!minor(source?.paidMinor) || source.paidMinor>payment.amountMinor || !minor(after) || !minor(before) ||
    after<before || after>payment.amountMinor) throw new ConflictException('Booking award refund evidence is invalid.');
  const remaining=(refund:number)=>Number(BigInt(source.paidMinor as number)*BigInt(payment.amountMinor-refund)/BigInt(payment.amountMinor)/200n);
  const difference=remaining(before)-remaining(after);
  if(!difference)return;
  if(await tx.auditEvent.findFirst({where:{resource:'CommerceRefundOperation',resourceId:operationId,action:'TRIP_REWARD_REFUND_REVIEWED'}})) return;
  const available=await spendablePoints(tx,payment.accountId);
  const reverse=Math.min(Math.max(0,available),difference);
  if(reverse) {
    const balance=await tx.rewardAccount.update({where:{id:award.rewardAccountId},data:{points:{decrement:reverse}}});
    await tx.rewardEntry.create({data:{rewardAccountId:balance.id,type:'REDEEM',points:reverse,balanceAfter:balance.points,
      referenceType:'TRIP_EARN_REFUND',referenceId:operationId,idempotencyKey:'reverse-trip-award:'+operationId,
      metadata:{originalEntryId:award.id,bookingId:payment.bookingId}}});
  }
  await tx.auditEvent.create({data:{resource:'CommerceRefundOperation',resourceId:operationId,action:'TRIP_REWARD_REFUND_REVIEWED',
    metadata:{originalEntryId:award.id,pointsReversed:reverse,pointsForReview:difference-reverse}}});
}
