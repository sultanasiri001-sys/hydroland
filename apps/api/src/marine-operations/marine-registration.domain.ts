import { BadRequestException } from '@nestjs/common';
import { decisionDigest, plain } from '../document-forms/owner-administrative-decision.domain';

export const REGISTRATION_CORRECTION_NOTICE='تصحيح رقم تسجيل أصل مسودة فقط. تعاد الوثائق المتحققة للمراجعة مع حفظ ملفاتها وسجلها، ولا يفعّل التصحيح الأصل أو يعتمد وثيقة.';
export function registrationNumber(value:unknown){
  if(typeof value!=='string')throw new BadRequestException('أدخل رقم التسجيل الصحيح.');
  const n=value.normalize('NFKC').trim().replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(c)%10)).toUpperCase();
  if(!/^[A-Z0-9\u0621-\u064A][A-Z0-9\u0621-\u064A /-]{0,79}$/.test(n))throw new BadRequestException('رقم التسجيل غير صالح أو يتجاوز 80 حرفًا.');
  return n;
}
export function registrationCorrectionInput(value:unknown){
  if(!plain(value)||Object.keys(value).some(k=>!['registrationNumber','reason','expectedRevision','confirmed'].includes(k))||value.confirmed!==true
    ||typeof value.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(value.expectedRevision)
    ||typeof value.reason!=='string'||value.reason.trim().length<10||value.reason.length>1000||/[\u0000-\u001f\u007f]/.test(value.reason))throw new BadRequestException('راجع التصحيح وسببه وأعد قراءة السجل قبل الحفظ.');
  return {registrationNumber:registrationNumber(value.registrationNumber),reason:value.reason.trim(),expectedRevision:value.expectedRevision};
}
// Includes both identities and every mutable field reviewed with a document.
export function marineDocumentReviewRevision(document:unknown,asset:unknown){return decisionDigest(JSON.parse(JSON.stringify({document,asset})));}
