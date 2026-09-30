# Phase 4 — Notifications and audit ledger

Roadmap scope used for this phase:
1. User notification inbox.
2. Read/unread state.
3. Sensitive-operation audit recording.
4. Historical audit ledger protected from application mutation.

## Baseline review — 2026-09-30

The authenticated notification API and account-center UI already provide the inbox and read transition. Authentication challenges are explicitly excluded from the in-app inbox. Existing HTTP/DB E2E covers caller ownership, challenge isolation, persistence, read state and self-only safety-test alerts.

Production read-only inspection found one in-app notification (already READ) and 164 audit events at the observation point, showing that both persistence paths are active. This count is an observation, not a completeness guarantee.

The audit API exposes only GET /audit/mine; no application delete endpoint was found. However, the application database role still had UPDATE, DELETE and TRUNCATE table privileges, so the roadmap phrase "non-deletable historical ledger" was not true at the database boundary.

## Append-only correction

Migration 20260930080000_audit_event_append_only adds PostgreSQL triggers that reject UPDATE, DELETE and TRUNCATE on AuditEvent while preserving INSERT and SELECT. This protects against accidental mutation through the normal application database role. It does not pretend to defeat a database owner who deliberately drops or alters the trigger, nor does it replace backup/PITR.

The validation runs only on a loopback disposable CI database, installs the actual migration, proves insert/read, then requires update/delete/deleteMany/truncate rejection and verifies both triggers. It deliberately leaves its one synthetic row because the CI database itself is disposable.

Phase closure still requires green CI, deployment of the migration, read-only production verification that both triggers exist, and live owner acceptance of inbox/read behavior. No external WhatsApp/SMS provider is added by this phase.
