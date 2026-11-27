# C06 — Native campaign preparation, evidence and measurement

## Acceptance boundary

The preserved C06.01 criterion is:

> مصدر إذن المحتوى والبيانات وميزانية معتمدة وحالة نشر حقيقية أو معلقة بوضوح؛ ربط القياس والتقرير والتدقيق.

This change implements the platform preparation and evidence path before any
real channel, campaign, content permission or budget is supplied. It does not
grant an external publisher permission, contact a provider, publish content,
spend funds or certify rights. D11 remains `REQUESTED_NOT_GRANTED`.

A real current owner must select current original documents and explicitly
record the campaign decision. Installing a template, saving a draft or entering
a proposed amount never creates that approval. Synthetic test approvals are
only evidence that the native mechanism works; they are not Sultan's approval
of any real campaign or money.

## Persisted state without rewriting planning history

`MarketingCampaignLifecycle` is a separate one-to-one record attached to the
existing `MarketingCampaignDraft`. `MarketingCampaignLifecycleEvent` records
each preparation, owner decision, revocation and evidence-link change, with
request fingerprint, actor account/person, revision, state snapshot, previous
event digest and audit receipt. PostgreSQL rejects UPDATE, DELETE and TRUNCATE
on this new event history.

The existing planning draft projection, digest and
`MarketingCampaignDraftRevision` snapshots are unchanged. An actual edit or
archive of the original draft makes its previous preparation stale. A new
preparation must bind the new draft revision and current sources and receive a
new owner decision; prior approvals and links remain in history.

All mutations run in a serializable transaction with current owner checks,
source and account locks, expected revision/digest guards and an atomic
`AuditEvent`. A repeated request with the same fingerprint replays without a
second effect. A changed request using the same key conflicts. Application
identifiers and timestamps are allocated before transaction retries.

## Original sources and existing review policy

The owner explicitly installs two original ManagedDocument templates:

| Template | Native department | Required scope |
| --- | --- | --- |
| `C06-CAMPAIGN-RIGHTS-V1` | `MARKETING_GROWTH` | Original campaign ID/revision/digest; covered channels; content and data scopes; original permission references; rights holder reference; restrictions; explicit UTC validity |
| `C06-CAMPAIGN-BUDGET-V1` | `FINANCE` | Same campaign/version/channel scope; original active finance account; its actual currency; total minor-unit budget cap; explicit tax amount/basis/reason; permitted spending scope; explicit UTC validity |

The source is created in `/documents` and submitted/reviewed through the native
`/document-reviews` workflow. An `APPROVED` source uses the independent reviewer
already required by that workflow. An optional `SIGNED` source also verifies
the native independent signer. C06 does not introduce a new three-person
requirement for an approved unsigned source.

At consumption, the server reads the original document, exact template schema,
immutable revision, brand/source digest, native approval/signature receipts and
their audit events. It checks current reviewer/signer employment, membership,
role and verified account bindings, the current owner mandate and explicit
revocation. Attached PDF bytes must still match their recorded SHA-256 and
size. A review link's access expiry does not silently become a legal expiry of
an already approved document; campaign validity is the explicit source
`validFrom`/`validUntil`. Explicitly revoking its review delegation, changing its
authority or retiring the selected source prevents current readiness.

Budget currency is not defaulted to SAR. It must exactly match the selected
active finance account belonging to the same platform organization. The
budget cap includes the explicitly recorded `taxMinor`; tax is not added twice
or derived from an assumed rate. Positive budgets require a matching explicit
tax treatment. A zero budget is allowed only with explicit `NO_SPEND`, zero tax
and a recorded reason. No ledger entry, reservation, transfer or payment is
created by this workflow.

## Owner decision and live readiness

Preparation stores a recommendation for review and state `PREPARED`. The
current verified platform owner records `APPROVE` or `DECLINE` against the
server's current readiness hash. Approval is bound to the draft, exact sources,
budget, validity, current owner authority and preparation content.

`readiness.ready` is scoped to `INTERNAL_PREPARATION`. It becomes false when
the draft changes, a selected source is expired/changed/unavailable, an account
or reviewer mandate becomes invalid, the owner changes, approval is revoked,
or a bound evidence reference is no longer current. GET evaluates this state
without rewriting the prior approval or appending an audit event. The client
cannot supply a readiness boolean or an approval actor.

