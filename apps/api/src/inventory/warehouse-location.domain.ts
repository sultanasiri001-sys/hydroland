import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { WarehouseLocation } from '@prisma/client';
import { templateObject } from '../document-forms/document-template-input';

export const WAREHOUSE_LOCATION_POLICY='WAREHOUSE_LOCATION_REGISTER_V1';
export const WAREHOUSE_LOCATION_NOTICE='سجل مواقع داخل الجهة؛ تسجيل الموقع أو استعادته لا يثبت الرصيد الفعلي أو تنفيذ حركة مخزون أو تصريح تشغيل.';
export type WarehouseLocationContent={title:string;locationDescription:string};
export const locationDigest=(value:unknown):string=>{
  const canonical=(v:unknown):unknown=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
};
function text(value:unknown,max:number,label:string){
  if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new BadRequestException(`أدخل ${label} صالحًا.`);
  return value.trim();
}
export function warehouseLocationContent(body:unknown):WarehouseLocationContent{
  const x=templateObject(body,['title','locationDescription']);
  return {title:text(x.title,160,'اسم الموقع'),locationDescription:text(x.locationDescription,1000,'وصف الموقع')};
}
export function warehouseLocationVersion(value:unknown){
  if(!Number.isSafeInteger(value)||Number(value)<1||Number(value)>1000000)throw new BadRequestException('إصدار الموقع غير صالح.');
  return Number(value);
}
export function warehouseLocationCreate(body:unknown){
  const x=templateObject(body,['requestKey','code','title','locationDescription']);
  if(typeof x.requestKey!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x.requestKey))throw new BadRequestException('معرف طلب الإنشاء غير صالح.');
  if(typeof x.code!=='string'||!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(x.code.trim().toUpperCase()))throw new BadRequestException('رمز الموقع من حرفين إلى 32 حرفًا لاتينيًا أو رقمًا أو شرطة.');
  return {requestKey:x.requestKey.toLowerCase(),content:{code:x.code.trim().toUpperCase(),...warehouseLocationContent({title:x.title,locationDescription:x.locationDescription})}};
}
export function warehouseLocationEdit(body:unknown){
  const x=templateObject(body,['expectedRevision','title','locationDescription','reason']);
  return {expectedRevision:warehouseLocationVersion(x.expectedRevision),reason:text(x.reason,500,'سبب التعديل'),content:warehouseLocationContent({title:x.title,locationDescription:x.locationDescription})};
}
export function warehouseLocationTransition(body:unknown){
  const x=templateObject(body,['expectedRevision','reason','confirmed']);
  if(x.confirmed!==true)throw new BadRequestException('راجع أثر الإجراء وأكده.');
  return {expectedRevision:warehouseLocationVersion(x.expectedRevision),reason:text(x.reason,500,'سبب الإجراء')};
}
export function warehouseLocationRecordDigest(row:WarehouseLocation){
  return locationDigest({id:row.id,organizationId:row.organizationId,requestKey:row.requestKey,requestDigest:row.requestDigest,revision:row.revision,status:row.status,code:row.code,title:row.title,locationDescription:row.locationDescription,createdByAccountId:row.createdByAccountId,createdAt:row.createdAt,updatedAt:row.updatedAt});
}
export function validateWarehouseLocationRecord(row:WarehouseLocation){
  try{warehouseLocationContent({title:row.title,locationDescription:row.locationDescription});warehouseLocationVersion(row.revision);}catch{throw new ConflictException('حقول سجل الموقع غير متسقة.');}
  if(!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(row.code)||!['RECORDED','ARCHIVED'].includes(row.status)||warehouseLocationRecordDigest(row)!==row.recordDigest)throw new ConflictException('بصمة سجل الموقع غير متسقة.');
  return row;
}
