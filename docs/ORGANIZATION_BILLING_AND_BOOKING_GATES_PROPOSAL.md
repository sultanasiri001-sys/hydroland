# Organization billing and booking gates — proposal

Status: **PROPOSED, NOT ACTIVE**. No user selection of payment terms has been
received. Prepayment is the working design assumption; this document grants no
credit, issues no invoices, changes no policies and authorizes no production
migration. The existing organization portal implementation is in PR #442.

## Business decisions to record before implementation

| Decision | Proposed starting point | Still needed |
|---|---|---|
| Customer / payer | The booking organization is the customer. The submitting account is the actor and contact, not automatically the invoice customer. | Confirm which legal entity is merchant/issuer and which organization details Finance requires. |
| Payment terms | Prepay before confirmation; no automatic credit terms or credit limit. | Select PREPAID, approved credit, or per-organization terms. |
| Payment authority | Current ACTIVE OWNER/ADMIN of an ACTIVE organization may start checkout and read organization billing. | Confirm whether a separate billing permission/delegation is required. Do not grant it to OPERATOR/STAFF/VIEWER by default. |
| Price / adjustments | Amount is calculated server-side from an approved immutable quote, currency and seat count. | Define discounts, quote expiry, taxes, numbering and billing address requirements with Finance. Do not infer rates or requirements from this proposal. |
| Cancellation / refund | Booking cancellation is a separate lifecycle action. Paid amounts remain recorded; Finance owns refund decisions. | Define refund eligibility and authorized reviewers. No automatic refund from customer cancellation. |

## Existing ownership and minimum persistence change

Reuse canonical `Booking`, `Payment`, provider reconciliation and booking
lifecycle services. Internal `FinanceEntry` is not a customer billing ledger.
Provider checkout invoices are payment-provider objects; their existence does
not establish a compliant business invoice issued to an organization.

`Payment.accountId` can remain the authenticated initiating actor, while
`Payment.bookingId → Booking.organizationId` establishes scope. Any organization
billing API must re-check current membership; historical actor ownership must
not grant continuing access after membership revocation.

The existing `Invoice` has only paymentId, number, status and dates. Before using
it for business invoices, persist the approved issuer/customer identity snapshot,
currency, line amounts, tax/adjustment breakdown, total and applicable numbering
rules. Reuse or add a versioned canonical invoice representation after Finance
review; do not duplicate issued invoices in a portal-only store. Later profile
edits must not rewrite an issued invoice's customer or amount snapshot.

## Proposed workflow and canonical gates

| Transition | Required behavior | Owning service |
|---|---|---|
| Submit request → PENDING | Current tenant membership, trip lifecycle, policy-controlled safety/weather/capacity, idempotency and participant snapshot. A pending request grants no departure clearance and creates no resource allocation. | TripsService, BookingParticipantService, AuditService |
| Prepare quote / checkout | Resolve organization billing permission and approved quote; validate booking state. Persist amount and terms revision server-side. Recheck these at the write boundary. | Canonical payment/quote service |
| Provider callback → recorded payment | Verify provider signature/reconciliation, payment ID, amount and currency. Process retries idempotently. Customer callbacks cannot assign CAPTURED. | PaymentsService and provider adapter |
| PENDING → CONFIRMED | Current authority, reviewed booking state, roster eligibility, payment terms satisfaction and existing policy-controlled safety/weather/capacity. Add the agreed calendar reservation validity check here, inside the canonical lifecycle transaction. | BookingManagementService plus CalendarAllocationService |
| Trip → CLOSE / COMPLETE | Current canonical operational readiness and clearance; re-check the same clearance inside the write transaction. | TripLifecycleService and OperationalClearanceService |
| Cancel / request refund | Cancel with reviewed state and stable request identity. Preserve recorded payments and invoice history. Refund needs the separate Finance/payment workflow. | Existing booking lifecycle and Finance/payment services |

A full operational-readiness result must not be blindly reused as a customer
booking gate: it includes departure requirements and aggregates other bookings.
Define a specific calendar reservation check for confirmation: active trip event,
active assigned resources, matching trip time window and no overlapping active
allocation. Do not silently create allocations or grant clearance from checkout.
The precise gate and policy treatment remain a decision to accept before coding.

## Proposed organization API boundary

| Route | Behavior |
|---|---|
| POST /organizations/:organizationId/bookings/:bookingId/payment-checkouts | Start or replay payment using current billing authority and the approved quote. No client amount, customer, capture state or credit terms. |
| GET /organizations/:organizationId/billing | Customer-safe invoices/payments for the current tenant; omit internal entries, secrets and unrelated personal payments. |
| GET /organizations/:organizationId/billing/:invoiceId | Current tenant authorization plus scoped invoice lookup; return an issued immutable customer-facing snapshot. |

Existing personal payment routes continue to exclude organization-owned bookings.
Organization payment must not be implemented by removing that boundary.

## Acceptance needed for the eventual implementation

- Cross-tenant IDs, inactive organizations, read-only members and revoked billing
  members fail before provider calls; replay re-checks current authorization.
- Same quote/request retries create one payment and one checkout; changes to
  amount, currency, terms or customer cannot reuse an idempotency key.
- Price/roster/booking changes during checkout either reject the stale quote or
  require an explicit new quote. They never silently alter an existing payment.
- Forged provider success, duplicate callbacks, mismatched amounts and currencies
  cannot satisfy the confirmation gate.
- Invoice snapshots remain stable after organization profile changes.
- Concurrent confirmation/resource changes reject stale reservations without
  creating a second allocation engine or bypassing operational clearance.
- Cancellation never claims a refund; repeat cancellation/refund actions have
  distinct idempotent records and current role checks.
- Additive schema changes pass TEXT/UUID rehearsal and backup/recovery acceptance.

This proposal is ready for a business decision and implementation review. It does
not close organization billing, calendar-gate or production recovery acceptance.
