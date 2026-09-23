export type FinanceShiftStatus='OPEN'|'HANDOVER_PENDING'|'HANDED_OVER'|'CLOSED';
export type FinanceEntryType='REVENUE'|'EXPENSE'|'REFUND'|'ADJUSTMENT';
export type FinanceHandoverStatus='PENDING'|'ACCEPTED'|'REJECTED';

export interface FinanceShiftSnapshot{
  id:string;
  centerOrgUnitId:string;
  accountantAccountId:string;
  status:FinanceShiftStatus;
  openingBalanceMinor:number;
  currency:string;
}

export interface FinanceShiftEntryInput{
  shiftId:string;
  type:FinanceEntryType;
  amountMinor:number;
  paymentId?:string|null;
  referenceType?:string|null;
  referenceId?:string|null;
  description?:string|null;
  recordedByAccountId:string;
}

export interface FinanceShiftTotals{
  revenueMinor:number;
  expenseMinor:number;
  refundMinor:number;
  adjustmentMinor:number;
  expectedCashMinor:number;
}

export function calculateFinanceShiftTotals(openingBalanceMinor:number,entries:ReadonlyArray<Pick<FinanceShiftEntryInput,'type'|'amountMinor'>>):FinanceShiftTotals{
  if(!Number.isSafeInteger(openingBalanceMinor)||openingBalanceMinor<0)throw new Error('FINANCE_AMOUNT_INVALID');
  let revenueMinor=0,expenseMinor=0,refundMinor=0,adjustmentMinor=0;
  for(const entry of entries){
    if(!Number.isSafeInteger(entry.amountMinor)||entry.amountMinor<=0)throw new Error('FINANCE_AMOUNT_INVALID');
    if(entry.type==='REVENUE')revenueMinor+=entry.amountMinor;
    else if(entry.type==='EXPENSE')expenseMinor+=entry.amountMinor;
    else if(entry.type==='REFUND')refundMinor+=entry.amountMinor;
    else adjustmentMinor+=entry.amountMinor;
  }
  return {revenueMinor,expenseMinor,refundMinor,adjustmentMinor,expectedCashMinor:openingBalanceMinor+revenueMinor-expenseMinor-refundMinor+adjustmentMinor};
}

export function assertShiftEntryOwnership(shift:FinanceShiftSnapshot,input:FinanceShiftEntryInput){
  if(shift.status!=='OPEN')throw new Error('FINANCE_SHIFT_NOT_OPEN');
  if(shift.accountantAccountId!==input.recordedByAccountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
  if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)throw new Error('FINANCE_AMOUNT_INVALID');
  if(input.type==='REVENUE'&&input.paymentId==null)throw new Error('FINANCE_REVENUE_PAYMENT_REQUIRED');
  return true;
}

export function assertHandoverTransition(input:{from:FinanceShiftSnapshot;to:FinanceShiftSnapshot;acceptedByAccountId:string}){
  if(input.from.centerOrgUnitId!==input.to.centerOrgUnitId)throw new Error('FINANCE_HANDOVER_CENTER_MISMATCH');
  if(input.from.accountantAccountId===input.to.accountantAccountId)throw new Error('FINANCE_HANDOVER_ACCOUNTANT_INVALID');
  if(input.from.status!=='HANDOVER_PENDING')throw new Error('FINANCE_HANDOVER_NOT_PENDING');
  if(input.to.status!=='OPEN')throw new Error('FINANCE_HANDOVER_RECEIVER_NOT_OPEN');
  if(input.to.accountantAccountId!==input.acceptedByAccountId)throw new Error('FINANCE_HANDOVER_ACCEPTOR_INVALID');
  return true;
}
