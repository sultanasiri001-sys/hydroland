import { BadRequestException } from '@nestjs/common';
import { catalogDetails, catalogPrice } from './product-catalog';

export function normalizeSale(value:unknown,base:number){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['salePriceMinor','startsAt','endsAt'].includes(key)))throw new BadRequestException('تحقق من سعر العرض وفترته.');
  const {salePriceMinor,startsAt,endsAt}=catalogDetails(value,base);
  return {salePriceMinor,startsAt,endsAt,baseMinor:base};
}
export function priceActivity(base:number,settings:unknown,at=new Date()){
  const data=settings && typeof settings==='object' && !Array.isArray(settings)?settings as Record<string,unknown>:null;
  if(!data || data.baseMinor!==base || data.salePriceMinor==null)return {priceMinor:base,listPriceMinor:base,discountActive:false};
  const {salePriceMinor,startsAt,endsAt}=data;
  const view=catalogPrice({priceMinor:base,catalogDetails:{salePriceMinor,startsAt,endsAt}},at);
  return {priceMinor:view.priceMinor,listPriceMinor:base,discountActive:view.discountActive};
}
