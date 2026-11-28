import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { erasureDigest } from './erasure-journal';

export type ErasureDomain = 'ACCOUNT'|'BOOKINGS'|'PAYMENTS'|'SENT_MESSAGES';
export type ErasureSubject = {accountId:string;domain:ErasureDomain;recordRef:string;centerId:string|null};
export type Disposition = {
  recordClass:'ACCOUNT_PROFILE'|'BOOKINGS_RENTALS'|'PAYMENT_COMMERCIAL'|'PAYMENT_VAT'|'PAYMENT_COMMERCIAL_AND_VAT'|'PRIVATE_MEMBER_CONVERSATION';
  accountClosureAt:string|null; commercialPeriodEnd:string|null; taxPeriodEnd:string|null;
  additionalRetainUntil:string|null; settlementsComplete:true; holdsReviewed:true; holdReviewReference:string;
};
export type NativePlan = ErasureSubject & {scope:string;identity:Record<string,unknown>;sourceHash:string;dueAt:string;relatedIds:string[]};
type Tx = Prisma.TransactionClient;
const conflict=(reason:string):never=>{throw new ConflictException({code:reason,message:'لم يستوف السجل شروط المحو؛ يبقى محفوظًا إلى مراجعة السبب.'});};
export function utcPeriod(date:Date,years=0,months=0) {
  const result=new Date(date), day=result.getUTCDate(); result.setUTCDate(1);
  result.setUTCFullYear(result.getUTCFullYear()+years);result.setUTCMonth(result.getUTCMonth()+months);
  const end=new Date(Date.UTC(result.getUTCFullYear(),result.getUTCMonth()+1,0)).getUTCDate();result.setUTCDate(Math.min(day,end));return result;
}
const instant=(s:string|null):Date=>{const d=new Date(s??'');if(!s||!Number.isFinite(d.getTime())||d.toISOString()!==s)return conflict('RETENTION_SOURCE_DATE_REQUIRED');return d;};
const latest=(...dates:(Date|null|undefined)[])=>new Date(Math.max(...dates.filter((d):d is Date=>!!d).map(d=>d.getTime())));
export async function lockPrivacyRecord(tx:Tx,s:ErasureSubject) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'a15-domain:'+s.accountId+':'+s.domain})::bigint)`;
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'a15:'+s.accountId+':'+s.domain+':'+s.recordRef})::bigint)`;
}
async function noIndependentFinancialReferences(tx:Tx,ref:string) {
  const rows=await tx.$queryRaw<unknown[]>`
    SELECT 1 FROM "FinanceShiftEntry" WHERE "paymentId"=${ref} OR "referenceId"=${ref}
    UNION ALL SELECT 1 FROM "ReceivablePayment" WHERE "paymentId"=${ref}
    UNION ALL SELECT 1 FROM "OrganizationBookingInvoiceFinalization" WHERE "paymentId"=${ref} OR "invoiceId"=${ref}
    UNION ALL SELECT 1 FROM "CenterServiceTransferReceipt" WHERE "paymentId"=${ref} OR "bookingId"=${ref}
    UNION ALL SELECT 1 FROM "CommerceInvoiceFinalization" WHERE "sourceId"=${ref}
    UNION ALL SELECT 1 FROM "CommerceSourceTransferReceipt" WHERE "sourceId"=${ref}
    UNION ALL SELECT 1 FROM "FinanceEntry" WHERE "referenceId"=${ref}
    UNION ALL SELECT 1 FROM "CommerceCollectionEvidence" WHERE "sourceId"=${ref}
    UNION ALL SELECT 1 FROM "UnifiedStoreOrderLine" WHERE "sourceId"=${ref}
    LIMIT 1`;
  if(rows.length)conflict('INDEPENDENT_FINANCIAL_REFERENCE_REQUIRES_RETENTION');
}
export async function requireNoPrivacyHold(tx:Tx,s:ErasureSubject) {
  await lockPrivacyRecord(tx,s);
  const held=await tx.$queryRaw<unknown[]>`SELECT id FROM "PrivacyRecordHold" WHERE "accountId"=${s.accountId} AND "domain"=${s.domain}
    AND ("recordRef"=${s.recordRef} OR "recordRef"='*') AND "releasedAt" IS NULL FOR SHARE`;
  if(held.length)conflict('ACTIVE_RETENTION_HOLD');
}
function finish(subject:ErasureSubject,scope:string,identity:Record<string,unknown>,facts:unknown,due:Date,relatedIds:string[],d:Disposition,now:Date):NativePlan {
  if(d.additionalRetainUntil)due=latest(due,instant(d.additionalRetainUntil));
  if(due>now)conflict('RETENTION_PERIOD_NOT_ELAPSED');
  return {...subject,scope,identity,sourceHash:erasureDigest({subject,scope,identity,facts,dueAt:due.toISOString(),relatedIds}),dueAt:due.toISOString(),relatedIds};
}

