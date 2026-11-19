# C04 persisted customer-case lifecycle

The existing customer-service panel now supports a persisted operating inbox and the requesting customer's resolution decision. The status, assignee, explicit deadline, conversation and audit history are stored in PostgreSQL. A case closes only after its requesting customer accepts a resolved case.

## Authority and scope

- The operating inbox, named assignee directory, assignment, information request, escalation and resolution require the existing active, email-verified `ADMIN` authority. Each operation rechecks this authority inside its database transaction. A designated support role or delegation policy is not inferred from an ordinary `STAFF` role.
- Assignees must also be active, email-verified administrators. The UI selects them by name and email from the authorized directory.
- Resolution is restricted to the assigned administrator. Any authorized administrator may assign, request information or escalate, following the existing workflow helpers.
- Personal customers can act only on their own personal cases. Organization decisions require both the original requesting customer and active write membership in that same active organization. Other organization writers can continue the conversation but cannot accept or object on the requester's behalf. Organization responses expose a server-computed `canRespondToResolution` flag rather than customer account identifiers.
- Cases with reference type `PROVIDER_QUALITY_TRIP_REHEARSAL_V1` retain their independent provider-appeal workflow. Generic staff actions, replies and resolution decisions reject that reference type, and it is excluded from the generic operating inbox.

## Routes

All routes below are relative to `/api/v1` and require an authenticated account.

| Route | Purpose and request body |
| --- | --- |
| `GET /customer-service/admin/cases?page=1&pageSize=20` | Paginated ordinary-case inbox with deadline and overdue state. |
| `GET /customer-service/admin/cases/assignees` | Active, verified administrator names and emails for assignment. |
| `GET /customer-service/admin/cases/:id` | Case, conversation and ordered audit history. |
| `POST /customer-service/admin/cases/:id/assign` | `{ assignedAccountId, dueAt? }`; an initial assignment needs an explicit deadline. |
| `POST /customer-service/admin/cases/:id/wait` | `{ message }`; `ASSIGNED` becomes `WAITING_CUSTOMER`. |
| `POST /customer-service/admin/cases/:id/escalate` | `{ assignedAccountId, message, dueAt? }`; records the escalation route and assigns the follow-up owner. |
| `POST /customer-service/admin/cases/:id/resolve` | `{ message }`; the assigned administrator proposes a resolution. |
| `POST /customer-service/cases/:id/resolution-response` | `{ decision: "ACCEPT" \| "OBJECT", message }` for the requesting personal customer. |
| `POST /organizations/:organizationId/requests/:caseId/resolution-response` | The same decision body for the requesting organization member. |

Existing create/list/reply routes continue to operate. Closed cases reject further replies. There is no administrative close endpoint.

## Deadline and escalation semantics

The nullable `CustomerCase.dueAt` column stores an instant using `TIMESTAMPTZ(3)`. Existing cases retain `null` until an administrator explicitly assigns a deadline. Initial assignment requires a deadline; reassignment and escalation may retain it or supply a new future instant. A supplied deadline must have a valid calendar date, time and explicit timezone. The browser shows and edits the deadline in the device timezone and sends UTC.

The inbox marks a nonclosed case overdue once the stored deadline has passed. It does not silently reset a deadline on escalation, pause elapsed time while waiting for a customer, or close a case when time expires. Standard response/resolution durations and an automatic escalation schedule have not been adopted in the existing project rules; this change provides an explicit per-case mechanism without inventing those business commitments.

Escalation reuses the existing routing rule: safety concerns go to `SAFETY`, payment issues to `FINANCE`, booking issues to `OPERATIONS`, other urgent cases to `CUSTOMER_SERVICE_MANAGER`, and other cases to `CUSTOMER_SERVICE`. The audit records this route, the responsible account, previous/new deadline, actor and time. No external message or notification provider is invoked.

## Resolution and transaction behavior

`RESOLVED` remains pending the requesting customer's decision. `ACCEPT` produces `CLOSED`; `OBJECT` produces `ASSIGNED` and retains the responsible administrator and prior history. Each decision requires a customer message. A new resolution is necessary before accepting an objected case.

Status/assignee/deadline writes, staff or customer interactions, and the corresponding audit event share the existing serializable transaction. Audit failure rolls the entire action back. Concurrent resolution or acceptance requests commit one transition and one interaction/audit event; a retried request observes the new status and fails the workflow guard. Repeating an identical assignment is a no-op without another audit entry.

## Verification

- `apps/api/scripts/customer-case-deadline-migration-db-checks.mjs` applies the actual forward migration in isolated schemas with TEXT and UUID identities. It checks preserved legacy rows, null/no-default semantics, the index, and UTC/Riyadh instant round trips.
- `apps/api/scripts/customer-case-lifecycle-http-e2e.mjs` uses synthetic accounts, real login/API requests and PostgreSQL. It covers role and organization fences, assignee eligibility, impossible/timezone-less dates, deadline changes/overdue state, all supported transitions, requesting-customer decisions, provider-appeal exclusion, concurrent resolution/acceptance, and injected audit-failure rollback with a successful retry.
- `apps/api/scripts/provider-quality-appeals-http-e2e.mjs` remains the separate provider-appeal regression.
- `apps/web/e2e/customer-case-lifecycle.spec.js` exercises the actual panel's named assignment, local-time conversion, wait/escalate/resolve controls, customer decisions, revoked authority and stale responses across session changes. The organization portal regression covers scoped acceptance/objection and the nonrequester restriction. Existing support-session privacy tests remain unchanged.
- API and web workflows execute the new checks. Browser test discovery does not substitute for execution; the Chromium CI gate is required before treating browser acceptance as passed.
