import {prepareAccountantShiftClose} from './finance-shift-close.domain';

function equal(actual:unknown,expected:unknown,label:string){if(actual!==expected)throw new Error(`${label}: expected ${expected}, got ${actual}`);}
function throws(fn:()=>unknown,code:string){try{fn();}catch(error){if(error instanceof Error&&error.message===code)return;throw error;}throw new Error(`Expected ${code}`);}

const base={accountantAccountId:'acc-1',shiftAccountantAccountId:'acc-1',shiftStatus:'OPEN',openingBalanceMinor:10000,revenueMinor:5000,expenseMinor:1000,refundMinor:500,adjustmentMinor:0,actualCashMinor:13500};
equal(prepareAccountantShiftClose(base).decision,'READY_FOR_REVIEW','balanced shift');
equal(prepareAccountantShiftClose({...base,actualCashMinor:13400,varianceReason:'Cash count shortage documented'}).decision,'VARIANCE_REVIEW_REQUIRED','variance shift');
equal(prepareAccountantShiftClose({...base,unresolvedPaymentCount:1}).decision,'BLOCKED','unresolved payment');
throws(()=>prepareAccountantShiftClose({...base,accountantAccountId:'acc-2'}),'FINANCE_SHIFT_CLOSE_ACCOUNT_ISOLATION_DENIED');
throws(()=>prepareAccountantShiftClose({...base,shiftStatus:'HANDOVER_PENDING'}),'FINANCE_SHIFT_CLOSE_REQUIRES_OPEN_SHIFT');
throws(()=>prepareAccountantShiftClose({...base,actualCashMinor:13400}),'FINANCE_SHIFT_CLOSE_VARIANCE_REASON_REQUIRED');

console.log('Finance L3 accountant shift close assertions passed.');
