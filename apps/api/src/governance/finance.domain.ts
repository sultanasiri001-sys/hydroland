export enum CompensationModel {
  MONTHLY = 'MONTHLY',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  PER_TRIP = 'PER_TRIP',
  PER_DIVE = 'PER_DIVE',
  PER_COURSE = 'PER_COURSE',
  PER_STUDENT = 'PER_STUDENT',
  REVENUE_SHARE = 'REVENUE_SHARE',
  FIXED_TASK = 'FIXED_TASK',
  CUSTOM = 'CUSTOM',
}

export interface PayableEvent {
  id: string;
  personId: string;
  contractId: string;
  centerId: string;
  departmentId: string;
  costCenterId: string;
  activityType: string;
  activityId: string;
  model: CompensationModel;
  amount: number;
  currency: string;
  status: 'PENDING_VERIFICATION' | 'CALCULATED' | 'CENTER_APPROVED' | 'FINANCE_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';
  referralComponent?: number;
  trainingComponent?: number;
  createdAt: string;
}

export function preventDuplicateCompensation(payable: PayableEvent): boolean {
  if (payable.referralComponent == null || payable.trainingComponent == null) return true;
  return payable.referralComponent >= 0 && payable.trainingComponent >= 0;
}
