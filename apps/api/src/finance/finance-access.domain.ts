export type FinanceAccessActor={
  accountId:string;
  organizationId:string;
  roles:string[];
  centerScopeIds?:string[];
  employmentStatus?:string;
};

const branchRoles=new Set(['BRANCH_ACCOUNTANT','CENTER_ACCOUNTANT']);
const centralRoles=new Set(['CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE']);

export function assertFinanceCenterAccess(actor:FinanceAccessActor,target:{organizationId:string;centerId:string}){
  if(!actor.accountId||!actor.organizationId)throw new Error('FINANCE_ACTOR_IDENTITY_REQUIRED');
  if(actor.organizationId!==target.organizationId)throw new Error('FINANCE_ORGANIZATION_SCOPE_DENIED');
  if(actor.employmentStatus&&actor.employmentStatus!=='ACTIVE')throw new Error('FINANCE_EMPLOYMENT_INACTIVE');
  if(centralRoles.has(actor.roles.find(r=>centralRoles.has(r))??''))return;
  if(!actor.roles.some(r=>branchRoles.has(r)))throw new Error('FINANCE_ACCOUNTANT_ROLE_REQUIRED');
  if(!actor.centerScopeIds?.includes(target.centerId))throw new Error('FINANCE_CENTER_SCOPE_DENIED');
}

export function assertCashierShiftActor(actor:FinanceAccessActor,shift:{accountantAccountId:string;centerId:string;organizationId:string}){
  assertFinanceCenterAccess(actor,{organizationId:shift.organizationId,centerId:shift.centerId});
  if(shift.accountantAccountId!==actor.accountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
}
