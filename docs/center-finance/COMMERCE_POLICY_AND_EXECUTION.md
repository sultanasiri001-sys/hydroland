# Original commerce terms and financial execution

Policy version: `2026-11-21.1`. This delivery implements parts of B01, B02,
B04 and B08. It does not close the seven orange scopes or demonstrate a live
bank transfer, tax invoice, or complete mixed-store financial lifecycle.

## Approved customer rules

| Line kind | Ordinary customer cancellation | Separate cases |
| --- | --- | --- |
| Trip | Full refund at least 48 hours before the original departure; 50% refund inside 48 hours. The exact 48-hour boundary is included in the full-refund window. | Verified no-show/late arrival after closure has no ordinary refund. Mandatory rights and provider failures remain separate. |
| Course | No free cancellation window after confirmation; no ordinary refund for no-show or voluntary withdrawal after starting. | New course refund terms (2026-11-21.2) deduct 25% and refund 75% when a confirmed course is cancelled more than 48 hours before its original start. With exactly 48 hours or less remaining, voluntary cancellation has no ordinary refund. Existing contracts retain their recorded terms. Provider cancellation before starting gives a full refund. |
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
Single-center physical-goods orders and store course enrollments now have their
own source-bound hosted checkout and collection paths. Each requires explicit
acceptance of the original quote, a durable dispatch record, matching provider
evidence and an independently approved posted collection entry. A lost invoice
response requires reconciliation of that original invoice; it never creates a
replacement payment automatically. Tax identity is not inferred from a commercial registration.
Trip payment capture can create an immutable `DRAFT` commercial invoice; missing
verified fiscal data remains `REVIEW_REQUIRED`.

Course collection leaves the enrollment `PENDING`. Training activation, sessions,
progress and completion retain their qualification and training-standard checks
and require the purchased course's collection evidence. Client metadata cannot
set `financialConfirmation`. The hosted course link expires after 30 minutes or
at the original start, whichever comes first; this technical expiry does not
invent a cancellation charge or change the original course schedule.

Goods fulfillment requires its provider and posted ledger evidence, not a local
`CAPTURED` label alone. Pending or uncertain payments prevent inventory from being
released by order cancellation. Mixed suppliers, mixed service kinds and missing
original contracts remain review cases. See [goods collection](STORE_HOSTED_COLLECTION.md).

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

Overlapping Serializable reservations can report a unique-key conflict after
waiting for the advisory lock. Recovery applies only to that rolled-back
reservation: a fresh transaction reads the exact idempotency key and rechecks
the actor, request fingerprint, payment, customer request, ledger entry and
current mandate. Another nonce or changed request cannot adopt the existing
operation. Provider dispatch and financial posting are outside this recovery.

A validated POST response is saved before the ledger posting transaction. The
operation, payment counter, existing ledger entry and audit are then committed
together. A timeout or uncertain response remains
`RECONCILIATION_REQUIRED`. A later cumulative provider GET cannot attribute
someone else's dashboard refund to this operation. Reconciliation may finish a
posting rollback only from the saved, validated original POST result.
An uncertain result reports `financialOutcome: UNKNOWN` and
`financialActionExecuted: null`; it never asserts that no money moved after a
timeout that could have occurred after the provider applied the refund.

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

Rental refund requests now bind the customer, original terms and verified
collection. Eligible pre-handover cancellation stops equipment handover under
the same rental lock. Refund execution requires the approved ledger entry and
current monetary mandates, and records the provider result and financial posting
without a repeated provider POST. Customer assertions of provider failure require
independent center confirmation. The customer's later suspension cannot erase or
prevent recording a refund already dispatched. The account interface distinguishes
the requested amount from the sum of confirmed refunds. See
[rental refund execution](RENTAL_REFUND_EXECUTION.md).

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

## Course cancellations and goods returns

A buyer can cancel a financially confirmed course in the store. The server freezes the request time and evaluates the original refund policy, schedule and collection. The cancellation receipt records eligibility. A delegated executor uses an independently approved SAR ledger entry to pay an eligible claim back to its original provider payment.

Goods delivery is acknowledged by the buyer per order item and quantity. The seller records actual return receipt separately and documents the inspection or verified remedy before execution. Both course and goods executions reserve one operation per claim. A lost provider response requires reconciliation and never authorizes a second dispatch.

The finance routes are `POST /payments/courses/cancellations/:id/refund` and `POST /payments/goods/returns/:id/refund`. Both take the approved `financeEntryId`. Replaying the same request reads or posts the saved provider proof. The ledger reference types are `COURSE_CANCELLATION_REFUND` and `STORE_GOODS_RETURN_REFUND`, respectively. An unknown outcome without attributable provider evidence remains open for investigation.

## Evidence and remaining scope

Acceptance uses disposable loopback PostgreSQL and a local synthetic provider,
including concurrent attempts, original-term changes, invalid scope, expired or
revoked mandates, timeout after provider application, and posting rollback.
GitHub CI also runs browser acceptance and existing API regressions on the exact
candidate commit. No test credentials authorize real merchant transactions.

Remaining acceptance includes verified fiscal profiles and invoice issuance,
actual center payout routing and confirmation, store/course return and
refund integration, mixed-line order acceptance, rental damage/deposit terms
and applicable-rights review, wallet/reward and instructor compensation rules, organization
payment delegation, and the procurement/contract/integration cycle. Scope
completion must be recorded only after its own implementation, acceptance,
publication and verification evidence exists.

Primary references checked for this implementation:

- [Saudi E-Commerce Law](https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/360de590-0286-4fa5-a243-aa9100c31979/1)
- [Ministry of Commerce consumer-protection transition FAQ](https://mc.gov.sa/ar/cps/Documents/CPS-FAQ.pdf)
- [Moyasar refund operation](https://docs.moyasar.com/api/payments/05-refund-payment)
- [Moyasar documented idempotency scope](https://docs.moyasar.com/api/idempotency)
- [PostgreSQL Serializable transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
