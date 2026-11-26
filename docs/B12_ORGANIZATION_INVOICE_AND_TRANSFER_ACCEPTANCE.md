# B12 — Organization invoice finalization and center transfer acceptance

## Scope and existing decisions

Organization bookings remain prepaid. A named financial delegate acts under the
organization's signed mandate reviewed by platform management. The supplying
center issues the invoice. HYDROLAND collects on its behalf, and center earnings
become eligible after service execution and verified collection. This change
reuses that published flow and its independent financial approvals.

The remaining implementation had stopped at an `Invoice` in `DRAFT` and a
`CENTER_SERVICE_ENTITLEMENT` ledger entry awaiting approval. Attaching a PDF alone
did not finalize the invoice, and the general ledger posting endpoint deliberately
refused to post a center entitlement without transfer evidence.

## Final invoice

From **فواتيري**, the supplying center's accountant reviews the original PDF and
uses **اعتماد أصل فاتورة المركز**. The review shows the seller, organization buyer,
original invoice number, amount, currency and collection reference. The accountant
supplies the original issue timestamp and explicitly confirms that the document
matches the displayed data.

The server requires:

- An active, unambiguous center accountant and the existing invoice access rules.
- The original organization payment contract, named payer and supplying center.
- Captured SAR payment, matching provider evidence and an independently approved,
  posted collection entry, without an unresolved refund.
- The center's legal name, address and declared financial profile; a registration
  number when that profile declares the center registered.
- A matching original PDF whose seller, buyer, number and SHA-256 agree with the
  saved source. The original contract is never rewritten with current terms.

A new immutable application record preserves the parties, source contract,
collection and PDF provenance at finalization. Its canonical evidence hash makes
the review fail if source data changes before submission. The transaction changes
the native invoice to `PAID` and records the issue timestamp and audit event.
An identical replay returns the saved result. A different original or timestamp
cannot replace it.

The seller's number remains in its original document and finalization record,
unique within that seller. `Invoice.number` remains a platform-unique internal
reference, so two centers may both legitimately use their own `INV-001`.

This is review and acceptance of a center-issued original. It does not infer tax
amounts, generate a tax-certified original, or represent tax-authority verification.
Later changes to organization names or profiles do not rewrite the final snapshot.

For organization bookings, attaching a draft PDF does not announce invoice issuance.
The existing native-invoice trigger queues one inbox/email notice after the
finalization transaction changes the invoice to `PAID`. A queued draft notice from
an earlier version is deferred before budget reservation or email transport, then
rechecked after finalization. Existing issued invoices and personal/store notices
retain their behavior.

## External center transfer

The platform finance approver opens **حوالات مستحقات المراكز** in the administration
workspace and chooses the supplying center and approved settlement. The approver
records an already executed external bank transfer, its bank/reference, exact net
amount, explicit transfer timestamp and original PDF.

The center accountant opens the same transfer register in the center finance
workspace. Receipt confirmation requires an accountant independent of the
settlement requester, approver and transfer submitter. The accountant supplies a
separate incoming-bank proof, its receipt timestamp and a review note.

Before posting, the server rechecks the original collection, attendance and
completion, latest allocation decision, current refunds, final invoice and both
document hashes. The net amount must match the approved settlement. A submitted
proof leaves the ledger `APPROVED`; independent receipt confirmation atomically
changes it to `POSTED` and records the evidence and audit events.

The booking and normalized bank reference are locked within a serializable
transaction. An active-settlement unique key prevents a second unresolved receipt.
The same bank reference cannot pay another settlement. Rejection keeps its history
and permits a corrected document for the same transfer and settlement. A failure
after the ledger update rolls the entire operation back.

The response distinguishes the recorded outcome explicitly:

```json
{
  "bankTransferExecuted": false,
  "externalTransferConfirmed": true,
  "providerVerified": false
}
```

The platform records independently reviewed evidence of an external transfer. An
outgoing request, timeout, uploaded file alone or test provider response does not
establish bank receipt. This change does not dispatch transfers through a bank API.

## Acceptance evidence

The acceptance fixtures use disposable PostgreSQL, synthetic accounts/documents,
and loopback-only HTTP. They exercise a SAR 100 organization invoice and collection,
an approved SAR 10 commission and a SAR 90 net center settlement.

| Boundary | Executable evidence |
|---|---|
| Existing mandate, prepayment and collection flow | `apps/api/scripts/organization-booking-mandates-db.cjs` |
| Final original, snapshot stability, permissions, replay and revoked membership | `apps/api/scripts/organization-invoice-finalization-db.cjs`, invoked by the prepayment fixture |
| Transfer approval, independent receipt, failure rollback, refunds, revocation and concurrency | `apps/api/scripts/center-service-transfer-db-checks.cjs` |
| Real HTTP login/session/guards, original PDF, invoice finalization, transfer and receipt | The combined HTTP scenario in `center-service-transfer-db-checks.cjs` |
| Forward migration with historical TEXT and UUID identities | `apps/api/scripts/b12-evidence-migration-db-checks.mjs` |
| Issuance notice timing and deferred draft-email delivery | `apps/api/scripts/organization-invoice-notice-db.cjs` |
| Invoice UI, stale review and session changes | `apps/web/e2e/organization-invoice-finalization.spec.js` |
| Transfer UI and actual administration entry | `apps/web/e2e/center-service-transfers.spec.js` |

The migration adds evidence tables without rewriting historical payments,
contracts, documents or ledger entries. Existing production-applied migration
checksums remain unchanged. CI runs the targeted database acceptance as part of
API validation, and the web changes participate in the existing full web gate.

## Operational acceptance

Technical acceptance and deployment must be recorded with their actual revision
and checks. The first real center invoice and first real received transfer remain
operational evidence supplied through these workflows when those transactions
occur. Synthetic evidence is never recorded as a real center invoice, a bank
transfer, or proof that funds reached a production bank account.
