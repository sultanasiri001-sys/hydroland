# C12 document acceptance — 27 November 2026

## Verified technical scope

This candidate improves conservative extraction of labelled license fields and
records fresh, isolated evidence for the existing upload, renewal and review
workflows. The source baseline is
`32e07e17439026d741e4c137f9858bc725fced49`; the candidate changes are the files in
this commit. No API schema, historical migration, production record or provider
configuration was changed. Release CI, merge and deployment of this candidate
are separate from the local results below.

The reproduced defect was an explicitly labelled field containing two dates:
`Issue date: 2025-01-01 or 2026-02-02`. Previously the parser suggested the first
date. It now leaves that field for manual entry. A valid date cannot hide a
second conflicting, invalid, ambiguous or out-of-range date-shaped candidate.
Equivalent repetitions of the same unambiguous date remain usable. A repeated
label with an unreadable value also prevents a conflicting automatic choice.
Other correctly extracted fields remain available for confirmation.

The OCR word-confidence threshold remains **80/100** for every word in a line.
Missing confidence evidence and uncertain scans still cause abstention. The
user must review the extracted data and match it to the original file before
saving. Neither reading a date nor creating a renewal approves a license.

## Executed checks

| Check | Observed result | Scope |
| --- | --- | --- |
| `node --test apps/web/scripts/license-fields.test.mjs` | 6/6 tests passed | Arabic, Persian and Western digits; conflicting, invalid, ambiguous and Hijri dates; repeated values; unchanged confidence guard |
| `license-reader.spec.js`, `center-documents-review.spec.js`, `center-license-admin.spec.js` | 36/36 passed; 0 skipped, 0 failed, 0 flaky | Nine real-reader/limit/cancellation tests and 27 UI scenarios with isolated HTTP fixtures |
| `center-license-acceptance-http-e2e.mjs` | 156/156 assertions passed in five sections | Actual API requests and PostgreSQL 16.16 with disposable synthetic accounts and documents |
| `credential-documents-http-e2e.mjs` | Passed | Private object upload/access, ownership, revocation during storage I/O, metadata integrity, evidence-gated review and storage diagnostics |
| `marine-documents-http-e2e.mjs` | Passed | Ownership and center/operations/platform review stages, revision guards, final-document immutability and persistence |
| `instructor-documents-http-e2e.mjs` | Passed | Four separate document types, private access, center scope, returned revisions, final decisions and retries |
| API build and changed-script syntax | Passed | Existing API source built with the existing Prisma client; no client regeneration |

The center-license HTTP sections recorded **36** upload/download/integrity
assertions, **44** creation/renewal/source-preservation assertions, **27**
platform-authority/expiry assertions, **37** independent-review/final-decision
assertions and **12** concurrent-registration assertions.

The HTTP tests ran against a new `hydroland_c12_test_*` database bound to
loopback. The dedicated CI schema baseline used `prisma db push
--skip-generate`. It did not fabricate production migration history or claim a
production migration/deployment test. The object store was a loopback test
server. All actors, files, references, evidence entries and reviewer decisions
were synthetic; role separation in these tests is not a real person's approval.

## Bounded OCR sample and limitations

| Synthetic input | Exact expected values and observed behavior |
| --- | --- |
| Arabic-labelled PNG, Western digits | Reference `46251`, issue `2025-03-18`, expiry `2028-07-24`: all three extracted correctly |
| Arabic-labelled JPEG, Western digits | The same three values extracted correctly |
| Arabic-labelled PNG, Eastern Arabic digits | No fields suggested in this run; all three remain for manual entry. The test rejects an incorrect substituted value |
| Existing Arabic scanned PDF | Every suggested field must equal its known value; abstention is permitted. This is a safe-abstention check, not evidence that every field was extracted |
| English text PDF | Reference `TEST-123`, issue `2025-01-02`, expiry `2030-03-04`: exact match |
| English raster PNG | Issue `2025-01-02` and expiry `2030-03-04` matched the two asserted date fields; OCR assets loaded from the same origin |
| English PDF with two issue-date alternatives | Issue date withheld; reference `AMBIGUOUS-123` and expiry `2030-03-04` retained correctly |

