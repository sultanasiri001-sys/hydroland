import type { CompensationModel } from './workforce.domain';

export interface PayableEvent {
  id: string;
  personId: string;
  contractId: string;
  centerId: string;
  departmentId?: string;
  costCenterId: string;
  activityType: string;
  activityId: string;
  model: CompensationModel;
  amountMinor: number;
  currency: string;
  status: 'PENDING_VERIFICATION' | 'CALCULATED' | 'CENTER_APPROVED' | 'FINANCE_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';
  referralComponentMinor?: number;
  trainingComponentMinor?: number;
  createdAt: string;
}

export function compensationEventKey(payable: Pick<PayableEvent, 'personId' | 'contractId' | 'activityType' | 'activityId' | 'model'>): string {
  return [payable.personId, payable.contractId, payable.activityType, payable.activityId, payable.model].join(':');
}

export function isValidPayable(payable: Pick<PayableEvent, 'amountMinor' | 'referralComponentMinor' | 'trainingComponentMinor'>): boolean {
  return payable.amountMinor >= 0 && (payable.referralComponentMinor ?? 0) >= 0 && (payable.trainingComponentMinor ?? 0) >= 0;
}
