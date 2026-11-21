# Original commerce terms and financial execution

Policy version: `2026-11-21.1`. This delivery implements parts of B01, B02,
B04 and B08. It does not close the seven orange scopes or demonstrate a live
bank transfer, tax invoice, or complete mixed-store financial lifecycle.

## Approved customer rules

| Line kind | Ordinary customer cancellation | Separate cases |
| --- | --- | --- |
| Trip | Full refund at least 48 hours before the original departure; 50% refund inside 48 hours. The exact 48-hour boundary is included in the full-refund window. | Verified no-show/late arrival after closure has no ordinary refund. Mandatory rights and provider failures remain separate. |
| Course | No free cancellation window after confirmation; no ordinary refund for no-show or voluntary withdrawal after starting. | The exact charge for voluntary cancellation after confirmation and before starting is unresolved. Provider cancellation before starting gives a full refund. |
| Equipment rental | Full refund at least 24 hours before the original scheduled handover; 75% refund inside 24 hours before handover. | Provider failure to hand over gives a full refund. Voluntary early return after handover does not generate an ordinary refund. Defects and nonconformity are separate. |
| Sold goods | Eligible unused goods have a seven-day return window measured from actual receipt. | The service cancellation percentages do not apply. Defects, nonconformity and warranty rights follow their own remedies. |

The trip 50% late-cancellation deduction supersedes the earlier 25% discussion.
The store is a common storefront, not a common cancellation policy. Each line
retains its source, kind, original price/currency, issuer and versioned policy.
Unknown legal classification cannot silently remove a mandatory refund right.
The seven-day boundary uses the end of the seventh following Riyadh calendar
day as an explicit customer-favoring implementation choice.

## Contract evidence

New trip bookings freeze the supplying center, original schedule and configured
price in the same transaction as the booking. Rebooking a cancelled trip creates
a new booking; historical payment and attendance records are retained. A missing
original price is reviewable and does not become a free booking. Organization
buyers and supplying centers are recorded separately.

The trip quote endpoint returns that original snapshot and a hash. Checkout
requires explicit acceptance of the same version and hash before the provider
invoice is requested. Payment and invoice records retain the accepted snapshot.
Later catalog edits do not change those terms. Legacy contracts remain without
a fabricated snapshot and cannot acquire new cancellation fees retroactively.

Store order lines and training enrollments also freeze their original terms.
This does not imply that their collection and refund paths are integrated with
trip checkout. Tax identity is not inferred from a commercial registration.
Payment capture can create an immutable `DRAFT` commercial invoice; missing
verified fiscal data remains `REVIEW_REQUIRED`.

## Refund execution

`POST /payments/refund-operations` accepts only references to a real payment,
original customer request and approved refund entry in the existing financial
ledger. It requires current owner-approved monetary mandates for the approver
and executor, with separate requester, approver and executor accounts. Owner
verification uses the established platform owner identity. No grants or limits
are seeded by these migrations.

The payment row is locked while reserving the operation. The cumulative amounts
of succeeded and unresolved operations cannot exceed either the original
customer request, the applicable policy entitlement, or the captured balance.
A durable dispatch claim precedes the provider POST. That POST is outside all
retrying database transactions and is not automatically repeated.

A validated POST response is saved before the ledger posting transaction. The
operation, payment counter, existing ledger entry and audit are then committed
together. A timeout or uncertain response remains
`RECONCILIATION_REQUIRED`. A later cumulative provider GET cannot attribute
someone else's dashboard refund to this operation. Reconciliation may finish a
posting rollback only from the saved, validated original POST result.

Provider invoice summaries cannot reverse an already observed full refund.
Partially refunded payments retain their actual refunded amount and cannot
satisfy confirmation of a fully payable booking. See
[Moyasar execution notes](MOYASAR_REFUND_EXECUTION.md) for adapter limits.

## Rental collection and service entitlement

Rental reservations distinguish the scheduled handover from the return deadline.
The original contract, line amounts, supplying center and accepted policy are
bound to a durable checkout journal. Hosted checkout is subject to the original
15-minute inventory hold and current equipment inspection. An uncertain invoice
creation is held for verified reconciliation, not blindly reissued.

Provider callbacks trigger a fresh provider read. Confirming collection requires
the exact rental payment and its independently approved, already posted revenue
entry. `CommerceCollectionEvidence` is source evidence; balances remain in
`FinanceEntry`. A callback, client boolean, invoice number or receipt label cannot
make a rental paid or authorize equipment handover. Collection after the hold
expires requires reconciliation.

Trip entitlement uses a confirmed booking, its bound captured payment, posted
collection and actual completion attendance. Only attended seats count as
performed services. No-show retention is shown separately. A refund or unresolved
refund operation prevents automatic entitlement preparation. Duplicate completion
does not create another settlement entry.

The net amount requires a current, explicit owner-approved allocation of gross,
commission and deductions. Unknown commission is not zero. Preparation creates
only a `PENDING_APPROVAL` entry in the existing ledger. It does not execute or
claim a bank transfer. Generic manual posting cannot bypass these guarded refund
and entitlement paths.

## Evidence and remaining scope

Acceptance uses disposable loopback PostgreSQL and a local synthetic provider,
including concurrent attempts, original-term changes, invalid scope, expired or
revoked mandates, timeout after provider application, and posting rollback.
GitHub CI also runs browser acceptance and existing API regressions on the exact
candidate commit. No test credentials authorize real merchant transactions.

Remaining acceptance includes verified fiscal profiles and invoice issuance,
actual center payout routing and confirmation, store/course collection and
refund integration, mixed-line order acceptance, rental refunds and damage/
deposit terms, wallet/reward and instructor compensation rules, organization
payment delegation, and the procurement/contract/integration cycle. Scope
completion must be recorded only after its own implementation, acceptance,
publication and verification evidence exists.

Primary references checked for this implementation:

- [Saudi E-Commerce Law](https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/360de590-0286-4fa5-a243-aa9100c31979/1)
- [Ministry of Commerce consumer-protection transition FAQ](https://mc.gov.sa/ar/cps/Documents/CPS-FAQ.pdf)
- [Moyasar refund operation](https://docs.moyasar.com/api/payments/05-refund-payment)
- [Moyasar documented idempotency scope](https://docs.moyasar.com/api/idempotency)
