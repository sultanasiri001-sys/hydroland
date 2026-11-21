import { CanActivate, ConflictException, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';
import { satisfiesTripBookingPayment, tripBookingPaymentRequirement } from '../commerce/trip-booking-contract';

@Injectable()
export class PaymentConfirmationGuard implements CanActivate {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService){}

  async canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest<{params?:{id?:string;bookingId?:string}}>();
    const tripId=request.params?.id?.trim(),bookingId=request.params?.bookingId?.trim();
    if(!tripId||!bookingId)throw new NotFoundException('Booking not found for this trip.');
    const booking=await this.db.booking.findFirst({where:{id:bookingId,tripId},select:{id:true,tripId:true,accountId:true,organizationId:true,seats:true,contractSnapshot:true}});
    if(!booking)throw new NotFoundException('Booking not found for this trip.');
    const paymentPolicy=await this.policies.decision('PAYMENT','PAYMENT_REQUIRED');
    if(!booking.organizationId && paymentPolicy.bypass)return true;
    const setting=!booking.organizationId && (booking.contractSnapshot===null||booking.contractSnapshot===undefined)
      ? await this.db.operationalSetting.findUnique({where:{key:`trip-price:${tripId}`},select:{value:true}}) : null;
    const requirement=tripBookingPaymentRequirement(booking,setting?.value);
    const requiredAmount=requirement.requiredAmountMinor,currency=requirement.currency;
    if(requiredAmount===null)throw new ConflictException({code:requirement.reasonCode,message:'Trip contract price requires review.'});
    if(requiredAmount===0)return true;
    const captured=await this.db.payment.findFirst({where:{bookingId,accountId:booking.accountId,status:'CAPTURED',amountMinor:requiredAmount,currency,refundedAmountMinor:0,
      refundOperations:{none:{status:{in:['RESERVED','DISPATCHED','RECONCILIATION_REQUIRED']}}}},orderBy:{updatedAt:'desc'},
      select:{id:true,bookingId:true,accountId:true,status:true,amountMinor:true,currency:true,refundedAmountMinor:true,providerReference:true,moyasarPaymentId:true}});
    if(captured&&satisfiesTripBookingPayment(captured,requirement))return true;
    if(!booking.organizationId && paymentPolicy.review)return true;
    throw new ConflictException('Captured payment is required before booking confirmation.');
  }
}
