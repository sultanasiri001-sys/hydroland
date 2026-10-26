# Store/course payment closure — 26 October 2026

Status: **local bookkeeping integrity fixed; commercial payment activation blocked**.
Inspection baseline: canonical `main` commit `908f389`. This is not a declaration
of store collection, course payment, tax invoicing, production deployment, or
operator acceptance. No provider was contacted and no financial policy was enabled.

## Implemented now: atomic bookkeeping, not collection

`StoreService.createPayment` now validates owner, terminal order state and replay
inside the same serializable transaction as the `StorePayment` insert and its
actor-attributed audit. A failed audit rolls back the local record. A unique-key
race re-runs the guarded transaction instead of bypassing current order state.
A non-string/blank idempotency key produces a client error, not a TypeError.

`updateOrderStatus` now commits status, cancellation stock restoration and audit
together. Its actor comes from the authenticated controller request, never the
request body. Retries no longer produce ghost/duplicate order audits. Existing
payment-required fulfillment and captured-payment cancellation restrictions stay
unchanged. The response remains `provider: NOT_SELECTED` and
`financialActionExecuted: false`; **no PSP integration was added**.

This prevents new audit gaps. It does not fabricate missing historical audits or
silently repair old records. Any historical reconciliation is a separate scoped,
read-only inventory followed by an approved remediation plan.

## Current capability map and source evidence

Links are pinned to the inspection baseline; local changes are described above.

