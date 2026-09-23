export type FinanceExecutiveRisk='LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
export type FinanceExecutiveDecision='CLEAR'|'REVIEW_REQUIRED'|'ESCALATION_REQUIRED';

export type FinanceExecutiveSnapshot={
  centerOrgUnitId:string;
  revenueMinor:number;
  expenseMinor:number;
  receivableMinor:number;
  cashVarianceMinor:number;
  overdueReceivableMinor:number;
  unresolvedFindingCount:number;
  criticalFindingCount:number;
};

function money(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_EXECUTIVE_AMOUNT_INVALID');return value}
function count(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_EXECUTIVE_COUNT_INVALID');return value}

export function evaluateFinanceExecutiveControl(input:FinanceExecutiveSnapshot){
  if(!input.centerOrgUnitId?.trim())throw new Error('FINANCE_EXECUTIVE_CENTER_REQUIRED');
  const revenue=money(input.revenueMinor),expense=money(input.expenseMinor),receivable=money(input.receivableMinor),overdue=money(input.overdueReceivableMinor);
  if(!Number.isSafeInteger(input.cashVarianceMinor))throw new Error('FINANCE_EXECUTIVE_VARIANCE_INVALID');
  const unresolved=count(input.unresolvedFindingCount),critical=count(input.criticalFindingCount);
  const absoluteVariance=Math.abs(input.cashVarianceMinor);
  const expenseRatioBps=revenue===0?(expense>0?10000:0):Math.round(expense*10000/revenue);
  const overdueRatioBps=receivable===0?0:Math.round(overdue*10000/receivable);
  let risk:FinanceExecutiveRisk='LOW';
  if(critical>0||absoluteVariance>=100000)risk='CRITICAL';
  else if(unresolved>=5||expenseRatioBps>=9000||overdueRatioBps>=5000)risk='HIGH';
  else if(unresolved>0||absoluteVariance>0||expenseRatioBps>=7500||overdueRatioBps>=2500)risk='MEDIUM';
  const decision:FinanceExecutiveDecision=risk==='CRITICAL'?'ESCALATION_REQUIRED':risk==='HIGH'||risk==='MEDIUM'?'REVIEW_REQUIRED':'CLEAR';
  return {centerOrgUnitId:input.centerOrgUnitId,risk,decision,netMinor:revenue-expense,expenseRatioBps,overdueRatioBps,absoluteVarianceMinor:absoluteVariance,unresolvedFindingCount:unresolved,criticalFindingCount:critical};
}

export function buildFinanceExecutivePortfolio(snapshots:FinanceExecutiveSnapshot[]){
  const centers=snapshots.map(evaluateFinanceExecutiveControl);
  return {
    centerCount:centers.length,
    clearCount:centers.filter(x=>x.decision==='CLEAR').length,
    reviewCount:centers.filter(x=>x.decision==='REVIEW_REQUIRED').length,
    escalationCount:centers.filter(x=>x.decision==='ESCALATION_REQUIRED').length,
    centers,
  };
}
