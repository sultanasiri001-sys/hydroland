import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CheckoutRefund, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { requireFinancialOperationMandate } from '../finance/finance-operation-mandate';
import { courseContractHash, requireAcceptedCourseContract, requireCourseContract } from '../commerce/course-contract';
import { requirePostedCourseCollection } from '../commerce/course-collection';
import { requireAcceptedStoreContract, requirePostedStoreCollection, requireStoreCheckoutContract, storeCanonicalJson, storeObject } from '../store/store-checkout-contract';
import { riyadhSevenDayRefundDeadline } from '../commerce/commerce-refund-policy';
import { MoyasarPayment, MoyasarPaymentProviderService } from './moyasar-payment-provider.service';

export type RefundKind = 'COURSE' | 'GOODS';
const settings = {
  COURSE: {source:'TRAINING_ENROLLMENT', reference:'COURSE_CANCELLATION_REFUND'},
  GOODS: {source:'STORE_ORDER', reference:'STORE_GOODS_RETURN_REFUND'},
} as const;

@Injectable()
export class CheckoutRefundService {
  constructor(private readonly db: DatabaseService, private readonly provider: MoyasarPaymentProviderService) {}

  private async claim(tx: Prisma.TransactionClient, kind: RefundKind, id: string) {
    if (kind === 'COURSE') {
      const request = await tx.auditEvent.findFirst({where:{id,resource:'TrainingEnrollment',action:'COURSE_CUSTOMER_CANCELLATION_RECORDED'}});
      if (!request?.resourceId) throw new NotFoundException('Cancellation not found.');
      const row = await tx.trainingEnrollment.findUniqueOrThrow({where:{id:request.resourceId}});
      const contract = requireCourseContract(row), saved=storeObject(request.metadata), decision=storeObject(saved.decision);
      if (row.status!=='CANCELLED' || saved.customerAccountId!==row.studentAccountId || saved.contractHash!==courseContractHash(contract)
        || decision.lineId!==row.id || decision.status!=='ELIGIBLE' || decision.currency!=='SAR'
        || decision.policyVersion!==contract.refundPolicy.snapshot.version) throw new ConflictException('The recorded cancellation requires review.');
      return {sourceId:row.id, customerId:row.studentAccountId, centerId:row.centerOrganizationId!, contract,
        maximum:decision.refundAmountMinor, evidenceId:saved.collectionEvidenceId as string};
    }
    const row=await tx.storeGoodsReturn.findUnique({where:{id},include:{delivery:{include:{item:{include:{order:{include:{items:true,payment:true}}}}}}}});
    if (!row) throw new NotFoundException('Return request not found.');
    const {item}=row.delivery, contract=requireStoreCheckoutContract(item.order);
    if (!row.sellerReceivedAt || row.delivery.organizationId!==contract.organizationId || row.delivery.customerAccountId!==item.order.accountId
      || row.quantity<1 || row.quantity>row.delivery.quantity) throw new ConflictException('The original seller must receive these goods first.');
    // A receipt alone is not a finding about use, condition, or mandatory rights.
    // Review is specific to this return, quantity and the original supplying center.
    const review=await tx.auditEvent.findFirst({where:{resource:'StoreGoodsReturn',resourceId:id,action:'STORE_GOODS_REFUND_REMEDY_VERIFIED'},orderBy:{occurredAt:'desc'}});
    const findings=storeObject(review?.metadata);
    if (findings.organizationId!==contract.organizationId || findings.quantity!==row.quantity || findings.receiptTime!==row.sellerReceivedAt.toISOString()
      || !findings.evidenceReference || (findings.basis!=='VERIFIED_RIGHT' && !(findings.basis==='ELIGIBLE_UNUSED' && row.reason==='CHANGE_OF_MIND'
        && row.requestedAt.toISOString()<=riyadhSevenDayRefundDeadline(row.delivery.receivedAt.toISOString())))) throw new ConflictException('The return remedy needs seller evidence.');
    return {sourceId:item.orderId, customerId:item.order.accountId, centerId:contract.organizationId, contract,
      maximum:row.quantity*item.unitPriceMinor, evidenceId:null};
  }

