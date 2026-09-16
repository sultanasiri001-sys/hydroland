import {assertFinanceAiAuthority,assertFinanceBranchAction,assertShiftCloseSegregation} from './finance-branch-policy';
import {reconcileFinanceShift} from './finance-reconciliation.domain';
import {prepareAccountantShiftClose} from './finance-shift-close.domain';
import {prepareCenterDailyClose} from './finance-center-daily-close.domain';
import {reviewFinanceVariance} from './finance-variance-review.domain';
import {classifyReceivableAging,buildInstallmentPlan} from './finance-advanced-receivables.domain';
import {buildFinanceReport} from './finance-reporting.domain';
import {buildFinanceDashboard} from './finance-dashboard.domain';
function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}
const recon=reconcileFinanceShift({openingBalanceMinor:10000,revenueMinor:5000,expenseMinor:1000,refundMinor:500,adjustmentMinor:0,actualCashMinor:13500});eq(recon.status,'MATCHED','reconciliation');
const shift=prepareAccountantShiftClose({accountantAccountId:'a1',shiftAccountantAccountId:'a1',shiftStatus:'OPEN',openingBalanceMinor:10000,revenueMinor:5000,expenseMinor:1000,refundMinor:500,adjustmentMinor:0,actualCashMinor:13500});eq(shift.decision,'READY_FOR_REVIEW','shift close');
const center=prepareCenterDailyClose({centerOrgUnitId:'c1',businessDate:'2026-09-17',shifts:[{shiftId:'s1',centerOrgUnitId:'c1',decision:'READY_FOR_REVIEW',expectedCashMinor:13500,actualCashMinor:13500,varianceMinor:0,unresolvedPaymentCount:0}]});eq(center.decision,'READY_FOR_REVIEW','center close');
const variance=reviewFinanceVariance({submitterAccountId:'a1',reviewerAccountId:'m1',varianceMinor:-100,varianceReason:'Verified shortage with supporting record',decision:'APPROVED',materialThresholdMinor:500});eq(variance.decision,'APPROVED','variance review');
eq(classifyReceivableAging({dueDate:'2026-09-01',asOfDate:'2026-09-17',outstandingMinor:1000}).bucket,'OVERDUE_1_30','aging');eq(buildInstallmentPlan({totalMinor:1000,installments:2,firstDueDate:'2026-09-20',intervalDays:30}).length,2,'installments');
const report=buildFinanceReport({fromDate:'2026-09-01',toDate:'2026-09-30',entries:[{centerOrgUnitId:'c1',serviceCode:'DIVE',businessDate:'2026-09-17',revenueMinor:5000,expenseMinor:1000,collectionMinor:4000,receivableMinor:1000}]});eq(report.netMinor,4000,'report net');
const dash=buildFinanceDashboard({scope:{role:'CENTER_MANAGER',accountId:'m1',centerOrgUnitId:'c1'},snapshots:[{centerOrgUnitId:'c1',accountantAccountId:'a1',revenueMinor:5000,expenseMinor:1000,collectionMinor:4000,receivableMinor:1000,openShiftCount:1,varianceReviewCount:1}]});eq(dash.snapshotCount,1,'dashboard');
assertFinanceBranchAction({accountId:'a1',role:'BRANCH_ACCOUNTANT',centerId:'c1'},'SUBMIT_SHIFT_CLOSE');throws(()=>assertFinanceBranchAction({accountId:'a1',role:'BRANCH_ACCOUNTANT',centerId:'c1'},'APPROVE_SETTLEMENT'),'FINANCE_ACTION_DENIED');
assertShiftCloseSegregation({openedBy:'a1',submittedBy:'a1',reviewedBy:'m1',settledBy:'f1'});throws(()=>assertShiftCloseSegregation({openedBy:'a1',submittedBy:'a1',reviewedBy:'a1'}),'FINANCE_SHIFT_REVIEW_SOD_VIOLATION');
throws(()=>assertFinanceAiAuthority('SETTLE'),'FINANCE_AI_HUMAN_APPROVAL_REQUIRED');throws(()=>reviewFinanceVariance({submitterAccountId:'a1',reviewerAccountId:'a1',varianceMinor:100,varianceReason:'Verified variance with supporting record',decision:'APPROVED',materialThresholdMinor:500}),'FINANCE_VARIANCE_SOD_DENIED');
console.log('Finance L3 closeout integration assertions passed.');
