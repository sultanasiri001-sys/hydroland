import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { MarketingCampaignDraft } from '@prisma/client';
import { templateObject } from '../document-forms/document-template-input';

export const MARKETING_DRAFT_POLICY='MARKETING_CAMPAIGN_DRAFT_V1';
export const MARKETING_DRAFT_NOTICE='سجل تخطيط داخلي؛ المسودة والأرشفة لا تعنيان اعتماد حملة أو نشرها أو قياس أدائها.';
export const MARKETING_CHANNELS=['APP','WEB','EMAIL','SMS','WHATSAPP','SOCIAL','PAID_ADS'] as const;
export type MarketingDraftContent={title:string;objective:string;channels:typeof MARKETING_CHANNELS[number][]};
export const draftDigest=(value:unknown):string=>{
  const canonical=(v:unknown):unknown=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
};
function text(value:unknown,max:number,label:string){
  if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new BadRequestException(`أدخل ${label} صالحًا.`);
  return value.trim();
}
export function marketingDraftContent(body:unknown):MarketingDraftContent{
  const x=templateObject(body,['title','objective','channels']);
  if(!Array.isArray(x.channels)||!x.channels.length||x.channels.length>MARKETING_CHANNELS.length||new Set(x.channels).size!==x.channels.length||x.channels.some(c=>!MARKETING_CHANNELS.includes(c)))throw new BadRequestException('اختر قنوات تخطيط متاحة دون تكرار.');
  return {title:text(x.title,160,'اسم المسودة'),objective:text(x.objective,2000,'هدف المسودة'),channels:[...x.channels].sort() as MarketingDraftContent['channels']};
}
export function marketingDraftVersion(value:unknown){
  if(!Number.isSafeInteger(value)||Number(value)<1||Number(value)>1000000)throw new BadRequestException('إصدار المسودة غير صالح.');
  return Number(value);
}
export function marketingDraftCreate(body:unknown){
  const x=templateObject(body,['requestKey','title','objective','channels']);
  if(typeof x.requestKey!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x.requestKey))throw new BadRequestException('معرف طلب الإنشاء غير صالح.');
  return {requestKey:x.requestKey,content:marketingDraftContent({title:x.title,objective:x.objective,channels:x.channels})};
}
export function marketingDraftEdit(body:unknown){
  const x=templateObject(body,['expectedRevision','title','objective','channels','reason']);
  return {expectedRevision:marketingDraftVersion(x.expectedRevision),reason:text(x.reason,500,'سبب التعديل'),content:marketingDraftContent({title:x.title,objective:x.objective,channels:x.channels})};
}
export function marketingDraftTransition(body:unknown){
  const x=templateObject(body,['expectedRevision','reason','confirmed']);
  if(x.confirmed!==true)throw new BadRequestException('راجع أثر الإجراء وأكده.');
  return {expectedRevision:marketingDraftVersion(x.expectedRevision),reason:text(x.reason,500,'سبب الإجراء')};
}
export function marketingDraftRecordDigest(row:MarketingCampaignDraft){
  return draftDigest({id:row.id,organizationId:row.organizationId,requestKey:row.requestKey,requestDigest:row.requestDigest,revision:row.revision,status:row.status,title:row.title,objective:row.objective,channels:row.channels,createdByAccountId:row.createdByAccountId,createdAt:row.createdAt,updatedAt:row.updatedAt});
}
export function validateMarketingDraftRecord(row:MarketingCampaignDraft){
  try{marketingDraftContent({title:row.title,objective:row.objective,channels:row.channels});marketingDraftVersion(row.revision);}catch{throw new ConflictException('حقول سجل المسودة غير متسقة.');}
  if(!['DRAFT','ARCHIVED'].includes(row.status)||marketingDraftRecordDigest(row)!==row.recordDigest)throw new ConflictException('بصمة سجل المسودة غير متسقة.');
  return row;
}
