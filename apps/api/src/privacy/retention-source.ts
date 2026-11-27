import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { eligibleReviewParticipant, reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { exportRetentionPolicy } from '../profile/export-retention-policy';
import { Disposition, ErasureSubject } from './record-disposition';
import { erasureDigest } from './erasure-journal';

export type SourcePin={documentId:string;version:number;contentHash:string;sourceHash:string};
const object=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
const fail=():never=>{throw new ConflictException('يلزم قرار احتفاظ/تصرف أصلي معتمد ومطابق للسجل وإصداره.');};
const date=(x:unknown,required=false):string|null=>{if(x===null||x===undefined||x===''){if(required)return fail();return null;}if(typeof x!=='string'||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)return fail();return x;};

export async function retentionSource(tx:Prisma.TransactionClient,pin:SourcePin,code:string) {
  const platform=await reviewPlatform(tx);
  await tx.$queryRaw`SELECT id FROM "ManagedDocument" WHERE id::text=${pin.documentId} FOR SHARE`;
  const result=await reviewSource(tx,platform.id,pin.documentId),d=result.d;
  if(!['APPROVED','SIGNED'].includes(d.status)||d.template.status!=='ACTIVE'||d.template.code!==code||!d.approvedByAccountId||!d.approvedAt||d.approvedAt>new Date()
    ||d.version!==pin.version||d.contentHash!==pin.contentHash||result.sourceHash!==pin.sourceHash)return fail();
  validateDocumentPayload(d.template.fields,d.payload);
  return {...result,platform,payload:object(d.payload)};
}
export async function approvedRetentionActivation(tx:Prisma.TransactionClient) {
  const setting=await tx.operationalSetting.findUnique({where:{key:'PRIVACY_RETENTION_ACTIVATION:v0.1'},select:{value:true}});
  if(!setting)return null;
  return activationFromSource(tx,parsePin(setting.value));
}
export async function activationFromSource(tx:Prisma.TransactionClient,pin:SourcePin) {
  const s=await retentionSource(tx,pin,'LEGAL-A15-RETENTION-ACTIVATION'),p=s.payload;
  const effectiveFrom=date(p.effectiveFrom,true)!;
  if(p.purpose!=='A15_RETENTION_ACTIVATION'||p.policyVersion!=='0.1'||p.technicalWorkCompleted!==true||typeof p.acceptanceReference!=='string'||p.acceptanceReference.length<5
    ||Date.parse(effectiveFrom)>Date.now()||Date.parse(effectiveFrom)<s.d.approvedAt!.getTime())return fail();
  return {pin,effectiveFrom};
}
export function parsePin(value:unknown):SourcePin {
  const p=object(value);
  if(Object.keys(p).sort().join(',')!=='contentHash,documentId,sourceHash,version'||typeof p.documentId!=='string'||p.documentId.length>200||!p.documentId
    ||!Number.isSafeInteger(p.version)||Number(p.version)<1||typeof p.contentHash!=='string'||!/^(?:sha256:)?[a-f0-9]{64}$/.test(p.contentHash)||typeof p.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(p.sourceHash))return fail();
  return p as SourcePin;
}
export const dispositionAuthorizationKey=(documentId:string)=>'PRIVACY_RECORD_DISPOSITION:v0.1:'+documentId;
export function dispositionAuthority(pin:SourcePin,platform:Awaited<ReturnType<typeof reviewPlatform>>) {
  return erasureDigest({pin,platformId:platform.id,ownerId:platform.ownerId,ownerAuthorityRevision:platform.ownerAuthorityRevision,
    ownerMemberRevision:platform.ownerMemberRevision,ownerStatusRevision:platform.ownerStatusRevision,ownerVerifiedAt:platform.ownerVerifiedAt});
}
export async function readDisposition(tx:Prisma.TransactionClient,pin:SourcePin,requestId:string,subject:ErasureSubject,requireAuthorization=true) {
  const s=await retentionSource(tx,pin,subject.domain==='PAYMENTS'?'FIN-A15-RECORD-DISPOSITION':'LEGAL-A15-RECORD-DISPOSITION'),p=s.payload;
  if(p.purpose!=='A15_RECORD_DISPOSITION'||p.policyVersion!=='0.1'||p.requestId!==requestId||p.accountId!==subject.accountId||p.domain!==subject.domain||p.recordRef!==subject.recordRef
    ||p.settlementsComplete!==true||p.holdsReviewed!==true||p.noOutstandingLegalHold!==true||typeof p.holdReviewReference!=='string'||p.holdReviewReference.trim().length<5||p.holdReviewReference.length>500
    ||typeof p.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(p.sourceHash)
    ||!['ACCOUNT_PROFILE','BOOKINGS_RENTALS','PAYMENT_COMMERCIAL','PAYMENT_VAT','PAYMENT_COMMERCIAL_AND_VAT','PRIVATE_MEMBER_CONVERSATION'].includes(String(p.recordClass)))return fail();
  if(subject.domain==='PAYMENTS')await eligibleReviewParticipant(tx,s.platform.id,'FINANCE',s.d.approvedByAccountId!);
  if(requireAuthorization){
    const binding=await tx.operationalSetting.findUnique({where:{key:dispositionAuthorizationKey(pin.documentId)}});
    if(binding?.value!==dispositionAuthority(pin,s.platform))return fail();
  }
  const disposition:Disposition={recordClass:p.recordClass as Disposition['recordClass'],accountClosureAt:date(p.accountClosureAt),commercialPeriodEnd:date(p.commercialPeriodEnd),taxPeriodEnd:date(p.taxPeriodEnd),
    additionalRetainUntil:date(p.additionalRetainUntil),settlementsComplete:true,holdsReviewed:true,holdReviewReference:p.holdReviewReference};
  return {disposition,expectedNativeHash:p.sourceHash};
}
export async function retentionPolicyForExport(tx:Prisma.TransactionClient,domain:Parameters<typeof exportRetentionPolicy>[0]) {
  const policy=exportRetentionPolicy(domain),activation=await approvedRetentionActivation(tx);
  return activation?{...policy,status:'DURATIONS_EFFECTIVE_SOURCE_BOUND',effectiveFrom:activation.effectiveFrom,activationSource:activation.pin,
    noticeAr:'مدد الجدول نافذة من التاريخ المعتمد. يبقى التصرف قرارًا محددًا بالسجل وموانعه؛ لم يُفعّل حذف عام.'}:policy;
}
