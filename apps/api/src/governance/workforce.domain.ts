import { EmploymentRelationship, PolicyVersionRef } from './domain';

export type ProbationStatus = 'NOT_APPLICABLE' | 'ACTIVE' | 'EVALUATION_DUE' | 'PASSED' | 'EXTENDED' | 'FAILED';
export type ContractStatus = 'DRAFT' | 'UNDER_REVIEW' | 'AWAITING_SIGNATURE' | 'ACTIVE' | 'SUSPENDED' | 'ENDED';
export type CompensationModel = 'MONTHLY' | 'HOURLY' | 'DAILY' | 'PER_TRIP' | 'PER_DIVE' | 'PER_COURSE' | 'PER_STUDENT' | 'REVENUE_SHARE' | 'FIXED_TASK' | 'CUSTOM';

// Identity and professional credentials remain owned by Person/Account/Credential.
// This domain only adds employment semantics that do not already exist there.
export interface WorkforceProfile {
  personId: string;
  homeCenterId: string;
  departmentId?: string;
  relationship: EmploymentRelationship;
  jobTitle: string;
  probationStatus: ProbationStatus;
  active: boolean;
}

export interface SmartContract {
  id: string;
  personId: string;
  centerId: string;
  departmentId?: string;
  jobTitle: string;
  status: ContractStatus;
  compensationModel: CompensationModel;
  compensationRule: Record<string, unknown>;
  startsAt: string;
  endsAt?: string;
  policy: PolicyVersionRef;
  parentContractId?: string;
}

export interface TemporaryAssignment {
  id: string;
  personId: string;
  homeCenterId: string;
  supportingCenterId: string;
  departmentId?: string;
  purpose: string;
  startsAt: string;
  endsAt: string;
  approvedBy: string[];
}
