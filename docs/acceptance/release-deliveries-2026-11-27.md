# Integration and delivery evidence — 27 November 2026

This register fixes a finite historical scope: **49 first-parent deliveries** after the tracked I01 baseline `9c5e8983118a2c9fcc201f9cb88b1ff7fc2f3cd6` through `32e07e17439026d741e4c137f9858bc725fced49`. It continues the prior delivery review; it does not reopen or replace the earlier accepted denominator. Finalized Purple deliveries are recorded separately below. Future changes require a new register version.

The [machine-readable register](release-deliveries-2026-11-27.json) preserves exact PR heads, merge and parent commits, head/merge trees, every changed-file before/after blob, observed workflow records, and author-declared scope and limits. The integration owner retrieved the GitHub receipts; the independent local review reconciled them with the actual Git DAG and source files. Declared PR behavior is not promoted into a newly performed behavioral test.

## Reconciliation performed

| Review | Observed result | Meaning |
| --- | --- | --- |
| Delivery denominator | 49 of 49 first-parent merges match the retrieved register | No missing delivery within the named historical interval. |
| Source identity | All 49 exact PR heads are merge parents; all 49 head trees equal their merge trees | The recorded PR source and accepted merge source are byte-identical for this interval. |
| Changed-file provenance | 781 per-delivery file revisions across 472 distinct paths | Before/after blob IDs remain available without implying a fresh behavioral review of every file. |
| Workflow receipts | 915 records: 914 successful, 1 cancelled | The cancelled Web run remains visible below; it is not a historical success. |
| Prisma schema | 973 added lines, 0 removed; 121 to 171 models | 50 model additions; no duplicate model names or table mappings in the candidate. |
| Migration history | 45 added SQL files; all 101 prior tracked SQL files retain their exact blobs | Existing migration history was not rewritten. Additive history is not a clean-install or production-deployment result. |
| Literal route scan | 822 signatures across 583 TypeScript files; 0 conflicts | The existing AST scanner completed on the named candidate. Runtime precedence and dynamically registered behavior remain outside this result. |

The independent route command was `node apps/api/scripts/route-uniqueness.mjs`. This review did not regenerate Prisma or replace the shared client.

## Historical Web exception