## Publication and measurement truth

`OperationalEvidence` remains the only observation ledger:

- `CAMPAIGN_PUBLICATION` supplies a named original owner-recorded observation
  for the campaign/channel, with its native proof document.
- `CAMPAIGN_ANALYTICS` supplies a named original publication reference,
  explicit observation window and explicit counts.

Evidence is explicitly linked to the approved current preparation. A
publication must occur after that owner decision; an analytics window must
start no earlier than its publication and end by the recorded observation.
Analytics cannot be linked without their publication. The selected revisions,
native proof and current campaign scope are rechecked on each read.

An unconnected channel is always reported as `NOT_CONNECTED` and external
authorization remains `REQUESTED_NOT_GRANTED`. If no current linked
publication exists, publication is `PENDING_CHANNEL`. If a valid original
observation is linked, the state is `OWNER_RECORDED`; its provenance is shown
and `providerVerified` remains false. Neither status triggers an outbound
publication request.

Measurement is presented per original observation window. Overlapping windows
are flagged and never summed. No aggregate is invented even for non-overlapping
windows; raw observations remain individually reviewable. A count of zero
appears only when explicitly present in the native observation. Missing
measurements, actual spend, revenue and ROI remain unavailable/null. The
workflow reports no financial action executed; that does not assert that an
unconnected outside party spent zero money.

Archived or changed observation sources stop contributing to current
publication/measurement. Their historical links remain in the immutable event
snapshots. The owner may explicitly replace/remove stale current links without
erasing the original observations or previous decisions.

## API contract

All routes require the existing access-token/Admin guards plus the current
verified platform owner checked inside the service. Responses use
`Cache-Control: private, no-store`.

Base: `/admin/marketing-campaign-drafts`.

| Method and path | Behavior |
| --- | --- |
| `POST /lifecycle/templates/install` | Explicit, idempotent native template installation; body `{}` |
| `GET /:id/lifecycle` | Current preparation, readiness, original evidence, per-window report and bounded event history |
| `GET /:id/lifecycle/sources` | Named source/template/account/evidence options, eligibility and server hashes; truncation is explicit |
| `POST /:id/lifecycle/prepare` | Bind current draft and selected original rights/budget documents, with recommendation |
| `POST /:id/lifecycle/decision` | Current owner approval/decline against the live readiness hash |
| `POST /:id/lifecycle/revoke` | Explicit owner revocation preserving original decision/history |
| `POST /:id/lifecycle/evidence` | Replace the current set of original observation links; no observation is duplicated |

Mutation guards are `{requestId, expectedRevision, expectedDigest}`. First
preparation requires revision `0` and digest `null`; all subsequent commands
require the displayed current revision and digest. Preparation additionally
requires `{expectedDraftRevision, expectedDraftDigest, rightsDocument:
{id,version,hash}, budgetDocument:{id,version,hash}, recommendation}`. A decision
requires `{expectedReadinessHash, decision:'APPROVE'|'DECLINE', note,
confirmed:true}`. Revocation requires `{reason,confirmed:true}`. Evidence binding
requires `{evidenceIds,reason,confirmed:true}` with at most 100 distinct native
IDs. The interface selects named options; it need not ask a user to type IDs,
hashes or JSON.

## Validation evidence

Static TypeScript validation (`tsc --noEmit --incremental false`) and JavaScript
syntax checks passed during implementation. The native runtime suite is
defined in `apps/api/scripts/c06-campaign-lifecycle-http-checks.cjs`, supported
by `c06-campaign-lifecycle-fixture.cjs`.

**Native run, CI, merge and live deployment: pending. Do not infer a pass from
this test plan.**

The current native gate contains 25 groups covering owner/session isolation,
original source workflows, explicit account currency/tax/zero budget,
idempotency, stale inputs, native source expiry/revocation/role changes,
authority reactivation, optional signature and PDF integrity, original draft
history, concurrent preparation/decisions, explicit decline/revocation,
OperationalEvidence publication/analytics, unavailable versus zero, overlapping
windows, stale evidence recovery, audit rollback and native append-only guards.

