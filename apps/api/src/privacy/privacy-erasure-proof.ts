import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { erasureDigest } from './erasure-journal';
import { nativeErasureSatisfied, NativePlan } from './record-disposition';

/** A disposition cannot be marked applied merely by sending an audit id. */
export async function verifyErasureExecution(tx:Prisma.TransactionClient,requestId:string,accountId:string,domain:string,recordRef:string|null){
  const ref=domain==='ACCOUNT'?accountId:recordRef;
  const operations=await tx.$queryRaw<Array<{id:string;intent:unknown;intentHash:string;receipt:unknown;receiptHash:string;executionAuditId:string}>>`
    SELECT id,intent,"intentHash",receipt,"receiptHash","executionAuditId" FROM "PrivacyErasureOperation"
    WHERE "requestId"=${requestId} AND "accountId"=${accountId} AND domain=${domain} AND "recordRef"=${ref} AND state='PUBLISHED'`;
  if(operations.length!==1)throw new ConflictException('يلزم إيصال محو منشور ومحدد لهذا الطلب.');
  const o=operations[0],intent=o.intent as {plan:NativePlan},receipt=o.receipt as {intentHash:string;executionAuditId:string};
  if(erasureDigest(intent)!==o.intentHash||erasureDigest(receipt)!==o.receiptHash||receipt.intentHash!==o.intentHash||receipt.executionAuditId!==o.executionAuditId
    ||!await nativeErasureSatisfied(tx,intent.plan))throw new ConflictException('إثبات المحو غير مطابق للسجل.');
  const original=await tx.auditEvent.findFirst({where:{id:o.executionAuditId,action:'PERSONAL_DATA_ERASED',resource:'PrivacyErasureOperation',resourceId:o.id,metadata:{path:['requestId'],equals:requestId}},select:{id:true}});
  const recovered=original?null:await tx.auditEvent.findFirst({where:{action:'privacy.erasure_recovery_verified',resource:'PrivacyErasureOperation',resourceId:o.id,
    AND:[{metadata:{path:['externalReceiptHash'],equals:o.receiptHash}},{metadata:{path:['intentHash'],equals:o.intentHash}}]},select:{id:true}});
  if(!original&&!recovered)throw new ConflictException('إيصال المحو لا يرتبط بسجل تدقيق صحيح.');
  return {domain,policyVersion:'0.1',status:'VERIFIED_NATIVE_ERASURE',scope:intent.plan.scope,operationId:o.id,externalReceiptHash:o.receiptHash,erasureAuthorized:true};
}
