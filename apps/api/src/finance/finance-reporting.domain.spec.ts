import {buildFinanceReport,groupFinanceReport,FinanceReportEntry} from './finance-reporting.domain';
function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}
const rows:FinanceReportEntry[]=[
{centerOrgUnitId:'c1',serviceCode:'DIVE',businessDate:'2026-09-01',revenueMinor:1000,expenseMinor:200,collectionMinor:800,receivableMinor:200},
{centerOrgUnitId:'c1',serviceCode:'RENTAL',businessDate:'2026-09-02',revenueMinor:500,expenseMinor:100,collectionMinor:500,receivableMinor:0},
{centerOrgUnitId:'c2',serviceCode:'DIVE',businessDate:'2026-09-03',revenueMinor:2000,expenseMinor:400,collectionMinor:1500,receivableMinor:500}
];
const all=buildFinanceReport({fromDate:'2026-09-01',toDate:'2026-09-30',entries:rows});eq(all.revenueMinor,3500,'revenue');eq(all.expenseMinor,700,'expense');eq(all.netMinor,2800,'net');
const center=buildFinanceReport({fromDate:'2026-09-01',toDate:'2026-09-30',centerOrgUnitId:'c1',entries:rows});eq(center.rowCount,2,'center rows');eq(center.receivableMinor,200,'center AR');
const service=buildFinanceReport({fromDate:'2026-09-01',toDate:'2026-09-30',serviceCode:'DIVE',entries:rows});eq(service.revenueMinor,3000,'service revenue');
const grouped=groupFinanceReport(rows,'CENTER');eq(grouped.length,2,'center groups');eq(grouped[0].key,'c1','first center');
throws(()=>buildFinanceReport({fromDate:'2026-09-30',toDate:'2026-09-01',entries:rows}),'FINANCE_REPORT_DATE_RANGE_INVALID');
throws(()=>buildFinanceReport({fromDate:'2026-09-01',toDate:'2026-09-30',entries:[{...rows[0],revenueMinor:-1}]}),'FINANCE_REPORT_VALUE_INVALID');
console.log('Finance L3 reporting assertions passed.');
