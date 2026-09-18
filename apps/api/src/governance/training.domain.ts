import { DelayAttribution, PolicyVersionRef, SessionEvidence, SkillProgressStatus, TrainingDeliveryMode, TrainingEnrollmentIdentity, TrainingStageType } from './domain';

export interface TrainingSkillRecord {
  skillId: string;
  name: string;
  status: SkillProgressStatus;
  signedOffByInstructorId?: string;
  signedOffAt?: string;
  studentAcknowledgedAt?: string;
  studentObjection?: string;
}

export interface TrainingStageRecord {
  id: string;
  type: TrainingStageType;
  deliveryMode: TrainingDeliveryMode;
  progressPercent: number;
  skills: TrainingSkillRecord[];
}

export interface DigitalTrainingRecord {
  id: string;
  enrollment: TrainingEnrollmentIdentity;
  status: 'NOT_STARTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'SUSPENDED';
  progressPercent: number;
  stages: TrainingStageRecord[];
  policy: PolicyVersionRef;
}

export interface TrainingSession {
  id: string;
  trainingRecordId: string;
  stageId: string;
  instructorId: string;
  facilityOrSiteId?: string;
  tripId?: string;
  vesselId?: string;
  evidence: SessionEvidence;
  status: 'SCHEDULED' | 'CHECK_IN_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface ContinuityCase {
  id: string;
  trainingRecordId: string;
  attribution: DelayAttribution;
  protectedReason: boolean;
  warningLevel: 0 | 1 | 2 | 3;
  disputed: boolean;
  status: 'OPEN' | 'RESOLUTION_WINDOW' | 'MANAGEMENT_REVIEW' | 'ADMINISTRATIVE_REVIEW' | 'RESOLVED';
  reason: string;
  resolution?: 'CONTINUE' | 'RESCHEDULE' | 'SUSPEND' | 'TRANSFER_INSTRUCTOR' | 'CANCEL';
}

export interface CourseSuspensionRequest {
  id: string;
  trainingRecordId: string;
  requestedByStudentId: string;
  startsAt: string;
  expectedReturnAt?: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
}

export interface ComplaintCase {
  id: string;
  trainingRecordId: string;
  submittedBy: string;
  category: 'REPEATED_DELAY' | 'PROFESSIONAL_CONDUCT' | 'TRAINING' | 'SAFETY' | 'FINANCIAL' | 'OTHER';
  description: string;
  sensitive: boolean;
  ownerRole?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'AWAITING_RESPONSE' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  dueAt?: string;
}

export interface InstructorTransfer {
  id: string;
  trainingRecordId: string;
  fromInstructorId: string;
  toInstructorId: string;
  reason: string;
  completedSkillIds: string[];
  remainingSkillIds: string[];
  approvedBy: string[];
  transferredAt: string;
}
