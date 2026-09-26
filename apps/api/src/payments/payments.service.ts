import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from '../trips/policy-control.service';
import { IntegrationService } from '../integrations/integration.service';
import { MoyasarPayment, MoyasarPaymentService } from './moyasar-payment.service';

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

type LocalPayment={id:string;bookingId:string;accountId:string;amountMinor:number;currency:string;status:string;providerReference:string|null};

@Injectable()
export class PaymentsService {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService,private readonly integrations:IntegrationService,private readonly moyasar:MoyasarPaymentService){}

  async create(accountId:string,input:{bookingId:string;amountMinor:number;idempotencyKey:string}){
    if(!Number.isInteger(input.amountMinor)||input.amountMinor<1||!input.idempotencyKey?.trim())throw new BadRequestException('Invalid payment.');
    const paymentPolicy=await this.policies.decision('PAYMENT','PAYMENT_REQUIRED');
    const booking=await this.db.booking.findFirst({where:{id:input.bookingId,accountId}});
    if(!booking)throw new NotFoundException('Booking not found.');
    if(booking.status==='CANCELLED')throw new ConflictException('Cancelled booking cannot create a payment.');
    if(paymentPolicy.bypass)return{bookingId:booking.id,status:'BYPASSED',provider:'NOT_SELECTED',policyReview:{required:false,issues:[],states:{payment:paymentPolicy.state}}};
    const idempotencyKey=input.idempotencyKey.trim();
    const existing=await this.db.payment.findUnique({where:{idempotencyKey}});
    if(existing&&existing.accountId!==accountId)throw new ConflictException('Idempotency key already belongs to another payment.');
    if(existing&&(existing.bookingId!==input.bookingId||existing.amountMinor!==input.amountMinor))throw new ConflictException('Idempotency key cannot be reused with different payment details.');
    this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});
    const payment=await this.db.payment.upsert({where:{idempotencyKey},create:{bookingId:input.bookingId,amountMinor:input.amountMinor,idempotencyKey,accountId,status:'CREATED'},update:{}});
    const checkout=this.moyasar.checkoutConfig(payment);
    if(!existing)await this.audit.record({action:'PAYMENT_CREATED',resource:'Payment',resourceId:payment.id,metadata:{accountId,bookingId:payment.bookingId,amountMinor:payment.amountMinor,currency:payment.currency,status:payment.status,provider:'MOYASAR',policyState:paymentPolicy.state,financialActionExecuted:false}});
    return{...payment,provider:'MOYASAR',checkout,policyReview:{required:paymentPolicy.review,issues:paymentPolicy.review?['PAYMENT_REQUIRED']:[],states:{payment:paymentPolicy.state}}};
  }

  async sync(accountId:string,paymentId:string,providerPaymentId:string){
    const payment=await this.db.payment.findFirst({where:{id:paymentId,accountId}});
    if(!payment)throw new NotFoundException('Payment not found.');
    const remote=await this.moyasar.fetchPayment(providerPaymentId);
    return this.reconcile(payment,remote,'CUSTOMER_SYNC');
  }

  async reconcileWebhook(providerPaymentId:string){
    const remote=await this.moyasar.fetchPayment(providerPaymentId);
    const localId=this.metadataPaymentId(remote);
    if(!localId)return{accepted:true,ignored:true,reason:'UNLINKED_PROVIDER_PAYMENT'};
    const payment=await this.db.payment.findUnique({where:{id:localId}});
    if(!payment)return{accepted:true,ignored:true,reason:'UNKNOWN_HYDROLAND_PAYMENT'};
    const reconciled=await this.reconcile(payment,remote,'MOYASAR_WEBHOOK');
    return{accepted:true,ignored:false,payment:reconciled};
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

  async executeRefund(adminAccountId:string,paymentId:string){
    const payment=await this.db.payment.findUnique({where:{id:paymentId}});
    if(!payment)throw new NotFoundException('Payment not found.');
    if(payment.status==='REFUNDED')return{paymentId,status:'REFUNDED',provider:'MOYASAR',financialActionExecuted:false,alreadyRefunded:true};
    if(payment.status!=='CAPTURED'||!payment.providerReference)throw new ConflictException('Only a captured provider payment can be refunded.');
    const request=await this.db.auditEvent.findFirst({where:{resource:'Payment',resourceId:paymentId,action:'PAYMENT_REFUND_REQUESTED'},orderBy:{occurredAt:'desc'},select:{id:true}});
    if(!request)throw new ConflictException('A customer refund request is required before financial execution.');
    const before=await this.moyasar.fetchPayment(payment.providerReference);
    this.verifyRemote(payment,before);
    if(!['paid','captured'].includes(before.status))throw new ConflictException('Provider payment is not refundable in its current state.');
    const refunded=await this.moyasar.refund(payment.providerReference);
    const result=await this.reconcile(payment,refunded,'ADMIN_REFUND');
    if(result.status!=='REFUNDED')throw new ConflictException('Provider did not confirm the refund.');
    await this.audit.record({action:'PAYMENT_REFUND_EXECUTED',resource:'Payment',resourceId:payment.id,metadata:{adminAccountId,refundRequestAuditEventId:request.id,provider:'MOYASAR',providerReference:payment.providerReference,amountMinor:payment.amountMinor,currency:payment.currency,financialActionExecuted:true}});
    return{...result,financialActionExecuted:true};
  }

  async mine(accountId:string){
    const refundPolicy=await this.policies.decision('PAYMENT','REFUND_REVIEW');
    const payments=await this.db.payment.findMany({where:{accountId},include:{invoice:true},orderBy:{createdAt:'desc'}}) as PaymentWithInvoice[];
    return payments.map((payment:PaymentWithInvoice)=>({...payment,provider:'MOYASAR',refundPolicy:{state:refundPolicy.state,reviewRequired:refundPolicy.review,enforced:refundPolicy.enforce}}));
  }

  private async reconcile(payment:LocalPayment,remote:MoyasarPayment,source:string){
    this.verifyRemote(payment,remote);
    if(payment.providerReference&&payment.providerReference!==remote.id)throw new ConflictException('Payment is already linked to a different provider reference.');
    const status=this.localStatus(remote.status);
    const now=new Date();
    const updated=await this.db.$transaction(async tx=>{
      const row=await tx.payment.update({where:{id:payment.id},data:{providerReference:remote.id,status}});
      if(status==='CAPTURED'){
        await tx.invoice.upsert({where:{paymentId:payment.id},create:{paymentId:payment.id,number:this.invoiceNumber(payment.id),status:'PAID',issuedAt:now},update:{status:'PAID',issuedAt:now}});
      }else if(['FAILED','CANCELLED'].includes(status)){
        await tx.invoice.updateMany({where:{paymentId:payment.id,status:{not:'PAID'}},data:{status:'VOID'}});
      }
      return row;
    });
    if(payment.status!==status||payment.providerReference!==remote.id)await this.audit.record({action:'PAYMENT_PROVIDER_RECONCILED',resource:'Payment',resourceId:payment.id,metadata:{source,provider:'MOYASAR',providerReference:remote.id,providerStatus:remote.status,previousStatus:payment.status,currentStatus:status,amountMinor:payment.amountMinor,currency:payment.currency,financialActionExecuted:status==='CAPTURED'||status==='REFUNDED'}});
    return{...updated,provider:'MOYASAR'};
  }

  private verifyRemote(payment:LocalPayment,remote:MoyasarPayment){
    const metadataPaymentId=this.metadataPaymentId(remote);
    if(metadataPaymentId!==payment.id)throw new ConflictException('Provider payment metadata does not match HYDROLAND payment.');
    if(remote.amount!==payment.amountMinor)throw new ConflictException('Provider payment amount does not match HYDROLAND payment.');
    if(remote.currency.toUpperCase()!==payment.currency.toUpperCase())throw new ConflictException('Provider payment currency does not match HYDROLAND payment.');
  }

  private metadataPaymentId(remote:MoyasarPayment){const value=remote.metadata?.hydroland_payment_id;return typeof value==='string'&&value.trim()?value.trim():null;}
  private localStatus(status:MoyasarPayment['status']){switch(status){case'paid':case'captured':return'CAPTURED';case'authorized':return'AUTHORIZED';case'failed':return'FAILED';case'refunded':return'REFUNDED';case'voided':return'CANCELLED';case'initiated':case'verified':default:return'PENDING';}}
  private invoiceNumber(paymentId:string){return`HL-${paymentId.toUpperCase()}`;}
}
