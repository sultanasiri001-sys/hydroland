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
| Private document storage | `credential-storage-recovery.test.cjs`, `credential-storage-readiness-validation.mjs`, `credential-integrity-db-e2e.mjs` | Provider-specific private bytes/version/ACL recovery and approved RPO/RTO are A03 acceptance, not these fixtures. |
| Marine weather | `weather-review-context-validation.cjs`, `weather-review-context-db-e2e.mjs` | Actual site/activity limits and operator acceptance remain A14 inputs. |
| Transactional email | `auth-email-outbox-db-e2e.mjs` | Existing bounded retries, stable delivery identity, expiry and database-poll recovery; no new recipient or real email is authorized by this patch. |
| Payments | `payment-moyasar-http-e2e.mjs`, `moyasar-webhook-validation.cjs` | Provider amount/identity verification and idempotency; real financial transactions are not performed for this patch. |
| AI provider | `agent-provider-errors.test.cjs`, `agent-provider-policy.test.cjs`, `agent-provider-recovery-acceptance.mjs` | Existing bounded rejection recovery preserves uncertain/completed tasks. No model call, cost limit or provider change. |
| PostgreSQL and application rollback | `phase11-recovery-drill.yml`, `PRODUCTION_RECOVERY_RUNBOOK.md` | Keep isolated recovery separate from provider PITR, agreed production cutover and measured RPO/RTO. |
| Unselected external integrations | Existing integration readiness gates | CERTIFICATION automation, external distress, Nafath, e-signing and other unapproved contracts remain unavailable; do not invent a substitute or acceptance. |

Local validation of this change: API build/lint, five adapter tests, 118 offline
weather assertions and existing credential-storage readiness checks passed.
The added PostgreSQL lifecycle scenario still requires exact-head CI evidence.
No provider outage, production resource, credential, permission, operational
approval, migration, deployment or full A06 closure is created by this patch.
