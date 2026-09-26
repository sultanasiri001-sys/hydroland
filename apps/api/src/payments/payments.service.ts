import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from '../trips/policy-control.service';
import { IntegrationService } from '../integrations/integration.service';
import { MoyasarInvoice, MoyasarPaymentProviderService } from './moyasar-payment-provider.service';

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
  ){}

  async create(accountId:string,input:{bookingId:string;idempotencyKey:string}){
    if(!input.bookingId?.trim()||!input.idempotencyKey?.trim())throw new BadRequestException('Invalid payment.');
    const paymentPolicy=await this.policies.decision('PAYMENT','PAYMENT_REQUIRED');
    const booking=await this.db.booking.findFirst({where:{id:input.bookingId,accountId},include:{trip:true}});
    if(!booking)throw new NotFoundException('Booking not found.');
    if(booking.status==='CANCELLED')throw new ConflictException('Cancelled booking cannot create a payment.');
    if(paymentPolicy.bypass)return{bookingId:booking.id,status:'BYPASSED',provider:'BYPASSED',policyReview:{required:false,issues:[],states:{payment:paymentPolicy.state}}};
    const pricing=await this.tripPrice(booking.tripId);
    if(!pricing)throw new ConflictException('Trip price is not configured.');
    if(pricing.currency!=='SAR')throw new ConflictException('Trip payment currency is not supported.');
    const amountMinor=pricing.pricePerSeatMinor*booking.seats;
    if(!Number.isSafeInteger(amountMinor)||amountMinor<0)throw new ConflictException('Trip payment amount is invalid.');
    if(amountMinor===0)return{bookingId:booking.id,status:'BYPASSED',provider:'FREE_TRIP',amountMinor:0,currency:pricing.currency,policyReview:{required:false,issues:[],states:{payment:paymentPolicy.state}}};
    if(amountMinor<100)throw new ConflictException('Trip payment amount is below the provider minimum.');
    const idempotencyKey=input.idempotencyKey.trim();
    const existing=await this.db.payment.findUnique({where:{idempotencyKey}});
    if(existing&&existing.accountId!==accountId)throw new ConflictException('Idempotency key already belongs to another payment.');
    if(existing&&(existing.bookingId!==input.bookingId||existing.amountMinor!==amountMinor||existing.currency!==pricing.currency))throw new ConflictException('Idempotency key cannot be reused with different payment details.');
    this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});
    let payment=await this.db.payment.upsert({where:{idempotencyKey},create:{bookingId:input.bookingId,amountMinor,currency:pricing.currency,idempotencyKey,accountId,status:'CREATED'},update:{}});
    if(!existing)await this.audit.record({action:'PAYMENT_CREATED',resource:'Payment',resourceId:payment.id,metadata:{accountId,bookingId:payment.bookingId,seats:booking.seats,pricePerSeatMinor:pricing.pricePerSeatMinor,amountMinor:payment.amountMinor,currency:payment.currency,status:payment.status,provider:'MOYASAR',policyState:paymentPolicy.state,financialActionExecuted:false}});

    let providerInvoice:MoyasarInvoice;
    if(payment.providerReference){
      providerInvoice=await this.moyasar.fetchInvoice(payment.providerReference);
      this.assertProviderInvoice(payment,providerInvoice);
      const status=this.statusFromInvoice(providerInvoice.status);
      if(status!==payment.status)payment=await this.db.payment.update({where:{id:payment.id},data:{status}});
    }else{
      providerInvoice=await this.moyasar.createInvoice({paymentId:payment.id,bookingId:payment.bookingId,amountMinor:payment.amountMinor,currency:payment.currency});
      this.assertProviderInvoice(payment,providerInvoice);
      const claimed=await this.db.payment.updateMany({where:{id:payment.id,providerReference:null},data:{providerReference:providerInvoice.id,status:this.statusFromInvoice(providerInvoice.status)}});
      if(claimed.count===1){
        payment=await this.db.payment.findUniqueOrThrow({where:{id:payment.id}});
        await this.audit.record({action:'PAYMENT_CHECKOUT_CREATED',resource:'Payment',resourceId:payment.id,metadata:{accountId,bookingId:payment.bookingId,provider:'MOYASAR',providerReference:providerInvoice.id,status:payment.status}});
      }else{
        await this.moyasar.cancelInvoice(providerInvoice.id);
        payment=await this.db.payment.findUniqueOrThrow({where:{id:payment.id}});
        if(!payment.providerReference)throw new ConflictException('Payment checkout is being prepared. Retry the request.');
        providerInvoice=await this.moyasar.fetchInvoice(payment.providerReference);
        this.assertProviderInvoice(payment,providerInvoice);
      }
    }
    return{...payment,provider:'MOYASAR',checkoutUrl:providerInvoice.url,providerStatus:providerInvoice.status,policyReview:{required:paymentPolicy.review,issues:paymentPolicy.review?['PAYMENT_REQUIRED']:[],states:{payment:paymentPolicy.state}}};
  }

  async refresh(accountId:string,paymentId:string){
    const payment=await this.db.payment.findFirst({where:{id:paymentId,accountId}});
    if(!payment)throw new NotFoundException('Payment not found.');
    if(!payment.providerReference)return{...payment,provider:'MOYASAR',checkoutReady:false};
    const invoice=await this.moyasar.fetchInvoice(payment.providerReference);
    this.assertProviderInvoice(payment,invoice);
    const status=this.statusFromInvoice(invoice.status);
    const updated=status===payment.status?payment:await this.db.payment.update({where:{id:payment.id},data:{status}});
    if(status!==payment.status)await this.audit.record({action:'PAYMENT_PROVIDER_RECONCILED',resource:'Payment',resourceId:payment.id,metadata:{accountId,provider:'MOYASAR',providerReference:payment.providerReference,from:payment.status,to:status,providerStatus:invoice.status}});
    return{...updated,provider:'MOYASAR',checkoutReady:true,checkoutUrl:invoice.url,providerStatus:invoice.status};
  }

  async handleMoyasarWebhook(payload:unknown){
    const event=this.moyasar.verifyWebhook(payload);
    const invoiceId=typeof event.data.invoice_id==='string'?event.data.invoice_id.trim():'';
    if(!invoiceId)return{accepted:true,matched:false};
    const duplicate=await this.db.auditEvent.findFirst({where:{resource:'PaymentProviderWebhook',resourceId:event.id},select:{id:true}});
    if(duplicate)return{accepted:true,duplicate:true};
    const payment=await this.db.payment.findUnique({where:{providerReference:invoiceId}});
    if(!payment){
      await this.db.auditEvent.create({data:{action:'PAYMENT_PROVIDER_WEBHOOK_UNMATCHED',resource:'PaymentProviderWebhook',resourceId:event.id,metadata:{provider:'MOYASAR',type:event.type,invoiceId,live:event.live}}});
      return{accepted:true,matched:false};
    }
    const providerInvoice=await this.moyasar.fetchInvoice(invoiceId);
    this.assertProviderInvoice(payment,providerInvoice);
    const next=this.statusFromInvoice(providerInvoice.status);
    return this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const repeated=await tx.auditEvent.findFirst({where:{resource:'PaymentProviderWebhook',resourceId:event.id},select:{id:true}});
      if(repeated)return{accepted:true,duplicate:true};
      const current=await tx.payment.findUnique({where:{id:payment.id}});
      if(!current||current.providerReference!==invoiceId)throw new ConflictException('Payment provider reference changed during reconciliation.');
      if(next!==current.status)await tx.payment.update({where:{id:current.id},data:{status:next}});
      await tx.auditEvent.create({data:{action:'PAYMENT_PROVIDER_WEBHOOK_PROCESSED',resource:'PaymentProviderWebhook',resourceId:event.id,metadata:{provider:'MOYASAR',type:event.type,paymentId:current.id,invoiceId,from:current.status,to:next,providerStatus:providerInvoice.status,live:event.live,providerVerified:true}}});
      return{accepted:true,matched:true,paymentId:current.id,status:next};
    });
  }

  async requestRefund(accountId:string,paymentId:string,reason:string){
    const normalizedReason=reason?.trim();
    if(!normalizedReason||normalizedReason.length<10)throw new BadRequestException('Refund reason must be at least 10 characters.');
    const payment=await this.db.payment.findFirst({where:{id:paymentId,accountId}});
    if(!payment)throw new NotFoundException('Payment not found.');
    if(['REFUNDED','CANCELLED','FAILED'].includes(payment.status))throw new ConflictException('Payment is not eligible for a refund request.');
    const refundPolicy=await this.policies.decision('PAYMENT','REFUND_REVIEW');
    const recent=await this.db.auditEvent.findFirst({where:{resource:'Payment',resourceId:paymentId,action:'PAYMENT_REFUND_REQUESTED'},orderBy:{occurredAt:'desc'},select:{id:true,occurredAt:true}});
    if(recent&&Date.now()-recent.occurredAt.getTime()<300000)throw new ConflictException('A refund request was already submitted recently.');
    const event=await this.audit.record({action:'PAYMENT_REFUND_REQUESTED',resource:'Payment',resourceId:paymentId,metadata:{accountId,bookingId:payment.bookingId,amountMinor:payment.amountMinor,currency:payment.currency,paymentStatus:payment.status,reason:normalizedReason,provider:'MOYASAR',policyState:refundPolicy.state,financialActionExecuted:false}});
    return{paymentId,status:'REFUND_REQUESTED',financialActionExecuted:false,provider:'MOYASAR',auditEventId:event.id,policyReview:{required:!refundPolicy.bypass,reviewRequired:refundPolicy.review,enforced:refundPolicy.enforce,states:{refund:refundPolicy.state}}};
  }

  async mine(accountId:string){
    const refundPolicy=await this.policies.decision('PAYMENT','REFUND_REVIEW');
    const payments=await this.db.payment.findMany({where:{accountId},include:{invoice:true},orderBy:{createdAt:'desc'}}) as PaymentWithInvoice[];
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
  private statusFromInvoice(status:string):PaymentStatus{switch(status){case'paid':return PaymentStatus.CAPTURED;case'refunded':return PaymentStatus.REFUNDED;case'failed':return PaymentStatus.FAILED;case'canceled':case'voided':case'expired':return PaymentStatus.CANCELLED;case'on_hold':case'initiated':default:return PaymentStatus.PENDING}}
}
