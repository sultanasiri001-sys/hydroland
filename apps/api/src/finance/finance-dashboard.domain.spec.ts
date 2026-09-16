import {buildFinanceDashboard,FinanceDashboardSnapshot} from './finance-dashboard.domain';
function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}
const rows:FinanceDashboardSnapshot[]=[
{centerOrgUnitId:'c1',accountantAccountId:'a1',revenueMinor:1000,expenseMinor:100,collectionMinor:900,receivableMinor:100,openShiftCount:1,varianceReviewCount:1},
{centerOrgUnitId:'c1',accountantAccountId:'a2',revenueMinor:2000,expenseMinor:200,collectionMinor:1800,receivableMinor:200,openShiftCount:1,varianceReviewCount:0},
{centerOrgUnitId:'c2',accountantAccountId:'a3',revenueMinor:3000,expenseMinor:300,collectionMinor:2500,receivableMinor:500,openShiftCount:1,varianceReviewCount:2}
];
const accountant=buildFinanceDashboard({scope:{role:'BRANCH_ACCOUNTANT',accountId:'a1',centerOrgUnitId:'c1'},snapshots:rows});eq(accountant.snapshotCount,1,'account isolation');eq(accountant.revenueMinor,1000,'account revenue');
const manager=buildFinanceDashboard({scope:{role:'CENTER_MANAGER',accountId:'m1',centerOrgUnitId:'c1'},snapshots:rows});eq(manager.snapshotCount,2,'center isolation');eq(manager.revenueMinor,3000,'center revenue');
const central=buildFinanceDashboard({scope:{role:'CENTRAL_FINANCE',accountId:'f1'},snapshots:rows});eq(central.snapshotCount,3,'central scope');eq(central.receivableMinor,800,'central AR');
const executive=buildFinanceDashboard({scope:{role:'EXECUTIVE',accountId:'e1'},snapshots:rows});eq(executive.netMinor,5400,'executive net');
throws(()=>buildFinanceDashboard({scope:{role:'CENTER_MANAGER',accountId:'m1'},snapshots:rows}),'FINANCE_DASHBOARD_CENTER_REQUIRED');
console.log('Finance L3 dashboard permission assertions passed.');
