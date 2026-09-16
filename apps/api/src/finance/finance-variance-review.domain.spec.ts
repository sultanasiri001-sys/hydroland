import {classifyFinanceVariance,reviewFinanceVariance} from './finance-variance-review.domain';
function eq(a:unknown,e:unknown,l:string){if(a!==e)throw new Error(`${l}: expected ${e}, got ${a}`)}
function throws(fn:()=>unknown,c:string){try{fn()}catch(e){if(e instanceof Error&&e.message===c)return;throw e}throw new Error(`Expected ${c}`)}
eq(classifyFinanceVariance(-50,100).severity,'MINOR','minor');
eq(classifyFinanceVariance(100,100).severity,'MATERIAL','material');
const approved=reviewFinanceVariance({submitterAccountId:'accountant',reviewerAccountId:'manager',varianceMinor:-50,varianceReason:'Documented cash shortage',decision:'APPROVED',materialThresholdMinor:100});eq(approved.decision,'APPROVED','approve');
const rejected=reviewFinanceVariance({submitterAccountId:'accountant',reviewerAccountId:'finance',varianceMinor:150,varianceReason:'Documented cash overage',decision:'REJECTED',reviewReason:'Supporting evidence is insufficient',materialThresholdMinor:100});eq(rejected.severity,'MATERIAL','material review');
throws(()=>reviewFinanceVariance({submitterAccountId:'same',reviewerAccountId:'same',varianceMinor:10,varianceReason:'Documented variance',decision:'APPROVED',materialThresholdMinor:100}),'FINANCE_VARIANCE_SOD_DENIED');
throws(()=>reviewFinanceVariance({submitterAccountId:'a',reviewerAccountId:'b',varianceMinor:10,varianceReason:'Documented variance',decision:'REJECTED',materialThresholdMinor:100}),'FINANCE_VARIANCE_REJECTION_REASON_REQUIRED');
throws(()=>reviewFinanceVariance({submitterAccountId:'a',reviewerAccountId:'b',varianceMinor:0,varianceReason:'Documented variance',decision:'APPROVED',materialThresholdMinor:100}),'FINANCE_VARIANCE_REVIEW_NOT_REQUIRED');
console.log('Finance L3 variance review assertions passed.');
