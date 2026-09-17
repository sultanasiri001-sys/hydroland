import {assertFinanceGovernanceApproval,assertPeriodCloseReadiness} from './finance-l4-governance.domain';
import {evaluateFinancePeriodClose} from './finance-period-close.domain';
import {evaluateFinanceExecutiveControl} from './finance-executive-control.domain';
import {evaluateFinanceBudgetControl} from './finance-budget-control.domain';
import {evaluateFinanceTreasuryControl} from './finance-treasury-control.domain';
import {evaluateFinanceForecast} from './finance-forecast-control.domain';
import {evaluateFinanceRiskCompliance,assertFinanceComplianceResolution} from './finance-risk-compliance.domain';

function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function ok(v:unknown,l:string){if(!v)throw new Error(`${l}: expected truthy`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}

const readiness=assertPeriodCloseReadiness({openShiftCount:0,unresolvedVarianceCount:0,unreconciledPaymentCount:0,pendingRefundCount:0});eq(readiness.ready,true,'period readiness');
const period=evaluateFinancePeriodClose({periodType:'MONTH',periodKey:'2026-09',openShiftCount:0,unresolvedVarianceCount:0,unreconciledPaymentCount:0,pendingRefundCount:0,unpostedReceivableCount:0});eq(period.state,'READY','period state');
const approval=assertFinanceGovernanceApproval({action:'APPROVE_PERIOD_CLOSE',requestedBy:'requester',approvals:[{accountId:'finance-1',role:'CENTRAL_FINANCE'},{accountId:'executive-1',role:'EXECUTIVE'}]});eq(approval.approved,true,'governance approval');eq(approval.approvalCount,2,'governance approval count');

const budget=evaluateFinanceBudgetControl({centerOrgUnitId:'center-1',budgetMinor:2000000,committedMinor:200000,spentMinor:500000,requestedMinor:100000,approvalLimitMinor:200000});eq(budget.decision,'ALLOW','budget decision');
const treasury=evaluateFinanceTreasuryControl({centerOrgUnitId:'center-1',availableCashMinor:1000000,expectedInflowsMinor:500000,dueOutflowsMinor:500000,reserveRequirementMinor:500000,overduePayablesMinor:0});eq(treasury.decision,'CLEAR','treasury decision');
const forecast=evaluateFinanceForecast({centerOrgUnitId:'center-1',scenario:'BASE',openingCashMinor:500000,forecastRevenueMinor:500000,forecastExpenseMinor:400000,forecastCollectionsMinor:300000,forecastReceivableMinor:300000,minimumCashReserveMinor:300000});eq(forecast.risk,'LOW','forecast risk');
const compliance=evaluateFinanceRiskCompliance({centerOrgUnitId:'center-1',unreconciledPaymentCount:0,unresolvedVarianceCount:0,overdueReceivableMinor:0,overduePayableMinor:0,unauthorizedAdjustmentCount:0,signals:[]});eq(compliance.decision,'CLEAR','compliance decision');
const executive=evaluateFinanceExecutiveControl({centerOrgUnitId:'center-1',revenueMinor:1500000,expenseMinor:500000,receivableMinor:300000,cashVarianceMinor:0,overdueReceivableMinor:0,unresolvedFindingCount:0,criticalFindingCount:0});eq(executive.decision,'CLEAR','executive decision');

ok(assertFinanceComplianceResolution({decision:'REVIEW_REQUIRED',resolvedBy:'finance-1',reason:'Reviewed and documented evidence'}),'compliance resolution');
throws(()=>assertFinanceGovernanceApproval({action:'APPROVE_WRITE_OFF',requestedBy:'same',approvals:[{accountId:'same',role:'EXECUTIVE'},{accountId:'finance-2',role:'FINANCE_MANAGER'}]}),'FINANCE_GOVERNANCE_SOD_VIOLATION');
throws(()=>assertFinanceComplianceResolution({decision:'ESCALATION_REQUIRED',resolvedBy:'finance-1',approvedBy:'finance-1',reason:'Independent approval is required'}),'FINANCE_COMPLIANCE_SOD_VIOLATION');

console.log('Finance L4 final integration closeout assertions passed.');
