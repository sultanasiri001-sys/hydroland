# A07 technology requests candidate

This candidate adds a durable request workflow for access, changes, incidents and risks. It is a **staff-assisted candidate**, not adoption of the unresolved AI-first authority decision D02, and not full operational acceptance of A07.

The existing source of identity, employment, organization membership, document review and IAM remains authoritative. Cases and immutable revision snapshots use namespaced `OperationalSetting` records; all case changes and their `AuditEvent` commit in the same serializable transaction. No schema migration is required.

## Workflow

1. The current verified platform owner selects a real, active technology employee and a bounded assignment of at most seven days. The worker must have the existing STAFF role, active employment, position and internal membership. The owner and worker must be different people.
2. The request binds the exact canonical document version, source digest, scope and execution, test and rollback plans. A document version may back only one case. A client request key provides idempotency.
3. Submission and explicit owner approval precede execution. Each operation rechecks the current owner authority, worker appointment, expiry, document and case revision. Revocation stops further worker access.
4. Recording execution requires a matching approved document created by the assigned worker. Access cases additionally bind an actual, unused native IAM audit after approval, and recheck the current account state.
5. The owner records an independent test using a different approved document. Failed tests cannot close a case. Rollbacks need their own evidence and a separate test. A risk-owner acceptance remains distinct from a passed test and includes a future review date.
6. Closure checks current pinned documents and current access state again. History remains available after closure or revocation.

## Existing execution paths

The workflow records and verifies execution performed by the existing specialist path; it does not grant an agent arbitrary infrastructure execution or introduce a second IAM engine.

| Case | Formal request | Execution and verification source |
| --- | --- | --- |
| ACCESS | `TEC-ACCESS-REQUEST` | Native `ACCOUNT_STATUS_CHANGED` for suspension/reactivation, or `STAFFING_IAM_APPLIED` for the ordinary STAFF profile. Requested account, system, action, actor, scope, time, session revocation and current state must match. The owner's own access is excluded. |
| CHANGE | `TEC-CHANGE-REQUEST` | Approved `TEC-RELEASE-RECORD` bound to the request reference. |
| INCIDENT | `TEC-SECURITY-INCIDENT` | Approved `TEC-INCIDENT-RESOLUTION` bound to the incident reference. |
| RISK | `TEC-SECURITY-REPORT` | Approved `TEC-INCIDENT-RESOLUTION`; explicit owner risk acceptance records its review date and never reports a failed test as successful. |

Other IAM profiles, automatic deployment, incident-response execution and free-form AI-generated commands are not adopted by this candidate. The existing HR approval path remains necessary for appointments.

## Interface

The account menu exposes **طلبات التقنية والأمن** to active ADMIN/STAFF profiles. The server independently limits owners, eligible assigned workers and case scope. References are selected from scoped, paginated canonical records. The client pins revisions, reuses an uncertain create's request key, and clears private views on logout, revocation and stale asynchronous responses.

## Acceptance evidence and remaining gates

- Local API build and strict lint pass.
- Eight domain tests cover invalid authority, bounded inputs, state transitions, independent execution, rollback, risk ownership, confirmation and integrity.
- The actual HTTP/PostgreSQL suite creates a new, empty loopback database, uses saved password hashes and real sessions, and tests every case type, native IAM receipts, stale access, rollback, concurrency, audit failure and authority revocation. It refuses an existing acceptance database.
- Browser tests cover mobile layout, safe rendering, source selection, revisions, evidence, idempotency, logout and revoked access. Local Chromium cannot start under the current Unix-socket restriction, so actual browser acceptance must come from CI.
- Full A07 remains open until the AI-first recommendation/execution/approval matrix is explicitly adopted, the corresponding execution adapter is reviewed and implemented, the accepted source is deployed, and live scoped acceptance is recorded. A green PR for this staff-assisted candidate does not satisfy those remaining gates.

### Concrete D02 decision to resolve

The proposed AI-first direction is: the cybersecurity agent prepares the case and recommendation; owner 001 or an explicitly scoped delegate approves the exact action; deterministic specialist handlers execute only the approved bounded action; any independent specialist approval required by the governing source remains a real, separately evidenced gate. AI text, fictional staff identities and generated signatures cannot replace such a gate.

The current candidate's human-worker branch must not be silently adopted as the user's zero-staff operating model. No new employee, role, delegate, provider credential or production permission was created by this work.
