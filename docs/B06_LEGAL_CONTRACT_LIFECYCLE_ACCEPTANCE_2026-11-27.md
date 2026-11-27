# B06 — persisted contract, obligation and insurance follow-up

## Implemented boundary

B06 follows an existing signed native contract. `ManagedDocument`, its exact `DocumentRevision`, existing signatures, original attachment bytes and `DocumentBrandSnapshot` remain the original document authority. The central contract library continues to own published clauses and immutable library versions. B06 computes and pins a server digest across these sources; it does not trust a caller's document hash alone.

Two original contract paths are supported:

- A general legal contract in the native document engine, bound to a published `GENERAL / REFERENCE_TEMPLATE_V1` library version, with three independent people for creation, approval and signature.
- An existing cooperation contract, retaining its original library binding, both actual party signatures, original center seal and independent platform approval. A general template cannot substitute for the cooperation or employment execution path.

The new SQL tables are follow-up state, append-only event evidence and existing-ledger references: `LegalContractLifecycle`, `LegalContractLifecycleEvent`, and `LegalContractSettlementReference`. There is no new contract, employment, inventory or finance source of truth. The exact additive migration is `apps/api/prisma/migrations/20261127020000_legal_contract_lifecycle/migration.sql`; it adapts only new foreign-key column types to the existing native TEXT or UUID keys. No Prisma model or shared generated client is changed.

## Available lifecycle

| Area | Behavior and required evidence |
| --- | --- |
| Registration | One follow-up for one native document ID/version. The caller pins the server-derived source digest. A new command cannot duplicate an already registered source. |
| Obligations | Add a named, currently authorized executor and a due date; only that executor records completion; another authorized person verifies or returns it; a fulfilled obligation can be reopened. Read-only members cannot be assigned or execute duties. |
| Insurance | Record insurer, policy number, explicit coverage dates and scope from signed evidence. Duplicate insurer/policy references are refused. Cancellation retains its original evidence and documented cut-off time. |
| Claims | Register a covered incident, including a historical incident, with explicit SAR amount; independently approve or reject; reopen a rejected claim. Incidents after the documented cancellation cut-off are refused. |
| Settlement reference | An approved claim may link one existing independently approved and POSTED `FinanceEntry`, type `REVENUE`, reference type `B06_INSURANCE_CLAIM`, reference ID equal to the claim ID, same organization, exact amount and SAR currency. This operation creates a reference only. It neither creates/changes an entry nor initiates a payment or provider transfer. Partial, multi-entry and non-SAR settlement are outside this first supported path. |
| Renewal | Signed renewal evidence binds both exact original IDs, versions and digests and the new validity must extend the old one. General contracts also name the previous original in their signed content. Native cooperation renewals retain the same parties and both native signatures; their predecessor relationship is carried by the signed renewal evidence without modifying the cooperation producer. Switching a specialized cooperation contract to a generic signature workflow is refused. Renewal atomically creates a successor follow-up, and old obligations and claims remain on the old contract. |
| Termination | A signed decision terminates an open follow-up while keeping unsettled duties and claims visible. |
| Archive | The contract must be expired, renewed or terminated; every obligation must be independently verified and every claim settled or rejected. All retained current evidence and ledger bindings are checked, and an explicit retention date is recorded. Archived follow-up is read-only. The original native document is not silently archived or rewritten. |

Each business mutation has its own independently reviewed and signed native evidence document, bound to the exact original contract, follow-up ID, action and subject. Evidence cannot be consumed twice. Commands pin the current revision and a UUID command ID. Repeating exactly the same command as the same currently authorized account returns its saved result. Different content, different authority or a stale concurrent command is refused. State, event, audit and settlement/renewal references share one transaction.

SQL timestamps are explicitly normalized to UTC before insertion into native `TIMESTAMP(3)` columns; business dates use Asia/Riyadh. This was exercised on PostgreSQL configured with `timezone=Asia/Riyadh` so a local-time cast cannot hide a three-hour shift.

## Access and source visibility

Active verified organization membership controls external-organization access. Owners and administrators manage follow-up; other non-viewer members can complete only their named obligations. Independence is checked at person level as well as through native source review.

Internal legal employment is **not** blanket permission to browse private documents. The current platform owner retains owner access. A non-owner also needs the existing exact-version `assignedReviewAccess` grant for the original and for any signed source they consume, with current role, positioned employment, membership, verification, expiry and revocation checks. An unrelated legal staff account cannot discover the source or read a follow-up using a direct record ID. Source revocation immediately blocks subsequent access and does not erase history. B06 creates no new sharing grant and cannot extend an expired native review assignment.

The cooperation path also preserves its narrower existing party/platform-owner visibility. An unrelated organization administrator or viewer cannot list or read its B06 record merely because they belong to the organization.

Responses return follow-up fields and evidence receipts. Full retained source snapshots, original evidence payloads and original bytes are not returned through B06; opening the native source uses the original document authorization path. Settlement selectors are limited to the claims in records visible to the caller.

