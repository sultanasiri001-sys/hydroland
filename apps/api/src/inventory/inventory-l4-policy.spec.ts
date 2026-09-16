import {assertInventoryAiAuthority,assertProcurementApproval,assertProcurementAuthority} from './inventory-l4-policy';
function expectError(fn:()=>unknown,code:string){let actual='';try{fn();}catch(error){actual=error instanceof Error?error.message:String(error);}if(actual!==code)throw new Error(`Expected ${code}, got ${actual||'NO_ERROR'}`);}
assertProcurementAuthority({accountId:'cm1',role:'CENTER_MANAGER',centerId:'c1'},'c1');
expectError(()=>assertProcurementAuthority({accountId:'cm1',role:'CENTER_MANAGER',centerId:'c1'},'c2'),'PROCUREMENT_CENTER_SCOPE_DENIED');
assertProcurementApproval({requestedBy:'maker',reviewedBy:'reviewer',approvedBy:'approver',receivedBy:'receiver',settledBy:'finance',amountHalala:100000,budgetConfirmed:true});
expectError(()=>assertProcurementApproval({requestedBy:'maker',reviewedBy:'reviewer',approvedBy:'maker',amountHalala:100,budgetConfirmed:true}),'PROCUREMENT_SEGREGATION_OF_DUTIES_VIOLATION');
expectError(()=>assertProcurementApproval({requestedBy:'maker',reviewedBy:'reviewer',approvedBy:'approver',amountHalala:100,budgetConfirmed:false}),'PROCUREMENT_BUDGET_CONFIRMATION_REQUIRED');
assertInventoryAiAuthority('SUMMARIZE');assertInventoryAiAuthority('ROUTE');
for(const action of ['PURCHASE','WRITE_OFF','APPROVE','OVERRIDE_SAFETY','DELETE_EVIDENCE'] as const)expectError(()=>assertInventoryAiAuthority(action),'INVENTORY_AI_HUMAN_APPROVAL_REQUIRED');
console.log('Inventory L4 governance assertions passed.');
