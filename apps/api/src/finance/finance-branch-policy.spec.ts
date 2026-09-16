import {assertCashVariance,assertFinanceAiAuthority,assertFinanceBranchAction,assertFinanceBranchScope,assertShiftCloseSegregation} from './finance-branch-policy';

describe('finance branch policy',()=>{
  const branchAccountant={accountId:'acct-1',role:'BRANCH_ACCOUNTANT' as const,centerId:'center-a'};

  it('allows a branch accountant inside assigned center',()=>{
    expect(assertFinanceBranchScope(branchAccountant,'center-a')).toBe(true);
    expect(assertFinanceBranchAction(branchAccountant,'RECORD_COLLECTION')).toBe(true);
    expect(assertFinanceBranchAction(branchAccountant,'SUBMIT_SHIFT_CLOSE')).toBe(true);
  });

  it('denies cross-center access',()=>{
    expect(()=>assertFinanceBranchScope(branchAccountant,'center-b')).toThrow('FINANCE_CENTER_SCOPE_DENIED');
  });

  it('prevents branch accountant from reviewing own shift or approving settlement',()=>{
    expect(()=>assertFinanceBranchAction(branchAccountant,'REVIEW_SHIFT_CLOSE')).toThrow('FINANCE_ACTION_DENIED');
    expect(()=>assertFinanceBranchAction(branchAccountant,'APPROVE_SETTLEMENT')).toThrow('FINANCE_ACTION_DENIED');
  });

  it('enforces independent shift review and settlement',()=>{
    expect(assertShiftCloseSegregation({openedBy:'cashier',submittedBy:'cashier',reviewedBy:'manager',settledBy:'finance'})).toBe(true);
    expect(()=>assertShiftCloseSegregation({openedBy:'cashier',submittedBy:'cashier',reviewedBy:'cashier'})).toThrow('FINANCE_SHIFT_REVIEW_SOD_VIOLATION');
    expect(()=>assertShiftCloseSegregation({openedBy:'cashier',submittedBy:'cashier',reviewedBy:'manager',settledBy:'manager'})).toThrow('FINANCE_SETTLEMENT_SOD_VIOLATION');
  });

  it('requires an explanation for cash variance',()=>{
    expect(assertCashVariance({expectedMinor:10000,actualMinor:10000})).toBe(0);
    expect(()=>assertCashVariance({expectedMinor:10000,actualMinor:9500,reason:'short'})).toThrow('FINANCE_VARIANCE_REASON_REQUIRED');
    expect(assertCashVariance({expectedMinor:10000,actualMinor:9500,reason:'Cash count verified and shortage recorded'})).toBe(-500);
  });

  it('keeps sensitive financial actions human-controlled',()=>{
    expect(assertFinanceAiAuthority('SUMMARIZE')).toBe(true);
    expect(assertFinanceAiAuthority('FORECAST')).toBe(true);
    for(const action of ['APPROVE_REFUND','SETTLE','WRITE_OFF','ALTER_LEDGER'] as const){
      expect(()=>assertFinanceAiAuthority(action)).toThrow('FINANCE_AI_HUMAN_APPROVAL_REQUIRED');
    }
  });
});
