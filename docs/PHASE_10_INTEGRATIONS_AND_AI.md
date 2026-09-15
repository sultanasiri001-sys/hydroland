# Phase 10 — Integrations and AI agents

Status: implemented on `feat/integrations-ai-agents` as a safe provider-neutral foundation.

## Integration hub

- Catalogues marine/weather, email, SMS, WhatsApp, payments, banking, Nafath and regulatory integrations without selecting a commercial provider.
- Keeps every integration in `NOT_SELECTED` status until a sandbox provider, approved contract and secrets are supplied.
- Restricts the integration catalogue to admin/reviewer scope.
- Verifies webhook HMAC signatures using a provider-specific environment secret, constant-time comparison and a five-minute replay window.
- Requires event metadata and writes a verified webhook audit event.

## AI agent governance

- Provides executive, marketing, sales, customer support, inventory, social, legal/risk and cybersecurity agent definitions.
- Supports Saudi Arabic (`ar-SA`) and English (`en`).
- Only produces safe drafts, reports, operational reads and approval requests.
- Every non-read action requires human approval before sending or execution.
- Explicitly forbids safety overrides, regulatory overrides, role changes, payment capture/refunds, contract signing and direct database access.
- Records every planned agent action in the immutable audit trail.

## Deliberately excluded

No provider account, API key, WhatsApp number, payment gateway, government credential or AI model credential is selected or stored in this phase. Those are production onboarding decisions after sandbox contracts and security review.

## Verification

```bash
npm run validate:phase10 -w @hydroland/api
npm run typecheck -w @hydroland/api
npm run build -w @hydroland/api
```
