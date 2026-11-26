# B08 — Mixed native commerce order and source financial acceptance

## Scope and status

B08 creates one customer order containing goods, a trip, a course and equipment
rental while preserving each original service, supplier, price, policy and
financial record. The order is a reference group with `paymentMode: PER_SOURCE`.
Each child collects through its established checkout and remains independently
visible after cancellation, execution or refund.

The complete local B08 HTTP/financial acceptance run passed **25 of 25 checks** on
2026-11-26. This document describes the implemented boundary and executable local
acceptance scenarios. Its verification record contains observed local results. Exact CI,
merged-revision, deployment and live-verification evidence belongs in the release
PR and the existing Linear/Tracker entries after those checks complete.

The original B12 organization mandate, prepayment, invoice and transfer workflow
remains the authority for organization bookings. The B08 trip child is a personal
`Booking`; its center entitlement reuses the existing trip entitlement service.
Sultan's ordering keeps **Q01 last**. This work neither advances that gate nor
claims it completed.

## One transaction, original children

`POST /store/unified-orders` accepts a stable UUIDv4 `requestId` and one to fifty
native offering selections. Authenticated customers can retrieve their own
orders through `GET /store/unified-orders` and `GET /store/unified-orders/:id`.
Identity, supplier and authoritative price come from the authenticated account
and original records.

| Selection | Client fields | Native child | Grouping |
|---|---|---|---|
| `GOODS` | `productId`, `quantity` | `StoreOrder` / `STORE_ORDER` | One child for each supplying center; every original good remains in `contractSnapshot.lines` |
| `TRIP` | `tripId`, `seats` | `Booking` / `TRIP_BOOKING` | One child for each selected trip; native participant creation remains in place |
| `COURSE` | `courseId` | `TrainingEnrollment` / `TRAINING_ENROLLMENT` | One native enrollment for each selected course |
| `RENTAL` | `resourceId`, `scheduledHandoverAt`, `dueAt` | `EquipmentRental` / `EQUIPMENT_RENTAL` | One child for each supplying center and matching handover/return window |

`resourceId` is the `CalendarResource.id` published as `id` by
`/store/rental-offers` and bound to the serialized `EquipmentBarcode`. The rental
child uses the existing equipment-rental contract and calendar holds. The price
remains the published original price for that resource; this change introduces
no duration multiplier or rental pricing rule. Rental timestamps require a real
calendar date and explicit time zone.

Every selection may supply `expectedUnitPriceMinor`. The server compares it with
the current original offer while creating the child and then permanently saves
the resulting original contract. A later catalog price or promotion change does
not rewrite an existing order. Duplicate offering selections, unknown fields,
client-supplied account/supplier identity and a reused request ID with different
contents are refused.

The service extracts transaction-aware creation helpers from the original store,
trip, training and rental services. The helpers retain their native authority,
stock, capacity, eligibility, boat, publication, contract and reservation guards.
All child creation, stock/seat/equipment reservation, parent lines and creation
audit run inside one serializable database transaction. A rejected last child or
an audit/database failure rolls back every earlier child in that basket.

An account/request advisory lock and a canonical request fingerprint make a
concurrent identical submission replay the saved order. Offering ordering is
canonicalized before fingerprinting. Native inventory/capacity locks and unique
source links prevent the same reservation from being silently consumed or linked
twice. One group line represents one native child, so two goods from one center
do not duplicate its order total.

The parent does not create a `StorePayment`, call a payment provider, allocate a
center entitlement or create a new financial balance. Its creation response
explicitly has `financialActionExecuted: false`.

## Independent checkout and immutable terms

Each returned line identifies its native `sourceType`, `sourceId`, supplying
`organizationId`, original amount/currency, complete `contractSnapshot` and
`contractHash`. Its actions point to the established native quote, checkout,
refresh and supported cancellation routes.

