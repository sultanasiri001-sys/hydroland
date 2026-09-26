import { CanActivate, ConflictException, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';

@Injectable()
export class PaymentConfirmationGuard implements CanActivate {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService){}

  async canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest<{params?:{id?:string;bookingId?:string}}>();
    const tripId=request.params?.id?.trim(),bookingId=request.params?.bookingId?.trim();
    if(!tripId||!bookingId)throw new NotFoundException('Booking not found for this trip.');
    const booking=await this.db.booking.findFirst({where:{id:bookingId,tripId},select:{id:true,seats:true}});
    if(!booking)throw new NotFoundException('Booking not found for this trip.');
    const paymentPolicy=await this.policies.decision('PAYMENT','PAYMENT_REQUIRED');
    if(paymentPolicy.bypass)return true;
    const setting=await this.db.operationalSetting.findUnique({where:{key:`trip-price:${tripId}`},select:{value:true}});
    if(!setting?.value||typeof setting.value!=='object'||Array.isArray(setting.value))throw new ConflictException('Trip price is not configured.');
    const value=setting.value as Record<string,unknown>;
    const pricePerSeatMinor=typeof value.pricePerSeatMinor==='number'?value.pricePerSeatMinor:Number.NaN;
    const currency=typeof value.currency==='string'?value.currency.trim().toUpperCase():'';
    if(!Number.isSafeInteger(pricePerSeatMinor)||pricePerSeatMinor<0||currency!=='SAR')throw new ConflictException('Trip price is invalid.');
    const requiredAmount=pricePerSeatMinor*booking.seats;
    if(!Number.isSafeInteger(requiredAmount)||requiredAmount<0)throw new ConflictException('Trip payment amount is invalid.');
    if(requiredAmount===0)return true;
    const captured=await this.db.payment.findFirst({where:{bookingId,status:'CAPTURED',amountMinor:requiredAmount,currency},orderBy:{updatedAt:'desc'},select:{id:true}});
    if(captured)return true;
    if(paymentPolicy.review)return true;
    throw new ConflictException('Captured payment is required before booking confirmation.');
  }
}
