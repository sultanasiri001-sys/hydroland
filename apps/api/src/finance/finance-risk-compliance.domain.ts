export type FinanceComplianceSeverity='INFO'|'WARNING'|'HIGH'|'CRITICAL';
export type FinanceComplianceDecision='CLEAR'|'REVIEW_REQUIRED'|'ESCALATION_REQUIRED';

export type FinanceComplianceSignal={
  code:string;
  severity:FinanceComplianceSeverity;
  open:boolean;
  amountMinor?:number;
};

export type FinanceRiskComplianceInput={
  centerOrgUnitId:string;
  unreconciledPaymentCount:number;
  unresolvedVarianceCount:number;
  overdueReceivableMinor:number;
  overduePayableMinor:number;
  unauthorizedAdjustmentCount:number;
  signals:FinanceComplianceSignal[];
};

function count(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_COMPLIANCE_COUNT_INVALID');return value}
function amount(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('FINANCE_COMPLIANCE_AMOUNT_INVALID');return value}

export function evaluateFinanceRiskCompliance(input:FinanceRiskComplianceInput){
  if(!input.centerOrgUnitId?.trim())throw new Error('FINANCE_COMPLIANCE_CENTER_REQUIRED');
  const unreconciled=count(input.unreconciledPaymentCount),variances=count(input.unresolvedVarianceCount),unauthorized=count(input.unauthorizedAdjustmentCount),overdueReceivable=amount(input.overdueReceivableMinor),overduePayable=amount(input.overduePayableMinor);
  const openSignals=input.signals.filter(signal=>signal.open).map(signal=>{
    if(!signal.code?.trim())throw new Error('FINANCE_COMPLIANCE_SIGNAL_INVALID');
    if(signal.amountMinor!==undefined)amount(signal.amountMinor);
    return {...signal,code:signal.code.trim(),amountMinor:signal.amountMinor??null};
  });
  const criticalSignals=openSignals.filter(x=>x.severity==='CRITICAL').length;
  const highSignals=openSignals.filter(x=>x.severity==='HIGH').length;
  let decision:FinanceComplianceDecision='CLEAR';
  if(criticalSignals>0||unauthorized>0)decision='ESCALATION_REQUIRED';
  else if(highSignals>0||unreconciled>0||variances>0||overdueReceivable>0||overduePayable>0)decision='REVIEW_REQUIRED';
  return {centerOrgUnitId:input.centerOrgUnitId,decision,openSignalCount:openSignals.length,criticalSignalCount:criticalSignals,highSignalCount:highSignals,unreconciledPaymentCount:unreconciled,unresolvedVarianceCount:variances,unauthorizedAdjustmentCount:unauthorized,overdueReceivableMinor:overdueReceivable,overduePayableMinor:overduePayable,signals:openSignals};
}

export function assertFinanceComplianceResolution(input:{decision:FinanceComplianceDecision;resolvedBy:string;approvedBy?:string;reason:string}){
  if(!input.resolvedBy?.trim()||!input.reason?.trim()||input.reason.trim().length<10)throw new Error('FINANCE_COMPLIANCE_RESOLUTION_INVALID');
  if(input.decision==='ESCALATION_REQUIRED'){
    if(!input.approvedBy?.trim())throw new Error('FINANCE_COMPLIANCE_APPROVAL_REQUIRED');
    if(input.approvedBy===input.resolvedBy)throw new Error('FINANCE_COMPLIANCE_SOD_VIOLATION');
  }
  return true;
}
