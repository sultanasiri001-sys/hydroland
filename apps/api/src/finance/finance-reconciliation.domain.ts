export type ReconciliationStatus='MATCHED'|'VARIANCE'|'BLOCKED';

export interface FinanceReconciliationInput {
  openingBalanceMinor:number;
  revenueMinor:number;
  expenseMinor:number;
  refundMinor:number;
  adjustmentMinor:number;
  actualCashMinor:number;
  unresolvedPaymentCount?:number;
}

function assertMoney(value:number,code:string){
  if(!Number.isSafeInteger(value)||value<0)throw new Error(code);
}

export function reconcileFinanceShift(input:FinanceReconciliationInput){
  assertMoney(input.openingBalanceMinor,'FINANCE_RECON_OPENING_INVALID');
  assertMoney(input.revenueMinor,'FINANCE_RECON_REVENUE_INVALID');
  assertMoney(input.expenseMinor,'FINANCE_RECON_EXPENSE_INVALID');
  assertMoney(input.refundMinor,'FINANCE_RECON_REFUND_INVALID');
  assertMoney(input.adjustmentMinor,'FINANCE_RECON_ADJUSTMENT_INVALID');
  assertMoney(input.actualCashMinor,'FINANCE_RECON_ACTUAL_INVALID');
  const unresolved=input.unresolvedPaymentCount??0;
  if(!Number.isSafeInteger(unresolved)||unresolved<0)throw new Error('FINANCE_RECON_UNRESOLVED_INVALID');

  const expectedCashMinor=input.openingBalanceMinor+input.revenueMinor+input.adjustmentMinor-input.expenseMinor-input.refundMinor;
  if(expectedCashMinor<0)throw new Error('FINANCE_RECON_EXPECTED_NEGATIVE');
  const varianceMinor=input.actualCashMinor-expectedCashMinor;
  const status:ReconciliationStatus=unresolved>0?'BLOCKED':varianceMinor===0?'MATCHED':'VARIANCE';
  return {expectedCashMinor,actualCashMinor:input.actualCashMinor,varianceMinor,unresolvedPaymentCount:unresolved,status};
}
