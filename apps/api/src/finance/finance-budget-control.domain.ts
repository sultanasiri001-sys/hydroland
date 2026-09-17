export type FinanceBudgetDecision='ALLOW'|'REVIEW_REQUIRED'|'BLOCK';
export type FinanceBudgetStatus='HEALTHY'|'WATCH'|'EXCEEDED';

export type FinanceBudgetControlInput={
  centerOrgUnitId:string;
  budgetMinor:number;
  committedMinor:number;
  spentMinor:number;
  requestedMinor:number;
  approvalLimitMinor:number;
};

function amount(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_BUDGET_AMOUNT_INVALID');return value}

export function evaluateFinanceBudgetControl(input:FinanceBudgetControlInput){
  if(!input.centerOrgUnitId?.trim())throw new Error('FINANCE_BUDGET_CENTER_REQUIRED');
  const budget=amount(input.budgetMinor),committed=amount(input.committedMinor),spent=amount(input.spentMinor),requested=amount(input.requestedMinor),approvalLimit=amount(input.approvalLimitMinor);
  const consumed=committed+spent;
  const projected=consumed+requested;
  const remaining=Math.max(0,budget-consumed);
  const utilizationBps=budget===0?(projected>0?10000:0):Math.round(projected*10000/budget);
  const status:FinanceBudgetStatus=projected>budget?'EXCEEDED':utilizationBps>=8500?'WATCH':'HEALTHY';
  let decision:FinanceBudgetDecision='ALLOW';
  if(projected>budget)decision='BLOCK';
  else if(requested>approvalLimit||utilizationBps>=8500)decision='REVIEW_REQUIRED';
  return {centerOrgUnitId:input.centerOrgUnitId,budgetMinor:budget,consumedMinor:consumed,requestedMinor:requested,projectedMinor:projected,remainingMinor:remaining,utilizationBps,status,decision};
}

export function assertFinanceBudgetOverride(input:{decision:FinanceBudgetDecision;requestedBy:string;approvedBy?:string;reason?:string}){
  if(input.decision!=='BLOCK')return true;
  if(!input.requestedBy?.trim()||!input.approvedBy?.trim())throw new Error('FINANCE_BUDGET_OVERRIDE_APPROVAL_REQUIRED');
  if(input.requestedBy===input.approvedBy)throw new Error('FINANCE_BUDGET_OVERRIDE_SOD_VIOLATION');
  if(!input.reason?.trim()||input.reason.trim().length<10)throw new Error('FINANCE_BUDGET_OVERRIDE_REASON_REQUIRED');
  return true;
}