| Source | Original payment route | Invoice document identity |
|---|---|---|
| Goods | `/store/orders/:id/quote`, `/checkout`, `/refresh` | `STORE_ORDER` / store order ID |
| Trip | `/payments/bookings/:id/quote`; checkout at `POST /payments`; refresh by native payment ID | `TRIP_PAYMENT` / native payment ID |
| Course | `/payments/courses/:id/quote`, `/checkout`, `/refresh` | `TRAINING_ENROLLMENT` / enrollment ID |
| Rental | `/payments/rentals/:id/quote`, `/checkout`, `/refresh` | `EQUIPMENT_RENTAL` / rental ID |

Each checkout separately requires the customer's original quote/policy
acceptance and its native idempotency key. An accepted quote from another source,
a fabricated quote hash or another customer's identifier cannot authorize
collection. Goods, trip, course and rental refunds continue to use their original
saved policy snapshots and native refund operations. Grouping the sources does
not introduce a basket-wide cancellation fee, inferred tax rate or shared refund
policy.

The saved group contract is compared with its original source on every read.
Changed or inconsistent source terms require review and withhold payment
actions. The customer can continue to inspect the saved original contract.

## Verified customer financial projection

The group reads existing collections and refund journals. A provider status label
alone never establishes an amount as paid. For goods, training and rental, the
projection reuses `commerceSettlementCandidates` together with the native
accepted-contract binding. It matches the original checkout, customer, supplying
center, provider references/proof, collection evidence and independently
approved, posted revenue. Confirmed refunds must match their posted original
refund journals and contiguous provider-refund balances.

For the personal trip, the projection requires the accepted original contract,
provider reconciliation/capture audit and matching independently posted native
collection. Each confirmed refund must have its original
`CommerceRefundOperation`, attributed provider POST response, payment binding,
ordered refund baseline and independently posted refund entry. Conflicting
payments or an unattested cumulative refunded amount require review.

The projection also searches historical capture/collection evidence. Changing a
payment label to `CANCELLED` after collection cannot erase that evidence or imply
a refund. Cancelling the booking itself retains the proven payment history.

| Customer field | Meaning |
|---|---|
| Line `capturedMinor` | Original verified gross collection for that source |
| Line `refundedMinor` | Verified, posted native refunds for that source |
| Line `netCollectedMinor` | Verified capture less verified refunds |
| Line `remainingMinor` | Original source amount not yet verified as collected |
| `collectionVerified` | Original collection/refund evidence matches the source |
| `financialReviewRequired` | Evidence is missing, contradictory or ambiguous; affected money fields are `null` |
| `refundPending` | A native refund operation is still pending or under reconciliation |
| Order `paidMinor`, `refundedMinor`, `netCollectedMinor`, `remainingMinor` | Sums of the corresponding independent source amounts; a sum is `null` if any constituent is unknown |

A confirmed refund does not create a new amount due: `remainingMinor` is based on
the original gross capture, and refunds have their own field. It is a collection
comparison with the original contract, not an instruction to charge a cancelled
source. The customer interface displays unknown amounts as requiring review.

Rental `paymentStatus` shows the native checkout state, while
`sourcePaymentStatus` preserves the original equipment workflow's payment state.
A captured checkout therefore does not imply equipment handover. Native service
`status` remains separate from the collection/refund amounts.

Each line exposes only its original invoice document/finalization reference,
number, issuance state and permitted document URL. The trip document key is
`TRIP_PAYMENT` / payment ID; its new generic finalization key is `TRIP_BOOKING` /
booking ID. Buyer responses contain no allocation decisions, center bank details
or transfer evidence.

## Original final invoice and explicit tax

The supplying center's scoped accountant finalizes the attached original invoice.
The server requires verified original collection, the supplying center's declared
legal/financial profile and a seller/customer/document binding whose PDF SHA-256
matches its stored original. The accountant supplies the original issuance
timestamp, current evidence hash and an explicit tax amount for every original
source line. Unknown, duplicate, omitted or additional lines are refused.

