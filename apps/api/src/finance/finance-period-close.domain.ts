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

export type FinancePeriodRange={periodType:FinancePeriodType;periodKey:string;startsAt:Date;endsAt:Date;timeZone:'Asia/Riyadh'};

const riyadhMidnightUtc=(year:number,month:number,day:number)=>new Date(Date.UTC(year,month-1,day)-3*60*60*1000);

export function resolveFinancePeriodRange(periodType:FinancePeriodType,periodKey:string):FinancePeriodRange{
  if(typeof periodKey!=='string')throw new Error('FINANCE_PERIOD_KEY_INVALID');
  let match:RegExpMatchArray|null,year:number,startMonth:number,endMonth:number;
  if(periodType==='MONTH'){
    match=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodKey);if(!match)throw new Error('FINANCE_PERIOD_KEY_INVALID');
    year=Number(match[1]);startMonth=Number(match[2]);endMonth=startMonth+1;
  }else if(periodType==='QUARTER'){
    match=/^(\d{4})-Q([1-4])$/.exec(periodKey);if(!match)throw new Error('FINANCE_PERIOD_KEY_INVALID');
    year=Number(match[1]);startMonth=(Number(match[2])-1)*3+1;endMonth=startMonth+3;
  }else if(periodType==='YEAR'){
    match=/^(\d{4})$/.exec(periodKey);if(!match)throw new Error('FINANCE_PERIOD_KEY_INVALID');
    year=Number(match[1]);startMonth=1;endMonth=13;
  }else throw new Error('FINANCE_PERIOD_TYPE_INVALID');
  if(year<2000||year>2100)throw new Error('FINANCE_PERIOD_KEY_INVALID');
  const endYear=year+(endMonth>12?1:0);if(endMonth>12)endMonth-=12;
  return{periodType,periodKey,startsAt:riyadhMidnightUtc(year,startMonth,1),endsAt:riyadhMidnightUtc(endYear,endMonth,1),timeZone:'Asia/Riyadh'};
}

export function evaluateFinancePeriodClose(input:FinancePeriodCloseInput){
  resolveFinancePeriodRange(input.periodType,input.periodKey);
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

export function assertFinancePeriodApproval(input:{requestedBy:string;reviewerAccountId:string;decision:'APPROVED'|'REJECTED';approvedAccountIds:string[]}){
  if(!input.requestedBy?.trim()||!input.reviewerAccountId?.trim())throw new Error('FINANCE_PERIOD_APPROVER_REQUIRED');
  if(input.requestedBy===input.reviewerAccountId||input.approvedAccountIds.includes(input.reviewerAccountId))throw new Error('FINANCE_PERIOD_REVIEW_SOD_VIOLATION');
  if(!['APPROVED','REJECTED'].includes(input.decision))throw new Error('FINANCE_PERIOD_DECISION_INVALID');
  const approvalCount=input.approvedAccountIds.length+(input.decision==='APPROVED'?1:0);
  return{approvalCount,closes:input.decision==='APPROVED'&&approvalCount>=2,rejected:input.decision==='REJECTED'};
}

export function buildFinanceAuditFinding(input:{code:string;description:string;severity:FinanceAuditSeverity;amountMinor?:number;referenceId?:string}){
  if(!input.code?.trim()||!input.description?.trim())throw new Error('FINANCE_AUDIT_FINDING_INVALID');
  if(input.amountMinor!==undefined&&(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<0))throw new Error('FINANCE_AMOUNT_INVALID');
  return {code:input.code.trim(),description:input.description.trim(),severity:input.severity,amountMinor:input.amountMinor??null,referenceId:input.referenceId?.trim()||null,requiresHumanReview:input.severity==='CRITICAL'};
}