The new Arabic samples use pinned Noto Sans Arabic 5.3.0, clear labels and
known synthetic values. They demonstrate positive Arabic-labelled extraction
for two raster formats, alongside deliberate abstention for uncertain Eastern
digits. They do not establish an accuracy percentage for real Saudi documents,
all fonts, camera conditions, layouts, issuer templates or handwritten values.

The actual reader rejected a file larger than **2,000,000 bytes** and a PDF with
**seven pages**, while the automatic-reading limit remains six pages. A
pre-cancelled read returned `AbortError`. A stalled file read returned the
manual-entry timeout after the test clock advanced past **90 seconds**; this
verifies the timeout branch without claiming a 90-second real-world OCR run.

## Upload, renewal and issuer boundaries

The existing center workflow preserves original file bytes and a server-computed
digest, limits downloads to authorized users with private/no-store responses,
and prevents foreign-center access. Registration locks the validated attachment
and dates. The concurrency test commits a competing HTTP change before the
registration transaction and proves that stale registration is rejected without
a success audit event.

A renewal creates a **separate DRAFT** with a new reference. The previous record
and attachment remain unchanged; the draft inherits the correct type and unit,
and does not copy old validity dates, attachments, routing or approvals. Its
audit links the previous record and reference.

The user-facing center and administration panels distinguish platform/internal
review, date validity and issuer verification. The credential workflow requires
a separately recorded verification-evidence step before its final decision.
The tests exercise those guards with synthetic references; they never contacted
an issuer or regulator to validate an actual document.

Real issuer verification must use the relevant issuing body's process and
document scope. User acceptance of the deployed interface and verification of
actual submitted documents remain real operational steps. No external approval
or universal OCR quality was inferred from these technical results.

## Reproduction and evidence identity

The web test dependencies `pdf-lib` 1.17.1 and
`@fontsource/noto-sans-arabic` 5.3.0 are declared directly in the web workspace
and its lock entry, so the web-only CI install does not depend on the API
workspace being installed.

Run the parser suite and the three browser specs above. For the HTTP subset,
build the API, create a disposable loopback database whose name starts with
`hydroland_c12_test`, apply the dedicated CI schema baseline, and start the API
with that database. Set `CI=true`,
`C12_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY`, `C12_E2E_BASE_URL` and the API's
test `JWT_SECRET`; then execute
`node apps/api/scripts/center-license-acceptance-http-e2e.mjs`.
`C12_EVIDENCE_PATH` optionally writes its section counts and scope as JSON.
Never use production data or credentials for this runner.

Local browser validation used the already available Chromium executable through
Playwright's explicit `executablePath`, with multiple-process operation and
normal web-security behavior. No test assertion or OCR threshold was weakened
to accommodate the local runtime. Release CI uses its normal installed browser.

| Tested source | SHA-256 |
| --- | --- |
| `apps/web/src/hydroland-license-fields.mjs` | `aea07577d3527a611ee5102f059b0c93c029344ea12dae37c7471303cce01548` |
| `apps/web/src/hydroland-license-reader.mjs` (unchanged) | `c0e61d94f0e2450c2af8279bf860b316f14a8555c233e042f4ae8ebb67343c23` |
| `apps/web/scripts/license-fields.test.mjs` | `a86cc96710eb1466cd2754d0a389b8db8b8fd9a9affe943f0304fdb98a3bc643` |
| `apps/web/e2e/license-reader.spec.js` | `ad383cc9829fddd56120074f48ef17f491ed41fc2640e2b7d9b6d4f7be0e2516` |
| `apps/api/scripts/center-license-acceptance-http-e2e.mjs` | `3f2319f10a0887198533e3a51e4a98ca9265d435258828c598fcf5931ffd6e9c` |

The local evidence bundle contains `license-fields-unit.log`,
`browser-results.json` (including exact Arabic sample outputs),
`http/center-license-receipt.json`, `http/summary.json` and the individual HTTP
logs. These results cover this source candidate; later release checks must
identify their own tested commit.