/** This reads native facts every time. A signed review cannot override an open
 * safety case, dependent financial record, live service or a retention hold. */
export async function inspectNativeRecord(tx:Tx,s:ErasureSubject,d:Disposition,now=new Date()):Promise<NativePlan> {
  // Revalidation receives the prior plan as its subject. Pin only the four
  // scope fields, never feed a previous plan/hash back into the source digest.
  s={accountId:s.accountId,domain:s.domain,recordRef:s.recordRef,centerId:s.centerId};
  await requireNoPrivacyHold(tx,s);
  if(s.domain==='SENT_MESSAGES') {
    if(d.recordClass!=='PRIVATE_MEMBER_CONVERSATION')return conflict('MESSAGE_CLASS_UNSUPPORTED');
    const [m]=await tx.$queryRaw<Array<{id:string;conversationId:string;senderAccountId:string;createdAt:Date;withdrawnAt:Date|null;mediaUrl:string|null;participants:number}>>`
      SELECT m.id::text AS id,m."conversationId"::text AS "conversationId",m."senderAccountId"::text AS "senderAccountId",m."createdAt",m."withdrawnAt",m."mediaUrl",
        (SELECT count(*)::int FROM "ConversationParticipant" p WHERE p."conversationId"=m."conversationId") AS participants
      FROM "Message" m WHERE m.id::text=${s.recordRef} AND m."senderAccountId"::text=${s.accountId} FOR UPDATE OF m`;
    if(!m)throw new NotFoundException('السجل غير متاح.');
    if(m.participants!==2||!m.withdrawnAt)return conflict('PRIVATE_WITHDRAWAL_REQUIRED');
    const [external]=await tx.$queryRaw<Array<{mediaUrl:string|null;body:string|null;kind:string;durationSec:number|null}>>`SELECT kind,body,"mediaUrl","durationSec" FROM "WithdrawnMessageContent" WHERE "messageId"=${m.id}`;
    if(m.mediaUrl||external?.mediaUrl) return conflict('EXTERNAL_MEDIA_DISPOSITION_REQUIRED');
    if((await tx.$queryRaw<unknown[]>`SELECT "caseId" FROM "MessageAbuseEvidence" WHERE "messageId"=${m.id} AND "releasedAt" IS NULL FOR SHARE`).length)
      return conflict('ACTIVE_MESSAGE_ABUSE_HOLD');
    const [audio]=await tx.$queryRaw<Array<{content:Buffer;sha256:string;byteSize:number;durationMs:number}>>`SELECT content,sha256,"byteSize","durationMs" FROM "PrivateMessageAudio" WHERE "messageId"::text=${m.id}`;
    const audioHash=audio?createHash('sha256').update(Buffer.from(audio.content)).digest('hex'):null;
    if(audio&&(audio.byteSize!==Buffer.from(audio.content).length||audio.sha256!==audioHash))return conflict('MESSAGE_AUDIO_SOURCE_INTEGRITY_FAILED');
    const identity={id:m.id,conversationId:m.conversationId,accountId:m.senderAccountId,createdAt:m.createdAt.toISOString()};
    return finish(s,'PRIVATE_MESSAGE_AND_RESTRICTED_CONTENT',identity,{withdrawnAt:m.withdrawnAt,restrictedContentHash:erasureDigest(external??null),audio:audio?{sha256:audioHash,byteSize:audio.byteSize,durationMs:audio.durationMs}:null},new Date(m.withdrawnAt.getTime()+30*86400000),[],d,now);
  }
  if(s.domain==='BOOKINGS') {
    if(d.recordClass!=='BOOKINGS_RENTALS')return conflict('BOOKING_CLASS_REQUIRED');
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id::text=${s.recordRef} FOR UPDATE`;
    const b=await tx.booking.findFirst({where:{id:s.recordRef,accountId:s.accountId,organizationId:null,...(s.centerId?{trip:{organizationId:s.centerId}}:{id:'NO_CENTER_SCOPE'})},include:{trip:true,payments:{select:{id:true}},safetyIncidents:{select:{id:true}},participants:{include:{diveLogs:{select:{id:true}},participationCase:{select:{id:true}}}}}});
    if(!b)throw new NotFoundException('السجل غير متاح.');
    await noIndependentFinancialReferences(tx,b.id);
    if(!['COMPLETED','CANCELLED'].includes(b.trip.status)&&b.status!=='CANCELLED')return conflict('BOOKING_SERVICE_NOT_FINISHED');
    if(b.payments.length||b.safetyIncidents.length||b.participants.some(p=>p.diveLogs.length||p.participationCase))return conflict('BOOKING_DEPENDENT_RECORDS_REQUIRE_RETENTION');
    const base=latest(b.updatedAt,b.trip.endsAt,b.trip.updatedAt,...b.participants.map(p=>p.updatedAt));
    return finish(s,'BOOKING_AND_UNREFERENCED_PARTICIPANTS',{id:b.id,accountId:b.accountId,tripId:b.tripId,createdAt:b.createdAt.toISOString()},
      {nativeBooking:b},utcPeriod(base,0,12),b.participants.map(p=>p.id).sort(),d,now);
  }
  if(s.domain==='PAYMENTS') {
    if(!['PAYMENT_COMMERCIAL','PAYMENT_VAT','PAYMENT_COMMERCIAL_AND_VAT'].includes(d.recordClass))return conflict('FINANCIAL_CLASSIFICATION_REQUIRED');
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id::text=${s.recordRef} FOR UPDATE`;
    const p=await tx.payment.findFirst({where:{id:s.recordRef,accountId:s.accountId,booking:{accountId:s.accountId,organizationId:null,trip:{organizationId:s.centerId??'NO_CENTER_SCOPE'}}},include:{invoice:true,refundOperations:{select:{id:true}},booking:{include:{trip:true,safetyIncidents:{select:{id:true}}}}}});
    if(!p)throw new NotFoundException('السجل غير متاح.');
    await noIndependentFinancialReferences(tx,p.id);
    if(p.invoice)await noIndependentFinancialReferences(tx,p.invoice.id);
    if(!['CAPTURED','REFUNDED','FAILED','CANCELLED'].includes(p.status)||!['COMPLETED','CANCELLED'].includes(p.booking.trip.status))return conflict('FINANCIAL_OPERATION_NOT_SETTLED');
    if(p.refundOperations.length||p.booking.safetyIncidents.length)return conflict('FINANCIAL_DEPENDENT_RECORDS_REQUIRE_RETENTION');
    const original=await tx.accountInvoiceDocument.findUnique({where:{sourceType_sourceId:{sourceType:'TRIP_PAYMENT',sourceId:p.id}}});
    if(original?.buyerOrganizationId)return conflict('ORGANIZATION_RECORD_OUTSIDE_MEMBER_SCOPE');
    const last=latest(p.updatedAt,p.invoice?.issuedAt,p.invoice?.createdAt,original?.createdAt,p.booking.updatedAt,p.booking.trip.endsAt);
    const limits:Date[]=[];
    if(d.recordClass.includes('COMMERCIAL')) { const start=instant(d.commercialPeriodEnd);if(start<last)return conflict('COMMERCIAL_PERIOD_BEFORE_SOURCE');limits.push(utcPeriod(start,10)); }
    if(d.recordClass.includes('VAT')) { const start=instant(d.taxPeriodEnd);if(start<last)return conflict('TAX_PERIOD_BEFORE_SOURCE');limits.push(utcPeriod(start,6)); }
    const identity={id:p.id,accountId:p.accountId,bookingId:p.bookingId,createdAt:p.createdAt.toISOString(),invoiceId:p.invoice?.id??null,invoiceDocumentHash:original?.sha256??null};
    return finish(s,'PAYMENT_AND_ITS_NATIVE_INVOICE',identity,{nativePayment:p,nativeInvoiceDocument:original,last},latest(...limits),p.invoice?[p.invoice.id]:[],d,now);
  }
  if(d.recordClass!=='ACCOUNT_PROFILE'||s.recordRef!==s.accountId)return conflict('ACCOUNT_CLASS_REQUIRED');
  await tx.$queryRaw`SELECT id FROM "Account" WHERE id::text=${s.accountId} FOR UPDATE`;
  const a=await tx.account.findUnique({where:{id:s.accountId},include:{person:{include:{professional:true}}}});
  if(!a)throw new NotFoundException('السجل غير متاح.');
  if(a.status!=='ARCHIVED')return conflict('ACCOUNT_NOT_CLOSED');
  const closure=instant(d.accountClosureAt);
  if(closure>now)return conflict('ACCOUNT_CLOSURE_NOT_EFFECTIVE');
  const dependencies=await Promise.all([
    tx.booking.count({where:{accountId:s.accountId}}),tx.payment.count({where:{accountId:s.accountId}}),
    tx.organization.count({where:{ownerId:s.accountId}}),tx.employment.count({where:{accountId:s.accountId}}),
    tx.safetyIncident.count({where:{OR:[{reportedByAccountId:s.accountId},{resolvedByAccountId:s.accountId}]}}),
    tx.hrCandidate.count({where:{personId:a.personId}}),
  ]);
  if(dependencies.some(Boolean))return conflict('ACCOUNT_INDEPENDENT_RECORDS_REQUIRE_REVIEW');
  const professional=a.person.professional;
  if(professional?.nationalLicenseCredentialId||professional?.qualificationCredentialId||professional?.eligibilityEvidenceReference)return conflict('ACCOUNT_CREDENTIAL_REFERENCES_REQUIRE_REVIEW');
  return finish(s,'ACCOUNT_CONTACT_AND_PUBLIC_PROFILE_CONTENT',{id:a.id,personId:a.personId,createdAt:a.createdAt.toISOString()},
    {accountUpdatedAt:a.updatedAt,personUpdatedAt:a.person.updatedAt,profileUpdatedAt:professional?.updatedAt??null,
      projectionHash:erasureDigest({email:a.email,person:a.person,professional})},closure,professional?[professional.id]:[],d,now);
}

