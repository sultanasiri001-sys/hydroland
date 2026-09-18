# HYDROLAND Operations — L1–L4 Canonical Baseline

Status: implementation baseline — active reconciliation. This document does not create a parallel backend; it assigns ownership and governs the existing canonical platform domains.

## L1 — Organization and ownership
Marine Operations owns Trips, Bookings, Crew Assignments and Dive Logs. Inventory & Logistics owns inventory, rental, procurement and transfers. Safety owns safety/risk/incident/operational clearance. Facilities owns assets and maintenance. Finance remains independent for budget confirmation, payment and accounting. HR remains the canonical source for employment and workforce status.

External-center operations are scoped by the master administration. A center manager may initiate operational work only within the assigned center scope; central policies, regulatory controls and master permissions cannot be overridden locally.

## L2 — Planning and readiness
Canonical operational flow:
Booking / schedule → site → vessel → crew qualification and availability → equipment readiness → weather/sea readiness → Safety Gate → Compliance Gate → Operational Clearance.

Readiness consumes existing canonical records and shared engines. It must not copy credentials, employment, vessel, equipment, document, payment or policy records into an Operations-specific duplicate store.

A RED safety or compliance result blocks authorization. Generic permissions cannot override a regulatory or safety block.

## L3 — Execution and control
Authorized trip → start → live operational status → crew/resource tracking → checklist/event logging → incident escalation when required → completion → Dive Logs → customer/operational evidence → financial settlement handoff → close.

Every workflow uses one canonical identifier chain and the common state pattern:
Validate → Route → Review → Approve → Execute → Verify → Close → Audit.

The platform must preserve existing Trip, Booking, CalendarResource, CalendarAllocation, CrewAssignment, SafetyChecklist and DiveLog models/APIs rather than rebuild them.

## L4 — Governance, approvals and analytics
Approval modes are shared platform capabilities: AUTO_APPROVAL, SINGLE, DUAL, SEQUENTIAL, PARALLEL, REGULATORY_REVIEW and MANUAL_REVIEW. Risk routing follows Low → Auto, Medium → Reviewer, High → Reviewer + Approver where applicable.

Sensitive/regulatory/financial actions preserve Maker → Reviewer → Approver segregation. No actor may create, review, approve and execute the same sensitive operation end-to-end.

Operations dashboards read canonical records for active trips, readiness, crew, vessels, weather/sea, safety, incidents and closures. Analytics is read-side only and must not become a second operational source of truth.

## Completion gate
Operations is NOT COMPLETE until:
1. Existing operational schema/API ownership is reconciled against this baseline.
2. No duplicate Trip/Booking/Crew/DiveLog/Safety engines exist.
3. Safety and compliance blocks are fail-closed and cannot be bypassed by generic permissions.
4. Center scope and master-admin controls are enforced in application services.
5. Authorization/start/complete/close transitions are validated and audited.
6. Incident escalation and evidence retention are connected to shared audit/document/notification capabilities.
7. Finance and HR integrations reference canonical records without copying ledgers or employment state.
8. Prisma validation, TypeScript/build and operations policy tests pass before production deployment.

## Validation record
- Branch build check: PASS at `10c5c6069d90a0eaf02d7891a6146f00c58d6508`.
- Canonical operations policy tests are present for fail-closed safety/compliance/weather/crew/resource gates, center scope, and segregation of duties.
- Remaining closure work must validate the full canonical branch against the current shared foundation before merge; no parallel operational engine may be introduced.
