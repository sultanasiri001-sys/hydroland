import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from '../trips/policy-control.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService){}

  async create(accountId:string,input:{bookingId:string;amountMinor:number;idempotencyKey:string}){
    if(!Number.isInteger(input.amountMinor)||input.amountMinor<1||!input.idempotencyKey?.trim())throw new BadRequestException('Invalid payment.');
    const paymentPolicy=await this.policies.decision('PAYMENT','PAYMENT_REQUIRED');
    const booking=await this.db.booking.findFirst({where:{id:input.bookingId,accountId}});
    if(!booking)throw new NotFoundException('Booking not found.');
    if(paymentPolicy.bypass)return{bookingId:booking.id,status:'BYPASSED',provider:'NOT_SELECTED',policyReview:{required:false,issues:[],states:{payment:paymentPolicy.state}}};
    const existing=await this.db.payment.findUnique({where:{idempotencyKey:input.idempotencyKey}});
    if(existing&&existing.accountId!==accountId)throw new ConflictException('Idempotency key already belongs to another payment.');
    const payment=await this.db.payment.upsert({where:{idempotencyKey:input.idempotencyKey},create:{...input,idempotencyKey:input.idempotencyKey.trim(),accountId,status:'CREATED'},update:{}});
    return{...payment,provider:'NOT_SELECTED',policyReview:{required:paymentPolicy.review,issues:paymentPolicy.review?['PAYMENT_REQUIRED']:[],states:{payment:paymentPolicy.state}}};
  }

  async mine(accountId:string){
    const refundPolicy=await this.policies.decision('PAYMENT','REFUND_REVIEW');
    const payments=await this.db.payment.findMany({where:{accountId},include:{invoice:true},orderBy:{createdAt:'desc'}});
    return payments.map(payment=>({...payment,provider:'NOT_SELECTED',refundPolicy:{state:refundPolicy.state,reviewRequired:refundPolicy.review,enforced:refundPolicy.enforce}}));
  }
}
