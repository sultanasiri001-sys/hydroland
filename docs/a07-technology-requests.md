# A07 technology requests candidate

This candidate adds durable request workflows for access, changes, incidents and risks. On 13 November 2026, the platform owner adopted D02: the cybersecurity agent prepares the recommendation, verified account 001 approves the exact bounded action, and a deterministic reviewed handler executes it. The narrow employee-free adapters below are implemented and tested; A07 is not operationally accepted until CI, merge, deployment and live scoped acceptance complete.

The existing source of identity, employment, organization membership, document review, IAM and AI-runtime controls remains authoritative. Cases and immutable revision snapshots use namespaced `OperationalSetting` records; each case change, its history and lifecycle `AuditEvent` commit in the same serializable transaction as the native handler. No schema migration is required.

## Workflow

1. The current verified platform owner selects a real, active technology employee and a bounded assignment of at most seven days. The worker must have the existing STAFF role, active employment, position and internal membership. The owner and worker must be different people.
2. The request binds the exact canonical document version, source digest, scope and execution, test and rollback plans. A document version may back only one case. A client request key provides idempotency.
3. Submission and explicit owner approval precede execution. Each operation rechecks the current owner authority, worker appointment, expiry, document and case revision. Revocation stops further worker access.
4. Recording execution requires a matching approved document created by the assigned worker. Access cases additionally bind an actual, unused native IAM audit after approval, and recheck the current account state.
5. The owner records an independent test using a different approved document. Failed tests cannot close a case. Rollbacks need their own evidence and a separate test. A risk-owner acceptance remains distinct from a passed test and includes a future review date.
6. Closure checks current pinned documents and current access state again. History remains available after closure or revocation.

## Employee-free D02 execution paths

The agent output is displayed as advice only. The owner selects an explicit operation from the allowlist, reviews its target and impact, and confirms the exact action. Text from the model is never interpreted as a command. Native handlers provide the system effect and their own audit receipt.

| Operation | Required source | Deterministic handler and verification |
| --- | --- | --- |
| Account access | `TEC-ACCESS-REQUEST` for `PLATFORM_ACCOUNT` | Suspend/reactivate a verified internal account through the native `AdminService`, invalidate sessions, verify the current status and require a separately approved access record. The owner's account is excluded. |
| Technology change | `TEC-CHANGE-REQUEST` for `CYBER_SECURITY` | Pause only the cybersecurity agent through `AgentRuntimeService`. Running work drains; queued tasks stay saved. Verify the paused state with a separate approved `TEC-RELEASE-RECORD`. |
| Incident containment | `TEC-SECURITY-INCIDENT` classified `HIGH` or `CRITICAL`, with `affectedSystem=CYBER_SECURITY` | Pause only the cybersecurity agent through the same native runtime handler. Verify with an approved `TEC-INCIDENT-RESOLUTION` bound to the incident number. Lower classifications are rejected. |
| Risk acceptance | `TEC-SECURITY-REPORT` with event number and supported severity | Record the exact owner-approved risk decision in an immutable case and native audit event. Require a future review date within one year. The case is terminal after acceptance; this records the review date but does not schedule reminders or auto-reopen the risk. |

These adapters do not implement staff appointments, code deployment, arbitrary incident remediation, broad account-role changes, or free-form system settings. The original staff-assisted workflow remains available for other cases and still requires real qualified staff where the source requires it.

## Interface

The owner account menu exposes **تنفيذ توصيات الأمن**. The server independently verifies the current platform owner and all scopes. References are selected from current technology documents and completed, receipt-backed cybersecurity tasks. The client pins revisions, reuses an uncertain create's request key, requires explicit confirmation and clears private views on logout, revocation and stale asynchronous responses.

## Acceptance evidence and remaining gates

- Local API build, strict lint, typecheck and web production build pass.
- Eight domain tests cover invalid authority, bounded inputs, state transitions, rollback, risk ownership, confirmation and integrity.
- The actual HTTP/PostgreSQL suite passes 35 checks on a newly created loopback-only database, using saved password hashes and real sessions. It covers the four original case types, the employee-free adapters, concurrent decisions, target revisions, native receipts and atomic rollback on audit failure; it refuses an existing acceptance database. No production writes or provider calls occur.
- The existing browser cases cover account access; three new cases cover bounded agent pause, high/critical incident containment and owner-approved risk dates. They are included in the PR's Chromium CI; results for the latest source revision are pending.
- A07 remains open until current-source CI, merge, deployment and live scoped acceptance complete. Additional access profiles, staff appointments, general infrastructure changes, incident remediation, risk follow-up automation and privacy/settings remain outside these narrow handlers.

### Adopted D02 decision

The adopted direction is: the cybersecurity agent prepares the case and recommendation; current verified owner account 001 approves the exact action and scope; deterministic handlers execute only the implemented bounded action; any independent approval required by the governing source remains a real, separately evidenced gate. AI text, fictional staff identities and generated signatures cannot replace such a gate. A delegate requires a separate explicit scope and authority record; none is currently adopted.

The original case API remains staff-assisted. The bounded `/technology/agent-access` path implements four limited operations: account suspend/reactivate, pause the cybersecurity agent for a change, pause it for a high/critical incident, and record owner acceptance of a risk with a review date. Each proposal binds a completed `CYBER_SECURITY` `DRAFT_REPORT` task, its original attempt and completion receipt, exact source document, current owner authority and expiry. It requires no employee assignment. The account menu lets the owner select the source/advice, review the target and explicitly approve execution.

`APPROVE_EXECUTE` invokes the existing `AdminService` account handler or `AgentRuntimeService` pause handler inside the same serializable transaction as the case snapshot and audit. A case-audit failure rolls back the native account or runtime mutation. Risk acceptance writes a dedicated native audit decision, also atomically. Exact revisions prevent duplicate concurrent execution. Access and runtime actions require separately approved verification records before closure. Advice, source and target changes block stale approvals.

No new employee, role, delegate, provider credential or production permission was created by this work. Broader execution, automatic risk reminders/reopening and live A07 acceptance remain open.
