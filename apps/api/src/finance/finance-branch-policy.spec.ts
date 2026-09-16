import {assertAccountantOwnsShift,assertCashVariance,assertFinanceAiAuthority,assertFinanceBranchAction,assertFinanceBranchScope,assertShiftCloseSegregation,assertShiftHandover,calculateShiftExpectedCash} from './finance-branch-policy';
function assertEqual<T>(actual:T,expected:T,label:string){if(actual!==expected)throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);}
function expectError(fn:()=>unknown,code:string){let actual='';try{fn();}catch(error){actual=error instanceof Error?error.message:String(error);}if(actual!==code)throw new Error(`Expected ${code}, got ${actual||'NO_ERROR'}`);}
const branchAccountant={accountId:'acct-1',role:'BRANCH_ACCOUNTANT' as const,centerId:'center-a'};
assertFinanceBranchScope(branchAccountant,'center-a');
assertFinanceBranchAction(branchAccountant,'RECORD_COLLECTION');
assertFinanceBranchAction(branchAccountant,'RECORD_EXPENSE');
assertFinanceBranchAction(branchAccountant,'SUBMIT_SHIFT_CLOSE');
expectError(()=>assertFinanceBranchScope(branchAccountant,'center-b'),'FINANCE_CENTER_SCOPE_DENIED');
const shift={shiftId:'shift-1',centerId:'center-a',accountantAccountId:'acct-1',status:'OPEN' as const,openingBalanceMinor:10000,revenueMinor:5000,expenseMinor:1000,expectedCashMinor:14000};
assertAccountantOwnsShift(branchAccountant,shift);
expectError(()=>assertAccountantOwnsShift({...branchAccountant,accountId:'acct-2'},shift),'FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
expectError(()=>assertAccountantOwnsShift(branchAccountant,{...shift,status:'HANDOVER_PENDING' as const}),'FINANCE_SHIFT_NOT_OPEN');
assertEqual(calculateShiftExpectedCash({openingBalanceMinor:10000,revenueMinor:7000,expenseMinor:2500}),14500,'expected cash');
assertEqual(assertShiftHandover({fromAccountantId:'acct-1',toAccountantId:'acct-2',fromCenterId:'center-a',toCenterId:'center-a',actualCashMinor:14500,expectedCashMinor:14500,acceptedBy:'acct-2'}),0,'handover variance');
expectError(()=>assertShiftHandover({fromAccountantId:'acct-1',toAccountantId:'acct-1',fromCenterId:'center-a',toCenterId:'center-a',actualCashMinor:14500,expectedCashMinor:14500}),'FINANCE_HANDOVER_ACCOUNTANT_INVALID');
expectError(()=>assertShiftHandover({fromAccountantId:'acct-1',toAccountantId:'acct-2',fromCenterId:'center-a',toCenterId:'center-b',actualCashMinor:14500,expectedCashMinor:14500}),'FINANCE_HANDOVER_CENTER_MISMATCH');
expectError(()=>assertShiftHandover({fromAccountantId:'acct-1',toAccountantId:'acct-2',fromCenterId:'center-a',toCenterId:'center-a',actualCashMinor:14500,expectedCashMinor:14500,acceptedBy:'acct-3'}),'FINANCE_HANDOVER_ACCEPTOR_INVALID');
expectError(()=>assertFinanceBranchAction(branchAccountant,'REVIEW_SHIFT_CLOSE'),'FINANCE_ACTION_DENIED');
expectError(()=>assertFinanceBranchAction(branchAccountant,'APPROVE_SETTLEMENT'),'FINANCE_ACTION_DENIED');
assertShiftCloseSegregation({openedBy:'cashier',submittedBy:'cashier',reviewedBy:'manager',settledBy:'finance'});
expectError(()=>assertShiftCloseSegregation({openedBy:'cashier',submittedBy:'cashier',reviewedBy:'cashier'}),'FINANCE_SHIFT_REVIEW_SOD_VIOLATION');
expectError(()=>assertShiftCloseSegregation({openedBy:'cashier',submittedBy:'cashier',reviewedBy:'manager',settledBy:'manager'}),'FINANCE_SETTLEMENT_SOD_VIOLATION');
assertEqual(assertCashVariance({expectedMinor:10000,actualMinor:10000}),0,'zero variance');
expectError(()=>assertCashVariance({expectedMinor:10000,actualMinor:9500,reason:'short'}),'FINANCE_VARIANCE_REASON_REQUIRED');
assertEqual(assertCashVariance({expectedMinor:10000,actualMinor:9500,reason:'Cash count verified and shortage recorded'}),-500,'cash variance');
assertFinanceAiAuthority('SUMMARIZE');assertFinanceAiAuthority('FORECAST');
for(const action of ['APPROVE_REFUND','SETTLE','WRITE_OFF','ALTER_LEDGER'] as const)expectError(()=>assertFinanceAiAuthority(action),'FINANCE_AI_HUMAN_APPROVAL_REQUIRED');
console.log('Finance branch accounting and shift assertions passed.');
