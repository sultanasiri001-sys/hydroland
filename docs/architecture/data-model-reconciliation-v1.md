# Platform Data Model Reconciliation v1

Status: Active reconciliation against the approved platform architecture.

## Rule
Existing production-shaped data is preserved unless a model is proven redundant. Similar names are not sufficient reason to delete data. Destructive changes require a migration and reference audit.

## Existing schema baseline
The current Prisma schema contains 73 models and 41 enums.

### Keep and align
- Person / Account / Session: canonical identity foundation.
- Organization / OrganizationMember / OrgUnit: canonical organization foundation.
- ProfessionalProfile / Credential / Document: retain and extend rather than duplicate.
- RoleAssignment: retain as the current multi-role assignment mechanism.
- Trip / Booking / BookingParticipant: retain as the current trip-booking core.
- Payment / Invoice: retain as booking payment records.
- FinanceAccount / FinanceEntry / FinanceApproval: retain for ledger/approval concerns; do not merge with Payment.
- TrainingEnrollment / TrainingRecord / TrainingStage / TrainingSkill / TrainingSession: retain as training foundation.
- MarineAsset / MarineAssetDocument / MarineMaintenanceRecord / MarineReadinessSnapshot: retain as marine asset foundation.
- AuditEvent: retain and extend; do not create a second audit table.
- CustomerCase / CustomerInteraction: retain for support cases; future real-time Conversation/Message remains a separate concern.
- OfflineTripPackage: retain and extend for offline navigation packages.

### Legacy terminology requiring migration, not blind duplication
- ProfessionalRole.INSTRUCTOR -> UI/domain term DIVING_PROFESSIONAL.
- ProfessionalRole.BOAT_OWNER -> UI/domain term MARINE_OPERATOR / marine portal.
- BoatResourceCompliance + CalendarResource represent legacy boat/resource concepts. They must be mapped to MarineAsset before any deletion.
- Trip.type is currently free text; target is controlled marine activity types.
- Organization.kind is currently free text; target is controlled organization types.

## Missing approved MVP data domains
These are not represented as first-class Prisma models in the current schema and must be added in controlled migrations:
1. Marine locations and two-stage approval:
   MarineLocation, MarineLocationRevision, MarineLocationMedia, LocationCenterReview, LocationAdminReview.
2. Navigation:
   MarineRoute, Waypoint, NavigationSession, Track, TrackPoint.
3. Safety incident operations:
   Incident, EmergencyCase, DiverAccountabilityEvent, BuddyTeam.
4. Executive Office:
   ManagementDecision, ExecutiveTask, FollowUpRecord, TaskEvidence, ExecutiveBrief.
5. Identity hardening:
   TrustedDevice, MfaMethod, explicit Permission/RolePermission or equivalent permission policy store.
6. Financial completion:
   Refund, ProviderEarning, Settlement, FinancialDispute.
7. Communication:
   Conversation, ConversationMember, Message, MessageAttachment.
8. Domain event reliability:
   DomainEvent/EventOutbox (or one canonical outbox model).
9. Equipment/inventory/rental models required by the approved MVP scope where no equivalent exists.

## Post-MVP domains
Do not force these into the MVP migration solely because they appear in the long-term architecture:
- full multi-vendor marketplace expansion
- advanced corporate procurement/RFQ
- advanced AI agent persistence
- advanced parts marketplace
- advanced forecasting warehouse

## Duplicate policy
Do not delete the following pairs as duplicates because they represent different accounting/business concerns:
- Payment vs StorePayment
- Invoice vs StoreInvoice
- Payment vs FinanceEntry
- CustomerCase vs future Conversation
- Credential vs Document
- MarineMaintenanceRecord vs future WorkOrder

Potential consolidation candidates that require reference/migration audit:
- BoatResourceCompliance -> MarineAsset compliance/document/readiness structures.
- CalendarResource for vessel resources -> MarineAsset + assignment/calendar linkage.
- legacy role labels BOAT_OWNER and INSTRUCTOR -> canonical role labels.

## Reconciliation order
R1 Foundation observability/environment validation.
R2 Identity and role terminology/permissions.
R3 MarineLocation + approval workflow.
R4 MarineAsset legacy consolidation.
R5 Trip activity normalization.
R6 Safety incident/accountability.
R7 Navigation/offline route/track.
R8 Executive Office.
R9 Finance completion.
R10 Communication.
R11 Inventory/equipment/rental.
R12 Event outbox and analytics hooks.

## Acceptance rule
For each reconciliation unit:
1. map existing models and references;
2. add/alter schema;
3. create forward migration;
4. preserve existing data;
5. update API/services;
6. add regression tests;
7. run CI;
8. merge through PR only.

No table or field is removed merely because it looks duplicated.


## R2 Identity & Role Reconciliation — audit result

### Verified existing behavior
- Account authentication uses short-lived signed access tokens and hashed refresh sessions.
- Refresh rotation revokes the consumed session.
- RoleAssignment already supports multiple roles per account and a JSON scope.
- Governance already defines ScopedPermission as a domain contract.
- AdminGuard and ReviewGuard currently authorize by hard-coded role checks.

### Required reconciliation
1. Keep Person + Account; do not introduce a duplicate User table.
2. Keep RoleAssignment as the canonical account-role relationship.
3. Preserve legacy enum values during migration; expose canonical UI/domain labels first:
   - INSTRUCTOR => DIVING_PROFESSIONAL
   - BOAT_OWNER => MARINE_OPERATOR
4. Replace endpoint-specific hard-coded role guards over time with a reusable permission/scope guard backed by one canonical permission policy.
5. Add TrustedDevice and MfaMethod before marking Identity & Security complete.
6. Extend Session with device/security metadata only through a forward migration; do not replace Session.
7. Active-role switching is an application/session context concern and must validate that the account owns an ACTIVE RoleAssignment.
8. Organization membership and RoleAssignment remain separate: organization membership answers "which organization?" while role assignment answers "what capability/role?".
9. REVIEWER remains an internal approval capability until the permission model replaces direct role coupling.

### Duplication decision
Do not add a second roles table merely to match the target blueprint. The existing RoleAssignment + governance ScopedPermission are the migration starting point. A persisted Permission/RolePermission model is only justified if the policy cannot be represented safely by the existing governance policy store.

### Security gaps retained for implementation
- MFA persistence and challenge flow.
- Trusted-device registry and session/device linkage.
- reusable RBAC + ABAC permission enforcement.
- active-role selection and validation.
- cross-organization authorization regression tests.
- durable/distributed login throttling for multi-instance production (current in-memory attempt map is process-local).
