# C08 cross-department technical evidence — 27 November 2026

## Source and acceptance boundary

The combined local source `57302f606dc5b993c8f83678f2f5619dd415f1c8`
passed the new native source-projection acceptance and the existing complete
agent-runtime HTTP/PostgreSQL/browser runner. It includes C05, B06, C12 and the
C02 session-fixture correction. Remote CI, merge and deployment must retain
their own exact source identities.

This record maps C08.01's source → requirement → entity → API → permission →
screen → test → audit chain. Native operations and aggregate observations have
different evidence. C05 actually executes the existing B05 issue/return routes
in its isolated database; B06 actually issues and signs native test documents
and posts a native test finance entry. The C08 count tests deliberately seed
projection fixtures, including inconsistent records, to test exclusion. They
do not substitute for those lifecycle tests.

All people, signatures, records, money and model responses in local acceptance
are synthetic. This work neither accepts a real employee or qualified reviewer
on their behalf nor marks the 98 departmental operating gates complete. Current
source packets retain `coverage=PARTIAL` and
`operationalAcceptance=NOT_ASSESSED`.

## Traceability of the delivered connections

All API paths below are relative to `/api/v1`. Original domain ownership remains
authoritative; a follow-up record or report does not create authority in another
domain.

| Requirement and original source | Native entity and API | Current authority and screen | Execution and audit evidence |
| --- | --- | --- | --- |
| Approved B05 stock issue and acknowledged custody become C05 part evidence; actual returns require reconciliation | `WarehouseDecisionRequest`, `WarehouseIssuePosting`, `WarehouseStockLot` → `MaintenancePartUsage`; `/organizations/:organizationId/maintenance/orders/:id/:action` | Same organization, approved issue, named custodian and current maintenance actor; **Maintenance** workspace | `maintenance-work-order-http-e2e.mjs` executes actual B05 routes, asserts immutable original cost/quantity evidence and updated return reconciliation. `MaintenanceCommand` and `C05_*` audit writes are in the business transaction. |
| Existing marine/equipment asset must remain unavailable for conflicting work or rental until valid closure | `MarineAsset` / `MarineMaintenanceRecord`, or `EquipmentBarcode` / `CalendarResource` → `MaintenanceWorkOrder`; maintenance order and plan routes | Current scoped manager, executor and separate inspector; Maintenance workspace and marine-readiness entry | C05 actual lifecycle plus exact TEXT/UUID migration checks; reciprocal calendar/rental conflict, inspection rejection, reopening, preventive recurrence, and audit rollback. `clearance-snapshot-validation.cjs` also verifies maintenance blocks and stale-clearance rejection. |
| Signed original contract and published library version drive obligations, coverage, claims and renewal | `ManagedDocument`, `DocumentRevision`, library version, native signature/seal evidence → `LegalContractLifecycle`; `/legal/contracts/organizations/:org/records` and `/records/:id/actions` | Original native source permission, explicit internal review assignment where required, current actor and person separation; **Contracts and insurance follow-up**, native Documents and Contract Library | B06 actual library/document/cooperation/review routes, exact signed renewal sources, independent verification, rejection/reopening, termination and archive guards. `LegalContractLifecycleEvent` and `LEGAL_LIFECYCLE_*` audit are atomic with state. |
| Approved insurance claim references an already-posted native financial entry | `FinanceAccount`, `FinanceEntry` and its independent approval/posting → `LegalContractSettlementReference` | Same organization, exact claim/amount/SAR currency, native posting evidence and separate people; B06 settlement selector | B06 HTTP suite asserts wrong/pending entry rejection, immutable retained reference, audit rollback and **zero B06 finance writes**. No provider collection or bank transfer is inferred. |
| Source/version-specific independent document review retains delivery, rework and revocation | `ManagedDocument`, immutable revision, native review assignment and decisions; `/document-reviews/.../plan`, `/assignment`, `/decisions`, `/revoke` | Named current reviewer/signer, scoped version, expiry, positioned employment and person separation; existing document review inbox | [C03 technical record](C03_INDEPENDENT_REVIEW_TECHNICAL_ACCEPTANCE_2026-11-27.md): actual HTTP/PG/browser delivery and revision checks, rework and revoked access, including revocation during PDF rendering and atomic audit rollback. Real qualified delivery remains a separate acceptance requirement. |
| HR source, contract version, employment state and IAM changes preserve their separate owners | `Employment`, employment contract, native document sources, `Session`; HR and employment-contract routes | Current staffing and source authority; HR/document workspaces | [C02 technical record](C02_HR_TECHNICAL_ACCEPTANCE_2026-11-27.md): actual isolated lifecycle, 12 source providers / 192 catalog definitions, saved source preservation, delegation and offboarding session revocation. A document signature does not itself grant IAM or pay salary. |
| Formal grievance retains the original customer/center/domain reference through escalation, appeal and outcome delivery | `PrivacyGrievance`, linked `PersonalDataRequest`, source `recordRef`, `executionAuditId`, native `Notification`; `/privacy/grievances`, `/:id/appeal`, `/:id/actions` | Verified center affiliation, current center-handler or assigned department scope, customer-only appeal; existing privacy/grievance panel and private inboxes | `privacy-grievance-http-checks.mjs` uses actual login and tests center handling, seven-day escalation, department isolation, executive report and two private deliveries, appeal linkage, original outcome retention, verified execution proof, duplicate retries and rollback. Native `privacy_grievance.*` audit binds the original case. Six focused `privacy-grievances.spec.js` browser cases passed on the shipped panel and native auth with deterministic API responses, separately establishing the screen's native case/action bindings and role/session behavior. Both existing API and Web gates must pass on the final release candidate. |
| Read-only department reports observe original records and retain the captured version | Existing domain tables → V7 department packets and existing task/review receipts; `/admin/agents/department-sources` and reporting routes | Fresh verified platform owner, current ADMIN assignment, active department; existing agent administration source/report panels | Eight new C08 projection groups, complete 14-department runtime/report cycle and browser checks. Only allowlisted scalar counts are exposed; no source IDs, private text, identities or amounts. Preview performs no business write. Historical report receipts are not rewritten. |

