import { RentalDamagePaymentService } from './rental-damage-payment.service';
import { OrganizationBookingCheckoutService, organizationPayer } from './organization-booking-checkout.service';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from '../trips/policy-control.service';
import { IntegrationService } from '../integrations/integration.service';
import { PaymentContractService } from '../commerce/payment-contract.service';
import { MoyasarInvoice, MoyasarPaymentProviderService } from './moyasar-payment-provider.service';
import { RentalCheckoutService } from './rental-checkout.service';
import { StoreCheckoutService } from '../store/store-checkout.service';
import { TrainingCheckoutService } from './training-checkout.service';

type PaymentWithInvoice={
  id:string;
  bookingId:string;
  accountId:string;
  amountMinor:number;
  currency:string;
  status:string;
  idempotencyKey:string;
  providerReference:string|null;
  createdAt:Date;
  updatedAt:Date;
  invoice:unknown|null;
};

type TripPrice={pricePerSeatMinor:number;currency:string};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db:DatabaseService,
    private readonly policies:PolicyControlService,
    private readonly audit:AuditService,
    private readonly integrations:IntegrationService,
    private readonly moyasar:MoyasarPaymentProviderService,
    private readonly contracts:PaymentContractService = new PaymentContractService(db),
    private readonly rentalCheckouts?:RentalCheckoutService,
    private readonly storeCheckouts?:StoreCheckoutService,
    private readonly trainingCheckouts?:TrainingCheckoutService,
    private readonly organizationCheckouts?:OrganizationBookingCheckoutService,
    private readonly damagePayments?:RentalDamagePaymentService,
  ){}

  async create(accountId:string,input:{bookingId:string;idempotencyKey:string;policyAcceptance?:{version?:string;quoteHash?:string}}){
    if(typeof input?.bookingId!=='string'||!input.bookingId.trim()||typeof input.idempotencyKey!=='string'||!input.idempotencyKey.trim())throw new BadRequestException('Invalid payment.');
    if(input.idempotencyKey.trim().startsWith('org-prepay:'))throw new BadRequestException('Invalid personal payment request key.');
    const paymentPolicy=await this.policies.decision('PAYMENT','PAYMENT_REQUIRED');
    const booking=await this.db.booking.findFirst({where:{id:input.bookingId,accountId,organizationId:null},include:{trip:true}});
    if(!booking)throw new NotFoundException('Booking not found.');
    if(booking.status==='CANCELLED')throw new ConflictException('Cancelled booking cannot create a payment.');
    if(paymentPolicy.bypass)return{bookingId:booking.id,status:'BYPASSED',provider:'BYPASSED',policyReview:{required:false,issues:[],states:{payment:paymentPolicy.state}}};
    const savedContract=booking.contractSnapshot&&typeof booking.contractSnapshot==='object'&&!Array.isArray(booking.contractSnapshot)?booking.contractSnapshot as Record<string,unknown>:null;
    const pricing=savedContract&&typeof savedContract.unitPriceMinor==='number'&&typeof savedContract.currency==='string'?{pricePerSeatMinor:savedContract.unitPriceMinor,currency:savedContract.currency}:await this.tripPrice(booking.tripId);
    if(!pricing)throw new ConflictException('Trip price is not configured.');
    if(pricing.currency!=='SAR')throw new ConflictException('Trip payment currency is not supported.');
    const amountMinor=pricing.pricePerSeatMinor*booking.seats;
    if(!Number.isSafeInteger(amountMinor)||amountMinor<0)throw new ConflictException('Trip payment amount is invalid.');
    const originalContract=booking.contractSnapshot!==null&&booking.contractSnapshot!==undefined
      ?this.contracts.buildTrip(booking,pricing.pricePerSeatMinor,pricing.currency):null;
    if(amountMinor===0)return{bookingId:booking.id,status:'BYPASSED',provider:'FREE_TRIP',amountMinor:0,currency:pricing.currency,policyReview:{required:false,issues:[],states:{payment:paymentPolicy.state}}};
    if(amountMinor<100)throw new ConflictException('Trip payment amount is below the provider minimum.');
    const idempotencyKey=input.idempotencyKey.trim();
    const existing=await this.db.payment.findUnique({where:{idempotencyKey}});
    if(existing&&existing.accountId!==accountId)throw new ConflictException('Idempotency key already belongs to another payment.');
    if(existing&&(existing.bookingId!==input.bookingId||existing.amountMinor!==amountMinor||existing.currency!==pricing.currency))throw new ConflictException('Idempotency key cannot be reused with different payment details.');
    if(originalContract&&!existing&&!input.policyAcceptance)throw new ConflictException({code:'PAYMENT_TERMS_ACCEPTANCE_REQUIRED',message:'Review and accept the booking conditions before checkout.'});
    const contractSnapshot=originalContract?this.contracts.accepted(originalContract,input.policyAcceptance):null;
    this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});
    let payment=await this.db.payment.upsert({where:{idempotencyKey},create:{bookingId:input.bookingId,amountMinor,currency:pricing.currency,idempotencyKey,accountId,status:'CREATED',...(contractSnapshot?{contractSnapshot:contractSnapshot as Prisma.InputJsonValue}:{})},update:{}});
    // Another request can claim the key after the lookup. Validate the persisted
    // winner before attributing an audit or creating/fetching its provider invoice.
    if(payment.accountId!==accountId)throw new ConflictException('Idempotency key already belongs to another payment.');
    if(payment.bookingId!==input.bookingId||payment.amountMinor!==amountMinor||payment.currency!==pricing.currency)throw new ConflictException('Idempotency key cannot be reused with different payment details.');
    if(!existing)await this.audit.record({action:'PAYMENT_CREATED',resource:'Payment',resourceId:payment.id,metadata:{accountId,bookingId:payment.bookingId,seats:booking.seats,pricePerSeatMinor:pricing.pricePerSeatMinor,amountMinor:payment.amountMinor,currency:payment.currency,status:payment.status,provider:'MOYASAR',policyState:paymentPolicy.state,financialActionExecuted:false}});

    let providerInvoice:MoyasarInvoice;
    if(payment.providerReference){
      providerInvoice=await this.moyasar.fetchInvoice(payment.providerReference);
      this.assertProviderInvoice(payment,providerInvoice);
      payment=await this.reconcileProviderInvoice(payment,providerInvoice);
    }else{
      providerInvoice=await this.moyasar.createInvoice({paymentId:payment.id,bookingId:payment.bookingId,amountMinor:payment.amountMinor,currency:payment.currency});
      this.assertProviderInvoice(payment,providerInvoice);
      const claimed=await this.db.payment.updateMany({where:{id:payment.id,providerReference:null},data:{providerReference:providerInvoice.id,status:this.statusFromInvoice(providerInvoice.status)}});
      if(claimed.count===1){
        payment=await this.db.payment.findUniqueOrThrow({where:{id:payment.id}});
        await this.audit.record({action:'PAYMENT_CHECKOUT_CREATED',resource:'Payment',resourceId:payment.id,metadata:{accountId,bookingId:payment.bookingId,provider:'MOYASAR',providerReference:providerInvoice.id,status:payment.status}});
        await this.syncMoyasarPaymentId(payment.id,providerInvoice);
        payment=await this.db.serializable(async tx=>{
          const current=await tx.payment.findUniqueOrThrow({where:{id:payment.id}});
          await this.contracts.recordInvoiceSnapshot(current,tx);
          return current;
        });
      }else{
        await this.moyasar.cancelInvoice(providerInvoice.id);
        payment=await this.db.payment.findUniqueOrThrow({where:{id:payment.id}});
        if(!payment.providerReference)throw new ConflictException('Payment checkout is being prepared. Retry the request.');
        providerInvoice=await this.moyasar.fetchInvoice(payment.providerReference);
        this.assertProviderInvoice(payment,providerInvoice);
        payment=await this.reconcileProviderInvoice(payment,providerInvoice);
      }
    }
    return{...payment,provider:'MOYASAR',checkoutUrl:providerInvoice.url,providerStatus:providerInvoice.status,policyReview:{required:paymentPolicy.review,issues:paymentPolicy.review?['PAYMENT_REQUIRED']:[],states:{payment:paymentPolicy.state}}};
  }

  async refresh(accountId:string,paymentId:string){
    const payment=await this.db.payment.findFirst({where:{id:paymentId,accountId,booking:{organizationId:null}}});
    if(!payment)throw new NotFoundException('Payment not found.');
    if(!payment.providerReference)return{...payment,provider:'MOYASAR',checkoutReady:false};
    const invoice=await this.moyasar.fetchInvoice(payment.providerReference);
    this.assertProviderInvoice(payment,invoice);
    const updated=await this.reconcileProviderInvoice(payment,invoice);
    return{...updated,provider:'MOYASAR',checkoutReady:true,checkoutUrl:invoice.url,providerStatus:invoice.status};
  }

  async handleMoyasarWebhook(payload:unknown){
    const event=this.moyasar.verifyWebhook(payload);
    const invoiceId=typeof event.data.invoice_id==='string'?event.data.invoice_id.trim():'';
    if(!invoiceId)return{accepted:true,matched:false};
    const duplicate=await this.db.auditEvent.findFirst({where:{resource:'PaymentProviderWebhook',resourceId:event.id},select:{id:true}});
    if(duplicate)return{accepted:true,duplicate:true};
    const payment=await this.db.payment.findUnique({where:{providerReference:invoiceId}});
    if (this.organizationCheckouts) {
      const metadata = event.data.metadata;
      const id = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string,unknown>).hydroland_payment_id : null;
      const candidate = payment ?? (typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id) ? await this.db.payment.findUnique({where:{id}}) : null);
      if (candidate && organizationPayer(candidate.contractSnapshot).source === 'ORGANIZATION_BOOKING_PREPAYMENT') {
        const result = await this.organizationCheckouts.providerEvent(candidate, invoiceId);
        await this.db.serializable(async tx => {
          await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'commerce-webhook:'+event.id},0))`;
          const prior = await tx.auditEvent.findFirst({where:{resource:'PaymentProviderWebhook',resourceId:event.id}});
          if (!prior) await tx.auditEvent.create({data:{action:'PAYMENT_PROVIDER_WEBHOOK_PROCESSED',resource:'PaymentProviderWebhook',resourceId:event.id,
            metadata:{provider:'MOYASAR',sourceType:'ORGANIZATION_BOOKING_PREPAYMENT',paymentId:result.paymentId,bookingId:result.bookingId,status:result.status}}});
        });
        return {accepted:true,matched:true,paymentId:result.paymentId,status:result.status};
      }
    }
    if(!payment){
      // All commerce routes share the verified webhook boundary. Each handler
      // resolves its own persisted source binding and reads the provider afresh;
      // notification amounts and a client-side status never confirm collection.
      const handlers = [
        ['EQUIPMENT_RENTAL', this.rentalCheckouts],
        ['RENTAL_DAMAGE', this.damagePayments],
        ['STORE_ORDER', this.storeCheckouts],
        ['TRAINING_ENROLLMENT', this.trainingCheckouts],
      ] as const;
      for (const [sourceType, handler] of handlers) {
        const result=await handler?.handleVerifiedProviderEvent(event);
        if(!result?.handled)continue;
        await this.db.serializable(async tx=>{
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`commerce-webhook:${event.id}`},0))`;
          const repeated=await tx.auditEvent.findFirst({where:{resource:'PaymentProviderWebhook',resourceId:event.id},select:{id:true}});
          if(!repeated)await tx.auditEvent.create({data:{action:'PAYMENT_PROVIDER_WEBHOOK_PROCESSED',resource:'PaymentProviderWebhook',resourceId:event.id,
            metadata:{provider:'MOYASAR',type:event.type,invoiceId,sourceType,status:result.status,live:event.live,providerVerified:true}}});
        });
        return{accepted:true,matched:true,sourceType,...result};
      }
      return this.db.serializable(async tx=>{
        const repeated=await tx.auditEvent.findFirst({where:{resource:'PaymentProviderWebhook',resourceId:event.id},select:{id:true}});
        if(repeated)return{accepted:true,duplicate:true};
        const matched=await tx.payment.findUnique({where:{providerReference:invoiceId}});
        if(matched)throw new ConflictException('Payment checkout changed during reconciliation. Retry the webhook.');
        await tx.auditEvent.create({data:{action:'PAYMENT_PROVIDER_WEBHOOK_UNMATCHED',resource:'PaymentProviderWebhook',resourceId:event.id,metadata:{provider:'MOYASAR',type:event.type,invoiceId,live:event.live}}});
        return{accepted:true,matched:false};
      });
    }
    const providerInvoice=await this.moyasar.fetchInvoice(invoiceId);
    this.assertProviderInvoice(payment,providerInvoice);
    const next=this.statusFromInvoice(providerInvoice.status,payment);
    return this.db.serializable(async tx=>{
      const repeated=await tx.auditEvent.findFirst({where:{resource:'PaymentProviderWebhook',resourceId:event.id},select:{id:true}});
      if(repeated)return{accepted:true,duplicate:true};
      const current=await this.requireReconciliationSnapshot(payment,providerInvoice,tx);
      await this.syncMoyasarPaymentId(current.id,providerInvoice,tx);
      const reconciled=next!==current.status?await tx.payment.update({where:{id:current.id},data:{status:next}}):current;
      await this.contracts.recordInvoiceSnapshot(reconciled,tx);
      await tx.auditEvent.create({data:{action:'PAYMENT_PROVIDER_WEBHOOK_PROCESSED',resource:'PaymentProviderWebhook',resourceId:event.id,metadata:{provider:'MOYASAR',type:event.type,paymentId:current.id,invoiceId,from:current.status,to:next,providerStatus:providerInvoice.status,live:event.live,providerVerified:true}}});
      return{accepted:true,matched:true,paymentId:current.id,status:next};
    });
  }

  async requestRefund(
    accountId: string,
    paymentId: string,
    reason: unknown,
    request: { amountMinor?: number; currency?: string } = {},
  ) {
    if (typeof reason !== 'string' || reason.trim().length < 10) {
      throw new BadRequestException('Refund reason must be at least 10 characters.');
    }
    return this.db.serializable(async tx => {
      const payment = await tx.payment.findFirst({ where: { id: paymentId, accountId, booking: { organizationId: null } } });
      if (!payment) throw new NotFoundException('Payment not found.');
      if (['REFUNDED', 'CANCELLED', 'FAILED'].includes(payment.status)) {
        throw new ConflictException('Payment is not eligible for a refund request.');
      }
      if (request.currency !== undefined && request.currency !== payment.currency) {
        throw new BadRequestException('Requested currency must match the payment currency.');
      }
      const requestedAmountMinor = request.amountMinor === undefined ? payment.amountMinor : request.amountMinor;
      if (!Number.isSafeInteger(requestedAmountMinor) || requestedAmountMinor <= 0 || requestedAmountMinor > payment.amountMinor) {
        throw new BadRequestException('Requested amount must be a positive integer within the original payment.');
      }
      const receipt = { action: 'PAYMENT_REFUND_REQUESTED', resource: 'Payment', resourceId: paymentId };
      const recent = await tx.auditEvent.findFirst({
        where: { ...receipt, occurredAt: { gt: new Date(Date.now() - 300000) } },
        select: { id: true },
      });
      if (recent) throw new ConflictException('A refund request was already submitted recently.');
      const policy = await this.policies.decision('PAYMENT', 'REFUND_REVIEW', tx);
      const policyDecision=await this.contracts.refundDecision(payment,new Date(),tx);
      const event = await this.audit.record({ ...receipt, metadata: {
        accountId, bookingId: payment.bookingId, amountMinor: payment.amountMinor, requestedAmountMinor,
        currency: payment.currency, paymentStatus: payment.status, reason: reason.trim(),
        provider: 'MOYASAR', policyState: policy.state, financialActionExecuted: false, policyDecision,
      } }, tx);
      return {
        paymentId, status: 'REFUND_REQUESTED', requestedAmountMinor, currency: payment.currency,
        financialActionExecuted: false, provider: 'MOYASAR', auditEventId: event.id, policyDecision,
        policyReview: { required: !policy.bypass, reviewRequired: policy.review, enforced: policy.enforce, states: { refund: policy.state } },
      };
    });
  }

  async mine(accountId:string){
    const refundPolicy=await this.policies.decision('PAYMENT','REFUND_REVIEW');
    const payments=await this.db.payment.findMany({where:{accountId,booking:{organizationId:null}},include:{invoice:true},orderBy:{createdAt:'desc'}}) as PaymentWithInvoice[];
    return payments.map((payment:PaymentWithInvoice)=>({...payment,provider:payment.providerReference?'MOYASAR':'PENDING_PROVIDER',refundPolicy:{state:refundPolicy.state,reviewRequired:refundPolicy.review,enforced:refundPolicy.enforce}}));
  }

  private async tripPrice(tripId:string):Promise<TripPrice|null>{
    const setting=await this.db.operationalSetting.findUnique({where:{key:`trip-price:${tripId}`},select:{value:true}});
    if(!setting?.value||typeof setting.value!=='object'||Array.isArray(setting.value))return null;
    const value=setting.value as Record<string,unknown>;
    const pricePerSeatMinor=typeof value.pricePerSeatMinor==='number'?value.pricePerSeatMinor:Number.NaN;
    const currency=typeof value.currency==='string'?value.currency.trim().toUpperCase():'';
    if(!Number.isSafeInteger(pricePerSeatMinor)||pricePerSeatMinor<0||!currency)return null;
    return{pricePerSeatMinor,currency};
  }

  private assertProviderInvoice(payment:{id:string;bookingId:string;amountMinor:number;currency:string},invoice:MoyasarInvoice){
    if(invoice.amount!==payment.amountMinor||invoice.currency!==payment.currency)throw new ConflictException('Provider invoice does not match local payment.');
    if(invoice.metadata.hydroland_payment_id!==payment.id||invoice.metadata.hydroland_booking_id!==payment.bookingId)throw new ConflictException('Provider invoice metadata does not match local payment.');
  }
  private async requireReconciliationSnapshot(snapshot:Payment,invoice:MoyasarInvoice,tx:Prisma.TransactionClient){
    const current=await tx.payment.findUnique({where:{id:snapshot.id}});
    if(!current||current.providerReference!==snapshot.providerReference||invoice.id!==current.providerReference)throw new ConflictException('Payment provider reference changed during reconciliation.');
    // The provider GET runs before this transaction. Never apply its response
    // over a payment changed while that request was in flight, including retries.
    if(current.status!==snapshot.status||current.updatedAt.getTime()!==snapshot.updatedAt.getTime()
      ||current.accountId!==snapshot.accountId||current.bookingId!==snapshot.bookingId
      ||current.amountMinor!==snapshot.amountMinor||current.currency!==snapshot.currency){
      throw new ConflictException({code:'PAYMENT_RECONCILIATION_STALE',message:'Payment changed during provider reconciliation. Retry the request.'});
    }
    this.assertProviderInvoice(current,invoice);
    return current;
  }

  private reconcileProviderInvoice(snapshot:Payment,invoice:MoyasarInvoice){
    return this.db.serializable(async tx=>{
      const current=await this.requireReconciliationSnapshot(snapshot,invoice,tx);
      await this.syncMoyasarPaymentId(current.id,invoice,tx);
      const status=this.statusFromInvoice(invoice.status,current);
      const updated=status===current.status?current:await tx.payment.update({where:{id:current.id},data:{status}});
      if(status!==current.status)await this.audit.record({action:'PAYMENT_PROVIDER_RECONCILED',resource:'Payment',resourceId:current.id,metadata:{accountId:current.accountId,provider:'MOYASAR',providerReference:current.providerReference,from:current.status,to:status,providerStatus:invoice.status}},tx);
      await this.contracts.recordInvoiceSnapshot(updated,tx);
      return updated;
    });
  }

  private async syncMoyasarPaymentId(paymentId:string,invoice:MoyasarInvoice,tx:Prisma.TransactionClient=this.db){
    const paid=invoice.payments.filter(item=>['paid','captured'].includes(item.status)&&item.amount>0&&item.currency===invoice.currency);
    if(paid.length!==1)return;
    const providerPaymentId=paid[0].id.trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerPaymentId))return;
    try{
      const updated=await tx.$executeRaw`UPDATE "Payment" SET "moyasarPaymentId"=${providerPaymentId} WHERE "id"::text=${paymentId} AND ("moyasarPaymentId" IS NULL OR "moyasarPaymentId"=${providerPaymentId})`;
      if(updated===0){
        const current=await tx.$queryRaw<Array<{moyasarPaymentId:string|null}>>`SELECT "moyasarPaymentId" FROM "Payment" WHERE "id"::text=${paymentId}`;
        if(current[0]?.moyasarPaymentId&&current[0].moyasarPaymentId!==providerPaymentId)throw new ConflictException('Provider payment reference changed during reconciliation.');
      }
    }catch(error){
      if(error instanceof ConflictException)throw error;
      if(error&&typeof error==='object'&&'code'in error&&['P2002','23505'].includes(String((error as {code?:unknown}).code)))throw new ConflictException('Provider payment reference is already linked to another payment.');
      throw error;
    }
  }
  private statusFromInvoice(status:string,payment?:{amountMinor:number;refundedAmountMinor?:number;status?:string}):PaymentStatus{
    const refunded=payment?.refundedAmountMinor??0;
    // A later invoice summary cannot undo a previously observed refund. A
    // cumulative provider total without operation attribution stays reviewable.
    if(payment?.status==='REFUNDED')return PaymentStatus.REFUNDED;
    if(refunded>0&&payment&&refunded===payment.amountMinor)return PaymentStatus.REFUNDED;
    if(refunded>0&&status==='refunded')return PaymentStatus.CAPTURED;
    switch(status){case'paid':return PaymentStatus.CAPTURED;case'refunded':return PaymentStatus.REFUNDED;case'failed':return PaymentStatus.FAILED;case'canceled':case'voided':case'expired':return PaymentStatus.CANCELLED;case'on_hold':case'initiated':default:return PaymentStatus.PENDING}}
}
