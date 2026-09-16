import {assertCashierShiftActor,assertFinanceCenterAccess} from './finance-access.domain';
function ok(fn:()=>unknown){fn()}
function denied(fn:()=>unknown,code:string){try{fn()}catch(e){if((e as Error).message===code)return;throw e}throw new Error(`Expected ${code}`)}
const accountant={accountId:'a1',organizationId:'org1',roles:['BRANCH_ACCOUNTANT'],centerScopeIds:['c1'],employmentStatus:'ACTIVE'};
ok(()=>assertFinanceCenterAccess(accountant,{organizationId:'org1',centerId:'c1'}));
denied(()=>assertFinanceCenterAccess(accountant,{organizationId:'org1',centerId:'c2'}),'FINANCE_CENTER_SCOPE_DENIED');
denied(()=>assertFinanceCenterAccess({...accountant,employmentStatus:'SUSPENDED'},{organizationId:'org1',centerId:'c1'}),'FINANCE_EMPLOYMENT_INACTIVE');
denied(()=>assertFinanceCenterAccess({...accountant,roles:['DIVER']},{organizationId:'org1',centerId:'c1'}),'FINANCE_ACCOUNTANT_ROLE_REQUIRED');
ok(()=>assertFinanceCenterAccess({...accountant,roles:['CENTRAL_FINANCE'],centerScopeIds:[]},{organizationId:'org1',centerId:'c9'}));
ok(()=>assertCashierShiftActor(accountant,{accountantAccountId:'a1',centerId:'c1',organizationId:'org1'}));
denied(()=>assertCashierShiftActor(accountant,{accountantAccountId:'a2',centerId:'c1',organizationId:'org1'}),'FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
console.log('Finance access assertions passed.');
