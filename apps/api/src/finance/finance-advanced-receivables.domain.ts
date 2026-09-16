export type ReceivableAgingBucket='NOT_DUE'|'DUE_TODAY'|'OVERDUE_1_30'|'OVERDUE_31_60'|'OVERDUE_61_90'|'OVERDUE_90_PLUS'|'SETTLED';

export function classifyReceivableAging(input:{dueDate:string;asOfDate:string;outstandingMinor:number}){
  if(!Number.isSafeInteger(input.outstandingMinor)||input.outstandingMinor<0)throw new Error('FINANCE_AR_OUTSTANDING_INVALID');
  const due=parseDate(input.dueDate,'FINANCE_AR_DUE_DATE_INVALID');
  const asOf=parseDate(input.asOfDate,'FINANCE_AR_AS_OF_DATE_INVALID');
  if(input.outstandingMinor===0)return {bucket:'SETTLED' as ReceivableAgingBucket,daysOverdue:0,outstandingMinor:0};
  const days=Math.floor((asOf.getTime()-due.getTime())/86400000);
  const bucket:ReceivableAgingBucket=days<0?'NOT_DUE':days===0?'DUE_TODAY':days<=30?'OVERDUE_1_30':days<=60?'OVERDUE_31_60':days<=90?'OVERDUE_61_90':'OVERDUE_90_PLUS';
  return {bucket,daysOverdue:Math.max(0,days),outstandingMinor:input.outstandingMinor};
}

export function buildInstallmentPlan(input:{totalMinor:number;installments:number;firstDueDate:string;intervalDays:number}){
  if(!Number.isSafeInteger(input.totalMinor)||input.totalMinor<=0)throw new Error('FINANCE_AR_PLAN_TOTAL_INVALID');
  if(!Number.isSafeInteger(input.installments)||input.installments<1||input.installments>24)throw new Error('FINANCE_AR_PLAN_COUNT_INVALID');
  if(!Number.isSafeInteger(input.intervalDays)||input.intervalDays<1)throw new Error('FINANCE_AR_PLAN_INTERVAL_INVALID');
  const first=parseDate(input.firstDueDate,'FINANCE_AR_DUE_DATE_INVALID');
  const base=Math.floor(input.totalMinor/input.installments),remainder=input.totalMinor%input.installments;
  return Array.from({length:input.installments},(_,i)=>({sequence:i+1,amountMinor:base+(i<remainder?1:0),dueDate:new Date(first.getTime()+i*input.intervalDays*86400000).toISOString().slice(0,10)}));
}

export function receivableAlertLevel(bucket:ReceivableAgingBucket){
  if(bucket==='OVERDUE_90_PLUS')return 'CRITICAL';
  if(bucket==='OVERDUE_61_90'||bucket==='OVERDUE_31_60')return 'HIGH';
  if(bucket==='OVERDUE_1_30'||bucket==='DUE_TODAY')return 'ACTION';
  return 'NONE';
}

function parseDate(value:string,code:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error(code);const d=new Date(`${value}T00:00:00.000Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw new Error(code);return d;}
