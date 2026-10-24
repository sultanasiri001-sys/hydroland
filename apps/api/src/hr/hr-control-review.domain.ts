import { BadRequestException, ConflictException } from '@nestjs/common';
import { OwnerReviewEvidence, validOwnerReviewEvidence } from './temporary-owner-review';

export const HR_CONTROL_PREFIX='HR_CONTROL_REVIEW:v1:';
export const requestKey=(id:string)=>HR_CONTROL_PREFIX+id;
export const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export type ControlInput={ruleKey:string;labelAr:string;regulatoryRequirementId:string;regulatoryVersion:string;evidenceIds:string[];legalApprovalReference:string};
export type ControlProposal={version:1;id:string;fingerprint:string;control:ControlInput;baseRevision:string|null;requestedByAccountId:string;requestedAt:string;reason:string;status:'PROPOSED'|'REVIEWED'|'APPLIED'|'REJECTED';revision:string;reviewedByAccountId?:string;reviewedAt?:string;reviewReason?:string;decidedByAccountId?:string;decidedAt?:string;decisionReason?:string;temporaryOwnerReview?:OwnerReviewEvidence};
function text(value:unknown,max:number){if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u001f\u007f]/.test(value))throw new BadRequestException('أدخل مراجع الضابط ونسخته وأدلته بصورة صحيحة.');return value.trim();}
export function exact(body:unknown,keys:string[]){const x=object(body);if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(x).some(k=>!keys.includes(k)))throw new BadRequestException('حقول طلب الضابط غير صالحة.');return x;}
export function reviewReason(x:Record<string,unknown>){const reason=typeof x.reason==='string'?x.reason.replace(/\r\n/g,'\n').trim():'';if(x.reviewed!==true||reason.length<5||reason.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(reason))throw new BadRequestException('راجع الإجراء وأدخل سببًا من 5 إلى 1000 حرف.');return reason;}
export function revision(value:unknown):value is string{return typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));}
export function controlInput(value:unknown):ControlInput{
 const x=exact(value,['ruleKey','labelAr','regulatoryRequirementId','regulatoryVersion','evidenceIds','legalApprovalReference']);
 const ruleKey=text(x.ruleKey,100).toUpperCase();if(!/^[A-Z][A-Z0-9_-]{2,99}$/.test(ruleKey))throw new BadRequestException('رمز الضابط غير صالح.');
 if(!Array.isArray(x.evidenceIds)||!x.evidenceIds.length||x.evidenceIds.length>20)throw new BadRequestException('أدخل من مرجع دليل واحد إلى عشرين مرجعًا.');
 const evidenceIds=x.evidenceIds.map(v=>text(v,200));if(new Set(evidenceIds).size!==evidenceIds.length)throw new BadRequestException('مراجع الأدلة مكررة.');
 return {ruleKey,labelAr:text(x.labelAr,160),regulatoryRequirementId:text(x.regulatoryRequirementId,200),regulatoryVersion:text(x.regulatoryVersion,100),evidenceIds,legalApprovalReference:text(x.legalApprovalReference,200)};
}
export function proposal(value:unknown):ControlProposal{
 const x=object(value);
 try{
  if(x.version!==1||!uuid(x.id)||!uuid(x.revision)||!uuid(x.requestedByAccountId)||!revision(x.requestedAt)||typeof x.fingerprint!=='string'||typeof x.reason!=='string'||!['PROPOSED','REVIEWED','APPLIED','REJECTED'].includes(String(x.status))||x.baseRevision!==null&&!revision(x.baseRevision))throw new Error();
  controlInput(x.control);
  const exception=x.temporaryOwnerReview;if(exception!==undefined&&!validOwnerReviewEvidence(exception))throw new Error();
  if(['REVIEWED','APPLIED'].includes(String(x.status))&&(!uuid(x.reviewedByAccountId)||!revision(x.reviewedAt)||x.reviewedByAccountId===x.requestedByAccountId&&(!validOwnerReviewEvidence(exception)||exception.ownerId!==x.reviewedByAccountId)))throw new Error();
  if(x.status==='APPLIED'&&(!uuid(x.decidedByAccountId)||!revision(x.decidedAt)||[x.requestedByAccountId,x.reviewedByAccountId].includes(x.decidedByAccountId)&&(!validOwnerReviewEvidence(exception)||exception.ownerId!==x.decidedByAccountId)))throw new Error();
  return x as ControlProposal;
 }catch{throw new ConflictException('بيانات طلب الضابط تحتاج مراجعة؛ لم يُفعّل أي تغيير.');}
}
