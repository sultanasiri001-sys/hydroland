export type FinanceBranchRole='BRANCH_ACCOUNTANT'|'CENTRAL_FINANCE'|'CENTER_MANAGER'|'EXECUTIVE'|'SYSTEM';

export type FinanceBranchActor={
  accountId:string;
  role:FinanceBranchRole;
  centerId?:string|null;
};

export type FinanceBranchAction=
  |'VIEW_BRANCH_FINANCE'
  |'RECORD_COLLECTION'
  |'REQUEST_REFUND'
  |'OPEN_SHIFT'
  |'SUBMIT_SHIFT_CLOSE'
  |'REVIEW_SHIFT_CLOSE'
  |'APPROVE_SETTLEMENT';

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
    BRANCH_ACCOUNTANT:['VIEW_BRANCH_FINANCE','RECORD_COLLECTION','REQUEST_REFUND','OPEN_SHIFT','SUBMIT_SHIFT_CLOSE'],
    CENTRAL_FINANCE:['VIEW_BRANCH_FINANCE','REVIEW_SHIFT_CLOSE','APPROVE_SETTLEMENT'],
    CENTER_MANAGER:['VIEW_BRANCH_FINANCE','REVIEW_SHIFT_CLOSE'],
    EXECUTIVE:['VIEW_BRANCH_FINANCE','REVIEW_SHIFT_CLOSE','APPROVE_SETTLEMENT'],
    SYSTEM:['VIEW_BRANCH_FINANCE'],
  };
  if(!allowed[actor.role].includes(action))throw new Error('FINANCE_ACTION_DENIED');
  return true;
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