  private async authorizedEntry(tx: Prisma.TransactionClient, actor: string, kind: RefundKind, claimId: string, entryId: string) {
    await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${entryId} FOR UPDATE`;
    const entry=await tx.financeEntry.findUnique({where:{id:entryId},include:{financeAccount:true,approvals:true}});
    if (!entry || entry.type!=='REFUND' || entry.referenceType!==settings[kind].reference || entry.referenceId!==claimId
      || entry.currency!=='SAR' || entry.financeAccount.currency!=='SAR' || !entry.financeAccount.active
      || entry.financeAccount.organizationId!==entry.organizationId || !entry.approvedAt || !entry.approvedByAccountId || entry.amountMinor<=0
      || !entry.approvals.some(a=>a.status==='APPROVED' && a.requestedByAccountId===entry.requestedByAccountId
        && a.decidedByAccountId===entry.approvedByAccountId && a.decidedAt?.getTime()===entry.approvedAt!.getTime())) {
      throw new ConflictException('A matching independently approved SAR refund entry is required.');
    }
    if (new Set([actor,entry.requestedByAccountId,entry.approvedByAccountId]).size!==3) throw new ForbiddenException('Refund duties must be separate.');
    await requireFinancialOperationMandate(tx,actor,entry.organizationId,'EXECUTE_REFUND',entry.amountMinor,'SAR');
    return entry;
  }

  private result(row: CheckoutRefund) {
    return {operationId:row.id, claimId:row.claimId, status:row.status, amountMinor:row.amountMinor,currency:'SAR',
      financialActionExecuted:row.status==='POSTED'?true:null};
  }

  async execute(actor: string, kind: RefundKind, claimId: string, entryId: string) {
    if (!entryId || typeof entryId!=='string' || entryId.length>128) throw new BadRequestException('Supply the approved refund entry.');
    const prepare = async (tx: Prisma.TransactionClient, replayOnly = false) => {
      const entry=await this.authorizedEntry(tx,actor,kind,claimId,entryId);
      const prior=await tx.checkoutRefund.findUnique({where:{claimId}});
      if (prior) {
        if (prior.financeEntryId!==entryId || prior.executorId!==actor || prior.organizationId!==entry.organizationId) throw new ConflictException('Claim already bound.');
        return {row:prior,dispatch:false};
      }
      if (replayOnly || entry.status!=='APPROVED') throw new ConflictException('Refund entry or collection is already in use.');
      const claim=await this.claim(tx,kind,claimId);
      if (claim.centerId!==entry.organizationId || !Number.isSafeInteger(claim.maximum) || entry.amountMinor!==claim.maximum) throw new ConflictException('The approved amount must equal the eligible amount of this claim.');
      await requireFinancialOperationMandate(tx,entry.approvedByAccountId!,entry.organizationId,'APPROVE_REFUND',entry.amountMinor,'SAR');
      const key={sourceType_sourceId:{sourceType:settings[kind].source,sourceId:claim.sourceId}};
      const checkout=await tx.commerceCheckout.findUnique({where:key}), proof=await tx.commerceCollectionEvidence.findUnique({where:key});
      if (!checkout || !proof || (claim.evidenceId && claim.evidenceId!==proof.id) || checkout.provider!=='MOYASAR' || proof.provider!=='MOYASAR'
        || checkout.customerAccountId!==claim.customerId || proof.customerAccountId!==claim.customerId || checkout.organizationId!==claim.centerId || proof.organizationId!==claim.centerId
        || checkout.currency!=='SAR' || proof.currency!=='SAR' || checkout.amountMinor!==claim.contract.amountMinor || proof.amountMinor!==checkout.amountMinor
        || proof.providerCapturedMinor!==checkout.amountMinor || checkout.providerPaymentId!==proof.providerPaymentId || checkout.providerInvoiceId!==proof.providerInvoiceId
        || storeCanonicalJson(checkout.contractSnapshot)!==storeCanonicalJson(proof.contractSnapshot)) throw new ConflictException('Original provider and ledger evidence do not match.');
      if (kind==='COURSE') {
        requireAcceptedCourseContract(claim.contract,checkout.contractSnapshot);
        await requirePostedCourseCollection(tx,{financeEntryId:proof.financeEntryId,enrollmentId:claim.sourceId,organizationId:claim.centerId,amountMinor:proof.amountMinor});
      } else {
        requireAcceptedStoreContract(claim.contract as ReturnType<typeof requireStoreCheckoutContract>,checkout.contractSnapshot);
        await requirePostedStoreCollection(tx,{financeEntryId:proof.financeEntryId,orderId:claim.sourceId,organizationId:claim.centerId,amountMinor:proof.amountMinor});
      }
      const observation = storeObject(storeObject(checkout.providerResult).payment);
      const saved = storeObject(proof.providerSnapshot);
      const metadata = storeObject(saved.invoiceMetadata);
      const reconciled = await tx.checkoutRefund.aggregate({
        where: {checkoutId: checkout.id, status: 'POSTED'}, _sum: {amountMinor: true},
      });
      const alreadyRefunded = reconciled._sum.amountMinor ?? 0;
      const matchingPayment = (payment: ReturnType<typeof storeObject>) =>
        payment.id === proof.providerPaymentId && payment.invoiceId === proof.providerInvoiceId
        && payment.currency === 'SAR' && payment.amountMinor === checkout.amountMinor
        && payment.capturedMinor === checkout.amountMinor && payment.refundedMinor === alreadyRefunded
        && ['paid', 'captured', 'refunded'].includes(payment.status);
      if ((checkout.status !== 'CAPTURED' && !(checkout.status === 'RECONCILIATION_REQUIRED' && alreadyRefunded > 0))
        || !matchingPayment(observation) || !matchingPayment(saved) || alreadyRefunded !== proof.providerRefundedMinor
        || metadata.hydroland_checkout_id !== checkout.id || metadata.hydroland_source_type !== settings[kind].source
        || metadata.hydroland_source_id !== claim.sourceId || metadata.hydroland_organization_id !== claim.centerId
        || metadata.hydroland_customer_account_id !== claim.customerId
        || alreadyRefunded + entry.amountMinor > proof.providerCapturedMinor) {
        throw new ConflictException('Reconcile the original provider evidence and posted balance before refunding.');
      }
      if (await tx.checkoutRefund.findFirst({where:{checkoutId:checkout.id,status:{not:'POSTED'}}})) throw new ConflictException('A previous refund awaits reconciliation.');
      const row=await tx.checkoutRefund.create({data:{checkoutId:checkout.id,claimId,financeEntryId:entry.id,executorId:actor,approverId:entry.approvedByAccountId!,
        preparerId:entry.requestedByAccountId,organizationId:claim.centerId,originalAmountMinor:checkout.amountMinor,amountMinor:entry.amountMinor,
        baselineMinor:proof.providerRefundedMinor,providerPaymentId:proof.providerPaymentId,providerInvoiceId:proof.providerInvoiceId,status:'DISPATCHED'}});
      return {row,dispatch:true};
    };
    const prepared=await this.db.serializable(tx=>prepare(tx)).catch(error=>{
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code!=='P2002') throw error;
      return this.db.serializable(tx=>prepare(tx,true));
    });
    const {row}=prepared;
    if (row.status==='POSTED') return this.result(row);
    if (prepared.dispatch) {
      try {
        const payment=await this.provider.refundPayment({providerPaymentId:row.providerPaymentId,invoiceId:row.providerInvoiceId,amountMinor:row.originalAmountMinor,
          expectedRefundedMinor:row.baselineMinor,refundAmountMinor:row.amountMinor,currency:'SAR'});
        await this.db.checkoutRefund.update({where:{id:row.id},data:{providerResult:payment}});
      } catch {
        await this.db.checkoutRefund.updateMany({where:{id:row.id,status:'DISPATCHED'},data:{status:'RECONCILIATION_REQUIRED'}});
      }
    }
    return this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "CheckoutRefund" WHERE "id"=${row.id} FOR UPDATE`;
      const current=await tx.checkoutRefund.findUniqueOrThrow({where:{id:row.id}});
      if (current.status==='POSTED' || !current.providerResult) return this.result(current);
      const observed=current.providerResult as unknown as MoyasarPayment;
      const checkout=await tx.commerceCheckout.findUniqueOrThrow({where:{id:current.checkoutId}});
      const proof=await tx.commerceCollectionEvidence.findUniqueOrThrow({where:{sourceType_sourceId:{sourceType:checkout.sourceType,sourceId:checkout.sourceId}}});
      if (observed.id!==current.providerPaymentId || observed.invoiceId!==current.providerInvoiceId || observed.currency!=='SAR'
        || observed.capturedMinor!==current.originalAmountMinor || observed.amountMinor!==current.originalAmountMinor || observed.refundedMinor!==current.baselineMinor+current.amountMinor
        || proof.providerPaymentId!==observed.id || proof.providerInvoiceId!==observed.invoiceId || proof.providerRefundedMinor!==current.baselineMinor) throw new ConflictException('Reconcile the original refund response.');
      const now=new Date();
      const posted=await tx.financeEntry.updateMany({where:{id:entryId,status:'APPROVED',type:'REFUND',referenceType:settings[kind].reference,referenceId:claimId,
        organizationId:current.organizationId,requestedByAccountId:current.preparerId,approvedByAccountId:current.approverId,currency:'SAR',amountMinor:current.amountMinor},
        data:{status:'POSTED',postedAt:now,postedByAccountId:current.executorId}});
      if (posted.count!==1) throw new ConflictException('Financial entry changed after provider execution.');
      await tx.commerceCollectionEvidence.update({where:{id:proof.id},data:{providerRefundedMinor:observed.refundedMinor,providerVerifiedAt:now,
        providerSnapshot:{...observed,invoiceMetadata:storeObject(proof.providerSnapshot).invoiceMetadata}}});
      await tx.commerceCheckout.update({where:{id:checkout.id},data:{status:'RECONCILIATION_REQUIRED',providerResult:{...storeObject(checkout.providerResult),payment:observed,verifiedAt:now.toISOString()}}});
      if (kind==='GOODS' && observed.refundedMinor===current.originalAmountMinor) {
        await tx.storePayment.update({where:{orderId:checkout.sourceId},data:{status:'REFUNDED'}});
      }
      await tx.auditEvent.create({data:{action:'CHECKOUT_REFUND_POSTED',resource:'CheckoutRefund',resourceId:current.id,
        metadata:{claimId,financeEntryId:entryId,executorId:current.executorId,amountMinor:current.amountMinor,providerPaymentId:observed.id}}});
      return this.result(await tx.checkoutRefund.update({where:{id:current.id},data:{status:'POSTED',postedAt:now}}));
    });
  }
}
