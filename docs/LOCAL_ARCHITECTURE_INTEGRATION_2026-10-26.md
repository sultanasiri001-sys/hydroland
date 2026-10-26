# Local architecture integration — 26 October 2026

## Status and authority

This is an **isolated local integration**, not a production release, operational
department closure, remote merge, or deployment. Base:
`908f3899e2e95931cec7cdba72bacd67b575107c`. Branch:
`integrate/validated-local-architecture`.

API/schema acceptance ran on code snapshot
`72a4ea9307bc9a066dd7a5a0ae59a9cb36e94136`. The later web-only messaging
correction is included at `1aba480f864cc4649f98808951330671b33aa14d`; web tests and
build were repeated after it. No live/customer data or real payment, messaging,
weather, model, or emergency provider was used by the runtime fixtures.

The full historical migration chain was **not** declared clean-installable.
The DB-baseline candidate `1cf29dec` is deliberately excluded. Canonical-schema
bootstrap and selected real additive migrations are different acceptance layers.

## Preserved package provenance

Commits below were cherry-picked with `-x`, except the explicitly identified
external PR import. The source commits remain in the local object database.

| Package | Accepted source commits |
| --- | --- |
| Department blocker assessments | `3d0e467` → `e91ee83` → corrective `daee35b51d751aa3fa2d628f13e9ef4181565e75` |
| Messaging history | `c31fae91ad433e971334b3a3e01daf43a4ae7125` → corrective `e204632fb3eebe36a271beba1268cacd56c107d5` |
| Render runtime/release reconciliation | `635f84e924151be5117379fd359901d99b631bdf` |
| Commerce audit/payment boundaries | `35a2a37dea565cd12b1ee061b79f99888b69c005` |
| Reproducible API correctness lint | `a7864afc23732f8bca60130cb8090d5740c4a584` |
| Shared calendar/training availability | `c206ba6404c5922eff4ac92f5110f8e37fc2a108` → `f1f1f3036d045796cfb4f15d8f54f39cf023d7ad` → `fa270d3b945518e6322f720492f95011e02651f0` |
| Canonical calendar weather consumer | `0ca550a15bce7fbe6f44efa9126e348c81fa959a`, after weather context |
| Training cross-role identity | `8c2149a430bd795d79fdeb7222fa399fa5385897` |
| Safety coordinates and weather context | `9607dbad3c1a383b4ff69001cd2c14d66cac493b` → `5a59061a45db2269e066c2f2023011921947d906` |
| Internal research runtime | `8e18bf2c51a205feb799986bb947019f5305b0f0` |
| External ready, unmerged PR #526 | Exact final five-file patch at `06daf844a4a422ea5719bfb959ffeb251dbe80dc`, imported locally as `cbe1a7719e32fd44e70df16db98b710c284741ba` |

For PR #526, a fresh read confirmed the base and head above and nine successful
head workflows. Full-file Git blob hashes were independently fetched and all
five local files matched. The connector patch import records source provenance,
**not invented original commit ancestry**. It does not imply that PR was merged.

The training cross-role change received an integration-owner read-only review:
the same canonical Account is checked in either role, while excluded session,
active states, half-open intervals, null-end/in-progress behavior, and policy
modes remain intact. Native concurrent-write acceptance was then repeated.

### Integration-specific changes

- `b0835bb`, `103ea95`: add API correctness/coordinate/weather/DOM checks and
  native weather timezone coverage without removing existing gates.
- `6d9a390`, `f52a413`: give older store HTTP fixtures real disposable Session
  rows and signed `sid` claims, including nested training actors. Keep revoked
  session denial. No AuthGuard modification or sessionless test bypass.
- The only merge conflict was additive Prisma schema content. The sole schema
  author explicitly approved retaining all closure and research reverse
  relations and all four models unchanged. Each model body was compared to its
  source; both migration files were preserved byte-for-byte.

## One architecture, bounded responsibilities

- **Identity/authority:** existing authenticated account sessions, fresh roles,
  organization scope, and independent-review checks stay authoritative. No
  package gains authority from a UI button, assessment, task completion, or
  passing test.
- **Persistence/audit:** shared Prisma/DatabaseService and transactional
  AuditService boundaries retain rollback and retry semantics. Research uses
  actual append-only SQL constraints and durable receipts; assessments record
  blockers, never closure decisions.
- **Scheduling:** training and trip resources resolve to the canonical Account
  across aliases and instructor/student roles. Native serializable races and
  UTC/Riyadh/New York tests cover shared conflicts and audit atomicity.
- **Weather:** canonical TripWeatherReview context is consumed by booking,
  trips, and calendar readiness. Legacy checklist weather cannot substitute for
  current trip/window/provider evidence. Readiness does not refresh a provider.
