export type FinanceLiquidityRisk='LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
export type FinanceTreasuryDecision='CLEAR'|'REVIEW_REQUIRED'|'ESCALATION_REQUIRED';

export type FinanceTreasurySnapshot={
  centerOrgUnitId:string;
  availableCashMinor:number;
  expectedInflowsMinor:number;
  dueOutflowsMinor:number;
  reserveRequirementMinor:number;
  overduePayablesMinor:number;
};

function amount(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_TREASURY_AMOUNT_INVALID');return value}

export function evaluateFinanceTreasuryControl(input:FinanceTreasurySnapshot){
  if(!input.centerOrgUnitId?.trim())throw new Error('FINANCE_TREASURY_CENTER_REQUIRED');
  const cash=amount(input.availableCashMinor),inflows=amount(input.expectedInflowsMinor),outflows=amount(input.dueOutflowsMinor),reserve=amount(input.reserveRequirementMinor),overdue=amount(input.overduePayablesMinor);
  const projectedLiquidity=cash+inflows-outflows;
  const reserveGap=Math.max(0,reserve-projectedLiquidity);
  const coverageBps=outflows===0?10000:Math.max(0,Math.round((cash+inflows)*10000/outflows));
  let risk:FinanceLiquidityRisk='LOW';
  if(projectedLiquidity<0||overdue>0&&coverageBps<5000)risk='CRITICAL';
  else if(reserveGap>0||coverageBps<10000)risk='HIGH';
  else if(coverageBps<12500)risk='MEDIUM';
  const decision:FinanceTreasuryDecision=risk==='CRITICAL'?'ESCALATION_REQUIRED':risk==='HIGH'||risk==='MEDIUM'?'REVIEW_REQUIRED':'CLEAR';
  return {centerOrgUnitId:input.centerOrgUnitId,projectedLiquidityMinor:projectedLiquidity,reserveGapMinor:reserveGap,coverageBps,overduePayablesMinor:overdue,risk,decision};
}

export function buildFinanceTreasuryPortfolio(snapshots:FinanceTreasurySnapshot[]){
  const centers=snapshots.map(evaluateFinanceTreasuryControl);
  return {centerCount:centers.length,totalProjectedLiquidityMinor:centers.reduce((sum,x)=>sum+x.projectedLiquidityMinor,0),clearCount:centers.filter(x=>x.decision==='CLEAR').length,reviewCount:centers.filter(x=>x.decision==='REVIEW_REQUIRED').length,escalationCount:centers.filter(x=>x.decision==='ESCALATION_REQUIRED').length,centers};
}