| Capability | Actual current contract / gap | Canonical source |
|---|---|---|
| Store order | Server selects active products and prices, aggregates quantities, reserves stock in a serializable transaction. Order creation has no request idempotency key, hold expiry, or quote/merchant snapshot. | [StoreService order](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/store/store.service.ts#L44-L91) |
| Store payment | One local record per order, globally unique key; ownership and replay checks. No provider checkout, refresh, webhook capture writer or refund command. | [Store payment record](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/store/store.service.ts#L94-L119), [schema](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/prisma/schema.prisma#L1829-L1866) |
| Order fulfillment | Manual admin transition; `FULFILLED` requires `CAPTURED`; cancellation of captured payment is blocked pending an approved refund flow. There is no store capture writer to reach that state through the implemented payment API. | [Transitions](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/store/store.service.ts#L145-L172) |
| Course enrollment | Active-account/active-offer checks, serializable capacity, same-student replay and immutable enrollment price/date metadata. Remains `PENDING`, with `financialActionExecuted: false`. There is no persisted payment/intent FK for a course enrollment. | [Enrollment](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/store/store-offerings.service.ts#L138-L159), [TrainingEnrollment](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/prisma/schema.prisma#L1642-L1663) |
| Course delivery | Scoped instructor assignment, sessions/attendance, assessed skills and guarded completion exist. `START` can move `PENDING` to `ACTIVE` without a payment check. Generic status updates have training/capacity guards, not a commercial gate. Payment must not be misrepresented as training completion/certification. | [Session start](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/governance/training-session.service.ts#L144-L161), [status transitions](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/governance/training-repository.service.ts#L53-L68) |
| Trip payment | Existing operational provider gate, server quote, minimum/zero-price behavior, provider invoice claim/recovery, protected refresh, authoritative webhook fetch and matching amounts/currency/metadata. Persisted `Payment` requires a real Booking. | [PaymentsService](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/payments/payments.service.ts#L35-L118), [provider](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/payments/moyasar-payment-provider.service.ts#L12-L92) |
| Invoice/issuer | StoreInvoice currently has payment ID, number, status and dates, but no issuance writer or issuer/customer/tax snapshot. Its presence is not evidence of an operational invoicing capability. | [StoreInvoice](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/prisma/schema.prisma#L1858-L1866) |
| UI honesty | Store frontend deliberately distinguishes record creation from collection and does not call booking payment routes. Trip UI separates capture from operator booking confirmation. | [Store UI validator](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/web/scripts/store-checkout-validation.mjs), [paid-booking contract](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/docs/PAID_BOOKING_STATUS_2026-10-20.md) |

### Currency integrity gap — not silently resolved

Center product/course writers currently fix currency to SAR, but admin product
input accepts any uppercase three-letter currency. `createOrder` sums product
amounts without checking currencies and leaves `StoreOrder.currency` at its SAR
default. Thus non-SAR or mixed-currency admin products can be mislabeled; there is
no conversion contract. No exchange rate, currency restriction, price or charge
was invented in this package. Before activation, Finance must select the supported
currency contract; implementation must reject mixed/unsupported currencies before
stock mutation, or preserve a single explicitly supported currency throughout.
See [admin validation](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/store/store.service.ts#L15-L31)
and [order construction](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/apps/api/src/store/store.service.ts#L62-L87).

## Reusable server contract — proposed, not activated

Follow the [canonical ownership rules](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/docs/HYDROLAND_CANONICAL_ARCHITECTURE.md)
and [adapter/workflow architecture](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/docs/ARCHITECTURE_FREEZE_V1.md#L49-L76):
`store` owns orders/stock, `governance` owns enrollment/training, `payments` owns
provider verification and payment state, Finance owns invoice/accounting policy.
Do not create fake Bookings for products/courses or a second independent Moyasar
adapter. Reuse the existing adapter's transport/verification behavior only behind
an explicitly approved, typed subject contract.

Proposed subject reference: `{ kind: TRIP_BOOKING | STORE_ORDER | COURSE_ENROLLMENT,
id }`. This is a design shape, not a new persistence model or API in this patch.
The approved canonical intent must bind:

- authenticated payer account + actual customer/merchant/center identity;
- typed subject and immutable server quote/version, amount and one currency;
- scoped idempotency key plus request fingerprint (reject changed input);
- unique provider invoice/payment identifiers and payment attempt lifecycle;
- approved policy/approval references and actor attribution.

Lifecycle boundaries:

1. **Prepare local intent**: authorize subject and owner; read source price;
   validate stock/seat hold and commercial policy; atomically persist intent/audit.
   Replays recover the same accepted request, not a new charge.
2. **Prepare external checkout only when authorized**: integration state + merchant
   contract + approved subject gate must all pass. Handle uncertain provider
   creation explicitly; a DB transaction is not an external exactly-once guarantee.
3. **Verify**: callback query parameters are never financial evidence. Authenticate
   provider events, enforce live/sandbox boundary, fetch authoritative provider
   state, compare local amount/currency/subject metadata and identifier binding.
4. **Reconcile atomically**: durable event deduplication/locking, allowed monotonic
   transitions, payment state + audit in one transaction. Duplicate/concurrent,
   out-of-order, unmatched and mismatched events need explicit outcomes. The trip
   webhook's read-before-insert audit check is not by itself a durable concurrent
   exactly-once guarantee; do not copy it as such.
5. **Fulfill separately**: capture alone never starts a course, confirms a trip,
   issues a certificate, fulfills goods or creates a refund. Authorized domain
   owners execute their independently checked action and evidence.
6. **Refund separately**: approved refund request/decision, provider execution and
   verified reconciliation are distinct. Cancellation is not proof of a refund.

## Decisions that block commercial closure

| Decision owner | Exact unresolved target/action | Why blocked / acceptance evidence |
|---|---|---|
| Finance + Legal + Executive authority | Merchant/issuer and payer/customer for platform vs center sales; treatment of multi-center baskets | A single StoreOrder can reference products from several organizations; no approved split/settlement/issuer contract. Require named entity ownership and approved scoped terms before checkout. |
| Finance | Currency, tax/adjustment and invoice lifecycle/version/numbering | No supported conversion/tax/issuer snapshot contract. Require approved quote/invoice schema and versioned policy; do not infer rates or legal obligations. |
| Finance + authorized service owner | Refund eligibility, approvers, partial/full refund, cancellation/stock restoration timing | Current captured cancellation is fail-closed. Require approved state machine and evidence that duplicate/uncertain refund execution cannot repeat collection reversal. |
| Payments architecture + sole schema owner | Canonical payment intent/subject relation and durable uniqueness/event reconciliation | Existing Payment has required booking FK, StorePayment has order FK, enrollment has neither. Require additive reviewed persistence design after deployed migration reconciliation; no shadow payment tables or fake bookings. |
| Training owner + Finance + Executive authority | Whether and when paid courses require collection before activation/start; free/waived/review paths | Current session START activates enrollment without payment. Require explicit versioned policy and all activation routes enforcing it; never auto-grant training credit/certificate. |
| Store/operations owner | Reservation expiry/release, goods/service fulfillment evidence, authorized center scope | Unpaid order stock and pending course capacity have no expiry contract; initial order creation has no idempotency key. Require approved hold/retry/expiry and fulfillment responsibilities. |
| Release/operations owner | Publish, merge, sandbox UAT and production payment activation | This lane has local-only authority. Remote publication is pending specific approval; merge/deploy/PSP activation is not authorized by this package. |

The [organization commercial proposal](https://github.com/sultanasiri001-sys/hydroland/blob/908f389/docs/ORGANIZATION_BILLING_AND_BOOKING_GATES_PROPOSAL.md)
is useful precedent for decision fields, **not an approved store/course policy**.

## Acceptance and reproducible evidence

### Passed locally

- 21 offline actual-service regressions: ownership, strict key input, exact replay,
  conflicting key/subject, deterministic P2002 recovery with terminal recheck,
  atomic audit rollback, status/stock guards, course snapshot/capacity/replay.
- 20 real PostgreSQL/HTTP checks on a new disposable loopback PostgreSQL 16 DB:
  post-audit P2034 retries, 8 concurrent payment calls, 8 cancellation calls,
  payment/cancellation races, concurrent course capacity, actor attribution;
  actual Nest controller/auth/admin guards reject unauthenticated/non-admin and
  revoked-session requests and ignore a spoofed body actor.
- Baseline PG run reproduced 4 defects (11 pass / 4 fail); fixed expanded run
  passes 20/20. Baseline offline run was 15 pass / 4 fail; fixed expanded 21/21.
- API typecheck/build; web build and 14 unit tests plus all web static validators.
- Two independent read-only implementation reviews found no blocking defect.

Run offline checks: `npm run validate:store-payment-boundaries -w @hydroland/api`.
For DB checks, first build API and bootstrap only a fresh disposable canonical
schema; then run `node apps/api/scripts/store-payment-boundary-db-checks.cjs` with
`CI=true`, `COMMERCE_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY`, and a loopback
`DATABASE_URL` whose database name starts `commerce_test_`. The script refuses
other targets. The local harness owns creating and destroying its test cluster.
A dedicated read-only-permission CI workflow repeats these gates on Node 22/PG16;
it has been authored locally, **not run remotely**.

### Not established

- Lint: baseline package declares ESLint but does not install it; command exits
  127 (`eslint: not found`). No lint pass is claimed.
- Local Node is v24.22.1 versus repository's Node 22 target. Remote Node 22 CI,
  full production migration history, complete application E2E and browser UAT
  are not established by these scoped tests.
- No provider traffic, real transaction, production DB access, tax policy,
  refund approval, wallet/reward mutation, certificate issuance, schema change,
  push, PR, merge or deployment occurred.
