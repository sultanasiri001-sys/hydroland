export type FinancePeriodType='MONTH'|'QUARTER'|'YEAR';
export type FinancePeriodCloseState='OPEN'|'READY'|'CLOSED'|'REOPENED';
export type FinanceAuditSeverity='INFO'|'WARNING'|'CRITICAL';

export type FinancePeriodCloseInput={
  periodType:FinancePeriodType;
  periodKey:string;
  openShiftCount:number;
  unresolvedVarianceCount:number;
  unreconciledPaymentCount:number;
  pendingRefundCount:number;
  unpostedReceivableCount:number;
};

export function evaluateFinancePeriodClose(input:FinancePeriodCloseInput){
  if(!input.periodKey?.trim())throw new Error('FINANCE_PERIOD_KEY_REQUIRED');
  const counts=[input.openShiftCount,input.unresolvedVarianceCount,input.unreconciledPaymentCount,input.pendingRefundCount,input.unpostedReceivableCount];
  if(counts.some(v=>!Number.isSafeInteger(v)||v<0))throw new Error('FINANCE_PERIOD_COUNT_INVALID');
  const blockers=[
    ['OPEN_SHIFTS',input.openShiftCount],
    ['UNRESOLVED_VARIANCES',input.unresolvedVarianceCount],
    ['UNRECONCILED_PAYMENTS',input.unreconciledPaymentCount],
    ['PENDING_REFUNDS',input.pendingRefundCount],
    ['UNPOSTED_RECEIVABLES',input.unpostedReceivableCount],
  ] as const;
  const active=blockers.filter(([,count])=>count>0).map(([code,count])=>({code,count}));
  return {periodType:input.periodType,periodKey:input.periodKey,state:active.length===0?'READY' as const:'OPEN' as const,blockers:active};
}

export function assertFinancePeriodTransition(input:{from:FinancePeriodCloseState;to:FinancePeriodCloseState;approved:boolean}){
  const allowed:Record<FinancePeriodCloseState,readonly FinancePeriodCloseState[]>={OPEN:['READY'],READY:['CLOSED'],CLOSED:['REOPENED'],REOPENED:['READY']};
  if(!allowed[input.from].includes(input.to))throw new Error('FINANCE_PERIOD_TRANSITION_DENIED');
  if((input.to==='CLOSED'||input.to==='REOPENED')&&!input.approved)throw new Error('FINANCE_PERIOD_APPROVAL_REQUIRED');
  return true;
}

export function buildFinanceAuditFinding(input:{code:string;description:string;severity:FinanceAuditSeverity;amountMinor?:number;referenceId?:string}){
  if(!input.code?.trim()||!input.description?.trim())throw new Error('FINANCE_AUDIT_FINDING_INVALID');
  if(input.amountMinor!==undefined&&(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<0))throw new Error('FINANCE_AMOUNT_INVALID');
  return {code:input.code.trim(),description:input.description.trim(),severity:input.severity,amountMinor:input.amountMinor??null,referenceId:input.referenceId?.trim()||null,requiresHumanReview:input.severity==='CRITICAL'};
}
