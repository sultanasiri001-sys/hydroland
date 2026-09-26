import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MoyasarPayment, MoyasarPaymentService } from '../payments/moyasar-payment.service';
import { StoreService } from './store.service';

type LocalStorePayment={id:string;orderId:string;accountId:string;amountMinor:number;currency:string;status:string;providerReference:string|null};

@Injectable()
export class StorePaymentProviderService {
  constructor(private readonly db:DatabaseService,private readonly store:StoreService,private readonly moyasar:MoyasarPaymentService,private readonly audit:AuditService){}

  async create(accountId:string,orderId:string,idempotencyKey:string){
    const payment=await this.store.createPayment(accountId,orderId,idempotencyKey);
    const checkout=this.moyasar.checkoutConfig({id:payment.id,scope:'STORE',referenceId:orderId,amountMinor:payment.amountMinor,currency:payment.currency,description:`HYDROLAND store order ${orderId}`});
    return{...payment,provider:'MOYASAR',checkout,financialActionExecuted:false};
  }

  async sync(accountId:string,paymentId:string,providerPaymentId:string){
    const payment=await this.db.storePayment.findFirst({where:{id:paymentId,accountId}});
    if(!payment)throw new NotFoundException('Store payment not found.');
    return this.reconcile(payment,await this.moyasar.fetchPayment(providerPaymentId),'CUSTOMER_SYNC');
  }

  async reconcileWebhookPayment(remote:MoyasarPayment){
    if(this.moyasar.scope(remote)!=='STORE')return{accepted:true,ignored:true,reason:'WRONG_PAYMENT_SCOPE'};
    const localId=this.moyasar.localPaymentId(remote);
    if(!localId)return{accepted:true,ignored:true,reason:'UNLINKED_PROVIDER_PAYMENT'};
    const payment=await this.db.storePayment.findUnique({where:{id:localId}});
    if(!payment)return{accepted:true,ignored:true,reason:'UNKNOWN_STORE_PAYMENT'};
    return{accepted:true,ignored:false,payment:await this.reconcile(payment,remote,'MOYASAR_WEBHOOK')};
  }

  async requestRefund(accountId:string,paymentId:string,reason:string){
    const normalized=reason?.trim();if(!normalized||normalized.length<10)throw new BadRequestException('Refund reason must be at least 10 characters.');
    const payment=await this.db.storePayment.findFirst({where:{id:paymentId,accountId}});if(!payment)throw new NotFoundException('Store payment not found.');
    if(payment.status!=='CAPTURED')throw new ConflictException('Only captured store payments can request a refund.');
    const recent=await this.db.auditEvent.findFirst({where:{resource:'StorePayment',resourceId:paymentId,action:'STORE_PAYMENT_REFUND_REQUESTED'},orderBy:{occurredAt:'desc'},select:{id:true,occurredAt:true}});
    if(recent&&Date.now()-recent.occurredAt.getTime()<300000)throw new ConflictException('A refund request was already submitted recently.');
    const event=await this.audit.record({action:'STORE_PAYMENT_REFUND_REQUESTED',resource:'StorePayment',resourceId:payment.id,metadata:{accountId,orderId:payment.orderId,reason:normalized,amountMinor:payment.amountMinor,currency:payment.currency,provider:'MOYASAR',financialActionExecuted:false}});
    return{paymentId,status:'REFUND_REQUESTED',provider:'MOYASAR',financialActionExecuted:false,auditEventId:event.id};
  }

