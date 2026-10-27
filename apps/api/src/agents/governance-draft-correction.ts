import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { GovernanceReview } from './governance-review.domain';

export const DRAFT_CORRECTION_POLICY = 'ONE_DRAFT_REVISION_V1';
export const DRAFT_CORRECTION_PREFIX = 'DRAFT_CORRECTION_V1:';
export const draftCorrectionAllowed = (key:string,action:string) =>
  ['EXECUTIVE','MARKETING','SALES','SUPPORT','INVENTORY','SOCIAL'].includes(key) &&
  ['DRAFT_REPORT','DRAFT_MESSAGE','DRAFT_CAMPAIGN'].includes(action);
export const draftCorrectionRequested = (review:GovernanceReview|null) =>
  Boolean(review && review.decision==='RETURN_FOR_CORRECTION' &&
    ['LOW','MEDIUM'].includes(review.riskLevel) && !review.ownerEscalationRequired &&
    review.findings.length && !review.evidenceGaps.length);
export const correctionFingerprint = (source:{id:string;revision:string},review:{id:string;revision:string}) =>
  DRAFT_CORRECTION_PREFIX + createHash('sha256').update(JSON.stringify({sourceId:source.id,sourceRevision:source.revision,reviewId:review.id,reviewRevision:review.revision})).digest('hex');

export const correctionRequestId = (sourceId:string) => {
  const hex=createHash('sha256').update(`draft-correction:${sourceId}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
};

export async function hasDraftCorrectionPermission(tx:Prisma.TransactionClient,source:{id:string;agentKey:string;action:string;language:string;requestedByAccountId:string;fingerprint:string}){
  if(source.fingerprint.startsWith(DRAFT_CORRECTION_PREFIX)||!draftCorrectionAllowed(source.agentKey,source.action))return false;
  // A generated revision is never a new opt-in root, even if another receipt
  // is subsequently attached. This bounds the complete lineage to one round.
  if(await tx.auditEvent.count({where:{resource:'AiAgentTask',resourceId:source.id,action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED'}}))return false;
  const receipts=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:source.id,action:'AI_TASK_QUEUED'},select:{metadata:true},take:2});
  const policy=receipts[0]?.metadata as Record<string,unknown>|undefined;
  return receipts.length===1&&policy?.correctionPolicy===DRAFT_CORRECTION_POLICY&&policy.agentKey===source.agentKey&&policy.action===source.action&&policy.language===source.language&&policy.requesterAccountId===source.requestedByAccountId;
}
