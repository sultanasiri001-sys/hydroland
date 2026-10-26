# Persisted department assessments — stage 1

The department reference catalog now reads a durable assessment for the current internal platform organization, rather than treating every department as permanently unassessed. **This release records assessment gaps, not departmental acceptance or closure.** It creates no production assessments, employees, assignments, approvals, model tasks, or permissions.

## Supported workflow

The current active, verified internal-platform owner opens a department in **مراجع الإدارات واللوائح**, opens the assessment editor, and records exactly the seven existing operating-cycle criteria. Each criterion can be `NOT_ASSESSED` or `BLOCKED`; a blocker needs a reason. Optional evidence references identify up to three current managed-document versions per criterion in the same organization and department. The server resolves these references and pins their content, template, revision and lifecycle status. A stored reference proves only which version was referenced, not its accuracy, legal applicability, independent approval, or actual execution.

1. Read the current assessment and expected revision.
2. Edit statuses, bounded notes and optional document IDs/versions.
3. Request a read-only server preview.
4. Separately confirm that exact preview. Edits invalidate it. Failed or uncertain writes require rereading, not automatic resubmission.

Each confirmation appends a new `DepartmentClosureAssessment` revision and an audit event in one serializable transaction. Existing rows are never overwritten by this API. The owner detail response includes the current full record and up to 50 recent history summaries (`hasMoreHistory` reports a longer retained history). Stored history is retained even if evidence or ownership later changes; the API does not silently replace old references with newer versions.

## API and visibility

All routes retain the existing access-token and ADMIN guards:

- `GET /api/v1/admin/department-references`: existing read-only administrator catalog. It exposes only assessment state, gate statuses and record metadata; no private notes, evidence IDs, document payload, actor identity or assignments.
- `GET /api/v1/admin/department-references/:department/assessment`: current owner-only detail.
- `POST /api/v1/admin/department-references/:department/assessment/preview`: owner-only non-mutating preview of `{expectedRevision, specificationVersion, gates}`.
- `POST /api/v1/admin/department-references/:department/assessment`: the same input plus `{expectedPlanHash, confirmed: true}`. Returns the newly persisted detail.

Gate input is `{id, verificationStatus, note, evidence:[{documentId,version}]}`. Unknown properties, missing/duplicate criteria, unsupported statuses, caller-supplied hashes/approval claims, invalid scope and stale versions are rejected. Private responses are `private, no-store`.

The preview binds the owner and organizational security revisions, policy/specification version, prior assessment digest and exact evidence. Every read/action rechecks current authority; suspending/restoring or transferring/restoring authority does not revive an old preview. Identity/source locks, revision uniqueness and serializable transactions prevent duplicate confirmations and lost updates. Audit failure rolls back the assessment insert. No external call runs inside the transaction.

When the recorded authority, policy/specification or referenced source changes, the catalog shows `STALE`, all current gate statuses become `NOT_ASSESSED`, and the historical snapshot remains available to the current owner. It is not silently re-certified.

## Explicit non-goals and next boundary

`departmentClosed` remains false and `closureDecisionReference` remains null because this release implements **no closure decision**. It accepts no `PASSED`, `ACCEPTED`, or `CLOSED` input, and never infers acceptance from a saved document, archived state, source count, CI success, owner routine approval, or agent review. Source catalogs still describe reference material; their applicability/adoption flags are unchanged.

A later independent-acceptance/closure policy must use actual qualified people, current scoped assignments, independent identities, specialist execution evidence, and an authorized separate decision. It must retain these assessment revisions and add explicit versioned review/decision records rather than reinterpreting this stage's owner notes as approvals. No reviewer identity, staff account or access grant is manufactured to fill missing operational evidence.

## Verification

- `department-closure-assessment-migration-db-e2e.mjs`: additive migration against isolated TEXT and UUID identity schemas, native Prisma writes/reads, FKs, revision uniqueness and rollback. Migration seeds no data.
- `department-closure-assessment-http-e2e.mjs`: real isolated HTTP/PostgreSQL owner/scope boundaries, malformed and stale requests, evidence integrity, concurrent/replayed writes, security revocation/restoration, source staleness, history preservation and actual failing audit triggers.
- `CLOSURE_E2E_BROWSER=1` adds the shipped browser module against the same live isolated API/database: preview then explicit confirmation, duplicate clicks, mobile rendering and non-owner privacy.
- `department-references.spec.js` adds malformed-contract, state display, preview invalidation, uncertain write and session/navigation tests to the existing reference suite.

Both database scripts refuse non-loopback destinations and require a test/CI environment. Test fixtures are synthetic and isolated; none constitute production evidence or operational acceptance.
