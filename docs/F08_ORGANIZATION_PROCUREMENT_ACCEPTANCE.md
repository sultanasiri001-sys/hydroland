# F08 — organization procurement and evidence acceptance

## Scope

This change supplies an organization-scoped procurement cycle alongside the
existing B05 platform warehouse, B12 organization booking, and B08 native commerce
workflows. It reuses signed `ManagedDocument` sources, their original attachments,
and native `FinanceEntry` journals. No external procurement endpoint is assumed.
No bank or payment provider is called by these procurement commands.

A purchase order binds one expressly signed contract to one qualified supplier.
The contract specifies its own purchase reference, validity period, named people,
purchase lines, prices, explicit tax amounts and bases, complete-order settlement
policy, cancellation and reversal terms, procurement method, exchange system, and
acceptance method. The supported exchange boundaries are manual document
evidence and an explicitly identified process managed outside the platform.
Neither setting enables an API connection or claims official provider approval.
Zid is not connected.

Partial receipts are supported. Settlement pays the complete approved order
after its invoice and full receipt have been independently accepted. A reversal
returns every quantity actually received and, if payment was confirmed, remains
in `RECOVERY_REQUIRED` until the corresponding incoming recovery is independently
confirmed. Partial settlements and partial financial reversals are not offered
by this contract version. Their absence is visible in the contract policy choice.

## Source documents and authority

The organization chooses **Install procurement forms** to install the three
native document definitions. Existing definitions are found first. Installation
does not create a supplier, contract, purchase, signature, or financial entry.

| Definition | Purpose |
| --- | --- |
| `F08-PROCUREMENT-SUPPLIER-V1` | Supplier identity, qualification scope, acceptance reference and validity. Existing valid `INV-SUPPLIER-QUALIFICATION` documents can also be used. |
| `F08-PROCUREMENT-CONTRACT-V1` | One order's explicit commercial terms and named authority. |
| `F08-PROCUREMENT-EVIDENCE-V1` | Invoice, receipt, receipt acceptance, external settlement, reversal, incoming recovery, or final acceptance. |

The guided organization workspace creates drafts through the existing document
API. The established independent create → approve → sign workflow remains the
authority for those documents. Original financial PDFs are attached before
signature. The procurement workspace uses names and scoped choices instead of
requiring people to copy account identifiers or evidence digests manually.

The server recomputes evidence from the actual native revision, payload,
template, branding, approval and signature events, the authors' person
identities, and each attachment's bytes and SHA-256 digest. A supplied
`ManagedDocument.contentHash` is insufficient by itself. Other-organization
documents, changed revisions, broken signature history, mismatched PDFs and
expired qualifications are refused.

The signed contract names the maker, procurement recommender, receiving person,
preparing accountant, financial confirmation officer, and independent accepting
representative. The current organization owner makes the final purchase and
financial decisions. Active verified membership and the named role are checked
again when an action is performed. Viewer membership is read only. The original
owner and participant person identities and membership revisions are pinned so
that revocation, a replacement account holder, or a changed membership cannot
silently inherit the old mandate.

Preparation, recommendation and owner approval require different people.
Receipt is independent of preparation and owner approval. Financial preparation,
approval and confirmation are independent. The accepting representative is
independent of all executing roles. Confirmation also requires independence from
the people who created, approved and signed its financial evidence document.

The configured internal platform organization is excluded from F08. Its
warehouse actions continue to use B05's existing employment and department
authority checks.

## Executed cycle

1. **Create the order.** The named maker selects the signed contract by its
   current version and server digest. One contract and purchase reference can
   create only one order. Creation records no payment.
2. **Recommend.** The named procurement representative records an explicit
   approval or decline recommendation and the reason.
3. **Decide.** The organization owner decides only after the recommendation.
   A declined purchase cannot receive goods or proceed to financial execution.
4. **Match the invoice.** The named accountant records the signed invoice and
   original PDF. Every line identifier, description, quantity, price, tax amount,
   tax treatment and tax basis must match the contract. The service calculates
   the total from those terms and never invents a tax rate. Its canonical supplier
   and invoice reference can be claimed only once within the organization, even
   when a second document changes the reference's case or surrounding spaces.
5. **Receive.** The named receiving person records one or more signed receipt
   documents. Unknown lines, duplicate sources and cumulative quantities above
   the approved amount are rejected.
6. **Accept the receipts.** The independent accepting representative binds a
   signed acceptance document to the current digest of all receipts. Incomplete
   or subsequently changed evidence cannot support settlement.
7. **Prepare and approve settlement.** The accountant selects an active SAR
   finance account of this organization. The owner approves or declines the
   resulting native expense journal. A declined preparation remains historical;
   a corrected preparation has a new journal and proof record.
8. **Confirm external settlement.** The named independent financial officer
   records the original signed bank evidence, amount, reference and actual time.
   This command atomically posts the approved journal, saves the proof and
   appends the order event and audit. It does not execute a bank transfer.
9. **Record final acceptance.** The independent accepting representative reviews
   the completed order and records a separate signed acceptance document bound
   to its current completion digest. This digest includes the contract, supplier,
   invoice, receipts, settlement and any reversal or recovery.

