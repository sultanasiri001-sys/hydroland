# C11 — Custom fields, acknowledgment wording and immutable versions

## Source requirement

The current tracker v145, main-plan row 43 and acceptance unit C11.01, requires add/delete/type/section editing with schema binding; a new document must use the new version while a previously signed document remains unchanged. Actor, time, hash and version, field-type effects, restoration and revoked access must be verified. The tracker says to reuse the existing history, PDF, logo, synchronization and draft paths. Its HYD-DOC-020 reference links participant/guardian acknowledgment or contract data to the service and version.

[HYD-42](https://linear.app/hydroland/issue/HYD-42/c11-alhqwl-walaqsam-wisdarat-almstnd-waliafaaat) identifies the remaining work as the free field/section/exemption designer and repeats C11.01; it does not require rebuilding the document engine. The [Technical Master Spec v1.1](https://chatgpt.com/library?file_id=libfile_fde3_f-9f26c1efb38c8191b4eb85e78c94c848_8b00de3d15ac8191a238b068804abc72&account_id=personal), HYD-DOC-020, requires versioned acknowledgments, contracts and consent with acceptance evidence, timing and audit. The [tracker](https://chatgpt.com/library?file_id=libfile_fde3_f-64da822ee02c81919a1e837e16162234_8b00de3d15ac8191a238b068804abc72&account_id=personal), main-plan row 54/D01, separately owns age/guardian authority, consent, service applicability and medical-evidence validity/revocation. This distinction governs the closure boundary below.

## Scope

This change implements a bounded custom form designer in the existing document library. It uses the existing `DocumentTemplate`, `ManagedDocument`, revision, lifecycle and `AuditEvent` records. There is no new data model, database migration, document approval path or production data write in this change.

`POST /documents/templates/custom` allocates `CUSTOM-FORM-<32 hexadecimal characters>` on the server. The request cannot choose the code, version, status or actor. The generic template creation endpoint rejects this reserved namespace. Existing organization `OWNER`/`ADMIN` permissions still govern creation/publication and are checked again within the transaction.

Only these custom definitions may add/delete fields or change their key, type and options through the existing versioned update route. Catalog and other existing templates retain their binding compatibility check. Structural changes to a catalog-bound form still need a reviewed binding migration.

The editor adds custom creation, field/section addition and removal, type/options editing and restoration across custom schema versions. `SECTION` is a heading in the definition: it cannot be required, cannot have answer options and cannot receive document payload data. At least one answer field is required. Sections render in the document editor and administrative PDF; `BOOLEAN` fields offer explicit yes/no answers, including a valid false answer.

`STATEMENT` stores the fixed Arabic and English acknowledgment/waiver wording in the template definition. Each language is required and bounded to 8,000 characters. Statements have no answer options or required-answer flag; document payloads cannot replace them. The designer edits the wording, previews it as escaped text and displays both languages in history. Document entry and printing use the wording pinned to that document's template version. Editable participant/guardian data and any answer to the wording remain separate fields.

## Immutable records and attribution

Publication retires the previous template for new use and creates a new row. Restoration also creates a new version; it never reactivates or rewrites a historical definition. Existing documents retain their original template ID. Signed document data, revisions, approval/signature actors and lifecycle events remain unchanged.

Custom creation and publication write an `AuditEvent` in the same serializable transaction. The event records the person and account, organization, code, template ID/version, previous ID/version, server timestamp and SHA-256 of the canonical definition (department, bilingual title, printable flag and ordered fields). The hash for an exact restored definition matches the original definition; its publication has a new version and timestamp. If the audit write fails, creation/publication and retirement of the previous version roll back together.

New custom documents and their draft revisions receive a server-calculated hash of the pinned template ID/version, canonical definition and payload. The definition includes both languages of fixed wording; the payload includes any server-captured source evidence. A changed clause therefore changes the signed content even if answers are identical. This does not rehash existing documents or change hash behavior for existing catalog forms. Document revisions and lifecycle events continue to record actor, time and version through the existing workflow.

## Participant/service source contract

The custom path reuses the existing restricted `PlatformDocumentSourceService`. A verified platform owner can select saved `BOOKING_PARTICIPANT`, `BOOKING` and `TRIP` records in their internal organization. The HTTP acceptance fixture verifies the participant's real booking ID and account, the booking's real trip ID, the service reference, the actual preparer and the captured source fingerprint. Current record data is captured by the server. Changed source data requires a new preview; existing document evidence retains its original names, references and fixed wording. Client-injected source snapshots and attempts to replace bound references are rejected. Revoking source authority blocks new previews, document creation and reads.

The preparer's account is distinct from the participant's account. An entered guardian name or claim stays entered data; it does not become proof of guardian authority or consent. Generic document approval/signature remains attributable to its real administrative actors. These tests do not label it a participant's or guardian's authenticated signature. Creating or restoring an acknowledgment leaves participant eligibility, booking status, trip status and payment state unchanged. D01 owns the separate authority/applicability decision and its qualified consent evidence.

## Acceptance evidence

Local checks were run against this patch based on main `a3771fcaa6c69b33fb4d313351814e0aa49752cd`, on 19 November 2026. HTTP tests used a disposable loopback PostgreSQL 18.6 database named `hydroland_form_library_ci`, the compiled API and synthetic actors. No live organization or user data was used.

| Acceptance requirement | Concrete evidence | Result |
| --- | --- | --- |
| Custom namespace cannot relax catalog safeguards | Staff/foreign denial, injected custom code rejected, generic reserved-code creation rejected, catalog field addition/code replacement rejected; no template/audit written | Passed over HTTP/PostgreSQL |
| New field/section/type/options persist | Custom definition contains SECTION, NUMBER, SELECT, BOOLEAN, TABLE and STATEMENT; invalid non-answer-only/required-heading/options/type/duplicate/statement-content definitions rejected | Passed over HTTP/PostgreSQL |
| Actual schema controls new document validation | Invalid number/selection/table/section/statement payloads rejected; schema v2 changes NUMBER to TEXT, replaces a section, removes a choice and changes table columns; old template cannot create new documents | Passed over HTTP/PostgreSQL |
| Fixed acknowledgment wording follows its version | Arabic/English wording retained in v1, changed in v2 and restored in v3; old signed print uses v1, new print uses v2; payload cannot replace wording; its exact definition is included in the independent content-hash calculation | Passed over HTTP/PostgreSQL |
| Actor/time/hash/version are attributable | Template audit and document revision/lifecycle records checked against the actual actors, versions, timestamps and independently calculated canonical hashes | Passed over HTTP/PostgreSQL |
| Signed documents do not change after publication/restoration | Signed document with two revisions compared before/after schema v2 and restore v3, including all revisions and lifecycle events; pinned print contract still uses v1 NUMBER/SECTION definitions | Passed over HTTP/PostgreSQL |
| Restore is a new version | History is v3 ACTIVE, v2 INACTIVE, v1 INACTIVE; v3 restores the original definition/hash while v2 documents stay pinned to v2 | Passed over HTTP/PostgreSQL |
| Revocation is effective | Suspended administrator cannot create, publish/restore, read history or read signed document; no new template/audit and original signature evidence preserved | Passed over HTTP/PostgreSQL |
| Audit failure is atomic | Synthetic PostgreSQL trigger rejects custom audit inserts; custom creation and publication fail, version count/audits unchanged and previous active template remains active | Passed over HTTP/PostgreSQL |
| Scoped participant/service evidence stays pinned | Actual participant/booking/trip IDs and author captured; stale source rejected; prior source names/wording/revisions/events unchanged; client replacement/injection denied | Passed over HTTP/PostgreSQL |
| Source evidence does not invent guardian authority | Preparer/participant/guardian claim distinguished; eligibility/booking/trip/payment/signature state remains unchanged; source-authority revocation enforced | Passed over HTTP/PostgreSQL |
| Custom sections and wording reach the PDF path | Signed pinned document PDF and edited custom template preview render through the real Arabic PDF renderer; exact binary outputs retained for review | Passed over HTTP; review images generated from the saved PDF |
| Custom editor, restoration and section/boolean/statement input | Three new cases in `apps/web/e2e/form-library.spec.js`; extended `apps/web/scripts/section-duty-table-validation.cjs`, including literal-text injection checks | Tests discovered/syntax checked locally; browser execution awaits CI |

### Commands and results

- `npm run typecheck --workspace @hydroland/api` — passed.
- `npm run build --workspace @hydroland/api` — passed.
- `npm run lint --workspace @hydroland/api` — passed with zero warnings.
- `node apps/api/scripts/form-library-schema-validation.cjs` — 13 existing schema/boundary checks passed.
- `node apps/api/scripts/document-payload-validation.cjs` — 5 existing payload groups passed.
- `node apps/api/scripts/form-library-history-validation.cjs` — 11 existing history checks passed.
- `node apps/api/scripts/form-library-http-e2e.mjs` with the isolated database/API configuration from `.github/workflows/form-library-integration.yml` — 28 primary groups and 10 preview subgroups passed. Thirteen primary groups cover the custom version/wording/source path. The fixture now creates persisted sessions and includes `sid`, matching current authentication; the application authentication code was not relaxed.
- Playwright discovery for `apps/web/e2e/form-library.spec.js` — 15 tests discovered, including the existing 12. Local browser launch was blocked by the environment's UNIX-socket restriction; a browser test pass is not claimed.
- `git diff --check` and JavaScript syntax checks for the changed editor/document/test files — passed.

The existing **Form library focused validation** workflow runs the editor, history, synchronization, table-entry and PDF checks. The existing **Form library HTTP database acceptance** workflow runs the custom helpers through `form-library-http-e2e.mjs`; its artifact contains `custom-templates/custom-signed-v1.pdf`, the corresponding print-contract JSON and `custom-edited-preview.pdf`. These are synthetic fixtures. Passing required checks on the PR head is still necessary before merging.

## Closure boundary

The implemented C11 delta covers custom field/section/statement editing, schema validation, immutable publication/restoration, actor/time/hash/version evidence and the existing participant/service source contract. Remaining release evidence is the browser CI result, independent PR review and verification of the deployed commit. Editable acknowledgment content does not need a new blanket legal-approval gate to satisfy this designer/version requirement.

D01 continues to own authentic participant/guardian consent, guardian authority, age/service applicability and qualified medical-evidence acceptance. This change neither creates such authority nor counts a typed name or administrative signature as that consent. Completing the C11 template/source contract does not close D01 or the cross-project HYD-DOC-020 consent workflow. Existing specialized contracts and catalog-binding migrations keep their current safeguards.

No acceptance count, tracker status, real signature, live approval or production record was changed by these tests. The tracker may be updated only with the verified release evidence and this precise scope boundary.
