# HYDROLAND Phase 2 — Commercial Operations & Integrations

Status: IN PROGRESS
Baseline: `2bf0fca817d137bb99fbd389bc7d04dee08b04b6`

## Objective
Move HYDROLAND from launch-ready product scope into real commercial operations without presenting simulated transactions as completed actions.

## Execution gates

### P2.1 Commerce truthfulness and catalog foundation
- Remove/disable fake cart-success behavior until a real order/cart API exists.
- Product catalog must be server-backed before prices, stock, cart, or checkout are presented as live.
- Preserve existing rental/inventory APIs as separate operational domains.

### P2.2 Payments and invoices
- Reuse existing payment/invoice domain where applicable.
- Add provider adapter boundary; no provider credentials in frontend code.
- Webhooks must be authenticated/idempotent before payment state changes are trusted.

### P2.3 Booking commercial flow
- Keep trip booking tied to a real trip ID returned by `/trips`.
- Capacity/availability must come from the API.
- Payment state and booking state remain separate and auditable.

### P2.4 Inventory and rentals
- Validate stock, rental availability, extensions, returns, and overdue states against live APIs.
- No client-side fabricated inventory counts or successful return/rental confirmations.

### P2.5 Organization/B2B operations
- Organization/member counts and approval states must be API-derived.
- Prepare contract/request workflow boundaries for companies and government entities.

### P2.6 Integrations
- Weather/marine data: provider adapter + freshness metadata + safe unavailable state.
- Notifications: provider adapter for outbound channels with audit trail.
- Shipping/suppliers: adapter contracts only until provider accounts are configured.
- AI agents: server-side tools with explicit permissions and audit events; no autonomous financial or safety-critical state changes without policy gates.

## Launch-quality rules
1. No fake success toast for a transaction that was not persisted.
2. No hard-coded operational metrics presented as live.
3. No secret/API key in web assets.
4. All external callbacks must be authenticated and idempotent.
5. Safety decisions require confirmed data and remain reviewable.
6. Protected E2E is required before calling authenticated commercial flows production-verified.

## Immediate implementation order
1. Commerce/store truthfulness cleanup.
2. Audit booking + inventory/rental flows.
3. Payment provider boundary and webhook contract.
4. B2B service-request/contract boundary.
5. Weather/notification/shipping adapters.
6. Protected E2E + release snapshot.
