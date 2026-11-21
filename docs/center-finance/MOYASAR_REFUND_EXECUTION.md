# Moyasar refund execution boundary

Reviewed on 21 November 2026 against the official API documentation. This adapter
does not itself authorize a refund, reserve a financial balance, post the ledger,
or replace the application operation journal.

## Adapter contract

`fetchPayment(providerPaymentId, { invoiceId, amountMinor, currency })` fetches the
original payment and verifies all four identifiers/amount fields. Its result
contains only payment/invoice IDs, status, original amount, currency, captured and
cumulative refunded amounts, and provider timestamps. It excludes card data,
payment tokens, payer details, descriptions, and arbitrary metadata.

`refundPayment({ providerPaymentId, invoiceId, amountMinor, currency,
refundAmountMinor, expectedRefundedMinor })` requires the original payment amount
separately from the requested refund. It performs a fresh bound GET and checks the
expected cumulative refund and the captured ceiling. It then sends exactly one
POST with an explicit `amount`, including for a full refund. A verified result
must preserve the payment binding and capture, increase the cumulative refunded
amount by exactly the requested amount, and contain valid provider timestamps.

The standard purchase flow uses `paid` for an automatically captured payment.
Manual capture uses `captured` and can have a ceiling below the original amount.
The provider's `refunded` amount is cumulative; the response does not establish a
new, separately identified refund object.

## Required orchestration

Before invoking the mutation, the caller must persist its idempotent operation,
validated authorization, policy decision, amount reservation, payment binding and
expected provider balance. Only one mutation may be in flight for a payment.
Repeated application requests must read that same operation instead of calling
the adapter again. The successful result must be reconciled into the existing
financial ledger exactly once.

`PAYMENT_REFUND_BALANCE_CHANGED`, `PAYMENT_REFUND_PROVIDER_REVIEW_REQUIRED` and
`PAYMENT_REFUND_CAPTURE_LIMIT` occur before any refund POST. All errors after the
POST is attempted, including an HTTP error, lost connection, redirect or invalid
returned balance, yield `PAYMENT_REFUND_RECONCILIATION_REQUIRED`. The caller must
retain an uncertain operation and reconcile through GET. It must not treat a
timeout as failure, release the reservation and send a fresh refund blindly.

The provider documents creation idempotency for payments and payouts, but the
reviewed refund endpoint does not document a refund idempotency key. No such
guarantee or distinct provider refund ID is invented here. Dashboard or other
external concurrent operations remain a reconciliation concern; a matching
cumulative balance alone cannot prove which external actor initiated a refund.

The current operation guide lists `paid` and `captured` as the allowed starting
states for refund POST. A new POST from `refunded` is therefore refused, even if a
partial refund leaves a positive balance. Supporting repeated refunds from that
state requires confirmed provider capability; the adapter can still fetch and
reconcile the remaining balance.

## Verification and scope

`apps/api/scripts/moyasar-refund-provider-validation.cjs` uses only disposable
loopback HTTP servers and synthetic credentials. It covers binding, full and
partial refunds, partial capture, cumulative balance changes, invalid evidence,
provider errors, connection loss and redirect refusal. It makes no external
provider calls and proves no real customer refund or provider-account activation.

## Primary references

- [Refund endpoint](https://docs.moyasar.com/api/payments/05-refund-payment)
- [Fetch payment](https://docs.moyasar.com/api/payments/02-fetch-payment)
- [Payment operations](https://docs.moyasar.com/guides/payment-operations)
- [Idempotency](https://docs.moyasar.com/api/idempotency)
- [Payment statuses](https://docs.moyasar.com/api/payments/payment-status-reference)
