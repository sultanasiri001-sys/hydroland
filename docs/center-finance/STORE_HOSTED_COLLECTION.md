# Original goods order collection

This delivery advances the store collection portion of B08 and the shared B01/B02
contract evidence. It does not close the orange group, implement goods refunds,
issue a tax invoice, or execute a center bank transfer.

## Supported contract

`GET /store/orders/:id/quote` reads the order owner's immutable line snapshots.
The initial supported scope is SAR physical goods from one active supplying dive
center, with the original legal name, registration and address recorded. Missing
historical snapshots, unclassified services, incomplete issuer identity, mixed
suppliers and unsupported currencies remain `STORE_CHECKOUT_REVIEW_REQUIRED`.
Current catalog edits cannot change the original price, supplier or return policy.
Fiscal verification and invoice issuance remain `REVIEW_REQUIRED`.

`POST /store/orders/:id/checkout` requires `quoteHash`,
`acceptedPolicyVersion` and a stable `idempotencyKey`. The accepted snapshot and
one dispatch claim are saved before the provider request. Invoice creation runs
outside retried database transactions. A lost response stays reserved for
reconciliation and never permits an automatic second POST, including after a
Serializable unique-key race. Existing uncollected local payment placeholders
may be attached only when their customer, amount and currency still match.

The hosted link expires after 30 minutes. This is a technical payment-link
lifetime, not a new cancellation charge or an inventory-release policy.

## Collection and fulfillment

`POST /store/orders/:id/refresh` performs a new provider invoice and payment read.
Webhook dispatch calls the same refresh only after the existing provider adapter
has authenticated the event. Notification amounts, browser success parameters
and client-supplied identity/status fields cannot establish capture. Provider
responses must retain the order, customer, center, amount, currency, invoice,
payment reference and original expiry. Card/source details are not retained.

Unknown, changed, refunded, multiply collected or unresolved authorized outcomes
remain `RECONCILIATION_REQUIRED`. Older capture responses cannot overwrite a
newer refund observation. Cancellation cannot release inventory while an invoice
is pending, uncertain, collected or still has unresolved payment activity. Only
verified terminal unpaid closure makes the ordinary cancellation path available.

The original center's active accountant can use
`POST /store/orders/:id/reconcile-invoice` with `providerInvoiceId` to recover the
original invoice after response loss. Scope is checked before provider access
and after I/O, so revocation during the request cannot save new financial proof.

`POST /store/orders/:id/collection` accepts an existing `financeEntryId`. It
requires a fresh unrefunded capture and a matching independently approved and
posted `REVENUE` entry with reference type `STORE_ORDER_COLLECTION` and reference
ID equal to the order ID. Preparation, approval and posting are separate actors.
One `CommerceCollectionEvidence` binds the accepted contract to this existing
ledger entry; it is not another balance ledger. Proof and audit commit together.

Administrative `FULFILLED` now requires that receipt, the retained provider
evidence, original contract and still-posted ledger agree. A local `CAPTURED`
label alone cannot authorize fulfillment. `CONFIRMED` remains an operational
order label and does not imply that money was collected.

## Acceptance

`apps/api/scripts/store-hosted-checkout-http-checks.cjs` loads the production Nest
controllers, authentication/session guard and actual provider adapter against
disposable PostgreSQL and a loopback HTTP provider. It uses real synthetic login
sessions; no authentication bypass is added to production. The fixture rejects
external network calls and requires `CI=true`, `NODE_ENV=test`,
`COMMERCE_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY`, and a loopback database named
`commerce_test_*`. `STORE_CHECKOUT_TEST_DIST` may point to the compiled API root;
otherwise it uses `apps/api/dist`.

Coverage includes original pricing/issuer preservation, missing and forged
consent, unsupported contracts, concurrent duplicate checkout, audit rollback,
lost response recovery without resend, pending/authorized cancellation guards,
accountant isolation and revocation during I/O, incorrect ledger references and
currency, fabricated capture, concurrent receipt publication, fulfillment,
refund and stale-read races, and authenticated notification semantics. No real
payment, bank payout, tax invoice, reward or wallet movement is produced.

Full release CI and deployed-source verification remain separate release gates.
Remaining commercial scope includes service/mixed-supplier checkout, actual goods
receipt and return workflows, refunds, verified invoice issuance and center payout.
