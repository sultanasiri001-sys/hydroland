import {assertHandoverTransition,assertShiftEntryOwnership,calculateFinanceShiftTotals} from './finance-shift.domain';
function eq<T>(actual:T,expected:T,label:string){if(actual!==expected)throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);}
function err(fn:()=>unknown,code:string){let actual='';try{fn();}catch(e){actual=e instanceof Error?e.message:String(e);}if(actual!==code)throw new Error(`Expected ${code}, got ${actual||'NO_ERROR'}`);}
const shift={id:'s1',centerOrgUnitId:'c1',accountantAccountId:'a1',status:'OPEN' as const,openingBalanceMinor:10000,currency:'SAR'};
const totals=calculateFinanceShiftTotals(10000,[{type:'REVENUE',amountMinor:5000},{type:'EXPENSE',amountMinor:1000},{type:'REFUND',amountMinor:500},{type:'ADJUSTMENT',amountMinor:200}]);
eq(totals.expectedCashMinor,13700,'expected cash');
assertShiftEntryOwnership(shift,{shiftId:'s1',type:'REVENUE',amountMinor:5000,paymentId:'p1',recordedByAccountId:'a1'});
err(()=>assertShiftEntryOwnership(shift,{shiftId:'s1',type:'REVENUE',amountMinor:5000,paymentId:'p1',recordedByAccountId:'a2'}),'FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
err(()=>assertShiftEntryOwnership(shift,{shiftId:'s1',type:'REVENUE',amountMinor:5000,recordedByAccountId:'a1'}),'FINANCE_REVENUE_PAYMENT_REQUIRED');
const from={...shift,status:'HANDOVER_PENDING' as const};
const to={...shift,id:'s2',accountantAccountId:'a2',status:'OPEN' as const};
assertHandoverTransition({from,to,acceptedByAccountId:'a2'});
err(()=>assertHandoverTransition({from,to:{...to,centerOrgUnitId:'c2'},acceptedByAccountId:'a2'}),'FINANCE_HANDOVER_CENTER_MISMATCH');
err(()=>assertHandoverTransition({from,to,acceptedByAccountId:'a3'}),'FINANCE_HANDOVER_ACCEPTOR_INVALID');
console.log('Finance shift execution assertions passed.');
