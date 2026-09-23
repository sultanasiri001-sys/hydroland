export type FinanceBranchRole='BRANCH_ACCOUNTANT'|'CENTRAL_FINANCE'|'CENTER_MANAGER'|'EXECUTIVE'|'SYSTEM';

export type FinanceBranchActor={
  accountId:string;
  role:FinanceBranchRole;
  centerId?:string|null;
};

export type FinanceBranchAction=
  |'VIEW_BRANCH_FINANCE'
  |'RECORD_COLLECTION'
  |'RECORD_EXPENSE'
  |'REQUEST_REFUND'
  |'OPEN_SHIFT'
  |'SUBMIT_SHIFT_CLOSE'
  |'HANDOVER_SHIFT'
  |'ACCEPT_SHIFT'
  |'REVIEW_SHIFT_CLOSE'
  |'APPROVE_SETTLEMENT';

export type AccountantShift={
  shiftId:string;
  centerId:string;
  accountantAccountId:string;
  status:'OPEN'|'HANDOVER_PENDING'|'HANDED_OVER'|'CLOSED';
  openingBalanceMinor:number;
  revenueMinor:number;
  expenseMinor:number;
  expectedCashMinor:number;
};

export function assertFinanceBranchScope(actor:FinanceBranchActor,targetCenterId:string){
  if(!targetCenterId?.trim())throw new Error('FINANCE_CENTER_REQUIRED');
  if(actor.role==='BRANCH_ACCOUNTANT'||actor.role==='CENTER_MANAGER'){
    if(!actor.centerId||actor.centerId!==targetCenterId)throw new Error('FINANCE_CENTER_SCOPE_DENIED');
  }
  if(!['BRANCH_ACCOUNTANT','CENTRAL_FINANCE','CENTER_MANAGER','EXECUTIVE','SYSTEM'].includes(actor.role))throw new Error('FINANCE_ROLE_DENIED');
  return true;
}

export function assertFinanceBranchAction(actor:FinanceBranchActor,action:FinanceBranchAction){
  const allowed:Record<FinanceBranchRole,readonly FinanceBranchAction[]>={
    BRANCH_ACCOUNTANT:['VIEW_BRANCH_FINANCE','RECORD_COLLECTION','RECORD_EXPENSE','REQUEST_REFUND','OPEN_SHIFT','SUBMIT_SHIFT_CLOSE','HANDOVER_SHIFT','ACCEPT_SHIFT'],
    CENTRAL_FINANCE:['VIEW_BRANCH_FINANCE','REVIEW_SHIFT_CLOSE','APPROVE_SETTLEMENT'],
    CENTER_MANAGER:['VIEW_BRANCH_FINANCE','REVIEW_SHIFT_CLOSE'],
    EXECUTIVE:['VIEW_BRANCH_FINANCE','REVIEW_SHIFT_CLOSE','APPROVE_SETTLEMENT'],
    SYSTEM:['VIEW_BRANCH_FINANCE'],
  };
  if(!allowed[actor.role].includes(action))throw new Error('FINANCE_ACTION_DENIED');
  return true;
}

export function assertAccountantOwnsShift(actor:FinanceBranchActor,shift:AccountantShift){
  assertFinanceBranchScope(actor,shift.centerId);
  if(actor.role!=='BRANCH_ACCOUNTANT'||actor.accountId!==shift.accountantAccountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
  if(shift.status!=='OPEN')throw new Error('FINANCE_SHIFT_NOT_OPEN');
  return true;
}

export function calculateShiftExpectedCash(input:{openingBalanceMinor:number;revenueMinor:number;expenseMinor:number}){
  for(const amount of [input.openingBalanceMinor,input.revenueMinor,input.expenseMinor])if(!Number.isSafeInteger(amount)||amount<0)throw new Error('FINANCE_AMOUNT_INVALID');
  return input.openingBalanceMinor+input.revenueMinor-input.expenseMinor;
}

export function assertShiftHandover(input:{fromAccountantId:string;toAccountantId:string;fromCenterId:string;toCenterId:string;actualCashMinor:number;expectedCashMinor:number;acceptedBy?:string|null}){
  if(!input.fromAccountantId||!input.toAccountantId||input.fromAccountantId===input.toAccountantId)throw new Error('FINANCE_HANDOVER_ACCOUNTANT_INVALID');
  if(input.fromCenterId!==input.toCenterId)throw new Error('FINANCE_HANDOVER_CENTER_MISMATCH');
  if(!Number.isSafeInteger(input.actualCashMinor)||input.actualCashMinor<0||!Number.isSafeInteger(input.expectedCashMinor))throw new Error('FINANCE_AMOUNT_INVALID');
  if(input.acceptedBy&&input.acceptedBy!==input.toAccountantId)throw new Error('FINANCE_HANDOVER_ACCEPTOR_INVALID');
  return input.actualCashMinor-input.expectedCashMinor;
}

export function assertShiftCloseSegregation(input:{openedBy:string;submittedBy:string;reviewedBy?:string|null;settledBy?:string|null}){
  if(input.openedBy!==input.submittedBy)throw new Error('FINANCE_SHIFT_OPERATOR_MISMATCH');
  if(input.reviewedBy&&input.reviewedBy===input.submittedBy)throw new Error('FINANCE_SHIFT_REVIEW_SOD_VIOLATION');
  if(input.settledBy&&[input.submittedBy,input.reviewedBy].filter(Boolean).includes(input.settledBy))throw new Error('FINANCE_SETTLEMENT_SOD_VIOLATION');
  return true;
}

export function assertCashVariance(input:{expectedMinor:number;actualMinor:number;reason?:string|null}){
  if(!Number.isSafeInteger(input.expectedMinor)||!Number.isSafeInteger(input.actualMinor))throw new Error('FINANCE_AMOUNT_INVALID');
  const variance=input.actualMinor-input.expectedMinor;
  if(variance!==0&&(input.reason?.trim().length??0)<10)throw new Error('FINANCE_VARIANCE_REASON_REQUIRED');
  return variance;
}

export type FinanceAiAction='SUMMARIZE'|'CLASSIFY'|'FORECAST'|'DRAFT'|'ROUTE'|'APPROVE_REFUND'|'SETTLE'|'WRITE_OFF'|'ALTER_LEDGER';

export function assertFinanceAiAuthority(action:FinanceAiAction){
  if(['APPROVE_REFUND','SETTLE','WRITE_OFF','ALTER_LEDGER'].includes(action))throw new Error('FINANCE_AI_HUMAN_APPROVAL_REQUIRED');
  return true;
}
