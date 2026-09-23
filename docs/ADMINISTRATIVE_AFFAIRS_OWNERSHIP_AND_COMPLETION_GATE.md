# Administrative Affairs — Final Ownership Boundary

## Mission
Administrative Affairs is the platform-wide administrative coordination core. It owns administrative records, correspondence, internal routing, meetings, minutes, administrative decisions, assignments, follow-up, organizational units, delegation metadata, and administrative performance signals.

## Owned capabilities
- Incoming/outgoing correspondence, internal memoranda and circulars.
- Administrative records, document registration, retention/archive lifecycle and reference numbering.
- Administrative meetings, minutes, decisions, action items and follow-up.
- Cross-unit routing, assignment, acknowledgement and decision workflow.
- Administrative unit registry and manager assignment.
- Administrative delegations and acting assignments where they do not grant security/IAM privileges.
- Administrative calendar participation through the platform unified calendar; Administrative Affairs does not create a second calendar source of truth.
- Administrative dashboards, overdue/pending signals and evidence-ready audit trail.

## Explicit boundaries
- HR owns recruitment, employment, compensation, leave, employee relations, discipline and termination.
- Finance owns budgets, accounting, invoices, payments and financial approval controls.
- Legal Governance owns legal interpretation, contracts, regulatory controls and legal retention requirements.
- Executive Governance owns enterprise policy, executive decisions and cross-department governance.
- Technology Security/IAM owns access grants, role activation, session revocation and security controls.
- Facilities & Maintenance owns physical assets, maintenance work and facilities operations.
- Marine Operations owns marine operational execution.
- Safety owns safety/risk controls and incident safety decisions.

Administrative Affairs may route or evidence work from these domains, but must not become the authoritative system for their domain state.

## Mandatory runtime controls
1. Every persisted administrative object is organization-scoped and referentially linked to Organization.
2. Unit, record, routing and meeting actors are persisted Account references.
3. Authenticated account identity is server-derived; clients cannot nominate the acting account.
4. Active organization membership is required for every mutation.
5. Requester cannot approve their own routing; assignee/approver eligibility is checked server-side.
6. Cross-organization and cross-unit scope mismatches fail closed.
7. State transitions use atomic compare-and-set/transaction semantics.
8. Successful sensitive mutations emit AuditEvent in the same transaction.
9. Denied operations do not mutate domain state and do not emit success audit events.
10. Unified calendar integration is the only scheduling source of truth for administrative meetings once calendar integration is enabled.

## Closure gate
Administrative Affairs is CLOSED only after persistence, API/authz, segregation of duties, atomic workflow, audit, E2E denial/success coverage, schema validation, CI gates, merge to main, and post-merge main validation are all green.