  async executeRefund(adminAccountId:string,paymentId:string){
    const payment=await this.db.storePayment.findUnique({where:{id:paymentId}});if(!payment)throw new NotFoundException('Store payment not found.');
    if(payment.status==='REFUNDED')return{paymentId,status:'REFUNDED',provider:'MOYASAR',financialActionExecuted:false,alreadyRefunded:true};
    if(payment.status!=='CAPTURED'||!payment.providerReference)throw new ConflictException('Only a captured provider payment can be refunded.');
    const request=await this.db.auditEvent.findFirst({where:{resource:'StorePayment',resourceId:paymentId,action:'STORE_PAYMENT_REFUND_REQUESTED'},orderBy:{occurredAt:'desc'},select:{id:true}});
    if(!request)throw new ConflictException('A customer refund request is required before financial execution.');
    const current=await this.moyasar.fetchPayment(payment.providerReference);this.verifyRemote(payment,current);
    if(!['paid','captured'].includes(current.status))throw new ConflictException('Provider payment is not refundable in its current state.');
    const result=await this.reconcile(payment,await this.moyasar.refund(payment.providerReference),'ADMIN_REFUND');
    if(result.status!=='REFUNDED')throw new ConflictException('Provider did not confirm the refund.');
    await this.audit.record({action:'STORE_PAYMENT_REFUND_EXECUTED',resource:'StorePayment',resourceId:payment.id,metadata:{adminAccountId,refundRequestAuditEventId:request.id,orderId:payment.orderId,provider:'MOYASAR',providerReference:payment.providerReference,amountMinor:payment.amountMinor,currency:payment.currency,financialActionExecuted:true}});
    return{...result,financialActionExecuted:true};
  }

  private async reconcile(payment:LocalStorePayment,remote:MoyasarPayment,source:string){
    this.verifyRemote(payment,remote);
    if(payment.providerReference&&payment.providerReference!==remote.id)throw new ConflictException('Store payment is linked to a different provider reference.');
    const status=this.nextStatus(payment.status,this.localStatus(remote.status));const now=new Date();
    const updated=await this.db.$transaction(async tx=>{
      const row=await tx.storePayment.update({where:{id:payment.id},data:{providerReference:remote.id,status}});
      if(status==='CAPTURED')await tx.storeInvoice.upsert({where:{paymentId:payment.id},create:{paymentId:payment.id,number:this.invoiceNumber(payment.id),status:'PAID',issuedAt:now},update:{status:'PAID',issuedAt:now}});
      else if(['FAILED','CANCELLED'].includes(status))await tx.storeInvoice.updateMany({where:{paymentId:payment.id,status:{not:'PAID'}},data:{status:'VOID'}});
      return row;
    });
    if(payment.status!==status||payment.providerReference!==remote.id)await this.audit.record({action:'STORE_PAYMENT_PROVIDER_RECONCILED',resource:'StorePayment',resourceId:payment.id,metadata:{source,provider:'MOYASAR',providerReference:remote.id,providerStatus:remote.status,previousStatus:payment.status,currentStatus:status,orderId:payment.orderId,amountMinor:payment.amountMinor,currency:payment.currency,financialActionExecuted:status==='CAPTURED'||status==='REFUNDED'}});
    return{...updated,provider:'MOYASAR'};
  }

  private verifyRemote(payment:LocalStorePayment,remote:MoyasarPayment){
    if(this.moyasar.scope(remote)!=='STORE'||this.moyasar.localPaymentId(remote)!==payment.id)throw new ConflictException('Provider metadata does not match store payment.');
    const reference=remote.metadata?.hydroland_reference_id;if(reference!==payment.orderId)throw new ConflictException('Provider metadata does not match store order.');
    if(remote.amount!==payment.amountMinor||remote.currency.toUpperCase()!==payment.currency.toUpperCase())throw new ConflictException('Provider amount or currency does not match store payment.');
  }
  private localStatus(status:MoyasarPayment['status']){switch(status){case'paid':case'captured':return'CAPTURED';case'authorized':return'AUTHORIZED';case'failed':return'FAILED';case'refunded':return'REFUNDED';case'voided':return'CANCELLED';default:return'PENDING';}}
  private nextStatus(current:string,remote:string){if(current==='REFUNDED')return'REFUNDED';if(current==='CAPTURED'&&remote!=='REFUNDED')return'CAPTURED';return remote;}
  private invoiceNumber(paymentId:string){return`HLS-${paymentId.toUpperCase()}`;}
}
