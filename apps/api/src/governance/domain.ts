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

export enum GovernanceAction {
  VIEW = 'VIEW', CREATE = 'CREATE', EDIT = 'EDIT', APPROVE = 'APPROVE', REJECT = 'REJECT', ESCALATE = 'ESCALATE', OVERRIDE = 'OVERRIDE',
}

export interface PolicyVersionRef {
  policyId: string;
  version: number;
  effectiveAt: string;
  sourceReference?: string;
}

export interface ScopedPermission {
  role: string;
  action: GovernanceAction;
  resource: string;
  centerId?: string;
  departmentId?: string;
  effect: 'ALLOW' | 'DENY';
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
