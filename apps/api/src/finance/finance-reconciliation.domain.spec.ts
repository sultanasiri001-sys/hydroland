import {reconcileFinanceShift} from './finance-reconciliation.domain';

function equal(actual:unknown,expected:unknown,label:string){if(actual!==expected)throw new Error(`${label}: expected ${expected}, got ${actual}`);}
function throws(fn:()=>unknown,code:string){try{fn();}catch(error){if(error instanceof Error&&error.message===code)return;throw error;}throw new Error(`Expected ${code}`);}

const matched=reconcileFinanceShift({openingBalanceMinor:10000,revenueMinor:5000,expenseMinor:1000,refundMinor:500,adjustmentMinor:250,actualCashMinor:13750});
equal(matched.expectedCashMinor,13750,'expected cash');
equal(matched.varianceMinor,0,'matched variance');
equal(matched.status,'MATCHED','matched status');

const variance=reconcileFinanceShift({openingBalanceMinor:10000,revenueMinor:5000,expenseMinor:1000,refundMinor:500,adjustmentMinor:0,actualCashMinor:13400});
equal(variance.varianceMinor,-100,'short cash variance');
equal(variance.status,'VARIANCE','variance status');

const blocked=reconcileFinanceShift({openingBalanceMinor:0,revenueMinor:5000,expenseMinor:0,refundMinor:0,adjustmentMinor:0,actualCashMinor:5000,unresolvedPaymentCount:1});
equal(blocked.status,'BLOCKED','unresolved payment blocks reconciliation');

throws(()=>reconcileFinanceShift({openingBalanceMinor:0,revenueMinor:0,expenseMinor:1,refundMinor:0,adjustmentMinor:0,actualCashMinor:0}),'FINANCE_RECON_EXPECTED_NEGATIVE');
throws(()=>reconcileFinanceShift({openingBalanceMinor:0,revenueMinor:0,expenseMinor:0,refundMinor:0,adjustmentMinor:0,actualCashMinor:0,unresolvedPaymentCount:-1}),'FINANCE_RECON_UNRESOLVED_INVALID');

console.log('Finance L3 reconciliation assertions passed.');