The final acceptance records its actual authenticated actor and time. It is
acceptance of that order's evidence. It does not automatically close F08.01, D19,
a department, a release, an external integration, or another organization's work.
Receipt acceptance and final cycle acceptance are distinct actions.

## Cancellation, reversal and recovery

Cancellation is available only when the signed policy permits it and no invoice,
receipt or financial preparation has created an execution effect. It retains
the original order and its reason in history.

For a contract permitting complete-order reversal, the owner records signed
return evidence with its original PDF. It must account for every quantity
actually received and the actual paid amount. An unposted settlement is voided
without claiming that money moved. A confirmed settlement is preserved and the
order instead requires incoming recovery. Recovery has a new native journal,
independent owner approval and signed incoming bank proof; it never rewrites or
deletes the original expense.

The reversal clears the applicability of an earlier final acceptance while
retaining its original event. A new final acceptance must bind the completed
reversal and recovery evidence. Declaring a reversal alone cannot turn a paid
order into a recovered one.

## Atomicity, idempotency and shared financial boundaries

Every order command carries a caller-stable `requestId`, expected revision and
expected digest. The fingerprint includes the authenticated actor, organization,
order, action and complete request. A matching replay returns the saved command
and current order; reuse for different content fails. Stable generated IDs are
allocated outside transaction retries, while current source evidence is reread
inside every retry.

Commands run inside serializable transactions and lock the order. Each committed
revision has exactly one event. Events retain the previous event hash, actor,
request fingerprint and resulting state hash, with a separately stored native
audit record. A failed journal, event or audit write rolls back the whole action.
Read projections check the chain and the current original sources. An
inconsistent source reports review reasons and unknown financial totals instead
of manufacturing a valid balance.

The dedicated references are:

- `ORGANIZATION_PROCUREMENT_SETTLEMENT`
- `ORGANIZATION_PROCUREMENT_REVERSAL`

Generic financial create, decision, posting and shift-entry routes cannot create
or advance those references. Their journals are advanced only through the
scoped procurement workflow. Existing sales, booking, course and rental
collection and transfer paths remain their original sources.

Bank name and reference normalization and the transaction-level reference lock
are shared with B08 and B12. All three workflows check all three evidence stores,
so an existing unresolved or confirmed claim cannot fund a different financial
movement. These checks do not contact a bank or assert provider verification.

## Additive migration and recovery evidence

`20261126140000_organization_procurement` adds order, event, receipt and money
proof tables. Existing source identities remain opaque text references so that
historical TEXT and UUID installations are supported without rewriting earlier
tables or migrations. Composite foreign keys preserve organization/order scope.
Unique constraints cover order references, source documents, request keys,
revision events, active financial proofs and bank references. SQL checks reject
invalid states, amounts and incomplete confirmed proofs, including null values.

The migration can be reapplied after a Prisma schema bootstrap and after a
native restore. The verification scripts retain original identities, documents
and journals and check the resulting constraints and unchanged history.

## Reproducible verification

The existing **API validation** workflow builds the actual API before running
these gates against a dedicated loopback PostgreSQL 18 database:

```sh
node apps/api/scripts/f08-migrations-db-checks.mjs
node apps/api/scripts/f08-procurement-http-checks.cjs
node apps/api/scripts/f08-native-recovery-checks.mjs
```

The HTTP fixture uses real authentication, the actual controller/service and
native document lifecycle, two isolated organizations, distinct people and
synthetic original PDFs. It prohibits outbound provider calls. Its persisted
rows are retained for the next gate.

The native recovery gate runs `pg_dump` and `pg_restore` using the existing
disposable PostgreSQL service. It creates a fresh uniquely named database,
compares table contents and binary-document fingerprints, columns, constraints,
indexes, enums, triggers, functions, views and sequences, then replays the F08
migration. It verifies the source remained unchanged and removes only its own
new disposable restore database. It is an isolated synthetic recovery rehearsal,
not a production restore, failover or provider PITR claim.

The workflow retains `f08-http-acceptance.json` and
`f08-native-recovery.json` in the `f08-procurement-evidence` artifact. The web
workflow executes the organization procurement browser scenarios alongside the
existing organization and document regressions. Existing B08 and B12 financial
suites also test refusal of a bank reference already claimed by F08.

Only successful execution on the released source revision is acceptance
evidence. Test discovery, syntax validation, a draft PR, or this document by
itself is not a pass.

## Technical preparation and later real acceptance

On 26 November 2026 the owner clarified that the platform will be tested before
any real organization is connected. The current closure scope is therefore
technical preparation and isolated verification, including a same-site test
workspace and configurable API preparation. See
[F08 API preparation](F08_API_PREPARATION.md). The absence of a real organization
or contract is not a blocker for that technical scope. User acceptance and the
external organization's commissioning are recorded separately when they occur.

For real operation, the organization still supplies its authorized
representative, contract and agreed integration scope, followed by separate
representative acceptance. No such identities, contractual agreement or human
approval are fabricated. The synthetic accepting identities in the fixtures
and simulator are not a real customer's acceptance.

Field operations previously deferred by the owner remain deferred. The actual
acceptance method may be remote when that is what the organization agrees to in
its contract. Completing technical preparation supplies the concrete system and
evidence for the owner's platform test; it does not grant D19 generally or
record the later user/customer acceptance. Q01 remains last.
