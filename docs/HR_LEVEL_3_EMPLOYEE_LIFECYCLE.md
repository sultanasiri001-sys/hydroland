# HYDROLAND HR — Level 3: Employee Lifecycle

Status: IMPLEMENTATION BASELINE

## Objective
Create one canonical employee-lifecycle workflow for headquarters and all external centers without duplicating identity, documents, approvals, permissions, notifications, or audit data.

## Single-source-of-truth rules
- Person/Account remain the identity source of truth.
- Employment is separate from Account, ProfessionalRole, credentials, and IAM permissions.
- Center/department assignment is scoped; it never creates a second employee record.
- Documents use the shared Document domain.
- Decisions use the shared approval/review mechanism.
- Permission changes are applied by IAM only after an approved employment event.
- Every sensitive transition produces an immutable AuditEvent.

## Canonical lifecycle
APPOINTED -> ACTIVE -> TRANSFER/PROMOTION/ASSIGNMENT/LEAVE -> ACTIVE -> SUSPENDED/TERMINATED -> OFFBOARDED

## L3 domains
### Employment record
Canonical record linking an employee account to organization/center, department/unit, position, manager, employment type, effective dates, and lifecycle status.

### Contract
Contract metadata belongs to HR; signed evidence remains in the shared document store. Contract renewal/amendment must preserve version history.

### Attendance, leave and shifts
These are operational HR transactions linked to Employment. They must not duplicate Person or Account data.

### Career movement
Transfer, temporary assignment and promotion share one movement workflow:
REQUESTED -> HR_REVIEW -> APPROVAL_REQUIRED -> APPROVED -> EFFECTIVE -> CLOSED.
Rejected/cancelled requests remain auditable.

On EFFECTIVE, HR updates the employment assignment and emits the required IAM scope change. A movement does not directly grant application permissions.

### External-center governance
A Center Manager may initiate a request only within the manager's center scope. HR verifies the request and supporting evidence. Required executive approval occurs before appointment or sensitive movement becomes effective. Center managers cannot self-approve or bypass HR.

### Offboarding boundary
L3 prepares termination/resignation state and effective date. Final settlement, asset clearance, session revocation and full offboarding orchestration are completed in HR Level 4.

## Shared engines — do not duplicate
- Identity: Person + Account
- Credentials: Credential
- Evidence: Document
- Approvals/reviews: shared workflow/review domain
- Notifications: Notification
- Authorization: IAM / scoped RoleAssignment
- Audit: AuditEvent

## Required implementation entities
The schema implementation should add only HR-specific records that do not already exist:
- Employment
- EmploymentContract
- EmploymentMovement
- LeaveRequest
- ShiftAssignment / attendance transaction model as required by scheduling implementation

Organization, center, department and unit references must use the canonical organization hierarchy once that hierarchy is finalized; do not introduce HR-only copies of those entities.

## Acceptance criteria
1. One employee identity can be assigned to a center without creating a duplicate Person/Account.
2. Center Manager cannot approve their own hiring or sensitive movement request.
3. HR verification is mandatory before executive approval where policy requires it.
4. Transfer/promotion/assignment preserves previous assignment history.
5. IAM scope changes occur only after the HR transaction becomes effective.
6. Contract amendments preserve history and evidence.
7. Leave/attendance/shift records reference Employment rather than duplicating employee identity.
8. Termination retains historical HR, financial, evidence, and audit records.
9. All transitions are auditable.
10. The same workflow supports HQ and external centers using scope, not duplicate modules.

## Next implementation step
Map these entities to the canonical organization hierarchy, then add Prisma models and migrations on the consolidation branch. Validate Prisma schema/migration history before any production deployment.