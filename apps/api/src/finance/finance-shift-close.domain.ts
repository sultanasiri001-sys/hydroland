import {reconcileFinanceShift} from './finance-reconciliation.domain';

export type ShiftCloseDecision='READY_FOR_REVIEW'|'VARIANCE_REVIEW_REQUIRED'|'BLOCKED';

export function prepareAccountantShiftClose(input:{
  accountantAccountId:string;
  shiftAccountantAccountId:string;
  shiftStatus:string;
  openingBalanceMinor:number;
  revenueMinor:number;
  expenseMinor:number;
  refundMinor:number;
  adjustmentMinor:number;
  actualCashMinor:number;
  unresolvedPaymentCount?:number;
  varianceReason?:string;
}){
  if(!input.accountantAccountId||input.accountantAccountId!==input.shiftAccountantAccountId)throw new Error('FINANCE_SHIFT_CLOSE_ACCOUNT_ISOLATION_DENIED');
  if(input.shiftStatus!=='OPEN')throw new Error('FINANCE_SHIFT_CLOSE_REQUIRES_OPEN_SHIFT');
  const reconciliation=reconcileFinanceShift(input);
  if(reconciliation.status==='BLOCKED')return {...reconciliation,decision:'BLOCKED' as ShiftCloseDecision};
  if(reconciliation.varianceMinor!==0){
    if(!input.varianceReason||input.varianceReason.trim().length<10)throw new Error('FINANCE_SHIFT_CLOSE_VARIANCE_REASON_REQUIRED');
    return {...reconciliation,varianceReason:input.varianceReason.trim(),decision:'VARIANCE_REVIEW_REQUIRED' as ShiftCloseDecision};
  }
  return {...reconciliation,decision:'READY_FOR_REVIEW' as ShiftCloseDecision};
}
