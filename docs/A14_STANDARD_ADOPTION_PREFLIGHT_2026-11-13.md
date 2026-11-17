# A14 existing-course adoption preflight

This adds a read-only prerequisite review to the existing A14 integration. It
does not migrate, rebind, approve or backfill an enrolment, source or signature.

`GET /training/enrollments/:id/standard-readiness` uses the existing
administrative enrolment scope inside the read transaction and checks that
scope again before returning the buffered result. An active platform ADMIN or
an existing authorised center operator can inspect that enrolment; REVIEWER
alone, a foreign center and an unauthenticated caller gain no access.

The response contains only the course identifier/code/status, counts of
sessions and signed skills, binding presence and a coarse prerequisite result.
It does not return the participant identities, private enrolment metadata,
birth dates, credentials, source bodies or medical fields. Responses use
`Cache-Control: private, no-store`.

The existing `assertTrainingStandardReady` is the sole prerequisite evaluator.
The preview distinguishes an unbound fresh course, an unbound course with
history or a closed status requiring review, and a bound course whose current
source/eligibility prerequisites are valid or blocked. Query/programming errors
remain errors. A stored binding is not treated as source approval. Every result
has `previewOnly: true`, `operationalAuthorization: false` and
`automaticHistoryAdoptionAllowed: false`. Valid prerequisites do not authorise
START, completion, certification or physical operations.

## Verification

- Nine compiled service cases cover scope denial before data reads, revocation
  before result delivery, coarse redaction, existing history/closed status,
  unapproved sources and propagation of database failures.
- The existing isolated certificate HTTP/PostgreSQL fixture now tests the
  actual endpoint, fresh and historical unbound courses, a revoked source,
  foreign-center/reviewer denial and revoked membership. Each successful read
  compares full enrolment/record/session/skill data and audit counts before and
  after. A fresh enrolment remains without an implicitly created record.
- Synthetic source and membership edits are test fault injection on the
  existing CI/loopback-only fixture. They are not operational approval or
  migration. Remote execution on the final head is required before claiming
  HTTP/PostgreSQL acceptance.

## Current integration and remaining adoption

The integration is reconciled with main `3f6702cacb734464f7150dfb02a354f8ee518823`:
storage timeouts, archived-record guards, route scanning and the full release
coordinator are retained. The latest agency source-review note is also retained.
No schema, dependency, role, source approval, production data or settings change
is introduced by this preflight.

The preflight supports review of the legacy-course impact; it is not itself a
legacy-course adoption process. Real programme/level/edition/source decisions,
actual vessel records/equipment, applicable site/weather limits, evidence
signing authority and authorised operational acceptance remain necessary for
full A14 closure. Unsupported delivery/evidence routes stay blocked.
