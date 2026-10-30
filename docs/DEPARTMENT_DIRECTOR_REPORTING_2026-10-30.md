# HYDROLAND department director reporting

Sultan's approved reporting line is: each of the fourteen AI department directors reports to the Governance, Compliance and Quality Office; the office records its findings; Abdullah formats those outcomes into one report for the platform owner's verified email. Final business approval remains with Sultan.

## Director identities

Five existing identities now own their respective departments; nine director identities are added. Existing tasks and identities are preserved. The catalog consequently contains 23 agents: fourteen directors, Abdullah, the existing sales/social specialists and the six office reviewers. Abdullah is separate from the executive department's director.

| Department | Director key |
| --- | --- |
| Human Resources | HR_DIRECTOR |
| Training | TRAINING_DIRECTOR |
| Marine Operations | MARINE_DIRECTOR |
| Inventory and Logistics | INVENTORY |
| Finance | FINANCE_DIRECTOR |
| Safety, Compliance and Risk | SAFETY_DIRECTOR |
| Customer Experience | SUPPORT |
| Marketing and Growth | MARKETING |
| Technology and Cybersecurity | CYBER_SECURITY |
| Facilities, Assets and Maintenance | FACILITIES_DIRECTOR |
| Administrative Affairs and Records | ADMIN_DIRECTOR |
| Executive Management and Governance | GOVERNANCE_DIRECTOR |
| Research and Market Intelligence | RESEARCH_DIRECTOR |
| Legal, Contracts and Insurance | LEGAL_RISK |

## One reporting cycle

The owner starts a cycle from the agent management panel. The brief, a stable request ID and the email choice are recorded atomically with fourteen director tasks. Retrying the same request cannot create another cycle. The owner can view recent cycles and their current report.

Director tasks use the existing queue, pause/resume controls, verified administrator checks, token counting, per-task reservations and daily model budget. Their current evidence connector supplies the existing four platform-wide aggregates only. Department instructions explicitly require unavailable departmental data to be identified; this change does not add fourteen departmental data connectors or establish operational acceptance of those departments.

Each completed director output enters the existing linked six-stage office review. The reporting coordinator waits for a terminal office outcome. Corrections, missing evidence, escalation, failed directors and invalid chains remain explicit outcomes in the consolidated report. Unreviewed source prose and invalid review-chain text are excluded. Pending or paused stages remain pending.

The coordinator then queues one `EXECUTIVE` formatting task. Immediately before model dispatch, all fourteen source identities/revisions, office results, owner authority and the bundle digest are revalidated. Abdullah receives this bundle as untrusted evidence under dedicated formatting instructions. The task cannot grant roles, approve operations or send messages. Its completion does not start another governance loop. A formatter failure requires attention and is not silently regenerated.

## Owner email delivery

When email was selected for the cycle, one durable notification is created after formatting. Its recipient is resolved server-side from the active, verified platform owner; request bodies cannot specify a recipient. Before delivery the saved executive revision, source bundle and ownership are checked again. The server appends the recorded status of every department in Arabic, independently of the model's prose.

Resend uses the existing configured sender and trial-recipient restrictions. The report has escaped RTL HTML and plain text. A stable notification-based idempotency key, serializable dispatch claim and a two-minute attempt fence protect concurrent workers. Definite transient rejections receive at most five attempts within one hour; ambiguous responses and expired in-flight attempts require reconciliation rather than automatic resending. A successful response is **provider acceptance**, not proof of inbox delivery. Email outbox records are excluded from generic in-app read actions.

No schedule is created by this change. Initialization leaves new directors paused. Nothing invokes a model or sends a report merely because the code is installed; a reporting cycle must be requested by the authenticated owner, and execution follows existing controls and budget limits.

## Validation and release

The local contract suite covers director uniqueness, request idempotency, owner and recipient boundaries, pending reviews, adverse office outcomes, bundle/revision tampering, actual runtime formatting integration, outbox deduplication, revoked ownership, ambiguous delivery, bounded retries and HTML escaping. Run after the API build:

```sh
node --test apps/api/scripts/department-reporting.test.cjs
```

The existing CI-only loopback HTTP/PostgreSQL fixture additionally drives the full fourteen-director cycle through actual office chains, including a correction, supplies the verified bundle to a mocked model and races two delivery workers against the same durable outbox record. Email delivery remains an injected stub. The browser suite covers the mobile reporting panel, stable retry identity, explicit email selection, escaped output and logout clearing.

This is an implementation for review on the existing main baseline. Full CI results, production deployment, live owner/email configuration, real provider delivery and acceptance of every department's domain tools are separate evidence. No schema migration, dependency, live setting, budget, role grant, production deployment or paid model invocation is part of this source change.