Tax is not calculated from a guessed rate. Each declared line tax must fit within
its original gross amount, and an explicitly exempt financial profile requires
zero tax. The finalization snapshot preserves the original issuer, customer,
contract, amount, collection, invoice number, PDF digest, issue time and declared
tax lines. Its currency is SAR; subtotal plus tax equals the original amount.

The shared `commerce-invoice-finalization.ts` validator serves both the accountant
and customer projections. It binds snapshot fields to the finalization row,
checks every original tax line and validates the native invoice's issuance state
and timestamp where `StoreInvoice` or `Invoice` exists. A void native invoice or
tampered tax/snapshot evidence cannot support settlement. An identical
finalization replays; a different document, issue time or declaration cannot
replace the original. Audit failure rolls back finalization and the native
invoice update together.

The hosted goods checkout deliberately has no native `StoreInvoice` before this
review. When absent, finalization creates that native invoice as `PAID`, with the
reviewed issuance time, in the same transaction. Its internal reference is
`HL-STORE-<native payment ID>`; the seller's own invoice number remains in the
original document and seller-scoped finalization. An existing draft is issued;
an existing void invoice is refused. The native payment/invoice unique relation
and source transaction prevent duplicate creation on retry.

The existing goods notification behavior is retained: document attachment may
already have queued the source's invoice notice. The native issue trigger uses
the same `STORE_ORDER`/order ID/customer identity, and the existing unique notice
key prevents a second email/inbox notice at finalization. This change does not
send a separate invoice announcement.

This records review of the seller's original. `taxAuthorityVerified` remains
`false`; synthetic documents and acceptance fixtures are never tax certification.

## Execution, allocation and independent receipt

Verified collection alone does not make an unperformed source payable to a
center. Source eligibility requires its original operational completion:

- Goods require customer receipt covering the original quantities, native receipt
  audit evidence and reconciliation of any return/refund claim.
- Training requires the completed enrollment and training record, original
  completion audit, finished stages/skills and applicable training-standard
  completion evidence.
- Rental requires the paid native rental, actual handover/return for its items
  and original item/rental completion audits.
- Trip eligibility reuses the existing personal trip entitlement evaluation,
  including actual trip completion and the original participants' attendance.

For goods, training and rental, the current verified refund balance reduces
eligible gross proceeds. The trip retains its existing entitlement refund guards;
grouping does not relax them. An unresolved refund or contradictory
execution/collection blocks preparation. A current
platform finance approver explicitly records the ledger account, commission and
other deductions against the current source evidence hash. There is no default
commission or assumed deduction. Revocation, changed evidence or lost approver
authority invalidates the allocation for subsequent preparation/receipt checks.

The center accountant prepares the exact approved net settlement in the existing
ledger. It receives the existing independent financial approval. The generic
entry creation and posting routes reject the protected source-entitlement
references; they cannot bypass source validation or receipt evidence.

Goods, training and rental preparation require the final original invoice. The
personal trip retains the existing sequence: its eligible, explicitly allocated
entry may be prepared as `PENDING_APPROVAL` before invoice finalization.
Consequently the trip's inherited `canPrepareSettlement` describes pending-entry
preparation, while `invoiceFinalized` remains a separate condition. The B08
interface also requires finalization before offering its preparation action.
Every source requires the valid final invoice before transfer submission and
again before independent receipt confirmation; preparing a pending entry does
not establish a payout.

The platform records a transfer already executed externally, with its exact net
amount, bank reference, timestamp and original PDF. A different center accountant,
independent of the settlement requester, approver and transfer submitter, confirms
receipt with a separate incoming proof and receipt timestamp. Submission keeps
the settlement `APPROVED`; confirmation atomically posts it and records the
receipt/audit. Before posting, the service reevaluates the current source,
completion, collection, refunds, allocation, final invoice and document hashes.

Source and normalized bank-reference locks are shared with B12. Both receipt
tables are checked for an active settlement or reused reference. One transfer
reference cannot settle a different source through the other workflow. Rejection
retains history; retries and concurrent requests cannot create a second active
receipt. An audit failure rolls the posting and receipt decision back together.

The transfer response remains explicit:

