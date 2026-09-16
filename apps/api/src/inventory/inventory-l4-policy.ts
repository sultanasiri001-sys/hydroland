export type ProcurementActor={accountId:string;role:'CENTER_MANAGER'|'INVENTORY'|'PROCUREMENT'|'FINANCE'|'EXECUTIVE'|'SYSTEM';centerId?:string|null};
export type ProcurementApprovalInput={requestedBy:string;reviewedBy?:string|null;approvedBy?:string|null;receivedBy?:string|null;settledBy?:string|null;amountHalala:number;budgetConfirmed:boolean;centerId?:string|null};

export function assertProcurementAuthority(actor:ProcurementActor,targetCenterId?:string|null){
  if(actor.role==='CENTER_MANAGER'&&(!actor.centerId||actor.centerId!==targetCenterId))throw new Error('PROCUREMENT_CENTER_SCOPE_DENIED');
  if(!['PROCUREMENT','FINANCE','EXECUTIVE','CENTER_MANAGER','SYSTEM'].includes(actor.role))throw new Error('PROCUREMENT_ROLE_DENIED');
  return true;
}

export function assertProcurementApproval(input:ProcurementApprovalInput){
  if(!Number.isSafeInteger(input.amountHalala)||input.amountHalala<0)throw new Error('PROCUREMENT_AMOUNT_INVALID');
  if(!input.budgetConfirmed)throw new Error('PROCUREMENT_BUDGET_CONFIRMATION_REQUIRED');
  if(!input.reviewedBy)throw new Error('PROCUREMENT_REVIEW_REQUIRED');
  if(!input.approvedBy)throw new Error('PROCUREMENT_APPROVAL_REQUIRED');
  const actors=[input.requestedBy,input.reviewedBy,input.approvedBy,input.receivedBy,input.settledBy].filter((v):v is string=>Boolean(v));
  if(new Set(actors).size!==actors.length)throw new Error('PROCUREMENT_SEGREGATION_OF_DUTIES_VIOLATION');
  return true;
}

export type InventoryAiAction='CLASSIFY'|'SUMMARIZE'|'CHECK'|'DRAFT'|'ROUTE'|'PURCHASE'|'WRITE_OFF'|'APPROVE'|'OVERRIDE_SAFETY'|'DELETE_EVIDENCE';
export function assertInventoryAiAuthority(action:InventoryAiAction){
  if(['PURCHASE','WRITE_OFF','APPROVE','OVERRIDE_SAFETY','DELETE_EVIDENCE'].includes(action))throw new Error('INVENTORY_AI_HUMAN_APPROVAL_REQUIRED');
  return true;
}