[PR666](https://github.com/sultanasiri001-sys/hydroland/pull/666), exact head `0ec317a1572390bf265000f4e06e8e79478d23f7`, has a **cancelled** [Web validation run 44867630275](https://github.com/sultanasiri001-sys/hydroland/actions/runs/44867630275). Its other nine retrieved workflow records succeeded. The accepted merge is `ec0c57b1a47bf8590214036cb7123fad94ec8c3b`; its tree is identical to that head.

A later full Web run on the final current source is separate current-code evidence. It cannot change this historical conclusion or establish that the cancelled execution passed. The final current-source receipt belongs in the Purple extension when available.

## Schema and migration findings

All 45 new SQL files were read. The canonical Prisma additions and the SQL extensions retain the existing identity, document, financial and resource sources. The 52 new SQL table declarations include the 50 Prisma additions and the SQL-managed private-message evidence tables. Constraints, triggers and SQL-only tables remain part of the migration contract even when a Prisma-only test bootstrap cannot represent them.

| Migration group | Reviewed effect and limit |
| --- | --- |
| Privacy requests and grievances | Adds organization/customer-scoped requests, center-first case routing, appeal and verified-outcome references. New private-message withdrawal/evidence tables preserve separate review evidence. Schema presence does not decide a real erasure request or retention policy. |
| Marine and instructor documents | Adds separate document slots and review metadata. `20261121190000_marine_operations_recommendation` intentionally changes in-flight `PLATFORM_PENDING`/`ON_HOLD` documents with a center approver to `OPERATIONS_PENDING`; completed decisions are not selected. This is a real data migration, not zero existing-row updates. |
| Commerce contracts and refunds | Adds nullable snapshots for historical records, bounded refund journals, operation grants, native collection references and uniqueness guards. No historical agreement, financial grant or collection evidence is seeded. Later cancellation support replaces the refund-status constraint through a new migration. |
| Store catalog, preferences and stock locations | Adds preference/feedback and location/transfer/count storage. The restock trigger consumes opted-in alert flags and creates native inbox notifications on qualifying future stock changes; it is not an initial physical-stock backfill. |
| Financial posting | Adds loyalty reservations and instructor posting/attempt/recovery records with bounds and references to existing financial evidence. These records do not establish that an external bank or payment provider executed a transfer. |
| Warehouse execution | Adds purchase/receipt/lot/issue/decision structures, custodian acknowledgment and returns. A later migration deliberately replaces the original on-hand ceiling with an independently counted ceiling, and adds return/transfer states. Original receipt quantities and linked history are retained. |
| Notifications and sessions | Adds a queue and native-event triggers; later invoice finalization replaces the queueing function so organizational notices wait for an issued native invoice. Session revocation clears the session-bound push token fields. This is not a new identity source or proof of provider delivery. |
| Invoice finalization and settlement receipts | Adds source-bound finalization and confirmation evidence while retaining original payment contracts and FinanceEntry ownership. Several source IDs intentionally remain textual across historical TEXT/UUID storage; application source checks are therefore part of the contract. |
| Organization procurement | Pins signed supplier/contract evidence, scoped participants, receipt/settlement/recovery snapshots and append-only decision provenance. The SQL does not create business transactions or historical approvals. |
| Procurement lab/API preparation | Adds a separately owner-scoped synthetic state machine and provider-neutral configuration. Its schema explicitly requires synthetic provenance; it does not create an organization purchase, native signed document, financial journal or provider connection. |

Fresh test databases use the canonical schema plus the specifically required raw migrations. The complete historical migration chain was **not** replayed against an empty database by this review. Actual deployed-history checks, recovery scripts, and production migration execution retain separate receipts. TEXT/UUID compatibility is claimed only for the exact fixtures actually run, not for every possible historical database shape.

## Ownership and integration boundaries

| Boundary | Canonical owner and reviewed contract |
| --- | --- |
| Identity and permission | Account, Person, Session, current organization membership and scoped authority remain authoritative. The push refresh change rebinds an existing device to the successor session; it does not grant a new business role. UI counts and simulation roles confer no authority. |
| Native documents | ManagedDocument, DocumentRevision, lifecycle history and the published Contract Library remain the originals. A saved source snapshot or signature does not itself issue money, stock, a regulatory permit or employee acceptance. |
| Payments and finance | Payment/CommerceCheckout retain source collection state; FinanceEntry and its approval history retain accounting ownership. Refund and settlement journals bind the exact original source, organization, currency, amount and independently authorized actors. Unknown provider results remain explicit reconciliation states. |
| Warehouse and maintenance sources | B05 owns warehouse purchase, receipt, lot, issue, custody and return effects. Asset/calendar owners retain MarineAsset, MarineMaintenanceRecord and CalendarResource. C05 integration must reference these sources rather than create an independent stock or financial ledger. |
| Procurement | Organization procurement resolves current native signed documents, supplier qualification, current named participants and source hashes. The owner-only procurement lab remains a separate synthetic context with no native business execution. |
| Customer notifications | Existing inbox records and the email queue retain intended-recipient/source bindings. Triggered queueing, provider submission and actual delivery remain different evidence states. |
| Department reports | Historical source packets remain versioned read-only observations. Partial coverage and `NOT_ASSESSED` operational acceptance remain explicit; an owner blocker assessment or a high count is not independent operational closure. |

This is a source/check, schema, migration, route and ownership reconciliation for the named delivered scope. It does not assert that all 472 changed paths received a fresh independent behavioral review, close Q04, or establish employee, issuer, legal, banking, provider, physical-maintenance or department acceptance.

## Purple and concurrent delivery extension

The 49 historical deliveries above remain an immutable denominator. **PR720 is delivery 50, concurrent PR721 is delivery 51, concurrent PR724 is delivery 52 and concurrent PR723 is delivery 53** in the combined register. Their receipts are recorded separately below. PR722 remains outside the delivered denominator until its exact accepted merge is recorded.

| Delivery | Exact PR head | Accepted merge | Observed PR workflows |
| --- | --- | --- | --- |
| 50 — [PR720, C12 document dates and acceptance evidence](https://github.com/sultanasiri001-sys/hydroland/pull/720) | `d2c6a303724dd22c3f07285ffd41103bab59d32b` | `024a6440d1c04135bde07ed11dc8a08883815ef4` | 22 completed successfully |

The merge's first parent is the historical candidate `32e07e17439026d741e4c137f9858bc725fced49`; its second parent is the exact PR head. The remote head, accepted merge and locally reviewed C12 commit `5ed9cc349051c183809f2c8ae01ba920eae2671b` all have tree `81c707de417df38ebbe52a01569aded734e2e952`. The different local and remote commit IDs therefore preserve byte-identical source. All seven changed-file blob pairs are retained in the JSON register.

The saved PR metadata was captured before merge and still says open. The separate successful merge response and the fetched local merge DAG establish the accepted merge above; the pre-merge synthetic merge SHA is retained only as provenance. All 22 saved PR workflow runs succeeded. **Post-merge full-policy, Web and deployment results were still pending at this receipt** and are not promoted to successful results here. C12 synthetic document checks do not establish issuer validity or real interface acceptance.

PR666's cancelled historical Web run remains unchanged. Final combined-source Web evidence is a separate receipt; a successful C12 PR run does not prove later Purple changes passed.

## Purple source and contract review before the concurrent D01 delivery

The integrated code was independently reviewed at `7fce7f586b4c9ad171a4af5d40bd7b97c859192c`, with the final test/CI integration at `57302f606dc5b993c8f83678f2f5619dd415f1c8`. Application source and production migration bytes are unchanged between these two points. This named source review is separate from the accepted-delivery list: the combined Purple PR/main/deployment receipts have not yet been recorded in this version.

| Source check | Exact observed result |
| --- | --- |
| Canonical Prisma schema | Unchanged from `32e07e17439026d741e4c137f9858bc725fced49`; 171 models remain. No shared client was regenerated by this review. |
| Migration history | All 146 SQL migrations at the preceding candidate retain their exact blobs. Two additive SQL files create seven SQL-managed tables, for 148 tracked SQL migration files. The original historical baseline contained 101 SQL files; the earlier 45 additions remain unchanged. |
| Routes | 835 literal signatures across 593 TypeScript files, zero conflicts. The 13 added signatures comprise seven maintenance and six legal-lifecycle routes; the C08 source preview extends an existing route. Exact normalized signatures are in the JSON register. |
| B06 evidence/source identity | All 11 implementation, migration and test hashes in the committed B06 acceptance summary match the integrated source. |
| Required workflow source contract | 143/143 source-inventory tests passed after C05/B06 checks were placed inside existing required jobs. No new workflow classification, required-job name or release-policy change is introduced. This is a source-contract test, not a replacement for remote CI. |

The exact new migrations are `20261127013000_maintenance_work_orders` and `20261127020000_legal_contract_lifecycle`. Their Git blobs and SHA-256 values are retained in the JSON register. They adapt only new foreign-key column types to the observed native TEXT/UUID sources. Existing identifiers, original documents, financial entries and warehouse sources are not rewritten by these additive migrations. The C05 usage/command and B06 event/settlement histories reject destructive updates/deletions; tested statement guards also reject truncation. C05 uses new `TIMESTAMPTZ` storage and normalizes legacy timestamp operations, while B06 normalizes writes to native `TIMESTAMP(3)` explicitly to UTC. Their tests ran against a database configured for Asia/Riyadh.

| Integration | Reviewed owner and technical evidence | Remaining real acceptance |
| --- | --- | --- |
| C12 document extraction/upload/renewal | The delivered PR720 source conservatively withholds ambiguous dates. Its acceptance record preserves the real reader samples, 36 browser cases and 156 HTTP/PostgreSQL assertions; the Eastern-digit raster abstention remains explicit. | Issuer validity and the user's actual interface acceptance. |
| C02 human resources | Existing employment, session and IAM sources retain ownership. The repaired isolated fixture creates actual sessions and verifies HTTP 401 after offboarding. The [C02 record](../C02_HR_TECHNICAL_ACCEPTANCE_2026-11-27.md) names the executed suites and source boundary. | Actual employee participation, records and decisions. |
| C03 independent review | Existing source revisions, separate reviewers and executive decisions retain ownership. The [C03 record](../C03_INDEPENDENT_REVIEW_TECHNICAL_ACCEPTANCE_2026-11-27.md) separates real HTTP/database checks from deterministic interface fixtures. | Actual qualified review and organizational acceptance. |
| C05 maintenance | MarineAsset/MarineMaintenanceRecord and EquipmentBarcode/CalendarResource remain the asset originals; B05 owns approved, posted and acknowledged issues and returns. The work order records execution, independent inspection and closure, and preserves original part-use evidence through return reconciliation. Exact TEXT/UUID migration fixtures, 18 real HTTP/PostgreSQL/browser groups and five separate browser-fixture groups passed. | Physical work, actual inspection, custody and closure by authorized people. |
| B06 contract/insurance follow-up | ManagedDocument, DocumentRevision, native signatures/branding and the published library remain the contract originals. Follow-up requires current exact source access, independent signed action evidence and scoped participants. General and native cooperation renewals preserve their producer/signature contracts. A settlement only references an existing independently approved posted SAR journal; it initiates no payment. Exact migration 32, real HTTP/PostgreSQL 98, deterministic browser 31 and actual API-restart persistence 11 assertions passed. | Real signed originals, professional/legal applicability, insurer decisions and actual ledger evidence. |
| C08 department sources | Version 7 adds only scoped, allowlisted counts for B06/C05. Historical V2–V6 shapes and stored receipts remain valid. The source reader checks selected current relational links; it does not claim full native-source/digest verification or operational approval. Eight real HTTP/PostgreSQL projection groups, 15 source-domain tests, the full runtime/reporting chain and V6/V7 provider-contract checks passed at the named integration source. | Independent acceptance across real departments and their current native sources. |

C08's real combined runtime run exercised all 14 department inputs and director-to-office report chains, historical source compatibility, read-only/scalar-only boundaries, current authority revocation, actual worker restart and protected browser behavior. All model/provider traffic stayed on the isolated loopback fixtures. The separate interface run passed 13 cases, including malformed V7 packets and historical views, followed by one final bilingual/mobile label check. Those labels describe recorded/matching links and retain `PARTIAL` coverage and `NOT_ASSESSED` operational acceptance.

The C08 projection test directly seeds synthetic native rows to verify the read projection; it is distinct from B06/C05's real native command suites. The first combined bootstrap attempt failed because the test helper split a semicolon inside a SQL comment. The failed receipt was retained, the helper was narrowly corrected without changing executable migration SQL, and the complete combined run then passed. The older clearance transaction fixture was also updated for the new maintenance read and passed 27 groups, including policy bypass resistance, stale-clearance denial and transactional failures; that mocked fixture does not prove database isolation.

The [C05 acceptance record](c05-maintenance-2026-11-27.md), [B06 acceptance record](../B06_LEGAL_CONTRACT_LIFECYCLE_ACCEPTANCE_2026-11-27.md) and [committed B06 source-hash summary](../evidence/B06_2026-11-27/acceptance-summary.json) preserve their detailed boundaries. The machine-readable I01 register retains the local result summaries and log digests. Full current-source remote Web/API/release-policy results, production migration/deployment and the subsequent accepted merge must be appended as separate receipts. None of these local results changes PR666's historical cancellation or creates real operational approval.


## Concurrent D01 delivery and combined-source snapshot

**PR721 is delivery 51.** It merged while the Purple candidate was awaiting final checks. [PR721](https://github.com/sultanasiri001-sys/hydroland/pull/721) has exact head `8f53716e46fa3c8b73da2051283561acecb66c84` and accepted merge `631d4437ec1ec4239235053e1a4ca708919ca324`. The merge's first parent is C12 delivery 50, `024a6440d1c04135bde07ed11dc8a08883815ef4`; its second parent is the exact D01 head. Both head and merge have tree `0895fc2f0d00020bf54615f58b7ef56d51c63c87`. GitHub records the merge at 01:01:59 UTC on 27 November. The two-commit DAG and all 76 changed-file before/after blobs match the retrieved GitHub metadata.

All **27 workflows on the final exact D01 PR head succeeded**. The [API run 45917951920](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45917951920), job `140241597988`, ran 28 native D01 HTTP groups, both exact TEXT/UUID migration checks and real PostgreSQL 18.7 dump/restore/replay. Its retained recovery result has identical original/restored fingerprints across 187 tables, unchanged original data and zero production writes. The [Web run 45917951794](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45917951794), full job `140241597467`, reports 955 browser cases passed. This evidence remains synthetic and supplies no actual participant consent, guardian authority, medical clearance or organization acceptance.

The earlier D01 head `814f9756d3ea09b10faba7479f324e8a375908b9` retains 26 successful runs and one failed [form-library diagnostic run 45917187178](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45917187178). Its observed error was `D01 fixtures require NODE_ENV=test`. The final head's corrected canonical environment replay passed; the earlier failed run is retained as a failure.

### D01 postmerge status at this receipt

At **01:15:54 UTC**, the 31 retrieved runs for merge `631d4437` comprise 28 successes, one failure and two still running. The [API run 45920202411](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45920202411), job `140248842330`, failed in **HR HTTP/DB E2E**: the notification fixture's `prisma.account.deleteMany()` at `apps/api/scripts/notifications-http-e2e.mjs:88` hit Prisma `P2003` on `Notification_accountId_fkey`. This is the visible grouped fixture cleanup failure. PostgreSQL also records repeated serialization/read-write conflicts on Notification INSERT/COMMIT from 01:15:28.087 through 01:15:28.368, before the cleanup FK failure at 01:15:28.407. The original request failure is masked by cleanup, so the receipt does not assert that cleanup was the sole defect. [Web 45920202168](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45920202168) and [A02 full policy 45920202295](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45920202295) were still running. The complete postmerge gate and matching deployment are **not asserted successful** by this receipt. The complete run records and failure details remain in the JSON register.

### Combined source after retaining D01 and Purple

The integration owner staged main `631d4437` into Purple head `8c9a606675fc09f3418c043b9f0c096387d1d1a2`. This review checked the resolved staged source at 01:12:53 UTC, before the new integration commit and release checks. The preceding 171-model / 148-migration / 835-route audit above remains an accurate historical result for its named source; the combined source has the following updated counts.

| Current static check | Observed result and limit |
| --- | --- |
| Canonical Prisma schema | **173 models**: D01 adds `ParticipationCase` and `ParticipationEvent`. The schema blob is `3b97d51c8e71018a7ad426468d708c1434720967`. This reviewer did not regenerate the shared client. |
| SQL migration history | **149 files**: all 146 files present at `32e07e1` retain identical bytes, followed by the one D01 migration and the two Purple migrations. Existing migration history was not rewritten. |
| D01 migration | `20261127010000_participation_source_eligibility` creates the two source-bound tables, adapts only their new FK columns to native TEXT/UUID identities, constrains one subject and bounded state, and protects event rows from UPDATE/DELETE. This review does not claim a D01 statement-level TRUNCATE guard. |
| Literal routes | **844 signatures across 602 TypeScript files, zero conflicts**, from a fresh `node apps/api/scripts/route-uniqueness.mjs` scan. D01 adds nine participation routes; the prior 13 Purple additions remain. |
| Directly overlapping paths | API workflow, clearance snapshot fixture, form-library diagnostic replay and web asset loader. The root's two textual conflicts are resolved, with zero unresolved paths at review. |
| Web loader resolution | Preserves maintenance and legal lifecycle assets and adds the D01 participant-eligibility interface after the existing profile assets. |
| Diagnostic resolution | Retains canonical workflow/job/step variables, including `NODE_ENV=test` and disposable-fixture confirmation, while preserving the diagnostic's own `DATABASE_URL`. |
| Source identity | The JSON register retains selected overlap-file blobs and a SHA-256 manifest identity for 1,383 tracked source/script/schema/workflow files. A future published commit/tree must be bound to its own complete gate receipt. |


### Local checks on the staged combined source

The integration owner's staged source tree `28d6b3b021820521838e135532a2f8ac84898990` passed API and Web builds, API lint and 35 clearance snapshot checks. The retained C05/C08 summaries and combined browser source manifest were read independently for this register.

| Scoped integration check | Actual result |
| --- | --- |
| C05 | Exact TEXT/UUID migration checks, 18 actual HTTP/PostgreSQL/browser groups and five separate interface boundary groups passed. |
| C08 | Eight real HTTP/PostgreSQL projection groups, 15 source-domain checks and the V6/V7 provider contracts passed. |
| Combined Web | **41 passed, exit 0**: three portal cases, eight profile-integrity cases, 24 D01 eligibility cases and six grievance-panel cases. The source manifest and log digest bind this local run; CSP bypass was false. |

A narrow notification fixture/diagnostic correction is being prepared after the separately retained main failure. These local results precede that correction and do not claim that the historical failure has been repaired. The final published combined head must still pass its complete remote CI and deployment gates.

D01 keeps the existing native document, revision, lifecycle and attachment stores as the private originals. Its case/event records bind exactly one original booking participant or training enrollment. The same current-source evaluator now contributes to booking confirmation, readiness, operational clearance, trip completion and training. A participant's editable health declaration remains separate from evidence and actual consent. Generic document, independent-review, owner-approval and operational-evidence readers exclude the private `D01-` sources; the integration retains these exclusions.

C05 continues to use the canonical asset/calendar and B05 issue/return records. B06 continues to bind the native signed contract and existing financial entries. D01's consent and eligibility additions do not create replacement maintenance, stock, legal or financial ledgers.

### Prior Purple checks remain diagnostic history

The superseded Purple head `83bb1bd` failed its stale diagnostic environment and three portal browser cases. Its complete full-Web artifact nevertheless provides exact diagnostic evidence: **940 passed, 3 failed, 0 skipped, 0 flaky**, with all six grievance-panel cases passing on their first attempt. The only browser failures expected nine center command cards after the B06 service added the tenth. Head `98c9902` passed the complete API gate, including C05, B06, formal grievances and B08 cancellation, and passed the corrected form-library diagnostic; its focused Web job retained the same three portal failures. The narrow portal correction passed all three local desktop/tablet/mobile cases. Head `8c9a606` had no PR workflows observed before the concurrent main integration because the PR was no longer mergeable.

These receipts diagnose the previous source; they do not pass the new combined head. At this D01 integration snapshot, PR722 was planned as delivery 52 and the delivered count was 51: the immutable 49 historical deliveries, C12 delivery 50 and concurrent D01 delivery 51. The subsequent concurrent delivery below advances the delivered count and the next planned delivery number. The new combined API/Web/full-policy checks, any required fixture correction, accepted merge and matching deployment remain separate pending release evidence. PR666's historical cancelled Web execution remains unchanged.

### Notification fixture failure preservation

The demonstrated fixture race is corrected without changing the notification service, authentication, foreign keys or transaction retry policy. All four concurrent POSTs settle before their results are asserted or fixture cleanup starts. A cleanup error is retained separately and cannot replace the original request/assertion error; the Prisma disconnect is always attempted. The canonical HR step prints the API log and keeps a failing exit status when this acceptance fails.

On a fresh isolated PostgreSQL database and the real combined API, the unchanged strict notification assertions passed. Two deliberate failure cases also passed their diagnostic assertions: one HTTP 500 alongside three delayed real-API 200 responses, and the same request failure with a temporary database cleanup rejection. Both waited for all requests, preserved the original error and completed disconnect; the harness removed only its own temporary trigger and synthetic records. The JSON register retains the source and log digests. This verifies the diagnostic/cleanup correction; it does not establish the cause of the historical serialization errors. The new exact-head CI must still pass all existing concurrency assertions.


## Concurrent notification fixture delivery — PR724

**PR724 is delivery 52.** The exact head `58ac757a30d7a9f80c204eca501d375b4ee5bc59` and accepted merge `7444b7fba315f21598611a1cccc269137c1e0060` have identical tree `43a81bde1ebde148f735316a7aa3e2b4a652dc1e`. The merge's parents are `631d4437ec1ec4239235053e1a4ca708919ca324` and the exact PR head. [GitHub records the merge](https://github.com/sultanasiri001-sys/hydroland/pull/724) at 01:52:30 UTC on 27 November. The fetched local DAG matches this metadata.

This delivery changes only `apps/api/scripts/notifications-http-e2e.mjs`: its blob changes from `ec2d605733e9a9439874891227b4d3b590aced21` to `4cf22e96a0259d71b5056e8e5a651e3b6f27cee2`. It waits for all concurrent requests, uses persisted sessions with session-bound access tokens, and removes only its fixture notifications, sessions, accounts and people transactionally. It does not change a production service, Prisma source or Web file.

All **14 retrieved final-head PR workflows succeeded**. The path-filtered PR did not run a separate Web workflow; no such result is invented. The [API run 45922589686](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45922589686), job `140256513011`, completed the grouped acceptance and logged the strict notification HTTP/PostgreSQL success. Its actual checkout `10d5c7fc79af89c2891c51fc30da74b5c0d6bc62` has the same verified tree `43a81bde`.

At the **01:58:05 UTC** postmerge receipt, the 31 push workflows comprise 28 successes, API and Web still running, and A02 full policy queued. The separate scheduled A06 success is retained separately from these release gates. The JSON register preserves every observed run. Postmerge completion and matching deployment are not asserted here, and the original `631d4437` API failure remains a failed historical execution.

### Fixture-only integration into the Purple source

The integration owner reconciled `7444b7fb` with Purple head `7c5c3754db3fac541c48ab9c4715b34d7b8a9a9c`. The fixture adopts the incoming persisted sessions and transactional cleanup while preserving the previous primary-error/AggregateError handling, unconditional disconnect attempt and canonical diagnostic wrapper.

Both current working-tree and staged-index diffs against `7c5c3754` are empty for these tracked source trees. No production-source audit rerun is needed for identical bytes.

| Unchanged source | Exact Git object at `7c5c3754` |
| --- | --- |
| Production API source, `apps/api/src` | `a207c50702e8d4b00a4e02006e27784ee0106ca1` |
| Complete Prisma directory | `4556cdbb09d89e1eb19d98660a2474a3f9defeea` |
| Prisma schema file | `3b97d51c8e71018a7ad426468d708c1434720967` |
| Prisma migration directory | `4143e61f3a4c5c715e628e8f27f3e917332541e6` |
| All tracked Web files, `apps/web` | `74e845713055f3e9cd17ca279cbf3ff5331534b4` |

The prior 173-model, 149-migration and 844-route findings therefore remain applicable to these unchanged production bytes. The merged fixture itself passed **three fresh isolated acceptance scenarios**. The real API/PostgreSQL happy path used persisted sessions and passed in 692 ms. The request-failure case waited for all four requests, retained three real-API 200 responses, preserved the original failure, disconnected and left zero fixture rows. The deliberate cleanup-failure case preserved the original failure and rolled back cleanup, retaining two accounts, two people, two sessions and five notifications before the harness removed only its own records. The two deliberate failure processes correctly exited nonzero; their diagnostic assertions passed. The retained summary and source/log digests are recorded in the JSON.

This is new fixture-integration evidence, not a reclassification of the historical serialization failures. The current main parent was independently verified as `7444b7fb` at 02:00:39 UTC. **At that review, the delivered count was 52 and PR722 was planned as delivery 53. The later PR723 receipt below supersedes only that prospective numbering.** The earlier 49-, 50- and 51-delivery boundaries remain named historical snapshots. The newly published combined head still requires its own complete CI and matching deployment receipts.


## Concurrent D02 delivery — PR723

**PR723 is delivery 53; PR722 is now pending delivery 54 and remains outside the accepted denominator.** [PR723](https://github.com/sultanasiri001-sys/hydroland/pull/723) merged at **02:25:01 UTC** on 27 November. Its exact head `4f6f22089852da09cca36bc511e01db4971ed1c5` and accepted merge `1e6a6127bbb73a9f46b3f866cde3cd4118229907` have identical tree `e3357c3b36a258fffc91d8041eed9974705b1663`. The first parent is `7444b7fba315f21598611a1cccc269137c1e0060`; the second is the exact PR head. The fetched metadata, local Git DAG and all **20 changed-file before/after blobs** agree. The source difference is 2,167 additions and 63 deletions.

All **18 retrieved exact-head PR workflows succeeded**, including [API validation](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45925362544) and [Web validation](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45925362503). The JSON retains every full-SHA workflow record and receipt digest. The earlier abbreviated query returned no runs and is not used as evidence. Main `1e6a6127` and the newly combined Purple source still require their own complete CI and matching deployment receipts. No deployment result is inferred here.

### Combined D02 and Purple source review

The resolved staged source was reviewed at `2026-11-27T02:31:56.520Z`, with local Purple input `f29c24217307feff43041657529e5cabc6f136a6` and incoming main `1e6a6127bbb73a9f46b3f866cde3cd4118229907`. The pre-documentation index tree is `76727b3fad432afaf310602657ed379ce7a21cb5`; this is an observed local snapshot, not a release commit. Production working files match that staged source, and no unresolved paths remain.

| Source check | Exact observed result |
| --- | --- |
| Production API source | Git tree `7e54df9ee2eb78695b4ba8d369243bff1fa8668e`. |
| Canonical Prisma schema | **173 models**, unchanged blob `3b97d51c8e71018a7ad426468d708c1434720967`. |
| Migration history | **149 SQL files**, unchanged tree `4143e61f3a4c5c715e628e8f27f3e917332541e6`. Incoming PR723 adds or modifies no schema or migration file. |
| Web source and browser fixtures | Trees `bf42e4a71ce8e1c03b467a7a98c9efea59d05453` and `b1d8cbdce7aa08679ac4aa8a83c0e65bcdc5ec0e`. The resolved loader retains D02 and the existing ordered Purple modules. |
| Literal route scan | **849 signatures across 606 TypeScript files, zero conflicts**, using `node apps/api/scripts/route-uniqueness.mjs`. This does not establish runtime precedence or full A10 acceptance. |

D02 adds five literal routes to the existing training controller: `GET /training/mine/certificates`, `GET /training/certificates/:id`, and `POST /training/certificates/:id/reconsideration`, `/reconsideration-decision` and `/revoke`. The existing `TrainingCertificate`, native enrollment/training/participation records and append-only audit events retain ownership. Source-derived readiness, independent reconsideration and terminal internal revocation do not create a second certificate register.

The reviewed adapter remains a **HYDROLAND-owned TEST contract** requiring an explicitly synthetic driver. Its external certification state stays `NOT_CONNECTED`, with `officialIssuance:false`; no agency is selected or contacted. The PR's author-declared native/runtime, adapter and browser counts remain separately attributed in the JSON and [D02 acceptance record](../D02_TRAINING_CERTIFICATION_TECHNICAL_ACCEPTANCE.md); this bounded source review did not rerun those suites or regenerate the shared client.

All earlier delivery entries, workflow observations and named source audits remain intact, including PR666's cancelled Web run and the failed `631d4437` API execution. The current accepted count is **53**. The finite I01 closure target becomes **54 only after PR722's actual accepted merge, required checks and matching deployments are recorded**.

## Historical delivery index

| PR | Merge | Exact PR head | Retrieved workflow records | Changed files |
| --- | --- | --- | --- | --- |
| [#647](https://github.com/sultanasiri001-sys/hydroland/pull/647) | `d1ac40d810be` | `340dcb7d1892` | 16 successful | 5 |
| [#649](https://github.com/sultanasiri001-sys/hydroland/pull/649) | `3e118d5d59ec` | `aa403d8d1f51` | 10 successful | 6 |
| [#650](https://github.com/sultanasiri001-sys/hydroland/pull/650) | `5d7605525bbf` | `66e8f6d55950` | 25 successful | 15 |
| [#651](https://github.com/sultanasiri001-sys/hydroland/pull/651) | `6e131361bf45` | `9cc5414f9a7d` | 18 successful | 12 |
| [#653](https://github.com/sultanasiri001-sys/hydroland/pull/653) | `c17dfc39c07b` | `a3ecccd69ed2` | 14 successful | 1 |
| [#656](https://github.com/sultanasiri001-sys/hydroland/pull/656) | `f71f68138986` | `944c5119b02f` | 29 successful | 26 |
| [#659](https://github.com/sultanasiri001-sys/hydroland/pull/659) | `e9e33d5a6548` | `a84e29a737ff` | 16 successful | 7 |
| [#657](https://github.com/sultanasiri001-sys/hydroland/pull/657) | `ba3babac9326` | `10640855460d` | 22 successful | 15 |
| [#660](https://github.com/sultanasiri001-sys/hydroland/pull/660) | `863e8bcecb25` | `eb6cd53b532f` | 10 successful | 2 |
| [#662](https://github.com/sultanasiri001-sys/hydroland/pull/662) | `023e4e515b3f` | `8b867e2342e7` | 23 successful | 14 |
| [#663](https://github.com/sultanasiri001-sys/hydroland/pull/663) | `f3aebb271319` | `7f9cf8766f30` | 22 successful | 73 |
| [#665](https://github.com/sultanasiri001-sys/hydroland/pull/665) | `dc658b424ce7` | `b196967f07f4` | 14 successful | 1 |
| [#667](https://github.com/sultanasiri001-sys/hydroland/pull/667) | `7e2e6233591b` | `fca72304b70c` | 15 successful | 2 |
| [#669](https://github.com/sultanasiri001-sys/hydroland/pull/669) | `0f56498f3090` | `12906caff83c` | 16 successful | 3 |
| [#666](https://github.com/sultanasiri001-sys/hydroland/pull/666) | `ec0c57b1a47b` | `0ec317a15723` | 9 successful / 1 cancelled | 6 |
| [#670](https://github.com/sultanasiri001-sys/hydroland/pull/670) | `3320826ad80e` | `fae53cc1ed43` | 21 successful | 54 |
| [#671](https://github.com/sultanasiri001-sys/hydroland/pull/671) | `82cc5668bb32` | `3d308467fb72` | 18 successful | 11 |
| [#673](https://github.com/sultanasiri001-sys/hydroland/pull/673) | `ce8e90083aae` | `5a7e41e516bd` | 18 successful | 3 |
| [#672](https://github.com/sultanasiri001-sys/hydroland/pull/672) | `e363a9f1a7de` | `5cdf91ce73a0` | 18 successful | 25 |
| [#676](https://github.com/sultanasiri001-sys/hydroland/pull/676) | `14c97d4fc58b` | `ce92de3af52c` | 22 successful | 37 |
| [#678](https://github.com/sultanasiri001-sys/hydroland/pull/678) | `7610770b0e82` | `6d53c78ec6d7` | 15 successful | 5 |
| [#679](https://github.com/sultanasiri001-sys/hydroland/pull/679) | `3e2a879b8e93` | `20201607e1f6` | 17 successful | 7 |
| [#681](https://github.com/sultanasiri001-sys/hydroland/pull/681) | `112b8c43c4e7` | `2824023e679a` | 14 successful | 3 |
| [#680](https://github.com/sultanasiri001-sys/hydroland/pull/680) | `d98d0cfae10c` | `a016147748c7` | 27 successful | 24 |
| [#683](https://github.com/sultanasiri001-sys/hydroland/pull/683) | `476439ae4ced` | `83a1da05d91d` | 14 successful | 4 |
| [#682](https://github.com/sultanasiri001-sys/hydroland/pull/682) | `c95dfd842f78` | `0b8707892a95` | 20 successful | 21 |
| [#684](https://github.com/sultanasiri001-sys/hydroland/pull/684) | `f45ddfbe2659` | `44c0658ca754` | 14 successful | 6 |
| [#685](https://github.com/sultanasiri001-sys/hydroland/pull/685) | `0696b925d5da` | `c6ba41b4632e` | 19 successful | 16 |
| [#692](https://github.com/sultanasiri001-sys/hydroland/pull/692) | `d1e33f1bbf82` | `25e31a859979` | 18 successful | 45 |
| [#693](https://github.com/sultanasiri001-sys/hydroland/pull/693) | `1c66f4e660db` | `d95b9d381959` | 20 successful | 13 |
| [#695](https://github.com/sultanasiri001-sys/hydroland/pull/695) | `978875d549bd` | `bc3368db9a3d` | 22 successful | 16 |
| [#696](https://github.com/sultanasiri001-sys/hydroland/pull/696) | `d2e5749d6ea3` | `32d5ecb7c842` | 24 successful | 58 |
| [#698](https://github.com/sultanasiri001-sys/hydroland/pull/698) | `2688b87421da` | `c831a4c5db16` | 14 successful | 1 |
| [#699](https://github.com/sultanasiri001-sys/hydroland/pull/699) | `0ed1efde278c` | `4bda024b1ec2` | 19 successful | 33 |
| [#700](https://github.com/sultanasiri001-sys/hydroland/pull/700) | `d708fbd8ac01` | `76f8dec82b6d` | 18 successful | 9 |
| [#701](https://github.com/sultanasiri001-sys/hydroland/pull/701) | `95f5a568413d` | `d00727b71565` | 17 successful | 6 |
| [#702](https://github.com/sultanasiri001-sys/hydroland/pull/702) | `4e028f6f3682` | `5b45afdcbb69` | 18 successful | 6 |
| [#703](https://github.com/sultanasiri001-sys/hydroland/pull/703) | `4547e42e2beb` | `347175a3db48` | 20 successful | 12 |
| [#704](https://github.com/sultanasiri001-sys/hydroland/pull/704) | `4d2e038d38ed` | `7e8ef92012fe` | 18 successful | 8 |
| [#705](https://github.com/sultanasiri001-sys/hydroland/pull/705) | `4220d8e2298c` | `439408f7d9a9` | 18 successful | 4 |
| [#706](https://github.com/sultanasiri001-sys/hydroland/pull/706) | `0cc0259bf267` | `9c9666a090dc` | 15 successful | 2 |
| [#707](https://github.com/sultanasiri001-sys/hydroland/pull/707) | `75704e2081f9` | `92a9c33b340b` | 25 successful | 10 |
| [#708](https://github.com/sultanasiri001-sys/hydroland/pull/708) | `c9dce7cf1881` | `ed6ca189238c` | 21 successful | 5 |
| [#714](https://github.com/sultanasiri001-sys/hydroland/pull/714) | `8c12f5029251` | `8c9d7eb17111` | 26 successful | 29 |
| [#715](https://github.com/sultanasiri001-sys/hydroland/pull/715) | `33f070765b81` | `b99912e359fc` | 23 successful | 27 |
| [#716](https://github.com/sultanasiri001-sys/hydroland/pull/716) | `758e24c4752e` | `858be6d7b351` | 22 successful | 36 |
| [#717](https://github.com/sultanasiri001-sys/hydroland/pull/717) | `9ea89421c9ba` | `862b8f554e44` | 25 successful | 27 |
| [#718](https://github.com/sultanasiri001-sys/hydroland/pull/718) | `c127c4b5bb79` | `294a3cbb8775` | 24 successful | 24 |
| [#719](https://github.com/sultanasiri001-sys/hydroland/pull/719) | `32e07e174390` | `c156acf7487b` | 11 successful | 6 |
