export type FinanceVarianceReviewDecision='APPROVED'|'REJECTED';
export type FinanceVarianceSeverity='NONE'|'MINOR'|'MATERIAL';

export function classifyFinanceVariance(varianceMinor:number,materialThresholdMinor:number){
  if(!Number.isSafeInteger(varianceMinor))throw new Error('FINANCE_VARIANCE_INVALID');
  if(!Number.isSafeInteger(materialThresholdMinor)||materialThresholdMinor<1)throw new Error('FINANCE_VARIANCE_THRESHOLD_INVALID');
  const amount=Math.abs(varianceMinor);
  const severity:FinanceVarianceSeverity=amount===0?'NONE':amount>=materialThresholdMinor?'MATERIAL':'MINOR';
  return {varianceMinor,absoluteVarianceMinor:amount,severity};
}

export function reviewFinanceVariance(input:{
  submitterAccountId:string;
  reviewerAccountId:string;
  varianceMinor:number;
  varianceReason?:string;
  decision:FinanceVarianceReviewDecision;
  reviewReason?:string;
  materialThresholdMinor:number;
}){
  if(!input.submitterAccountId||!input.reviewerAccountId)throw new Error('FINANCE_VARIANCE_ACTOR_REQUIRED');
  if(input.submitterAccountId===input.reviewerAccountId)throw new Error('FINANCE_VARIANCE_SOD_DENIED');
  const classification=classifyFinanceVariance(input.varianceMinor,input.materialThresholdMinor);
  if(classification.severity==='NONE')throw new Error('FINANCE_VARIANCE_REVIEW_NOT_REQUIRED');
  if(!input.varianceReason||input.varianceReason.trim().length<10)throw new Error('FINANCE_VARIANCE_REASON_REQUIRED');
  if(input.decision==='REJECTED'&&(!input.reviewReason||input.reviewReason.trim().length<10))throw new Error('FINANCE_VARIANCE_REJECTION_REASON_REQUIRED');
  return {...classification,decision:input.decision,varianceReason:input.varianceReason.trim(),reviewReason:input.reviewReason?.trim()??null,reviewedByAccountId:input.reviewerAccountId};
}