## Cancellation, grievance, exception and delegation coverage

| Required branch | Native evidence and boundary |
| --- | --- |
| Cancellation / withdrawal | B06 policy cancellation retains its signed decision and cut-off date; incidents after the cut-off are refused. Termination leaves outstanding duties/claims visible. C03 executive retraction retains its terminal receipt. Existing commerce refund/cancellation suites remain required in API and commerce CI; this report does not infer a provider refund from a cancellation request. |
| Formal grievance | The existing `privacy-grievance-http-checks.mjs` gate executes A15 center-first escalation, linked rights case, executive report and verified outcome delivery against actual isolated PostgreSQL/HTTP. It remains a separate required API CI step. A B06 rejected claim or C05 rejected inspection is not relabelled as a formal grievance. |
| Exceptions and disputed state | C05 failed inspection/rework, stale B05 return evidence and audit failures; B06 disputed/rejected claims, missing coverage, mismatched source or ledger, and archive blockers; runtime evidence gaps, high-risk escalation, conflicting receipts and explicit deferred resume. Failure does not create a success audit or implicit approval. |
| Delegation / access revocation | C02 offboarding and temporary owner delegation; C03 exact-source review grants; B06 source revocation and unrelated legal staff denial; C05 current member/employment/assignment checks; C08 current owner/ADMIN/session revocation. Historical records remain retained without reviving access. |

The formal grievance and commerce rows identify existing executable release
gates. Their final remote run must be verified for the published candidate;
listing them here is not a new local execution claim.

## Observed combined-source results

| Check | Result and actual scope |
| --- | --- |
| `cross-department-lifecycle-http-e2e.mjs` | **8 groups passed**, real Nest HTTP and PostgreSQL 16.16, database timezone Asia/Riyadh. Own/foreign legal, finance, marine, equipment and warehouse links; returned parts; stale versions; no-store scalar privacy; no writes; current authority revocation. |
| `agent-runtime-http-e2e.mjs` with browser enabled | **Passed**, including all 14 V7 department inputs, director/office report flow, captured-source immutability, queued historical V2/V3/V4/V6 behavior, provider recovery and actual API process restart. All model/email-provider traffic used loopback fixtures. |
| `department-source.test.cjs` | **15/15 passed**, strict metric allowlists, safe integer bounds and versioned historical shapes. |
| `agent-word-limit-check.mjs` | **Passed**, V6/V7 source contracts for six relevant review scopes, missing/unknown-version refusal and unchanged output/token reservation boundaries. |
| Focused `admin-agent-runtime.spec.js` | **13/13 passed**, zero failed/skipped/flaky; separate bilingual V7 wording recheck passed. This UI run used deterministic request fixtures. |
| UI localization checks | **9/9 passed** on the reviewed C08 UI candidate. |
| `privacy-grievances.spec.js` | **6/6 passed**, zero failed/skipped/flaky in 30.7 seconds. Shipped profile/settings entry, panel and auth; stable submission key/retry, appeal source IDs, center/dept action boundaries, execution-proof-dependent choices, private report handling, mobile escaped text and logout/late-response clearing. API responses are deterministic fixtures; native persistence is tested separately. |

The committed [acceptance summary](evidence/C08_2026-11-27/acceptance-summary.json)
pins the exact local results and checked source hashes. Full runtime evidence is
in `c08-backend-evidence/summary.json` and its named
logs; UI evidence is in `c08-ui-evidence/`. The first combined bootstrap attempt
failed because an old test SQL splitter treated a semicolon in a standalone
migration comment as a statement boundary. The helper now removes standalone
comments before splitting, keeping executable SQL unchanged. That failed
attempt is retained separately and is not counted as a pass.

## Persistence, compatibility and release integration

V7 adds native legal and maintenance metrics without modifying the prior V2–V6
definitions or fingerprint rules. Current original document/version/source
links, finance organization/posting fields and B05 quantity/cost/return fields
are checked before counting a linked record. These are bounded link counts,
not a second full cryptographic/legal audit of every source. The UI uses
"linked to posted entries" and "matching warehouse issues" accordingly.

The C05 and B06 raw migrations are applied from their exact production files
to fresh test schemas. `purple-test-schema.mjs` refuses a partially installed
set, applies each new migration in a transaction and never fabricates production
migration history. Existing historical SQL and the Prisma schema are unchanged.
The actual production deploy continues through its normal history/recovery gate.

Current source-preview fixtures in warehouse, marketing, operational evidence
and agent reporting now prepare the required new schemas and expect V7.
Explicit historical test inputs retain their old version. Existing mandatory
API, Web and operational-evidence jobs carry the new checks; no extra workflow,
job or release-policy exemption is introduced.

## Real-operation boundaries

The original C08 technical criterion concerns the complete traced and exercised
integration chain; its final release requires the mapped API, commerce and Web
gates. The operating limits below do not add a new real-person prerequisite to
C08 or waive the explicit human conditions in C02/C03.

Actual cross-department operation still requires the relevant original records,
current authorized people, applicable professional/issuer decisions and the
real receiving department's decision. C02/C03 retain their explicitly required
real employee and qualified-review acceptance. C08 operating acceptance cannot
be inferred from aggregate counts or automatically transferred from the test
identities. Q01 remains the final overall user test, and does not silently waive
an existing domain acceptance condition.
