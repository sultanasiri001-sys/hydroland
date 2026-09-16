import {applyReceivablePayment,assertCreditInvoice,receivableStatus} from './finance-receivables.domain';

function equal<T>(actual:T,expected:T,label:string){if(actual!==expected)throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`)}
function throws(fn:()=>unknown,code:string){try{fn()}catch(e){if((e as Error).message===code)return;throw e}throw new Error(`Expected ${code}`)}

const paid=assertCreditInvoice({totalMinor:200000,paidMinor:200000});
equal(paid.mode,'PAID_NOW','paid invoice');
equal(paid.outstandingMinor,0,'paid balance');

const partial=assertCreditInvoice({totalMinor:300000,paidMinor:100000,dueAt:new Date('2026-10-17'),creditLimitMinor:250000});
equal(partial.mode,'PARTIAL','partial invoice');
equal(partial.outstandingMinor,200000,'partial balance');

const credit=assertCreditInvoice({totalMinor:150000,paidMinor:0,dueAt:new Date('2026-10-17'),creditLimitMinor:200000});
equal(credit.mode,'CREDIT','credit invoice');
throws(()=>assertCreditInvoice({totalMinor:150000,paidMinor:0}),'FINANCE_DUE_DATE_REQUIRED');
throws(()=>assertCreditInvoice({totalMinor:300000,paidMinor:0,dueAt:new Date('2026-10-17'),creditLimitMinor:200000}),'FINANCE_CREDIT_LIMIT_EXCEEDED');

const payment=applyReceivablePayment(200000,50000);
equal(payment.remainingMinor,150000,'installment balance');
equal(payment.status,'PARTIALLY_PAID','installment status');
equal(receivableStatus(150000,new Date('2026-09-01'),new Date('2026-09-17')),'OVERDUE','overdue status');

console.log('Finance receivables assertions passed.');
