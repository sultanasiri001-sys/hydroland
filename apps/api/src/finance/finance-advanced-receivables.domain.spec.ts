import {buildInstallmentPlan,classifyReceivableAging,receivableAlertLevel} from './finance-advanced-receivables.domain';
function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}
eq(classifyReceivableAging({dueDate:'2026-09-20',asOfDate:'2026-09-17',outstandingMinor:1000}).bucket,'NOT_DUE','not due');
eq(classifyReceivableAging({dueDate:'2026-09-17',asOfDate:'2026-09-17',outstandingMinor:1000}).bucket,'DUE_TODAY','due today');
eq(classifyReceivableAging({dueDate:'2026-06-01',asOfDate:'2026-09-17',outstandingMinor:1000}).bucket,'OVERDUE_90_PLUS','90 plus');
eq(classifyReceivableAging({dueDate:'2026-06-01',asOfDate:'2026-09-17',outstandingMinor:0}).bucket,'SETTLED','settled');
const plan=buildInstallmentPlan({totalMinor:10001,installments:3,firstDueDate:'2026-09-20',intervalDays:30});eq(plan.length,3,'plan count');eq(plan.reduce((s,x)=>s+x.amountMinor,0),10001,'plan sum');eq(plan[1].dueDate,'2026-10-20','second due');
eq(receivableAlertLevel('OVERDUE_90_PLUS'),'CRITICAL','critical');eq(receivableAlertLevel('OVERDUE_1_30'),'ACTION','action');
throws(()=>buildInstallmentPlan({totalMinor:1000,installments:0,firstDueDate:'2026-09-20',intervalDays:30}),'FINANCE_AR_PLAN_COUNT_INVALID');
throws(()=>classifyReceivableAging({dueDate:'2026-02-30',asOfDate:'2026-09-17',outstandingMinor:1000}),'FINANCE_AR_DUE_DATE_INVALID');
console.log('Finance L3 advanced receivables assertions passed.');
