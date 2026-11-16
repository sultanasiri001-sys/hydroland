# A06 — bounded private-storage requests and recovery acceptance

Private credential/marine document PUT, HEAD and best-effort cleanup DELETE
previously had no explicit request deadline. A stalled storage endpoint could
leave a request waiting indefinitely. All three now use an eight-second abort
deadline and refuse redirects of signed requests. Existing lifecycle gates,
HTTP error handling, namespace, signatures, permissions and cleanup semantics
are retained. A timed-out or otherwise uncertain PUT is not automatically
replayed; DELETE remains best-effort cleanup, not proof of legal erasure.

The new adapter tests load the actual compiled service with isolated fixture
configuration and an in-memory transport. They exercise delivered aborts for
all three methods, one request per caller, recovery on a later call, disabled
integration refusal, non-404 outages versus missing bytes, denied access and
failed-upload refusal. No real provider or environment credential is used.

The existing PostgreSQL credential-integrity scenario now verifies that a
failed upload creates no document metadata or attachment audit; recovery
creates exactly one; a failed existence check cannot submit the credential;
and later recovery creates one submission/audit. The original rollback,
ownership, concurrency and cleanup assertions remain. The fixture is limited
by that suite's existing local-test-database boundary.

The weather-context scenario now starts from an approved forecast, changes
location, injects an outage and verifies no write/approval restoration. Provider
recovery creates a pending forecast. Only a new revision-bound review can make
it usable. No operational weather threshold, setting or approval is introduced.

## Acceptance inventory

| Critical dependency | Existing executable evidence | Current remaining boundary |
| --- | --- | --- |
| Private document storage | `credential-storage-recovery.test.cjs`, `credential-storage-readiness-validation.mjs`, `credential-integrity-db-e2e.mjs` | A03 is closed within its owner-approved composite evidence scope: historical provider PITR plus current restore on the existing recovery instance. These fixtures do not replace that evidence. |
| Marine weather | `weather-review-context-validation.cjs`, `weather-review-context-db-e2e.mjs` | Actual site/activity limits and operator acceptance remain A14 inputs. |
| Transactional email | `auth-email-outbox-db-e2e.mjs` | Existing bounded retries, stable delivery identity, expiry and database-poll recovery; no new recipient or real email is authorized by this patch. |
| Payments | `payment-moyasar-http-e2e.mjs`, `moyasar-webhook-validation.cjs` | Provider amount/identity verification and idempotency; real financial transactions are not performed for this patch. |
| AI provider | `agent-provider-errors.test.cjs`, `agent-provider-policy.test.cjs`, `agent-provider-recovery-acceptance.mjs` | Existing bounded rejection recovery preserves uncertain/completed tasks. No model call, cost limit or provider change. |
| PostgreSQL and application rollback | `phase11-recovery-drill.yml`, `PRODUCTION_RECOVERY_RUNBOOK.md` | Keep isolated recovery separate from provider PITR, agreed production cutover and measured RPO/RTO. |
| Unselected external integrations | Existing integration readiness gates | CERTIFICATION automation, external distress, Nafath, e-signing and other unapproved contracts remain unavailable; do not invent a substitute or acceptance. |