/** Only fixed projections and fixed native tables are writable. No table name,
 * SQL, field list or replacement content can be supplied by the request. */
export async function applyNativeErasure(tx:Tx,p:NativePlan) {
  await requireNoPrivacyHold(tx,p);
  if(p.domain==='SENT_MESSAGES') {
    const [m]=await tx.$queryRaw<Array<{id:string;accountId:string;conversationId:string;createdAt:Date}>>`SELECT id::text AS id,"senderAccountId"::text AS "accountId","conversationId"::text AS "conversationId","createdAt" FROM "Message" WHERE id::text=${p.recordRef} FOR UPDATE`;
    if(m && erasureDigest({...m,createdAt:m.createdAt.toISOString()})!==erasureDigest(p.identity))return conflict('RECOVERY_SOURCE_IDENTITY_MISMATCH');
    if((await tx.$queryRaw<unknown[]>`SELECT "caseId" FROM "MessageAbuseEvidence" WHERE "messageId"=${p.recordRef} AND "releasedAt" IS NULL`).length)return conflict('ACTIVE_MESSAGE_ABUSE_HOLD');
    await tx.$executeRaw`DELETE FROM "PrivateMessageAudio" WHERE "messageId"::text=${p.recordRef}`;
    await tx.$executeRaw`DELETE FROM "WithdrawnMessageContent" WHERE "messageId"=${p.recordRef}`;
    await tx.$executeRaw`DELETE FROM "Message" WHERE id::text=${p.recordRef}`;
    return;
  }
  if(p.domain==='BOOKINGS') {
    const b=await tx.booking.findUnique({where:{id:p.recordRef}});
    if(!b)return;
    await noIndependentFinancialReferences(tx,b.id);
    if(erasureDigest({id:b.id,accountId:b.accountId,tripId:b.tripId,createdAt:b.createdAt.toISOString()})!==erasureDigest(p.identity))return conflict('RECOVERY_SOURCE_IDENTITY_MISMATCH');
    const current=await tx.bookingParticipant.findMany({where:{bookingId:b.id},select:{id:true}});
    if(current.some(x=>!p.relatedIds.includes(x.id)))return conflict('RECOVERY_UNEXPECTED_DEPENDENT_RECORD');
    await tx.bookingParticipant.deleteMany({where:{bookingId:b.id,id:{in:p.relatedIds}}});
    await tx.booking.delete({where:{id:b.id}});return;
  }
  if(p.domain==='PAYMENTS') {
    const payment=await tx.payment.findUnique({where:{id:p.recordRef},include:{invoice:true}});
    if(!payment)return;
    await noIndependentFinancialReferences(tx,payment.id);
    if(payment.invoice)await noIndependentFinancialReferences(tx,payment.invoice.id);
    const original=await tx.accountInvoiceDocument.findUnique({where:{sourceType_sourceId:{sourceType:'TRIP_PAYMENT',sourceId:payment.id}}});
    const identity={id:payment.id,accountId:payment.accountId,bookingId:payment.bookingId,createdAt:payment.createdAt.toISOString(),invoiceId:payment.invoice?.id??null,invoiceDocumentHash:original?.sha256??null};
    if(erasureDigest(identity)!==erasureDigest(p.identity))return conflict('RECOVERY_SOURCE_IDENTITY_MISMATCH');
    await tx.accountInvoiceDocument.deleteMany({where:{sourceType:'TRIP_PAYMENT',sourceId:payment.id}});
    await tx.invoice.deleteMany({where:{paymentId:payment.id,id:{in:p.relatedIds}}});
    await tx.payment.delete({where:{id:payment.id}});return;
  }
  const account=await tx.account.findUnique({where:{id:p.accountId}});
  if(!account)return;
  if(erasureDigest({id:account.id,personId:account.personId,createdAt:account.createdAt.toISOString()})!==erasureDigest(p.identity))return conflict('RECOVERY_SOURCE_IDENTITY_MISMATCH');
  await tx.session.deleteMany({where:{accountId:account.id}});
  await tx.account.update({where:{id:account.id},data:{status:'ARCHIVED',email:'erased-'+erasureDigest(account.id)+'@example.invalid',passwordHash:'ERASED_NO_LOGIN',emailVerifiedAt:null,lastLoginAt:null}});
  await tx.person.update({where:{id:account.personId},data:{firstName:'محذوف',lastName:'',phone:null}});
  await tx.professionalProfile.updateMany({where:{personId:account.personId},data:{headline:null,bio:null,regionCode:null}});
  // Identity and separately retained evidence are deliberately not destroyed.
}

