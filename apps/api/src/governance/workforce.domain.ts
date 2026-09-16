import { EmploymentRelationship, PolicyVersionRef } from './domain';

export type ProbationStatus = 'NOT_APPLICABLE' | 'ACTIVE' | 'EVALUATION_DUE' | 'PASSED' | 'EXTENDED' | 'FAILED';
export type CredentialStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED' | 'REJECTED';
export type ContractStatus = 'DRAFT' | 'UNDER_REVIEW' | 'AWAITING_SIGNATURE' | 'ACTIVE' | 'SUSPENDED' | 'ENDED';
export type CompensationModel = 'MONTHLY' | 'HOURLY' | 'DAILY' | 'PER_TRIP' | 'PER_DIVE' | 'PER_COURSE' | 'PER_STUDENT' | 'REVENUE_SHARE' | 'FIXED_TASK' | 'CUSTOM';
export type SupportResourceType = 'INSTRUCTOR' | 'EMPLOYEE' | 'TRIP_CREW' | 'EQUIPMENT' | 'INVENTORY' | 'VESSEL' | 'VEHICLE' | 'FACILITY' | 'OTHER';

export interface WorkforceProfile {
  personId: string;
  homeCenterId: string;
  departmentId?: string;
  relationship: EmploymentRelationship;
  jobTitle: string;
  probationStatus: ProbationStatus;
  active: boolean;
}

export interface ProfessionalCredential {
  id: string;
  personId: string;
  credentialType: string;
  issuer: string;
  referenceNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  status: CredentialStatus;
  verifiedBy?: string;
  verifiedAt?: string;
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

export interface InterCenterSupportRequest {
  id: string;
  requestingCenterId: string;
  requestingDepartmentId: string;
  supportingCenterId?: string;
  resourceType: SupportResourceType;
  quantity: number;
  requirements?: Record<string, unknown>;
  startsAt: string;
  endsAt: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';
  reason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'AWAITING_SUPPORTING_CENTER' | 'AWAITING_HQ' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'RETURN_DUE' | 'COMPLETED';
  costAllocation?: Record<string, unknown>;
}
