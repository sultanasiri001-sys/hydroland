export type FinanceGovernanceRole='CENTRAL_FINANCE'|'FINANCE_MANAGER'|'EXECUTIVE';
export type FinanceGovernanceAction='APPROVE_REFUND'|'APPROVE_WRITE_OFF'|'APPROVE_PERIOD_CLOSE'|'REOPEN_PERIOD'|'ALTER_LEDGER';
export type FinanceApproval={accountId:string;role:FinanceGovernanceRole};

const limits:Record<FinanceGovernanceAction,{minimumApprovals:number;allowed:readonly FinanceGovernanceRole[]}>= {
  APPROVE_REFUND:{minimumApprovals:1,allowed:['FINANCE_MANAGER','EXECUTIVE']},
  APPROVE_WRITE_OFF:{minimumApprovals:2,allowed:['FINANCE_MANAGER','EXECUTIVE']},
  APPROVE_PERIOD_CLOSE:{minimumApprovals:2,allowed:['CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE']},
  REOPEN_PERIOD:{minimumApprovals:2,allowed:['FINANCE_MANAGER','EXECUTIVE']},
  ALTER_LEDGER:{minimumApprovals:2,allowed:['FINANCE_MANAGER','EXECUTIVE']},
};

export function assertFinanceGovernanceApproval(input:{action:FinanceGovernanceAction;requestedBy:string;approvals:FinanceApproval[]}){
  if(!input.requestedBy?.trim())throw new Error('FINANCE_GOVERNANCE_REQUESTER_REQUIRED');
  const policy=limits[input.action];
  const unique=new Map<string,FinanceApproval>();
  for(const approval of input.approvals){
    if(!approval.accountId?.trim())throw new Error('FINANCE_GOVERNANCE_APPROVER_REQUIRED');
    if(approval.accountId===input.requestedBy)throw new Error('FINANCE_GOVERNANCE_SOD_VIOLATION');
    if(!policy.allowed.includes(approval.role))throw new Error('FINANCE_GOVERNANCE_ROLE_DENIED');
    if(unique.has(approval.accountId))throw new Error('FINANCE_GOVERNANCE_DUPLICATE_APPROVER');
    unique.set(approval.accountId,approval);
  }
  if(unique.size<policy.minimumApprovals)throw new Error('FINANCE_GOVERNANCE_APPROVALS_INSUFFICIENT');
  return {action:input.action,approved:true,approvalCount:unique.size};
}

export function assertPeriodCloseReadiness(input:{openShiftCount:number;unresolvedVarianceCount:number;unreconciledPaymentCount:number;pendingRefundCount:number}){
  for(const value of Object.values(input))if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_GOVERNANCE_COUNT_INVALID');
  const blockers=Object.entries(input).filter(([,value])=>value>0).map(([key])=>key);
  return {ready:blockers.length===0,blockers};
}
