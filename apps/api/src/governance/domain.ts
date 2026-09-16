export enum EmploymentRelationship {
  PERMANENT = 'PERMANENT',
  PART_TIME = 'PART_TIME',
  TEMPORARY = 'TEMPORARY',
  SEASONAL = 'SEASONAL',
  COLLABORATOR = 'COLLABORATOR',
}

export enum TrainingDeliveryMode {
  REMOTE = 'REMOTE',
  IN_PERSON = 'IN_PERSON',
  BLENDED = 'BLENDED',
}

export enum EnrollmentSource {
  HYDROLAND_MARKETPLACE = 'HYDROLAND_MARKETPLACE',
  CENTER = 'CENTER',
  INSTRUCTOR_QR = 'INSTRUCTOR_QR',
}

export enum TrainingStageType {
  THEORY = 'THEORY',
  E_LEARNING = 'E_LEARNING',
  CLASSROOM = 'CLASSROOM',
  CONFINED_WATER = 'CONFINED_WATER',
  OPEN_WATER = 'OPEN_WATER',
  ASSESSMENT = 'ASSESSMENT',
  CERTIFICATION = 'CERTIFICATION',
}

export enum SkillProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  INTRODUCED = 'INTRODUCED',
  PRACTICED = 'PRACTICED',
  COMPLETED = 'COMPLETED',
  NEEDS_REASSESSMENT = 'NEEDS_REASSESSMENT',
}

export enum DelayAttribution {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  CENTER = 'CENTER',
  SAFETY_WEATHER = 'SAFETY_WEATHER',
  FACILITY_RESOURCE = 'FACILITY_RESOURCE',
  EXTERNAL_AUTHORITY = 'EXTERNAL_AUTHORITY',
  FORCE_MAJEURE = 'FORCE_MAJEURE',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum GovernanceAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ESCALATE = 'ESCALATE',
  OVERRIDE = 'OVERRIDE',
}

export interface PolicyVersionRef {
  policyId: string;
  version: number;
  effectiveAt: string;
}

export interface ScopedPermission {
  role: string;
  action: GovernanceAction;
  resource: string;
  centerId?: string;
  departmentId?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  conditions?: Record<string, unknown>;
}

export interface ApprovalStepDefinition {
  order: number;
  actorRole: string;
  required: boolean;
  conditions?: Record<string, unknown>;
}

export interface ApprovalWorkflowDefinition {
  id: string;
  name: string;
  resource: string;
  action: string;
  centerId?: string;
  departmentId?: string;
  steps: ApprovalStepDefinition[];
  policy: PolicyVersionRef;
}

export interface TrainingEnrollmentIdentity {
  enrollmentId: string;
  studentId: string;
  centerId: string;
  courseId: string;
  source: EnrollmentSource;
  referredByInstructorId?: string;
  preferredInstructorId?: string;
  assignedInstructorId?: string;
  policy: PolicyVersionRef;
}

export interface SessionEvidence {
  scheduledAt: string;
  studentCheckInAt?: string;
  instructorCheckInAt?: string;
  startedAt?: string;
  endedAt?: string;
  studentGeofenceVerified?: boolean;
  instructorGeofenceVerified?: boolean;
  studentQrVerified?: boolean;
  instructorQrVerified?: boolean;
  offlineCapturedAt?: string;
  synchronizedAt?: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  occurredAt: string;
  reason?: string;
  previousValue?: unknown;
  nextValue?: unknown;
  metadata?: Record<string, unknown>;
}