/** The recovery gate checks the actual native projection, not just a receipt
 * that could have been copied from a different point in the backup history. */
export async function nativeErasureSatisfied(tx:Tx,p:NativePlan):Promise<boolean> {
  if(p.domain==='SENT_MESSAGES')return !(await tx.$queryRaw<unknown[]>`
    SELECT id::text FROM "Message" WHERE id::text=${p.recordRef}
    UNION ALL SELECT "messageId" FROM "WithdrawnMessageContent" WHERE "messageId"=${p.recordRef}
    UNION ALL SELECT "messageId"::text FROM "PrivateMessageAudio" WHERE "messageId"::text=${p.recordRef} LIMIT 1`).length;
  if(p.domain==='BOOKINGS')return !(await tx.booking.count({where:{id:p.recordRef}}))&&!(await tx.bookingParticipant.count({where:{id:{in:p.relatedIds}}}));
  if(p.domain==='PAYMENTS')return !(await tx.payment.count({where:{id:p.recordRef}}))&&!(await tx.invoice.count({where:{id:{in:p.relatedIds}}}))
    &&!(await tx.accountInvoiceDocument.count({where:{sourceType:'TRIP_PAYMENT',sourceId:p.recordRef}}));
  const a=await tx.account.findUnique({where:{id:p.accountId},include:{person:{include:{professional:true}},sessions:{select:{id:true}}}});
  if(!a)return true;
  const profile=a.person.professional;
  return a.status==='ARCHIVED'&&a.email==='erased-'+erasureDigest(a.id)+'@example.invalid'&&a.passwordHash==='ERASED_NO_LOGIN'&&a.emailVerifiedAt===null&&a.lastLoginAt===null
    &&a.sessions.length===0&&a.person.firstName==='محذوف'&&a.person.lastName===''&&a.person.phone===null
    &&(!profile||profile.headline===null&&profile.bio===null&&profile.regionCode===null);
}
