export type FinanceForecastScenario='BASE'|'UPSIDE'|'DOWNSIDE'|'STRESS';
export type FinanceForecastRisk='LOW'|'MEDIUM'|'HIGH'|'CRITICAL';

export type FinanceForecastInput={
  centerOrgUnitId:string;
  scenario:FinanceForecastScenario;
  openingCashMinor:number;
  forecastRevenueMinor:number;
  forecastExpenseMinor:number;
  forecastCollectionsMinor:number;
  forecastReceivableMinor:number;
  minimumCashReserveMinor:number;
};

function amount(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_FORECAST_AMOUNT_INVALID');return value}
function safe(value:number){if(!Number.isSafeInteger(value))throw new Error('FINANCE_FORECAST_OVERFLOW');return value}

export function evaluateFinanceForecast(input:FinanceForecastInput){
  if(!input.centerOrgUnitId?.trim())throw new Error('FINANCE_FORECAST_CENTER_REQUIRED');
  const opening=amount(input.openingCashMinor),revenue=amount(input.forecastRevenueMinor),expense=amount(input.forecastExpenseMinor),collections=amount(input.forecastCollectionsMinor),receivable=amount(input.forecastReceivableMinor),reserve=amount(input.minimumCashReserveMinor);
  const inflows=safe(revenue+collections);
  const projectedCash=safe(safe(opening+inflows)-expense);
  const reserveGap=Math.max(0,reserve-projectedCash);
  const collectionCoverageBps=receivable===0?10000:Math.min(10000,Math.round(collections*10000/receivable));
  let risk:FinanceForecastRisk='LOW';
  if(projectedCash<0)risk='CRITICAL';
  else if(reserveGap>0||collectionCoverageBps<5000)risk='HIGH';
  else if(collectionCoverageBps<7500||expense>inflows)risk='MEDIUM';
  return {centerOrgUnitId:input.centerOrgUnitId,scenario:input.scenario,projectedCashMinor:projectedCash,reserveGapMinor:reserveGap,collectionCoverageBps,risk,requiresExecutiveReview:risk==='CRITICAL'||risk==='HIGH'};
}

export function compareFinanceForecastScenarios(inputs:FinanceForecastInput[]){
  if(inputs.length===0)throw new Error('FINANCE_FORECAST_SCENARIOS_REQUIRED');
  const center=inputs[0].centerOrgUnitId;
  if(inputs.some(x=>x.centerOrgUnitId!==center))throw new Error('FINANCE_FORECAST_CENTER_MISMATCH');
  const scenarios=inputs.map(evaluateFinanceForecast);
  return {centerOrgUnitId:center,scenarioCount:scenarios.length,criticalCount:scenarios.filter(x=>x.risk==='CRITICAL').length,highCount:scenarios.filter(x=>x.risk==='HIGH').length,minimumProjectedCashMinor:Math.min(...scenarios.map(x=>x.projectedCashMinor)),scenarios};
}
