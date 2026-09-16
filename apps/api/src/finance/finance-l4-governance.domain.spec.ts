import {assertFinanceGovernanceApproval,assertPeriodCloseReadiness} from './finance-l4-governance.domain';
function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}
const refund=assertFinanceGovernanceApproval({action:'APPROVE_REFUND',requestedBy:'requester',approvals:[{accountId:'manager',role:'FINANCE_MANAGER'}]});eq(refund.approved,true,'refund approval');
const writeoff=assertFinanceGovernanceApproval({action:'APPROVE_WRITE_OFF',requestedBy:'requester',approvals:[{accountId:'manager',role:'FINANCE_MANAGER'},{accountId:'executive',role:'EXECUTIVE'}]});eq(writeoff.approvalCount,2,'dual write-off approval');
const close=assertFinanceGovernanceApproval({action:'APPROVE_PERIOD_CLOSE',requestedBy:'requester',approvals:[{accountId:'central',role:'CENTRAL_FINANCE'},{accountId:'manager',role:'FINANCE_MANAGER'}]});eq(close.approved,true,'period close approval');
throws(()=>assertFinanceGovernanceApproval({action:'APPROVE_WRITE_OFF',requestedBy:'requester',approvals:[{accountId:'manager',role:'FINANCE_MANAGER'}]}),'FINANCE_GOVERNANCE_APPROVALS_INSUFFICIENT');
throws(()=>assertFinanceGovernanceApproval({action:'ALTER_LEDGER',requestedBy:'requester',approvals:[{accountId:'requester',role:'FINANCE_MANAGER'},{accountId:'executive',role:'EXECUTIVE'}]}),'FINANCE_GOVERNANCE_SOD_VIOLATION');
throws(()=>assertFinanceGovernanceApproval({action:'REOPEN_PERIOD',requestedBy:'requester',approvals:[{accountId:'central',role:'CENTRAL_FINANCE'},{accountId:'executive',role:'EXECUTIVE'}]}),'FINANCE_GOVERNANCE_ROLE_DENIED');
throws(()=>assertFinanceGovernanceApproval({action:'APPROVE_PERIOD_CLOSE',requestedBy:'requester',approvals:[{accountId:'manager',role:'FINANCE_MANAGER'},{accountId:'manager',role:'FINANCE_MANAGER'}]}),'FINANCE_GOVERNANCE_DUPLICATE_APPROVER');
const ready=assertPeriodCloseReadiness({openShiftCount:0,unresolvedVarianceCount:0,unreconciledPaymentCount:0,pendingRefundCount:0});eq(ready.ready,true,'period ready');
const blocked=assertPeriodCloseReadiness({openShiftCount:1,unresolvedVarianceCount:2,unreconciledPaymentCount:0,pendingRefundCount:0});eq(blocked.ready,false,'period blocked');eq(blocked.blockers.length,2,'period blocker count');
throws(()=>assertPeriodCloseReadiness({openShiftCount:-1,unresolvedVarianceCount:0,unreconciledPaymentCount:0,pendingRefundCount:0}),'FINANCE_GOVERNANCE_COUNT_INVALID');
console.log('Finance L4 governance assertions passed.');