```json
{
  "bankTransferExecuted": false,
  "externalTransferConfirmed": true,
  "providerVerified": false
}
```

The application records independently reviewed external-transfer evidence. It
does not dispatch a bank transfer through this workflow.

## Customer and finance interfaces

The customer store interface includes a mixed basket, source-specific fields,
original contracts, per-source checkout and separate collection/refund amounts.
Goods-only baskets containing multiple supplying centers also use the unified
route, producing one original `StoreOrder` and independent checkout/invoice for
each center. A goods-only basket from one center retains its existing native
store checkout.
Session fencing prevents an earlier customer's asynchronous response from being
shown or acted on after an account change. Integration hooks remain in the
existing store entry.

The finance interface lists actual centers and native sources, supports the
original invoice and explicit per-line tax review, owner allocation, accountant
preparation and the commerce variant of the existing transfer register. It uses
the approved allocation account and exposes no default commission choice.

Implementation and focused browser evidence are in
`apps/web/src/hydroland-store-unified.js`,
`apps/web/src/hydroland-commerce-finance.js`,
`apps/web/e2e/store-unified-orders.spec.js` and
`apps/web/e2e/commerce-finance.spec.js`. The focused customer/finance suite passed
66 tests with no failures, retries or skips. After the multi-center goods routing
change, two targeted tests passed: the new multi-center flow and the existing
single-center flow. These are separate runs, not a claim of one 67-test run.
Two affected finance tests were rerun successfully after their preview fixtures
were aligned with the actual post-approval review state. The web's 159 unit tests
and six existing web validation gates also passed locally.

Focused coverage includes exact trip/rental payloads and native consent, original
invoice identities, server-projected amounts including unknown/refunded values,
late create/quote/checkout responses, account changes/logout/dismissal, actual
financial choices, explicit zero-valued decisions, read-only/unauthorized states
and late finance reads/writes. Browser execution used the available local
Chromium 153 with a temporary configuration outside the repository; the default
CI browser configuration is unchanged. The mobile view was inspected without
horizontal overflow.

## Executable acceptance evidence

All fixture accounts, offerings, provider responses, documents and bank references
are synthetic. The acceptance database is disposable loopback PostgreSQL, and
provider HTTP is intercepted by a local test provider. Original service endpoints
create and complete the same native sources; financial assertions do not replace
them with unrelated sales. Deliberate corruption cases affect only this fixture
and restore the changed evidence.

The B08 fixture asserts that the database session uses UTC, matching this CI
database configuration and the application's persisted-instant convention.
Customer scheduling/display still uses the explicit original time zone. These
results do not certify legacy operational-clearance behavior under a different
database session time zone. They do not establish the live database's session
time zone, which was not inspected as part of this acceptance.

The fixture amounts below are **minor SAR units (halalas)**. They were verified by
the successful `B08_MIXED_NATIVE_ORDER` run, whose local output is
`b08-full-acceptance.json`; they are synthetic acceptance evidence.

| Native source | Original capture | Posted refund | Net collected | Explicit commission | Expected center settlement |
|---|---:|---:|---:|---:|---:|
| Goods, two units | 2,400 | 1,200 | 1,200 | 100 | 1,100 |
| Trip, one seat | 2,300 | 0 | 2,300 | 100 | 2,200 |
| Course | 3,400 | 0 | 3,400 | 100 | 3,300 |
| Rental | 4,500 | 0 | 4,500 | 100 | 4,400 |
| **Total** | **12,600** | **1,200** | **11,400** | **400** | **11,000** |

Thus the synthetic order is SAR 126, the goods refund is SAR 12, net collection
is SAR 114, explicit commissions total SAR 4, and synthetic posted center
settlements total SAR 110. The fixture explicitly declares an exempt profile and
zero invoice tax; its commission is separate from that declaration.

