# Equipment rental refund execution

This extends the original rental collection path with customer cancellation
requests and source-bound provider refunds. It does not seed grants, legal
classifications, financial approvals, fees, deposits or production transactions.

## Customer request and policy

`POST /payments/rentals/:id/refund-requests` accepts an idempotency key, the
requested amount in halalas, a cause and a reason. The authenticated account
must own the rental. The server binds the request to the collected original
contract, customer, supplying center and checkout. Reusing the same key with
different details is rejected. A cancellation before any handover records the
cancellation immediately under the same rental lock used by equipment delivery.
It does not claim that a refund has been executed.

The existing versioned policy supplies the full refund at/above 24 hours and
75% before handover inside 24 hours. Its cumulative entitlement is shared by
all requests and operations on the rental. Unresolved statutory applicability
remains reviewable; no classification or exception is inferred from the item
being rental equipment. Ordinary automatic refunds cannot proceed after any
equipment has been handed over. Defect, nonconformity and warranty requests
remain available for separate review.

A customer saying `PROVIDER_CANCELLATION` does not establish provider failure.
`POST /payments/rentals/:id/provider-handover-failure` requires the supplying
center's current accountant and a source evidence reference. It records a
server-owned, actor-attributed confirmation before the customer's request and
cancels the undelivered rental. The original policy then permits the documented
provider-failure refund. It cannot be used for delivered equipment.

`GET /payments/rentals/:id/refund-requests` returns the customer's requests,
current decisions and operation states. Original request history remains visible
when collection changes require reconciliation. A missing or inconsistent source
does not turn into an executable refund.

## Financial execution and reconciliation

`POST /payments/rentals/:id/refund-operations` accepts the original request ID,
an independently approved existing `FinanceEntry`, and a distinct idempotency
key. The entry must be `REFUND` / `EQUIPMENT_RENTAL_REFUND`, belong to the
supplying center and reference this rental. Preparation, approval and execution
use separate accounts. Approval and execution each require a current
owner-approved mandate with matching currency, amount limit and audit evidence.
The same mandate helper is used by the pre-existing trip refund executor.

The rental row serializes reservations, handover, checkout refresh and financial
posting. Each rental can have only one unresolved operation; cumulative success
and reservations cannot exceed the customer request, policy entitlement or
collected balance. An exact reservation unique-key race is recovered only after
rollback and a fresh authority/binding check. A different key, actor, request or
ledger entry cannot adopt another operation.

An immutable dispatch claim is committed before the external provider POST.
The POST runs outside retrying database transactions and is never automatically
sent again. Its validated response is persisted separately from the final atomic
posting. Final posting updates the collection's cumulative refund, checkout
provider observation, existing ledger, operation journal and audit together.
The cancelled/refunded rental cannot authorize handover. The checkout stays in
reconciliation state and cannot present a new payment URL.

`POST /payments/rentals/:id/refund-operations/:operationId/reconcile` can finish
an interrupted posting from its saved exact POST proof. A cumulative provider
GET cannot prove which operation changed money and cannot authorize a resend.
Uncertain outcomes therefore report `financialActionExecuted: null` and
`financialOutcome: UNKNOWN`. A matching concurrent authenticated provider
observation does not prevent posting the original exact POST result. A changed
contract, source, payment reference or approved ledger binding prevents posting.

`POST /payments/rentals/:id/refund-operations/:operationId/cancel-reservation`
accepts an explicit `reason` and requires a current execution mandate for the
same center, currency and amount. Under the rental dispatch lock, it can change
only a `RESERVED` operation with no dispatch timestamp or provider proof to
`CANCELLED`. It records the cancelling actor and reason without removing or
reassigning the original journal, idempotency key or approved ledger. Exact
retries return the cancelled receipt without sending money. A different
authorized executor can then use a new independently prepared and approved
refund entry. Dispatched and uncertain operations remain held for reconciliation.

## Validation and boundaries

The forward migration preserves existing rows and supports both native UUID and
TEXT financial ledger identities. Its checks enforce amounts, currency,
separation of duties, exact resulting totals, valid states, unique source-ledger
binding and restrictive source foreign keys.

Acceptance scripts:

- `rental-refund-migration-checks.mjs`: eight PostgreSQL migration cases across
  TEXT and UUID identities.
- `rental-refund-postgresql-http-checks.cjs`: actual Nest routes and bearer
  authentication, actual PostgreSQL and finance services, and the actual Moyasar
  adapter against an ephemeral loopback provider. Cases include partial/full
  refunds, concurrent keys and limits, immutable terms, revoked mandates,
  handover exclusion, uncertain results, posting rollback, customer suspension,
  reconciliation and cancellation of unused reservations.

These tests do not contact a payment provider, change production data or move
real money. Insurance, deposits, damage charges, partial multi-item delivery
remedies and verified mandatory-right decisions are not fabricated by this
implementation. They require their own applicable terms and evidence.
