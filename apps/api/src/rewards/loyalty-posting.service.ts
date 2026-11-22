import { spendablePoints, centerParticipates } from './booking-points';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { requirePlatformFinanceApprover } from '../finance/finance-operation-grant.service';
import { postingTransaction, requirePostingEnabled, verifiedEntry } from '../finance/posting/ledger-proof';
import { CenterServiceEntitlementService } from '../commerce/center-service-entitlement.service';
import { requireCourseCollection } from '../commerce/course-collection';
import { requireVerifiedStoreCollection } from '../store/store-checkout-contract';
import { earnPoints, minor, offerQuote, textId } from './loyalty-rules';

type Tx = Prisma.TransactionClient;
type Forecast = {organizationId:string;eligibleMinor:number};
type Draft = {title:string;priceMinor:number;pointsCost:number;platformBps:number;platformCap:number;centerCap:number};
const monthNow = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0,7);
@Injectable()
export class LoyaltyPostingService {
  constructor(private readonly db:DatabaseService, private readonly entitlements:CenterServiceEntitlementService) {}

  async budget(actor:string, month:string, firstCenter:string, forecasts:Forecast[]) {
    requirePostingEnabled();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !textId(firstCenter) || !Array.isArray(forecasts)
      || forecasts.some(f=>!f || !textId(f.organizationId) || !minor(f.eligibleMinor))) throw new BadRequestException('Invalid monthly forecast.');
    const centers=[firstCenter,...forecasts.map(f=>f.organizationId)];
    if (new Set(centers).size !== centers.length) throw new BadRequestException('Duplicate center forecast.');
    const capMinor=15000+earnPoints(forecasts.reduce((sum,f)=>sum+f.eligibleMinor,0));
    return postingTransaction(this.db,async tx=>{
      await requirePlatformFinanceApprover(tx,actor);
      const count=await tx.organization.count({where:{id:{in:centers},status:'ACTIVE',kind:{contains:'DIVE',mode:'insensitive'}}});
      if(count!==centers.length) throw new ConflictException('Active centers required.');
      const prior=await tx.loyaltyMonth.findUnique({where:{id:month}});
      if(prior && (prior.issuedMinor>capMinor || (prior.forecasts as {firstCenter?:string}).firstCenter!==firstCenter))
        throw new ConflictException('Existing issuance and original center must be preserved.');
      const data={capMinor,forecasts:{firstCenter,additional:forecasts},approvedBy:actor};
      return tx.loyaltyMonth.upsert({where:{id:month},create:{id:month,...data},update:data});
    });
  }

  async earnTrip(actor:string, organizationId:string, bookingId:string, directCostMinor:number, costEvidence:string) {
    return this.earn(actor,organizationId,'TRIP',bookingId,directCostMinor,costEvidence);
  }
  async earn(actor:string, organizationId:string, kind:string, bookingId:string, directCostMinor:number, costEvidence:string, commissionEntryId?:string) {
    requirePostingEnabled();
    if(!minor(directCostMinor) || !textId(costEvidence)) throw new BadRequestException('Actual direct costs and their reference are required.');
    return postingTransaction(this.db,async tx=>{
      const owner=await requirePlatformFinanceApprover(tx,actor);
      if(!['TRIP','COURSE','GOODS'].includes(kind)) throw new BadRequestException('Unsupported reward source.');
      const key='loyalty:earned:'+kind+':'+bookingId;
      const prior=await tx.rewardEntry.findUnique({where:{idempotencyKey:key}});
      if(prior) {
        const original=prior.metadata as {organizationId:string;directCostMinor:number;costEvidence:string};
        if(original.organizationId!==organizationId || original.directCostMinor!==directCostMinor || original.costEvidence!==costEvidence)
          throw new ConflictException('Booking reward already recorded with different evidence.');
        return prior;
      }
      const source=kind==='TRIP'?await this.entitlements.loyaltySource(tx,organizationId,bookingId)
        :await this.completedPurchase(tx,organizationId,kind,bookingId,commissionEntryId);
      const points=earnPoints(source.paidMinor);
      if(!points || source.commissionMinor-directCostMinor<points) throw new ConflictException('Insufficient qualifying margin.');
      const month=monthNow();
      const budget=await tx.loyaltyMonth.findUnique({where:{id:month}});
      const plan=budget?.forecasts as {firstCenter:string;additional:Forecast[]}|undefined;
      if(!budget || !plan || (plan.firstCenter!==organizationId && !plan.additional.some(f=>f.organizationId===organizationId)))
        throw new ConflictException('No approved budget for this center and month.');
      const changed=await tx.loyaltyMonth.updateMany({where:{id:month,capMinor:budget.capMinor,issuedMinor:{lte:budget.capMinor-points}},data:{issuedMinor:{increment:points}}});
      if(!changed.count) throw new ConflictException('Monthly issuance budget exhausted.');
      const account=await tx.rewardAccount.upsert({where:{accountId:source.payerId},create:{accountId:source.payerId,points},update:{points:{increment:points}}});
      const row=await tx.rewardEntry.create({data:{rewardAccountId:account.id,type:'EARN',points,balanceAfter:account.points,
        idempotencyKey:key,referenceType:'COMPLETED_'+kind,referenceId:bookingId,metadata:{...source,organizationId,directCostMinor,costEvidence,month}}});
      await tx.auditEvent.create({data:{actorId:owner.personId,action:'REWARD_BUDGET_RESERVED',resource:'RewardEntry',resourceId:row.id,metadata:{month,points}}});
      return row;
    });
  }

  private async completedPurchase(tx:Tx,organizationId:string,kind:string,id:string,commissionEntryId?:string) {
    if(!commissionEntryId) throw new ConflictException('Posted platform commission required.');
    const commission=await verifiedEntry(tx,commissionEntryId);
    if(commission.type!=='REVENUE'||commission.referenceType!=='LOYALTY_'+kind+'_COMMISSION'||commission.referenceId!==id
      ||commission.organizationId!==organizationId) throw new ConflictException('Commission evidence mismatch.');
    let proof;
    if(kind==='COURSE') {
      const enrollment=await tx.trainingEnrollment.findFirstOrThrow({where:{id,centerOrganizationId:organizationId,status:'COMPLETED',completedAt:{lte:new Date()}}});
      proof=await requireCourseCollection(tx,enrollment);
    } else {
      const order=await tx.storeOrder.findFirstOrThrow({where:{id,status:'FULFILLED'},include:{items:true,payment:true}});
      proof=await requireVerifiedStoreCollection(tx,order);
    }
    if(!proof||proof.organizationId!==organizationId||proof.currency!=='SAR') throw new ConflictException('Completed and collected purchase required.');
    const refunded=await tx.checkoutRefund.findFirst({where:{checkout:{sourceId:id,sourceType:proof.sourceType}}});
    if(refunded) throw new ConflictException('Refunded purchase requires review.');
    return {payerId:proof.customerAccountId,paidMinor:proof.amountMinor,commissionMinor:commission.amountMinor,
      receiptId:proof.financeEntryId,paymentId:proof.providerPaymentId,completionId:id,allocationId:commission.id};
  }
  async propose(actor:string, organizationId:string, d:Draft) {
    requirePostingEnabled();
    if(!d || !textId(d.title) || !minor(d.platformCap) || !minor(d.centerCap)) throw new BadRequestException('Invalid campaign.');
    offerQuote(d,0);
    return postingTransaction(this.db,async tx=>{
      const center=await tx.organization.findFirst({where:{id:organizationId,ownerId:actor,status:'ACTIVE'}});
      if(!center) throw new ForbiddenException('The supplying center owner must approve the offer.');
      return tx.loyaltyOffer.create({data:{organizationId,title:d.title,priceMinor:d.priceMinor,pointsCost:d.pointsCost,
        platformBps:d.platformBps,platformCap:d.platformCap,centerCap:d.centerCap,centerApprovedBy:actor}});
    });
  }
  async approve(actor:string,id:string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx=>{
      await requirePlatformFinanceApprover(tx,actor);
      return tx.loyaltyOffer.update({where:{id},data:{platformApprovedBy:actor}});
    });
  }
  async offers(organizationId:string) {
    if(process.env.HYDROLAND_B03_LEDGER_POSTING!=='enabled') return [];
    return this.db.loyaltyOffer.findMany({where:{organizationId,platformApprovedBy:{not:null}},
      select:{id:true,title:true,priceMinor:true,pointsCost:true},orderBy:{createdAt:'desc'},take:100});
  }
  async bookingBalance(actor:string,organizationId:string) {
    if(process.env.HYDROLAND_B03_LEDGER_POSTING!=='enabled') return {points:0};
    return postingTransaction(this.db,async tx=>({points:await centerParticipates(tx,organizationId)?await spendablePoints(tx,actor):0}));
  }
  async quote(accountId:string,offerId:string) {
    return postingTransaction(this.db,async tx=>{
      const offer=await tx.loyaltyOffer.findFirst({where:{id:offerId,platformApprovedBy:{not:null}}});
      if(!offer) throw new NotFoundException('Offer unavailable.');
      return {title:offer.title,...offerQuote(offer,await spendablePoints(tx,accountId))};
    });
  }
  async reserve(accountId:string,offerId:string,requestKey:string,expectedHeld:number,expectedCash:number) {
    requirePostingEnabled();
    if(!textId(requestKey)||!minor(expectedHeld)||!minor(expectedCash)) throw new BadRequestException('Confirmed quote required.');
    return postingTransaction(this.db,async tx=>{
      const existing=await tx.loyaltyReservation.findUnique({where:{accountId_requestKey:{accountId,requestKey}}});
      if(existing) {
        if(existing.offerId!==offerId || existing.heldPoints!==expectedHeld || existing.topUpMinor!==expectedCash) throw new ConflictException('Reservation changed.');
        return existing;
      }
      const offer=await tx.loyaltyOffer.findFirst({where:{id:offerId,platformApprovedBy:{not:null}}});
      if(!offer) throw new NotFoundException('Offer unavailable.');
      const q=offerQuote(offer,await spendablePoints(tx,accountId));
      if(q.heldPoints!==expectedHeld || q.cashDueMinor!==expectedCash) throw new ConflictException('Review the updated quote.');

      const held=await tx.loyaltyOffer.updateMany({where:{id:offerId,platformSpent:{lte:offer.platformCap-q.additionalPlatformBudgetMinor},
        centerSpent:{lte:offer.centerCap-q.centerContributionMinor}},data:{platformSpent:{increment:q.additionalPlatformBudgetMinor},centerSpent:{increment:q.centerContributionMinor}}});
      if(!held.count) throw new ConflictException('Campaign budget exhausted.');
      return tx.loyaltyReservation.create({data:{accountId,offerId,requestKey,status:'HELD',heldPoints:q.heldPoints,topUpMinor:q.cashDueMinor,
        platformBonusMinor:q.additionalPlatformBudgetMinor,centerBonusMinor:q.centerContributionMinor}});
    });
  }
  async pending(accountId:string,offerId:string) {
    if(process.env.HYDROLAND_B03_LEDGER_POSTING!=='enabled') return [];
    return this.db.loyaltyReservation.findMany({where:{accountId,offerId,status:{in:['HELD','AWAITING_PAYMENT']}},
      select:{id:true,status:true,heldPoints:true,topUpMinor:true},orderBy:{createdAt:'desc'}});
  }
  async failedPayment(actor:string,id:string,evidenceId:string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx=>{
      await requirePlatformFinanceApprover(tx,actor);
      const hold=await tx.loyaltyReservation.findUniqueOrThrow({where:{id}});
      const evidence=await tx.auditEvent.findUniqueOrThrow({where:{id:evidenceId}});
      const proof=evidence.metadata as Record<string,unknown>|null;
      const offer=await tx.loyaltyOffer.findUniqueOrThrow({where:{id:hold.offerId}});
      if(evidence.resource!=='LoyaltyReservation'||evidence.resourceId!==hold.id||evidence.action!=='LOYALTY_PAYMENT_FAILED'
        ||!proof||proof.accountId!==hold.accountId||proof.amountMinor!==hold.topUpMinor||proof.currency!=='SAR'
        ||proof.organizationId!==offer.organizationId||!textId(proof.providerReference)||evidence.occurredAt<hold.createdAt)
        throw new ConflictException('Confirmed provider failure required.');
      if(hold.status==='PAYMENT_FAILED')return hold;
      if(hold.status!=='AWAITING_PAYMENT')throw new ConflictException('Payment is not awaiting a result.');
      if(await tx.financeEntry.findFirst({where:{referenceId:id,referenceType:{in:['LOYALTY_OFFER_CASH','LOYALTY_OFFER_TOPUP']},status:'POSTED'}}))
        throw new ConflictException('Payment already collected.');
      await tx.loyaltyOffer.update({where:{id:offer.id},data:{platformSpent:{decrement:hold.platformBonusMinor},centerSpent:{decrement:hold.centerBonusMinor}}});
      return tx.loyaltyReservation.update({where:{id},data:{status:'PAYMENT_FAILED'}});
    });
  }

  async beginPayment(accountId:string,id:string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx=>{
      const hold=await tx.loyaltyReservation.findFirstOrThrow({where:{id,accountId}});
      if(hold.status==='AWAITING_PAYMENT') return hold;
      if(hold.status!=='HELD'||hold.topUpMinor<=0) throw new ConflictException('No payment is ready.');
      return tx.loyaltyReservation.update({where:{id},data:{status:'AWAITING_PAYMENT'}});
    });
  }

  async cancel(accountId:string,id:string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx=>{
      const hold=await tx.loyaltyReservation.findFirstOrThrow({where:{id,accountId}});
      if(hold.status==='CANCELLED') return hold;
      if(hold.status!=='HELD') throw new ConflictException('A dispatched payment must first be reconciled.');
      await tx.loyaltyOffer.update({where:{id:hold.offerId},data:{platformSpent:{decrement:hold.platformBonusMinor},centerSpent:{decrement:hold.centerBonusMinor}}});
      return tx.loyaltyReservation.update({where:{id},data:{status:'CANCELLED'}});
    });
  }

  async finish(actor:string,id:string,entryId?:string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx=>{
      const hold=await tx.loyaltyReservation.findUniqueOrThrow({where:{id}});
      if (actor!==hold.accountId || hold.topUpMinor>0) await requirePlatformFinanceApprover(tx,actor);
      if(hold.status==='COMPLETED' && hold.topUpEntryId===(entryId??null)) return hold;
      if(hold.status!==(hold.topUpMinor?'AWAITING_PAYMENT':'HELD')) throw new ConflictException('Reservation is no longer pending.');
      const offer=await tx.loyaltyOffer.findUniqueOrThrow({where:{id:hold.offerId}});
      if(hold.topUpMinor>0) {
        if(!entryId) throw new ConflictException('Payment receipt required.');
        const paid=await verifiedEntry(tx,entryId);
        const type=offer.priceMinor>offer.pointsCost?'LOYALTY_OFFER_TOPUP':'LOYALTY_OFFER_CASH';
        if(paid.type!=='REVENUE'||paid.referenceType!==type||paid.referenceId!==id||paid.organizationId!==offer.organizationId||paid.amountMinor!==hold.topUpMinor)
          throw new ConflictException('Confirmed offer payment does not match.');
      } else if(entryId) throw new ConflictException('No cash payment was due.');
      if (hold.heldPoints>0) {
        const account=await tx.rewardAccount.updateMany({where:{accountId:hold.accountId,points:{gte:hold.heldPoints}},data:{points:{decrement:hold.heldPoints}}});
        if(!account.count) throw new ConflictException('Insufficient points.');
        const member=await tx.rewardAccount.findUniqueOrThrow({where:{accountId:hold.accountId}});
        await tx.rewardEntry.create({data:{rewardAccountId:member.id,type:'REDEEM',points:hold.heldPoints,balanceAfter:member.points,
          idempotencyKey:'reward-reservation:'+id,referenceType:'LOYALTY_OFFER',referenceId:id,metadata:{
            organizationId:offer.organizationId,offerId:offer.id,cashPaidMinor:hold.topUpMinor,costToCenterMinor:hold.centerBonusMinor,
            costToPlatformMinor:offer.priceMinor-hold.topUpMinor-hold.centerBonusMinor,supplierBeforeCommissionMinor:offer.priceMinor-hold.centerBonusMinor}}});
      }
      return tx.loyaltyReservation.update({where:{id},data:{status:'COMPLETED',topUpEntryId:entryId??null}});
    });
  }
}
