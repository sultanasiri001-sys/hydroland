export type FinanceDashboardRole='BRANCH_ACCOUNTANT'|'CENTER_MANAGER'|'CENTRAL_FINANCE'|'EXECUTIVE';
export type FinanceDashboardScope={role:FinanceDashboardRole;accountId:string;centerOrgUnitId?:string};
export type FinanceDashboardSnapshot={centerOrgUnitId:string;accountantAccountId?:string;revenueMinor:number;expenseMinor:number;collectionMinor:number;receivableMinor:number;openShiftCount:number;varianceReviewCount:number};

export function buildFinanceDashboard(input:{scope:FinanceDashboardScope;snapshots:FinanceDashboardSnapshot[]}){
  if(!input.scope.accountId)throw new Error('FINANCE_DASHBOARD_ACCOUNT_REQUIRED');
  if((input.scope.role==='BRANCH_ACCOUNTANT'||input.scope.role==='CENTER_MANAGER')&&!input.scope.centerOrgUnitId)throw new Error('FINANCE_DASHBOARD_CENTER_REQUIRED');
  const visible=input.snapshots.filter(s=>isVisible(input.scope,s));
  for(const s of visible)validateSnapshot(s);
  const totals=visible.reduce((a,s)=>({revenueMinor:a.revenueMinor+s.revenueMinor,expenseMinor:a.expenseMinor+s.expenseMinor,collectionMinor:a.collectionMinor+s.collectionMinor,receivableMinor:a.receivableMinor+s.receivableMinor,openShiftCount:a.openShiftCount+s.openShiftCount,varianceReviewCount:a.varianceReviewCount+s.varianceReviewCount}),{revenueMinor:0,expenseMinor:0,collectionMinor:0,receivableMinor:0,openShiftCount:0,varianceReviewCount:0});
  return {role:input.scope.role,centerOrgUnitId:input.scope.centerOrgUnitId??null,snapshotCount:visible.length,...totals,netMinor:totals.revenueMinor-totals.expenseMinor};
}

function isVisible(scope:FinanceDashboardScope,s:FinanceDashboardSnapshot){
  if(scope.role==='BRANCH_ACCOUNTANT')return s.centerOrgUnitId===scope.centerOrgUnitId&&s.accountantAccountId===scope.accountId;
  if(scope.role==='CENTER_MANAGER')return s.centerOrgUnitId===scope.centerOrgUnitId;
  return true;
}
function validateSnapshot(s:FinanceDashboardSnapshot){if(!s.centerOrgUnitId)throw new Error('FINANCE_DASHBOARD_CENTER_REQUIRED');for(const v of [s.revenueMinor,s.expenseMinor,s.collectionMinor,s.receivableMinor,s.openShiftCount,s.varianceReviewCount])if(!Number.isSafeInteger(v)||v<0)throw new Error('FINANCE_DASHBOARD_VALUE_INVALID');}
