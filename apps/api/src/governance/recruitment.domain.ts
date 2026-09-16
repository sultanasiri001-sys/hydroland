import { EmploymentRelationship } from './domain';

export type RecruitmentStatus =
  | 'DRAFT'
  | 'SUBMITTED_TO_HR'
  | 'HR_VERIFICATION'
  | 'HR_MANAGER_REVIEW'
  | 'EXECUTIVE_APPROVAL'
  | 'CONTRACTING'
  | 'APPOINTED'
  | 'ACCOUNT_ACTIVATION'
  | 'ACTIVE'
  | 'REJECTED'
  | 'CANCELLED';

export type RecruitmentOrigin = 'CANDIDATE_APPLICATION' | 'CENTER_REQUEST' | 'DEPARTMENT_REQUEST' | 'HR_SOURCING';

export interface RecruitmentRequest {
  id: string;
  origin: RecruitmentOrigin;
  centerId: string;
  departmentId: string;
  requestedJobTitle: string;
  relationship: EmploymentRelationship;
  candidatePersonId?: string;
  requestedBy: string;
  status: RecruitmentStatus;
  requiredCredentialTypes: string[];
  requiredDocumentTypes: string[];
  createdAt: string;
}

export interface RecruitmentVerification {
  requestId: string;
  verifiedBy: string;
  documentsComplete: boolean;
  credentialsEligible: boolean;
  credentialIds: string[];
  documentIds: string[];
  notes?: string;
  verifiedAt: string;
}

export interface AppointmentIntent {
  recruitmentRequestId: string;
  personId: string;
  centerId: string;
  departmentId: string;
  jobTitle: string;
  relationship: EmploymentRelationship;
  contractId?: string;
}

export const RECRUITMENT_SEQUENCE: readonly RecruitmentStatus[] = [
  'SUBMITTED_TO_HR',
  'HR_VERIFICATION',
  'HR_MANAGER_REVIEW',
  'EXECUTIVE_APPROVAL',
  'CONTRACTING',
  'APPOINTED',
  'ACCOUNT_ACTIVATION',
  'ACTIVE',
];

// The sequence describes the default lifecycle, not a hard-coded approval chain.
// ApprovalEngine definitions decide which review stages are required for a given scope.
export function canCenterFinalizeSensitiveAppointment(): false {
  return false;
}
