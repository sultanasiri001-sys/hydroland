import {prepareCenterDailyClose} from './finance-center-daily-close.domain';
function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}
const shift=(id:string,variance=0,decision:'READY_FOR_REVIEW'|'VARIANCE_REVIEW_REQUIRED'|'BLOCKED'='READY_FOR_REVIEW',unresolved=0)=>({shiftId:id,centerOrgUnitId:'center-1',decision,expectedCashMinor:1000,actualCashMinor:1000+variance,varianceMinor:variance,unresolvedPaymentCount:unresolved});
const ready=prepareCenterDailyClose({centerOrgUnitId:'center-1',businessDate:'2026-09-17',shifts:[shift('s1'),shift('s2')]});
eq(ready.shiftCount,2,'shift count');eq(ready.expectedCashMinor,2000,'expected');eq(ready.decision,'READY_FOR_REVIEW','ready');
const variance=prepareCenterDailyClose({centerOrgUnitId:'center-1',businessDate:'2026-09-17',shifts:[shift('s1'),shift('s2',-50,'VARIANCE_REVIEW_REQUIRED')]});eq(variance.varianceMinor,-50,'variance');eq(variance.decision,'VARIANCE_REVIEW_REQUIRED','variance decision');
const blocked=prepareCenterDailyClose({centerOrgUnitId:'center-1',businessDate:'2026-09-17',shifts:[shift('s1'),shift('s2',0,'BLOCKED',1)]});eq(blocked.decision,'BLOCKED','blocked');
throws(()=>prepareCenterDailyClose({centerOrgUnitId:'center-1',businessDate:'2026-09-17',shifts:[shift('s1'),shift('s1')]}),'FINANCE_CENTER_CLOSE_SHIFT_DUPLICATE');
throws(()=>prepareCenterDailyClose({centerOrgUnitId:'center-1',businessDate:'2026-09-17',shifts:[{...shift('s1'),centerOrgUnitId:'center-2'}]}),'FINANCE_CENTER_CLOSE_CROSS_CENTER_DENIED');
console.log('Finance L3 center daily close assertions passed.');