Local validation of this change: API build/lint, five adapter tests, 118 offline
weather assertions and existing credential-storage readiness checks passed.
The PostgreSQL lifecycle scenario subsequently passed in API CI run
[43399190444](https://github.com/sultanasiri001-sys/hydroland/actions/runs/43399190444),
job 131797488998, on PR #587 head b80745a33f142bc3d908268c075b7d389393b749.
That job also confirms storage adapter 5/5, 118 offline weather assertions,
email outbox outage/recovery and AI provider recovery. PR #587 passed all
17 discovered workflows and merged as cb2f5e212c6ed40da4becfed6ab481c18ed35c49.
No provider outage, production resource, credential, permission, operational
approval, migration, deployment or full A06 closure is created by this patch.

## Payment verification outage and recovery

The payment HTTP/PostgreSQL fixture now injects provider HTTP 429, HTTP 503
and a real loopback connection reset after the provider has marked the invoice
paid. Both authenticated refresh and the paid webhook must return 503, preserve
the complete local payment row, create no successful reconciliation audit,
leave the webhook event unprocessed and preserve the pending booking. Exactly
one provider read per caller is allowed, and no new invoice may be created.
After provider recovery, the same webhook event is verified and processed once;
the existing duplicate-event and independent booking-confirmation assertions
still apply. The fixture refuses remote database, API and provider targets
before the first write and cleans only the webhook IDs it generated.

API CI run [43416274940](https://github.com/sultanasiri001-sys/hydroland/actions/runs/43416274940),
job 131854866297, executed this scenario successfully at 2026-11-13 11:25:12 UTC.
All 14 discovered PR #590 workflows passed before merge 53bfb8652e760b5b8ac1660d0ddc64d3e9bd62ca.

## Provider incident runbook

Use the existing provider lifecycle gates and stored receipts. Keep one incident
record with UTC detection time, deployed commit, integration state, affected
operation, sanitized error category and the recovery evidence. Do not copy
credentials, signed document URLs, bearer links or payment secrets into it.

| Dependency | Detection and containment | Recovery acceptance |
| --- | --- | --- |
| Private document storage | Upload/check errors or the 8-second adapter deadline. Keep the credential unverified; do not automatically replay an uncertain upload. Cleanup DELETE is best effort. | Verify private object existence and integrity, then retry the caller operation once under the same owner boundary. Confirm one attachment/submission audit. Actual bytes/version/ACL restoration remains A03. |
| Marine weather | Refresh failure, stale context or pending review. Keep the trip blocked where the adopted requirement applies. | Fetch fresh data for the current location/time/activity and obtain a new revision-bound review. Old approval cannot be revived. Real site limits and operator acceptance remain A14. |
| Email | Deferred outbox rows, expired challenges or a failed database poll. Preserve notification identity and recipient; respect the stored backoff and expiry. | Verify the same idempotency key and challenge identity are used, one delivery is acknowledged, and consumed/expired links cannot be sent again. Never redirect another account's challenge. |
| Payments | Provider verification returns unavailable, is throttled or disconnects. Preserve the local payment and pending booking; keep the failed event retryable. | Re-read provider amount, currency and local identity. Process the same verified event once; verify no duplicate invoice and no implicit booking confirmation. Investigate uncertain create/refund operations with provider reconciliation before any replay. |
| AI provider | Durable WAITING or ACTION_REQUIRED gate and recorded attempt category. Preserve unknown-cost receipts, owner pauses and the existing budget. | Respect Retry-After and per-attempt reservations. Quota/unknown/daily holds need the existing reviewed revision transition. Never replay completed or uncertain work. |
| PostgreSQL/application | Readiness/database failure or integrity uncertainty. Preserve the affected instance and incident evidence. | Follow PRODUCTION_RECOVERY_RUNBOOK.md for an isolated restore and acceptance before owner-approved cutover. A live heartbeat alone does not accept database recovery. |

The current uptime workflow runs every 15 minutes and creates or updates the
repository outage issue for API/Web failure, then closes it after successful
recovery. It checks public readiness, liveness, the protected payment diagnostic
boundary and the web shell. It does not probe every provider or prove delivery
of a provider-specific alert to an on-call recipient.

Existing technical bounds are implementation facts, not approved service SLOs:
storage/payment request deadlines are 8 seconds, the email worker polls every
15 seconds and stores retry deadlines, and the AI recovery suite verifies a
four-attempt cap. Detection latency also includes scheduler and retry delays.

The owner selected the platform/security agent for technical monitoring and
escalation to platform director 001 through GitHub in the current conversation.
The repository owner account is sultanasiri001-sys. This records the technical
assignment; it does not appoint a professional marine operator. Approved
provider-specific service objectives, response deadlines and applicable
operational acceptance remain open. Owner 001 approves reopening/cutover
where the existing runbook requires it.

## Executed synthetic alert-route receipt

PR #593 passed all 10 discovered workflows on head
17f092c7fe5fa30a5f1a80f743b86569dfffe430 and merged as
6c59e5933a6609d3609b1b6ea826e20c5df9710c. Its inventory entry and
pinned digest were updated while preserving the existing 28 required release
workflow rules.

Manual run [43419947841](https://github.com/sultanasiri001-sys/hydroland/actions/runs/43419947841),
job 131868719989, passed at 2026-11-13 11:54:22 UTC. It created
[issue #594](https://github.com/sultanasiri001-sys/hydroland/issues/594), assigned
it to sultanasiri001-sys, read back six SIMULATED_UNAVAILABLE markers, read
back six SIMULATED_RECOVERED markers, and verified the same issue closed.
The six markers cover storage, weather, email, payments, AI and database.
The ten contract cases include refusal outside explicit manual context,
wrong issue identity, failed delivery, recovery readback and reuse on rerun.
The receipt is retained in Actions artifact 14034600279.

This is a real GitHub write/readback/closure exercise with simulated provider
states. It is not automatic production provider detection, a real provider
outage, or human acknowledgement. Existing uptime monitoring does not yet
connect failures from every provider adapter to this route. No production
credential, permission, configuration, paid resource or real transaction was
changed by this exercise.

A03 and A04 are closed within their accepted scopes in tracker version 67.
A03 accepts RPO <= 15 minutes and RTO <= 60 minutes with historical provider
PITR plus current restoration on the existing recovery instance. A fresh
provider PITR or production cutover was not performed or accepted by A06.
A14 and D04 operational/safety applicability remains open where required.

## Final closure record

A06 remains OPEN until the record identifies every applicable critical provider,
its accepted SLO, working alert route and responsible operator, and attaches a
dated outage/recovery receipt plus review. Record whether each receipt is an
isolated fixture, provider sandbox or production exercise. Retain the accepted A03/A04 evidence and link the remaining A14/D04
acceptances where applicable. Keep unselected external integrations blocked.
A passed software test, a deployment or an application heartbeat cannot fill
an unperformed operational acceptance.
