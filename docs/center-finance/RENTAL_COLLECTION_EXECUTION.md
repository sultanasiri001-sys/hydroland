# Rental checkout, collection and handover

## Implemented boundary

New rental reservations record a distinct future `scheduledHandoverAt`, the return deadline, the single supplying center, explicit item prices and the original policy in `EquipmentRental.contractSnapshot`. Existing rentals keep null original-contract fields and require review. No migration invents a handover time or customer agreement. A return deadline is never used as a handover date.

The customer reads `/payments/rentals/:id/quote`, then submits the returned quote hash and policy version to `/payments/rentals/:id/checkout`. The server records acceptance and one durable `CommerceCheckout` dispatch before requesting a hosted Moyasar invoice. The provider invoice expires at the original 15-minute equipment hold. A lost POST response leaves the same request in review; retries do not send another POST.

`CommerceCheckout` is an operation journal. Accounting remains in the existing `FinanceEntry` and `FinanceApproval` tables.

## Collection workflow

1. The customer reviews the frozen issuer, prices, handover date and cancellation terms and explicitly accepts them. The checkout request contains no price or paid flag.
2. `/payments/rentals/:id/refresh` retrieves the bound invoice and individual payment from the provider. The server verifies the invoice metadata, source, customer, center, amount, SAR currency, full capture and zero refund. A return URL or webhook body only triggers this verification.
3. The existing finance workflow creates, independently approves and posts a `REVENUE` entry with `referenceType=EQUIPMENT_RENTAL_COLLECTION` and `referenceId` equal to the rental ID. Requester, approver and poster are distinct. This implementation does not create financial grants or post entries automatically.
4. An active accountant employed at the rental's center calls `/payments/rentals/:id/collection` with that posted entry ID. The server performs a fresh provider read, rechecks accountant authority and the real ledger/approval rows, then creates one immutable `CommerceCollectionEvidence` record. The entry and provider payment cannot be reused for another rental collection.
5. The established administrative payment confirmation consumes that receipt. It still enforces inspection readiness, calendar conflicts, equipment availability and the hold deadline. It leaves the rental reserved. Each item becomes physically checked out only after its barcode is scanned.

The publisher response and customer screen distinguish provider capture, ledger verification and administrative confirmation. Neither collection publication nor payment confirmation implies service completion or a supplier entitlement.

## Reconciliation and authority

An uncertain invoice creation can be recovered through `/payments/rentals/:id/reconcile-invoice` by an active center accountant supplying the original provider invoice ID. This operation only performs GET requests and accepts the binding after verifying all original metadata and the expiry. Authority is checked again after provider I/O before persistence.

Provider reads can complete out of order. The final write compares the complete checkout revision observed before the external read. Older responses cannot overwrite a newer capture or refund observation. Decreasing cumulative refunded/captured amounts or a regressing provider update timestamp preserve prior evidence and require review. A later observed refund invalidates the checkout's handover eligibility without altering the historical collection receipt.

Payment confirmation and handover revalidate the active global ADMIN actor and active supplying center within their transaction. Identity and role rows are locked and rechecked after inspection before a mutation or replay result.

Late captures, expired or cancelled reservations, unmatched metadata, multiple collected payments, partial captures, existing refunds, missing ledger evidence and legacy terms all require review. They never become `PAID` automatically. An ordinary provider outage preserves existing evidence and cannot trigger a second invoice POST.

## Commercial record and remaining scope

The rental snapshot and printable summary are commercial reservation records. The implementation does not claim tax invoice compliance or manufacture tax registration, VAT allocation or fiscal issuance data. It requires the center's actual saved legal name, registration and address before creating new payable rental contracts.

This change implements rental checkout and verified collection. Rental refund execution, settlement attribution and supplier entitlement are separate financial workflows. They must not be reported complete solely because a collection receipt exists. No credentials, live integration activation, actual collection, refund or payout was performed during implementation or acceptance.

## Verification

Use a disposable loopback PostgreSQL database with the canonical Prisma schema and the equipment runtime bootstrap:

```sh
node apps/api/scripts/bootstrap-equipment-runtime-schema.mjs
node apps/api/scripts/rental-collection-evidence-validation.mjs
node apps/api/scripts/rental-checkout-collection-validation.mjs
node apps/api/scripts/rental-center-scope-bootstrap-validation.mjs
```

The producer test uses an actual disposable loopback HTTP provider and explicit synthetic credentials. The gate test uses clearly identified synthetic provider evidence but real ledger transitions and approval rows. Run these fixture-cleanup tests before enabling the append-only audit test boundary. The routed equipment lifecycle additionally runs in UTC and Asia/Riyadh with append-only audit enabled. Browser acceptance is in `apps/web/e2e/rental-checkout.spec.js`, including delayed JSON responses across account switches and dialog dismissal.

Provider semantics were checked against official Moyasar documentation on 21 November 2026:

- [Create invoice](https://docs.moyasar.com/api/invoices/01-create-invoice): hosted checkout and `expired_at`.
- [Fetch invoice](https://docs.moyasar.com/api/invoices/04-show-invoice): invoice status and associated payment attempts.
- [Fetch payment](https://docs.moyasar.com/api/payments/02-fetch-payment): original invoice, captured and refunded amounts.
- [Idempotency](https://docs.moyasar.com/api/idempotency): documented `given_id` support does not establish invoice-creation or refund replay safety.