- **Commerce/messaging:** payment records do not claim capture or financial
  execution; audit writes are atomic. Participant-only history uses bounded
  stable cursors and the UI retains navigation/session fences.
- **Agents/research:** historical agent metrics are read-only observations, not
  acceptance rates or invoices. Research is an API-first internal desk-research
  lifecycle, not external execution, staffed adoption, or department closure.
- **Deployment:** reconciled Render evidence/configuration is retained without
  making a live deployment or changing production settings.

The unified Nest application registered **502 distinct method/path routes** in
each of three real API bootstraps; no duplicate registration was found.

## Acceptance matrix

Environment: clean scoped npm installation; Node **22.23.4**, npm **10.9.8**;
native disposable loopback **PostgreSQL 16.14**. All final rows below passed.

| Boundary | Observed acceptance |
| --- | --- |
| Canonical schema | Prisma validate/generate, API no-emit typecheck/build, clean diff |
| Static/domain aggregate | All **47 command groups** passed, including every API `validate:*` script, correctness lint, web unit/source checks, Render contract, messaging source and dependency-audit contract |
| Latest web-only correction | **20 unit tests** (14 existing + 6 anchor/layout contracts), all web source validators and web build repeated successfully |
| Native aggregate | All **46 database/runtime command stages** passed, including bootstraps and timezone setup; this count is not an assertion count |
| Migration compatibility | Closure TEXT/UUID; AI runtime TEXT/UUID; unified store; organization booking identity/index matrix; center license; messaging **80/80** TEXT/UUID scenarios; research **four** Account/Organization TEXT/UUID combinations |
| Historical migration integrity | **84** production-applied checksums verified; **zero** historical SQL edits |
| Calendar/training | `(25 cross-role + 57 shared-calendar + 26 alias) × 3 timezones = 324` native checks, with forced concurrent writes |
| Weather | `29 × 3 timezones = 87` native checks; **103** offline context assertions, **225** coordinate assertions, **15** canonical calendar assertions and DOM-token regression |
| Commerce | **20** actual PostgreSQL/service/Nest HTTP boundaries, including audit rollback, concurrency, ownership and revoked-session refusal |
| Closure HTTP | **17** groups; persisted blocker revisions, fresh authority, evidence binding, stale/concurrent writes and audit rollback |
| Messaging HTTP | Real auth/participant/cursor/text/voice/read-marker/notification contracts |
| Store/training HTTP | Checkout plus provider isolation, enrollment, instructor assignment, attendance, signed skills, guarded completion and separate independent certificate-review paths |
| Agent HTTP | Full AI/governance fixture plus actual PR #526 aggregate/duration/cost assertions; model traffic loopback-only |
| Research HTTP | **32** groups under actual research/revision/AuditEvent migration guards |
| Shared document review | **36** existing HTTP/PostgreSQL regression groups after research's shared-domain change |
| API registry | 502 routes with no duplicate method/path pairs |
| Dependency audits | Web/API including dev dependencies: **0 total**; mobile and repository: **0 high/critical, 6 moderate**, not silently ignored |

Each timezone gets a fresh disposable database, matching the existing CI matrix.
An early harness used the wrong guarded database suffix and then reused a
fixture database; the guards/one-time SQL correctly refused these setups. The
harness was corrected, not the protections. Research runs separately because
its append-only fixtures must be retained, whereas older closure cleanup removes
its own synthetic audit rows. All use the same integrated schema and API binary.

## Remaining limits and handoff

- **No local browser acceptance claim.** Chromium execution is blocked by the
  known runtime IPC restriction; no denial bypass was attempted.
- PR #527's real browser run exposed private editor retention after fresh role
  denial; `daee35b` is included. PR #528's real browser run exposed an unbounded
  message grid/scroll jump; `e204632` is included. Root published the messaging correction to approved PR #528 as
  `d9ad589d545409591f86e23d8bf5aa3bd3bc1f54`, with its tree verified equal
  to local `e204632`; CI is rerunning. Updated remote browser
  results must be checked separately. The original sub-2px scroll assertion is
  retained and desktop/mobile viewport checks are stronger, not relaxed.
- The isolated integration branch itself is **not published**, merged, or
  deployed, and has no combined remote CI receipt.
- Research UI and mobile/offline authorization hardening are separate pending
  lanes, not included or claimed complete here. Mobile moderate advisories remain
  separately visible.
- No fresh-install baseline candidate, production repair, live migration,
  provider activation, money movement, or customer-data action was performed.

Local detailed receipts, source hashes, command status tables, logs, provenance,
and the async disposable PostgreSQL harness are retained in
`/workspace/shared/hydroland-integration-evidence-20261026/`. Earlier harness
failures are preserved separately from the final green status tables.
