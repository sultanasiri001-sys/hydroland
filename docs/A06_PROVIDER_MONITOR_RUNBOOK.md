# A06 external provider monitor

## Approved operating targets
- Observe the protected provider-state endpoint on a 15-minute GitHub Actions schedule.
- Create one GitHub incident issue when a real application call records a provider failure.
- Assign the issue to the platform director account 001 and mark it escalated when the same failure remains current for at least 30 minutes.
- Close the incident only after a later real application operation records success.

## What the monitor observes
The API records transition-only, allowlisted state in the append-only AuditEvent table for the real provider adapters: private object storage, marine weather, email delivery, Moyasar payment requests, and OpenAI model requests. It does not run synthetic charges, send test emails, upload test documents, or call provider APIs merely to manufacture a health signal. A state with no prior real application operation is UNKNOWN and does not open an outage issue. User input, payloads, recipient information, credentials, and raw provider error text are excluded from provider-state events.

The monitor reads the latest state every 15 minutes through `GET /api/v1/health/integrations/provider-observations`. That endpoint accepts only a GitHub Actions OIDC token bound to this repository, the fixed workflow file, the main branch, and the expected audience. The token is short lived; no persistent API secret is stored in GitHub. A failed read opens a separate monitor-control issue and is never reported as a provider outage.

## Incident handling
A provider incident is created or refreshed using the sanitized provider key, observed timestamp, source commit, and workflow run link. The incident remains unassigned during the initial 30-minute window. At 30 minutes or later, the workflow adds the escalation label, comments with the escalation timestamp, and assigns the issue to repository owner `sultanasiri001-sys` (director account 001). A later successful operation closes the provider issue as recovered. The GitHub assignment is an escalation notification; it does not prove a person acknowledged or resolved the incident.

## Containment and recovery actions
The monitor is alert-only. It does not disable providers, switch credentials or storage, retry payments, send duplicate emails, or authorize trips. The director and technical owner use the existing role and safety controls to approve any operational change.

- **Object storage:** keep private-document paths fail-closed; do not expose a public URL or switch buckets during an incident. After a real successful storage operation, review affected document operations through the existing audit trail.
- **Marine weather:** keep trip decisions in the current human-review path; missing or invalid forecast data must not turn into an approval. Resume normal review only after a real valid forecast is returned.
- **Email:** use the existing outbox and idempotency keys. Check message IDs and outbox state before any manual resend to avoid duplicate delivery.
- **Payments:** do not repeat an uncertain invoice/charge. Reconcile the existing provider invoice/status and payment reference before any finance action.
- **AI model:** route affected work through its existing human approval/review path; do not grant an agent extra authority to bypass a failed model call.
- **API/database:** these remain covered by the existing uptime and recovery procedures, separately from provider-state observations.

A successful provider request clears the current degraded state and the next monitor run closes its issue. A later failure is tracked as a new incident. The 15-minute observation cadence and 30-minute escalation are the approved response targets; no availability percentage or human acknowledgement time is inferred. GitHub assignment to account 001 is the escalation notification path; it does not verify that a person has acknowledged the incident.

Before changing any provider incident or closing a monitor-control issue, the monitor checks the complete response for observation ordering. A recovery must be strictly later than the open incident's failure. An older failure cannot supersede a newer incident. Timestamps more than 60 seconds ahead of the run's start and UNKNOWN states carrying an observation/category are rejected. Invalid or ambiguous observations leave provider evidence intact and raise the separate monitor-control alert. These checks prevent false recovery; they do not add complete transition-history replay between scheduled polls.

## Boundaries and remaining acceptance
This is passive observation of real outbound calls. Providers that receive no application traffic remain UNKNOWN; the monitor intentionally does not make billable or user-visible probe transactions. The existing API / database uptime checks remain separate. The synthetic alert-route drill verifies GitHub issue delivery but is not evidence of a real production provider outage. Full A06 closure still depends on the linked operational acceptance and dependency items recorded in the tracker, including A14; this code path alone does not close them.

## Scheduled-monitor liveness

The separate production-uptime workflow checks whether the provider monitor actually ran. On scheduled or explicitly dispatched main runs, its `monitor-liveness` job reads the provider workflow's bounded 24-hour run and job evidence. It accepts only a successful `watch` job whose exact observation step ran against the same source SHA. Scheduled coverage uses the original first attempt. GitHub retains `event=schedule` on manual reruns, so the collector fetches the original attempt separately, preserves its original observation time and reports the newer rerun separately. Queue creation, a passing contract job, a skipped observation, a failed run, a manual dispatch and a rerun cannot stand in for scheduled coverage.

The observation step's start is the conservative time bound. An interval longer than the existing 15-minute cadence opens a distinct `a06-monitor-liveness` control incident; at 30 minutes it assigns the existing director account 001 route. Missing or unreadable evidence is reported as unavailable, never as healthy. Issue writes and recovery are read back. A later successful scheduled observation can close that control incident, while the retained report still records every historical missed slot. Neither action asserts a provider outage/recovery or a human acknowledgement.

Each report contains exactly 96 completed UTC quarter-hour slots, with multiple runs in one slot counted once. The in-progress quarter is excluded. Manual observations are identified separately. Reports are retained as dated Actions artifacts. The observer does not call a provider, send a customer message, charge a payment or change service settings. Its contracts run on pull requests and pushes; incident mutation runs only from the existing scheduled/manual main context.

This is an independent workflow, **not an independent monitoring service**: both it and the provider monitor still depend on GitHub Actions. If the entire control plane stops scheduling, detection waits for a later observer run. Full independent liveness and the actual adopted provider/on-call acceptances remain open. No new availability percentage or acknowledgement deadline is inferred.

Read-only evidence captured at 2026-11-19 06:51:34 UTC found four successful scheduled observation slots in the preceding 96 completed slots, with the latest observation starting at 06:16:36 UTC (run 44470901238). The collector classified the latest observation as late and eligible for the existing 30-minute escalation. This audit did not create or modify an incident. Synthetic liveness tests cover stale/missing/failed evidence, source and attempt binding, manual-run exclusion, pagination truncation, duplicate slots, future timestamps, separate alert routing, persistence readback and recovery.

## Render quarter-hour observations

On a production Render API instance the application samples the five provider transition streams once per UTC quarter, independently of the GitHub Actions scheduler. A database lock coordinates overlapping instances. An audit event and a sanitized Render log contain the sample time, the last observed transition per provider and the number of complete quarters missed since the preceding sample. The first sample has no coverage baseline. Missing slots stay missing. A provider with no recorded traffic remains UNKNOWN.

Filter Render API logs by `RenderProviderObserver` and the audit stream by resource `integration.provider.monitor.render`. Compare the two schedules independently. Render downtime can interrupt these observations. The existing GitHub incident assignment remains the director's escalation route.
