import { BadRequestException } from '@nestjs/common';
const DAY=86400000,RIYADH_OFFSET=3*3600000;
export function riyadhToday(now=new Date()){
 const date=new Date(now.getTime()+RIYADH_OFFSET).toISOString().slice(0,10),start=new Date(date+'T00:00:00+03:00');
 return {date,start,end:new Date(start.getTime()+DAY)};
}
export function centerReportRange(from?:string,to?:string,now=new Date()){
 const today=riyadhToday(now).date,fromDate=from??today.slice(0,8)+'01',toDate=to??today;
 const parse=(value:unknown)=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new BadRequestException('أدخل فترة التقرير بصيغة سنة-شهر-يوم.');const utc=new Date(value+'T00:00:00Z');if(!Number.isFinite(utc.getTime())||utc.toISOString().slice(0,10)!==value)throw new BadRequestException('تاريخ التقرير غير صالح.');return new Date(value+'T00:00:00+03:00')};
 const start=parse(fromDate),last=parse(toDate),end=new Date(last.getTime()+DAY);if(last<start||end.getTime()-start.getTime()>366*DAY)throw new BadRequestException('اختر فترة مرتبة لا تتجاوز 366 يومًا.');
 return {from:fromDate,to:toDate,timeZone:'Asia/Riyadh',basis:'TRIP_START_DATE',start,end};
}