## Admin/organization interface

`hydroland-legal-lifecycle.js` adds **متابعة العقود والتأمين / Contracts and insurance follow-up** to the existing admin/organization/center command areas and the authenticated profile menu. It supports organization selection, explicit template installation, selecting an existing signed original, durable follow-up lists, obligations/policies/claims, valid action selection, signed-evidence selection and revision history.

The evidence form automatically binds internal source IDs, version and digest, the action and the selected subject. It creates a native draft and opens the existing Documents workflow for review/signature and optional original PDF attachment. It does not approve or sign on another person's behalf. Original contract preparation stays in the existing document and contract-library workspaces. Original review uses the existing authorized PDF route, including its cooperation-party or internal assigned-source checks, so an assigned reviewer is not sent through an unrelated owner-only document editor.

Arabic/English labels, mobile layout, native modal keyboard behavior and return focus are covered. Switching language preserves unsaved form values. Lost business-command responses reuse the exact command identity; ambiguous native draft creation tells the operator to check Documents before creating another. Session/account/portal changes cancel reads, clear private content and prevent a late response from repainting it. Opening or refreshing the workspace performs no business write.

## Reproducible isolated acceptance

The existing required `.github/workflows/api-validation.yml` job runs the B06 checks after its normal API/Web builds and Chromium installation. It uses an isolated loopback PostgreSQL database with a name ending in `_ci`, `NODE_ENV=test`, `CI=true`, and `LEGAL_E2E_CONFIRM=ISOLATED_LOOPBACK_DATABASE`. Exact migration, HTTP, restart and browser logs are retained in its B06 evidence artifact. No extra workflow or release-policy job is introduced. The local verification also uses real PostgreSQL 16.16 and the compiled Nest API; no production services or real signatures, personnel or funds are used.

Build the existing Prisma client in an isolated installation, then prepare the same dedicated baseline used by API CI:

```sh
npm exec --workspace=@hydroland/api -- prisma db push --skip-generate
npm exec --workspace=@hydroland/api -- prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261127020000_legal_contract_lifecycle/migration.sql
npm run build --workspace=@hydroland/api
npm run build --workspace=@hydroland/web
node apps/api/scripts/legal-contract-lifecycle-migration-db-e2e.mjs
node apps/api/scripts/legal-contract-lifecycle-http-e2e.mjs
node apps/web/scripts/legal-contract-lifecycle-browser-e2e.mjs
```

Start the compiled API against that dedicated database before the HTTP script. The HTTP script generates synthetic original documents through the actual library/document/cooperation/review routes, then exercises B06. After stopping and starting the API against the same database, run:

```sh
node apps/api/scripts/legal-contract-lifecycle-reopen-http-e2e.mjs
```

The migration fixture applies the exact forward SQL in isolated populated TEXT and UUID source schemas, checks that all pre-existing source records remain unchanged, exercises the native foreign keys and verifies append-only/deletion guards. The HTTP suite covers scoped roles, unrelated legal staff, current native grant revocation, original source and branding tampering, actual native signatures, obligations, coverage cancellation, historical claims, rejection/reopening, wrong/pending journal refusal, zero B06 finance writes, renewal, termination, archive blockers, same-command concurrency, different-command stale conflicts, and injected database audit failures that roll back both settlement links and renewal successors. The browser suite uses deterministic API fixtures to verify presentation/session behavior separately from the real HTTP suite.

## Actual evidence and remaining acceptance

The completed combined local run passed **98 HTTP/PostgreSQL assertions**, **31 browser assertions**, **32 migration assertions on populated TEXT and UUID source schemas**, and **11 assertions after an actual API process restart against the retained database**. API and web builds and the shared API correctness lint succeeded. The PostgreSQL server used Asia/Riyadh explicitly. The committed evidence summary and screenshots are in `docs/evidence/B06_2026-11-27/`. Desktop English and mobile Arabic screenshots were inspected; the dialog, tables and controls fit their intended surfaces. The portable checks are integrated into the existing required API job, preserving the required-workflow inventory. This local result is not a claim that a remote CI run or deployment has already occurred.

These are local synthetic acceptance results. They do not claim a production deployment, a production restore, a real counterparty's legal acceptance, a professional applicability determination, an insurer's approval, a bank/provider execution or the user's final Q01 acceptance. Production migration history must remain intact and pass the normal release/recovery gate; a canonical `db push` baseline does not prove that every historical deployed schema can be reconstructed from old migrations.

Real operation still needs the actual signed originals and qualified reviewers, the current explicit source-bound access for every acting internal staff account, real insurance/claim evidence, the appropriate already-posted journal reference, and the owner's retention/closure decisions. Existing review-grant expiry and revocation remain effective; broader or longer-lived operational delegation requires a separate explicit scope decision rather than implicit department-wide access. Obligations require the named executor to retain suitable current authority; B06 does not silently reassign a revoked person's obligations.