The same successful run also exercised a second complete mixed order through
native cancellation and refund operations. Its original collection was 12,600
minor units. The original course policy permitted 2,550 back, the rental returned
4,500, and the trip returned 2,300: a total verified refund of 9,350. Each refund
was attributed to its original source and executed once through the synthetic
provider and existing refund ledger. Cancellation itself did not move money, and
another customer's requests were refused.

The remaining 3,250 comprised the unfulfilled goods and the course amount retained
under its original policy. **Supplier settlement stayed zero** for all unperformed
sources, including retained money. All four original source references remained
attached to that same second order. The projection showed the proven refund and
net collection separately, without reopening an amount to collect.

The passing execution also verified that completing only the goods does not earn
entitlement for the other three sources; two centers produce distinct original
goods orders; corrupted collection/payment state produces review; invoice tax
tampering and native voiding block settlement; and receipt audit failure/stale
evidence cannot partially post a transfer. The external bank-execution flag was
`false` throughout.

| Boundary | Executable evidence |
|---|---|
| Native creation, atomic rollback, concurrency, ownership, replay, original snapshots and separate provider/ledger collection | `apps/api/scripts/mixed-commerce-http-checks.cjs` |
| Real Nest HTTP/session setup, isolated provider and original offerings | `apps/api/scripts/mixed-commerce-fixture.cjs` |
| Original goods, rental, training and trip completion; native refund execution | `apps/api/scripts/mixed-commerce-execution.cjs` |
| Collection tampering, cancelled payment ambiguity, independent refund totals, invoice integrity, allocations, receipt independence, stale evidence and audit rollback | `apps/api/scripts/mixed-commerce-finance-checks.cjs` |
| Forward migration/replay with historical TEXT and UUID identities, original history and unique source/receipt/settlement constraints | `apps/api/scripts/b08-migrations-db-checks.mjs` |
| Customer source/checkout/session handling and finance workflows | The two focused browser specs listed above |

The migrations add grouping and evidence tables. They preserve existing contracts,
payments, balances and original identities. Conditional check installation also
applies the SQL-only invariants when CI has first created the tables through
`prisma db push`; raw migration replay does not skip those constraints. Existing
production-applied migration checksums are unchanged.

The API CI workflow includes the migration and full mixed-commerce HTTP suite in
its disposable-database gate. The source changes also participate in the existing
API and full web validation gates.

### Verification record

| Check | Recorded result |
|---|---|
| API TypeScript (`npm --workspace @hydroland/api run typecheck`) | Passed locally on 2026-11-26 after shared invoice validation and cancellation ambiguity handling |
| `git diff --check` | Passed locally on 2026-11-26, including final acceptance documentation |
| Full B08 clean-database HTTP/financial suite | **25/25 passed**, `B08_MIXED_NATIVE_ORDER`, synthetic loopback provider and disposable UTC PostgreSQL; verified both completed/settled and cancelled/refunded mixed orders |
| TEXT/UUID migration suite with replay | Passed after fresh and checkless-bootstrap coverage with conditional constraint installation |
| Existing B12 acceptance | 15/15 passed |
| Original policy/contract/entitlement checks | 38/38 passed |
| Store payment boundaries | 24/24 passed |
| Focused customer/finance browser suite | 66/66 passed; subsequent multi-center/single-center routing checks 2/2 passed; two affected finance checks rerun 2/2 passed |
| Web unit tests and validation gates | 159/159 tests and all six existing validation gates passed |
| CI revision, merge, deployment and live checks | Recorded separately in the release PR and existing Linear/Tracker entries when verified; not claimed by local fixtures |

## Operational acceptance

Technical acceptance requires the actual successful gates, merged revision,
deployment and live verification to be recorded. The first real mixed customer
order, original supplier invoices, actual service fulfillment, any real refund
and the first independently confirmed real transfer remain operational evidence
when those transactions occur through the implemented workflows.

No synthetic invoice, mock provider response or fixture receipt is recorded as a
real sale, tax-authority confirmation or proof that funds reached a production
bank account. This technical implementation does not authorize generating a real
charge or bank transfer to manufacture an acceptance event. Q01 remains last in
the agreed sequence.