The fixture refuses execution unless CI/test mode, both explicit disposable
database confirmations, UTC and a `commerce_test_c06_*` loopback database are
present. It starts the compiled Nest API on an ephemeral loopback port, uses
real login/session and native document/review HTTP paths, rejects all external
fetches and retains synthetic rows for an independent restore gate. It does
not disable original append-only triggers. The audit-failure injection creates
and removes only its uniquely named fixture trigger/function on that guarded
disposable database.

The additive migration detects parent ID types and supports both TEXT and
UUID installations. It is replay-safe and seeds no identities, permissions,
documents, approvals or campaigns. Migration/restore results must be recorded
only after the corresponding actual run.


## Local verification — 27 November 2026

The final native acceptance completed **25/25 groups**, zero failures or skips,
on PostgreSQL 16.16 / Node 24.22.3. It retained 14 original campaign drafts,
12 lifecycles, 27 immutable lifecycle events, 3 original operational-evidence
records and 30 source documents, with zero finance entries and zero external
HTTP requests. Corrected diagnostic runs are repetitions of these same groups,
not additional acceptance counts. The create boundary now invokes the existing
OperationalEvidence validator before persistence; a prefixed generic-document
hash is rejected without leaving an unreadable evidence row. Its original
canonical hash and SQL constraints are unchanged.

The exact migration passed native TEXT and UUID parent matrices, including
actor Person/original draft foreign keys, budget/state constraints, request and
revision uniqueness, UPDATE/DELETE/TRUNCATE rejection, unchanged original draft
history, SQL-only guard restoration, and forward replay with retained rows.
API build and lint passed.

The web group passed **20/20**: 13 C06 cases plus the 7 unchanged original
campaign-draft cases. The existing unit suite passed **165/165** and all six
validators. After a focused CSS contrast correction, the two affected cases
and a mobile screenshot capture passed again; these are overlapping evidence,
not additional unique cases. All successful runs had zero skipped, retried or
flaky cases. Arabic desktop/mobile screenshots were visually inspected, and
source files matched the built assets. USD and JPY conversion, explicit zero
budget, current permission loss, late responses, uncertain saves, source
readiness, owner-recorded facts and nonaggregated measurement windows are
covered.

The CI gate additionally requires PostgreSQL 18 native backup/restore and
exact row/catalog/binary fingerprints with forward migration replay. CI,
merged-main validation, deployment, and canonical tracker closure remain
pending until their actual source-bound receipts are available. No real
campaign publication, spending, rights grant, professional acceptance or
D11 authorization is claimed by these synthetic checks.

## Resumed verification on the Purple release — 27 November 2026

The existing C06 work was merged with the published Purple source
`95b0d91cc7f8090b5f17a63d12bf81c05232e402`. The original draft fixture now
preserves C06's incoming foreign keys and then applies the existing Purple
fixture schemas. Its historical source-version assertion follows V7; all
original assertions and append-only protections remain in force.

The guided-document browser case previously read its result before the
asynchronous fresh-authority check finished. It now deliberately holds that
check, verifies that no document opens while authority is unresolved, releases
it, and waits for the exact original document/scope and the cleared busy state.
No timeout, authorization rule or expected document scope was relaxed.

The resulting source passed API build and lint, **20/20** API unit cases,
**20/20** focused browser cases (13 lifecycle and seven original draft cases),
both C06 native **TEXT/UUID** migration matrices, all four original draft
Organization/Account identity combinations, and **8/8** original HTTP draft
acceptance groups. The C06 native HTTP run finished at **08:28:11 UTC** with
**25/25** groups and zero skipped on PostgreSQL 16.16 / Node 24.22.3. It retained
14 synthetic drafts, 12 lifecycles, 27 lifecycle events, three original evidence
records and 30 source documents, with zero finance entries and zero external
HTTP requests. These repeat the existing acceptance groups; they are not new
business transactions or additional distinct coverage counts.

PostgreSQL 18 native recovery, full updated-head/main CI and live deployment
remain release gates until the root release receipt records their actual
results. Original content/data rights, real budgets, external publishing,
provider verification, spending and the final Q01 user acceptance are not
created by this isolated technical verification.
