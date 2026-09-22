export type HrAction =
  | 'STAFFING_REQUEST'
  | 'VERIFY_CANDIDATE'
  | 'APPROVE_APPOINTMENT'
  | 'CHANGE_EMPLOYMENT'
  | 'APPROVE_COMPENSATION_CHANGE'
  | 'OPEN_EMPLOYEE_RELATIONS_CASE'
  | 'APPROVE_DISCIPLINARY_DECISION'
  | 'APPROVE_TERMINATION'
  | 'APPLY_IAM_CHANGE';

export type HrActor = {
  accountId: string;
  roles: string[];
  organizationId: string;
  centerScopeIds?: string[];
};

export type HrRequestContext = {
  organizationId: string;
  centerId?: string;
  requesterAccountId?: string;
  reviewerAccountId?: string;
  approverAccountId?: string;
};

const sensitiveApprovalActions = new Set<HrAction>([
  'APPROVE_APPOINTMENT',
  'APPROVE_COMPENSATION_CHANGE',
  'APPROVE_DISCIPLINARY_DECISION',
  'APPROVE_TERMINATION',
]);

export function assertHrAuthorization(actor: HrActor, action: HrAction, ctx: HrRequestContext): void {
  if (actor.organizationId !== ctx.organizationId) throw new Error('HR_ORGANIZATION_SCOPE_DENIED');

  if (ctx.centerId && actor.centerScopeIds?.length && !actor.centerScopeIds.includes(ctx.centerId)) {
    throw new Error('HR_CENTER_SCOPE_DENIED');
  }

  if (sensitiveApprovalActions.has(action)) {
    if (!actor.roles.some((r) => ['EXECUTIVE_APPROVER', 'HR_EXECUTIVE'].includes(r))) {
      throw new Error('HR_EXECUTIVE_APPROVAL_REQUIRED');
    }
    if (ctx.requesterAccountId && actor.accountId === ctx.requesterAccountId) {
      throw new Error('HR_SELF_APPROVAL_DENIED');
    }
    if (ctx.reviewerAccountId && actor.accountId === ctx.reviewerAccountId) {
      throw new Error('HR_SEGREGATION_OF_DUTIES_DENIED');
    }
  }

  if (action === 'CHANGE_EMPLOYMENT' && !actor.roles.some((r) => ['HR_MANAGER', 'HR_EXECUTIVE'].includes(r))) {
    throw new Error('HR_EMPLOYMENT_CHANGE_PERMISSION_REQUIRED');
  }

  if (action === 'STAFFING_REQUEST' && !actor.roles.some((r) => ['CENTER_MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(r))) {
    throw new Error('HR_STAFFING_PERMISSION_REQUIRED');
  }

  if (action === 'OPEN_EMPLOYEE_RELATIONS_CASE' && !actor.roles.some((r) => ['HR_REVIEWER', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(r))) {
    throw new Error('HR_EMPLOYEE_RELATIONS_PERMISSION_REQUIRED');
  }

  if (action === 'VERIFY_CANDIDATE' && !actor.roles.some((r) => ['HR_REVIEWER', 'HR_MANAGER'].includes(r))) {
    throw new Error('HR_REVIEW_PERMISSION_REQUIRED');
  }

  if (action === 'APPLY_IAM_CHANGE' && !actor.roles.includes('IAM_SERVICE')) {
    throw new Error('HR_IAM_SERVICE_REQUIRED');
  }
}

export function assertEmploymentTransition(from: string, to: string): void {
  const allowed: Record<string, string[]> = {
    DRAFT: ['PENDING_APPROVAL'],
    PENDING_APPROVAL: ['ACTIVE', 'TERMINATED'],
    ACTIVE: ['ON_LEAVE', 'SUSPENDED', 'TERMINATED'],
    ON_LEAVE: ['ACTIVE', 'TERMINATED'],
    SUSPENDED: ['ACTIVE', 'TERMINATED'],
    TERMINATED: ['OFFBOARDED'],
    OFFBOARDED: [],
  };
  if (!allowed[from]?.includes(to)) throw new Error(`HR_INVALID_EMPLOYMENT_TRANSITION:${from}->${to}`);
}
