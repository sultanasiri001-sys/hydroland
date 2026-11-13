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

## Boundaries and remaining acceptance
This is passive observation of real outbound calls. Providers that receive no application traffic remain UNKNOWN; the monitor intentionally does not make billable or user-visible probe transactions. The existing API / database uptime checks remain separate. The synthetic alert-route drill verifies GitHub issue delivery but is not evidence of a real production provider outage. Full A06 closure still depends on the linked operational acceptance and dependency items recorded in the tracker, including A14; this code path alone does not close them.
