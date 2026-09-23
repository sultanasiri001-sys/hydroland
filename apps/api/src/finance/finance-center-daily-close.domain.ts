export type CenterDailyCloseDecision='READY_FOR_REVIEW'|'VARIANCE_REVIEW_REQUIRED'|'BLOCKED';

export type CenterShiftCloseSnapshot={
  shiftId:string;
  centerOrgUnitId:string;
  decision:'READY_FOR_REVIEW'|'VARIANCE_REVIEW_REQUIRED'|'BLOCKED';
  expectedCashMinor:number;
  actualCashMinor:number;
  varianceMinor:number;
  unresolvedPaymentCount:number;
};

export function prepareCenterDailyClose(input:{centerOrgUnitId:string;businessDate:string;shifts:CenterShiftCloseSnapshot[]}){
  if(!input.centerOrgUnitId)throw new Error('FINANCE_CENTER_CLOSE_CENTER_REQUIRED');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.businessDate))throw new Error('FINANCE_CENTER_CLOSE_DATE_INVALID');
  if(input.shifts.length===0)throw new Error('FINANCE_CENTER_CLOSE_SHIFTS_REQUIRED');
  const ids=new Set<string>();
  let expectedCashMinor=0,actualCashMinor=0,varianceMinor=0,unresolvedPaymentCount=0;
  let hasVariance=false,hasBlocked=false;
  for(const shift of input.shifts){
    if(!shift.shiftId||ids.has(shift.shiftId))throw new Error('FINANCE_CENTER_CLOSE_SHIFT_DUPLICATE');
    ids.add(shift.shiftId);
    if(shift.centerOrgUnitId!==input.centerOrgUnitId)throw new Error('FINANCE_CENTER_CLOSE_CROSS_CENTER_DENIED');
    for(const value of [shift.expectedCashMinor,shift.actualCashMinor,shift.unresolvedPaymentCount])if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_CENTER_CLOSE_VALUE_INVALID');
    if(!Number.isSafeInteger(shift.varianceMinor))throw new Error('FINANCE_CENTER_CLOSE_VALUE_INVALID');
    expectedCashMinor+=shift.expectedCashMinor; actualCashMinor+=shift.actualCashMinor; varianceMinor+=shift.varianceMinor; unresolvedPaymentCount+=shift.unresolvedPaymentCount;
    hasVariance ||= shift.decision==='VARIANCE_REVIEW_REQUIRED';
    hasBlocked ||= shift.decision==='BLOCKED'||shift.unresolvedPaymentCount>0;
  }
  const decision:CenterDailyCloseDecision=hasBlocked?'BLOCKED':hasVariance||varianceMinor!==0?'VARIANCE_REVIEW_REQUIRED':'READY_FOR_REVIEW';
  return {centerOrgUnitId:input.centerOrgUnitId,businessDate:input.businessDate,shiftCount:input.shifts.length,expectedCashMinor,actualCashMinor,varianceMinor,unresolvedPaymentCount,decision};
}
