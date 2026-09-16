# HYDROLAND Training & Workforce Governance V1

Status: implementation baseline

## Architecture principles

- Multi-center, centrally governed platform.
- Dynamic RBAC + scoped permissions + conditional approval workflows.
- Configurable controls are distinct from mandatory compliance controls.
- Immutable audit trail for sensitive changes, corrections, approvals and transfers.
- Policy/version pinning: each enrollment, contract and workflow retains the policy version effective when created.

## Workforce & contracts

Employment relationships support permanent, part-time, temporary, seasonal and collaborator engagements. Probation is modeled independently so it can apply to applicable employment relationships.

Job titles are configurable/free-form within governed catalogs, allowing titles such as `Collaborating Diving Instructor` without code changes. The effective title propagates to contracts, training, trips, finance, invoices/payables, reporting and permissions.

Contracts support templates, amendments, versioning, electronic acceptance/signature integrations, compensation rules and time-bound access. Compensation may be monthly, hourly, daily, per trip, per dive, per course, per student, revenue share, fixed task or governed custom formula.

## Credentials & eligibility

Operational assignment requires active relationship/contract, valid required credentials, center authorization, role permission and schedule/resource availability. Expired credentials block new professional assignments without deleting historical records.

## Enrollment sources and instructor referral

Enrollment source is explicit and immutable-by-default:

- HYDROLAND marketplace
- Center enrollment
- Instructor QR referral

Each instructor may receive a unique referral token/QR. Referral ownership is separate from instructional assignment. A center may retain the referring instructor, assign another qualified instructor, or transfer the student later. Referral attribution remains preserved for compensation/reporting according to contract policy.

## Student course workspace

Every approved enrollment creates one Digital Training Record visible according to role permissions to student, assigned instructor, training supervisor, center management and HQ.

Delivery modes: remote, in-person and blended.

Training stages can include theory/e-learning, classroom review, confined-water/pool, open-water/sea, assessments and certification completion. Each stage contains milestones and skills with statuses such as not-started, introduced, practiced, completed and needs-reassessment.

Only authorized training personnel can formally sign off skills. Student acknowledgement/objection is stored separately from instructor sign-off.

## Session evidence & attendance

Each training session records scheduled time, participant check-in, instructor check-in, session start/end, attendance, skill outcomes and authorized corrections.

For physical sessions, evidence may combine geofence, QR check-in and timestamps. Location evidence is supporting evidence rather than an automatic final determination. Offline capture must preserve original device event time and later synchronization metadata.

Pool, classroom and dive sites are governed center resources and may be linked to contracts/authorizations.

## Continuity, delays and complaints

Use neutral `Course Continuity & Delay Management` terminology. Delay attribution may be instructor, student, center, safety/weather, facility/resource, external authority, force majeure or pending review.

Protected delays such as unsafe weather/sea conditions do not automatically penalize student or instructor.

Configurable escalation pattern:

1. Warning/notification 1
2. Resolution window
3. Warning/notification 2 + management intervention
4. Warning/notification 3
5. Case review
6. Continue, reschedule, suspend, instructor transfer or cancellation according to policy/contract

No automatic instructor transfer or course cancellation solely because warning 3 was reached. A governed review is required.

Students may request suspension with dates/duration and reason, report training delay, file a formal complaint, request rescheduling and acknowledge/dispute session records according to enabled permissions.

Instructor-to-instructor handover preserves completed skills, remaining requirements, evaluations and transfer reason.

## Dynamic approvals

Approval chains are data-driven and configurable by HQ per platform, center, department, course/activity type and action. Possible actors include student, instructor, training supervisor, center manager, central department and HQ.

Actions expose governed capabilities such as view, create, edit, approve, reject, escalate and override. Temporary delegation and time-bound permissions are supported. Emergency override requires explicit authorization, reason, duration and audit record.

## Inter-center resource support

A generic support engine covers instructors, staff, trip crews, equipment/inventory, vessels where permitted, facilities and other governed resources.

Typical flow:

Requesting department -> requesting center approval -> central functional review -> supporting center confirmation -> HQ approval -> temporary assignment/transfer -> execution -> cost allocation -> return/closure.

Workflows remain configurable. Temporary assignments do not change the worker's home center. Resource conflict checks prevent double-booking.

## Marketplace instructor selection

Marketplace students can select region, center, course and a qualified available instructor. Instructor cards may expose verified qualifications, eligible courses, languages, availability, completed platform activity and verified student ratings.

`Preferred Instructor`, `Assigned Instructor` and `Referred By` are separate fields.

## Cross-cutting controls

- Resource conflict engine
- Policy and contract versioning
- Multi-channel notification abstraction with delivery/read status
- Delegation/acting authority
- Privacy and retention controls for location, complaints and contracts
- Offline-first evidence synchronization where connectivity is weak
- Audit log for all sensitive state changes

## Implementation order

1. Domain model and policy primitives
2. Workforce/contract/credential foundations
3. Training enrollment + referral attribution
4. Digital training record + skills + sessions
5. Attendance/evidence
6. Continuity/delay/complaint cases
7. Dynamic approvals and delegation
8. Inter-center support and resource conflicts
9. Compensation/finance events
10. Student/instructor/center/HQ dashboards and integration tests

This document is the V1 implementation baseline. New scope should be evaluated against it rather than silently expanding core behavior.