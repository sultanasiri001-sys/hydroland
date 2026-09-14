import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from '../trips/policy-control.service';

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

@Injectable()
export class PaymentsService {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService){}

  async create(accountId:string,input:{bookingId:string;amountMinor:number;idempotencyKey:string}){
    if(!Number.isInteger(input.amountMinor)||input.amountMinor<1||!input.idempotencyKey?.trim())throw new BadRequestException('Invalid payment.');
    const paymentPolicy=await this.policies.decision('PAYMENT','PAYMENT_REQUIRED');
    const booking=await this.db.booking.findFirst({where:{id:input.bookingId,accountId}});
    if(!booking)throw new NotFoundException('Booking not found.');
    if(paymentPolicy.bypass)return{bookingId:booking.id,status:'BYPASSED',provider:'NOT_SELECTED',policyReview:{required:false,issues:[],states:{payment:paymentPolicy.state}}};
    const existing=await this.db.payment.findUnique({where:{idempotencyKey:input.idempotencyKey.trim()}});
    if(existing&&existing.accountId!==accountId)throw new ConflictException('Idempotency key already belongs to another payment.');
    const payment=await this.db.payment.upsert({where:{idempotencyKey:input.idempotencyKey.trim()},create:{...input,idempotencyKey:input.idempotencyKey.trim(),accountId,status:'CREATED'},update:{}});
    return{...payment,provider:'NOT_SELECTED',policyReview:{required:paymentPolicy.review,issues:paymentPolicy.review?['PAYMENT_REQUIRED']:[],states:{payment:paymentPolicy.state}}};
  }

  async requestRefund(accountId:string,paymentId:string,reason:string){
    const normalizedReason=reason?.trim();
    if(!normalizedReason||normalizedReason.length<10)throw new BadRequestException('Refund reason must be at least 10 characters.');
    const payment=await this.db.payment.findFirst({where:{id:paymentId,accountId}});
    if(!payment)throw new NotFoundException('Payment not found.');
    if(['REFUNDED','CANCELLED','FAILED'].includes(payment.status))throw new ConflictException('Payment is not eligible for a refund request.');
    const refundPolicy=await this.policies.decision('PAYMENT','REFUND_REVIEW');
    const recent=await this.db.auditEvent.findFirst({where:{actorId:accountId,resource:'Payment',resourceId:paymentId,action:'PAYMENT_REFUND_REQUESTED'},orderBy:{occurredAt:'desc'},select:{id:true,occurredAt:true}});
    if(recent&&Date.now()-recent.occurredAt.getTime()<300000)throw new ConflictException('A refund request was already submitted recently.');
    const event=await this.audit.record({actorId:accountId,action:'PAYMENT_REFUND_REQUESTED',resource:'Payment',resourceId:paymentId,metadata:{accountId,bookingId:payment.bookingId,amountMinor:payment.amountMinor,currency:payment.currency,paymentStatus:payment.status,reason:normalizedReason,provider:'NOT_SELECTED',policyState:refundPolicy.state,financialActionExecuted:false}});
    return{paymentId,status:'REFUND_REQUESTED',financialActionExecuted:false,provider:'NOT_SELECTED',auditEventId:event.id,policyReview:{required:!refundPolicy.bypass,reviewRequired:refundPolicy.review,enforced:refundPolicy.enforce,states:{refund:refundPolicy.state}}};
  }

  async mine(accountId:string){
    const refundPolicy=await this.policies.decision('PAYMENT','REFUND_REVIEW');
    const payments=await this.db.payment.findMany({where:{accountId},include:{invoice:true},orderBy:{createdAt:'desc'}}) as PaymentWithInvoice[];
    return payments.map((payment:PaymentWithInvoice)=>({...payment,provider:'NOT_SELECTED',refundPolicy:{state:refundPolicy.state,reviewRequired:refundPolicy.review,enforced:refundPolicy.enforce}}));
  }
}
