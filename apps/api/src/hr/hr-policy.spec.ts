import { assertEmploymentTransition, assertHrAuthorization, HrActor } from './hr-policy';

const executive: HrActor = {
  accountId: 'exec-1', roles: ['HR_EXECUTIVE', 'EXECUTIVE_APPROVER'], organizationId: 'org-1', centerScopeIds: ['center-1'],
};
const centerManager: HrActor = {
  accountId: 'mgr-1', roles: ['CENTER_MANAGER'], organizationId: 'org-1', centerScopeIds: ['center-1'],
};
const reviewer: HrActor = {
  accountId: 'hr-1', roles: ['HR_REVIEWER'], organizationId: 'org-1', centerScopeIds: ['center-1'],
};

function expectDenied(fn: () => void, code: string) {
  try { fn(); throw new Error(`EXPECTED_DENIAL:${code}`); }
  catch (error) {
    if (error instanceof Error && error.message === `EXPECTED_DENIAL:${code}`) throw error;
    if (!(error instanceof Error) || !error.message.includes(code)) throw error;
  }
}

// Center scope isolation.
assertHrAuthorization(centerManager, 'STAFFING_REQUEST', { organizationId: 'org-1', centerId: 'center-1' });
expectDenied(() => assertHrAuthorization(centerManager, 'STAFFING_REQUEST', { organizationId: 'org-1', centerId: 'center-2' }), 'HR_CENTER_SCOPE_DENIED');

// HR verification is HR-only.
assertHrAuthorization(reviewer, 'VERIFY_CANDIDATE', { organizationId: 'org-1', centerId: 'center-1' });
expectDenied(() => assertHrAuthorization(centerManager, 'VERIFY_CANDIDATE', { organizationId: 'org-1', centerId: 'center-1' }), 'HR_REVIEW_PERMISSION_REQUIRED');

// Sensitive approval requires executive and separation of duties.
assertHrAuthorization(executive, 'APPROVE_APPOINTMENT', { organizationId: 'org-1', requesterAccountId: 'mgr-1', reviewerAccountId: 'hr-1' });
expectDenied(() => assertHrAuthorization({ ...executive, accountId: 'mgr-1' }, 'APPROVE_APPOINTMENT', { organizationId: 'org-1', requesterAccountId: 'mgr-1' }), 'HR_SELF_APPROVAL_DENIED');
expectDenied(() => assertHrAuthorization({ ...executive, accountId: 'hr-1' }, 'APPROVE_TERMINATION', { organizationId: 'org-1', requesterAccountId: 'mgr-1', reviewerAccountId: 'hr-1' }), 'HR_SEGREGATION_OF_DUTIES_DENIED');

// IAM changes are service-only.
expectDenied(() => assertHrAuthorization(executive, 'APPLY_IAM_CHANGE', { organizationId: 'org-1' }), 'HR_IAM_SERVICE_REQUIRED');
assertHrAuthorization({ accountId: 'iam', roles: ['IAM_SERVICE'], organizationId: 'org-1' }, 'APPLY_IAM_CHANGE', { organizationId: 'org-1' });

// Employment lifecycle is fail-closed.
assertEmploymentTransition('DRAFT', 'PENDING_APPROVAL');
assertEmploymentTransition('PENDING_APPROVAL', 'ACTIVE');
assertEmploymentTransition('ACTIVE', 'ON_LEAVE');
assertEmploymentTransition('ON_LEAVE', 'ACTIVE');
assertEmploymentTransition('ACTIVE', 'TERMINATED');
assertEmploymentTransition('TERMINATED', 'OFFBOARDED');
expectDenied(() => assertEmploymentTransition('DRAFT', 'ACTIVE'), 'HR_INVALID_EMPLOYMENT_TRANSITION');
expectDenied(() => assertEmploymentTransition('OFFBOARDED', 'ACTIVE'), 'HR_INVALID_EMPLOYMENT_TRANSITION');


// Cross-organization access must fail closed.
expectDenied(
  () => assertHrAuthorization({ ...reviewer, organizationId: 'org-2' }, 'VERIFY_CANDIDATE', { organizationId: 'org-1' }),
  'HR_ORGANIZATION_SCOPE_DENIED',
);

// A center-scoped manager cannot act outside the assigned center.
expectDenied(
  () => assertHrAuthorization({ ...centerManager, centerScopeIds: [] }, 'STAFFING_REQUEST', { organizationId: 'org-1', centerId: 'center-1' }),
  'HR_CENTER_SCOPE_DENIED',
);

// Action-level permissions fail closed.
expectDenied(() => assertHrAuthorization(reviewer, 'CHANGE_EMPLOYMENT', { organizationId: 'org-1' }), 'HR_EMPLOYMENT_CHANGE_PERMISSION_REQUIRED');
assertHrAuthorization({ ...reviewer, roles: ['HR_MANAGER'] }, 'CHANGE_EMPLOYMENT', { organizationId: 'org-1' });
expectDenied(() => assertHrAuthorization(reviewer, 'STAFFING_REQUEST', { organizationId: 'org-1' }), 'HR_STAFFING_PERMISSION_REQUIRED');
assertHrAuthorization(centerManager, 'STAFFING_REQUEST', { organizationId: 'org-1', centerId: 'center-1' });
expectDenied(() => assertHrAuthorization(centerManager, 'OPEN_EMPLOYEE_RELATIONS_CASE', { organizationId: 'org-1' }), 'HR_EMPLOYEE_RELATIONS_PERMISSION_REQUIRED');
assertHrAuthorization(reviewer, 'OPEN_EMPLOYEE_RELATIONS_CASE', { organizationId: 'org-1' });

// Any center-scoped HR actor is constrained by assigned centers.
expectDenied(
  () => assertHrAuthorization({ ...reviewer, centerScopeIds: ['center-1'] }, 'VERIFY_CANDIDATE', { organizationId: 'org-1', centerId: 'center-2' }),
  'HR_CENTER_SCOPE_DENIED',
);

// Sensitive approvals require complete separation context.
expectDenied(
  () => assertHrAuthorization(executive, 'APPROVE_APPOINTMENT', { organizationId: 'org-1' }),
  'HR_REQUESTER_REQUIRED',
);
expectDenied(
  () => assertHrAuthorization(executive, 'APPROVE_TERMINATION', { organizationId: 'org-1', requesterAccountId: 'mgr-1' }),
  'HR_SEPARATION_CONTEXT_REQUIRED',
);
assertHrAuthorization(executive, 'APPROVE_TERMINATION', {
  organizationId: 'org-1', requesterAccountId: 'mgr-1', reviewerAccountId: 'hr-1',
});

console.log('HR authorization and employment lifecycle controls validated.');
