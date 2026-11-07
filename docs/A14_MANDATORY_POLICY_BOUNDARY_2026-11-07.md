# A14 source-bound mandatory policy boundary

This change adds a runtime enforcement boundary for explicitly recorded source
adoptions. It does not create any adoption, assert that a source is currently
law, verify an attachment, or close the complete A14 acceptance criterion.

`PolicyControl.metadata.mandatoryRequirement` is a versioned adoption envelope.
It binds a requirement to the exact category/key, an explicitly approved
`ALL_OPERATIONS_USING_CONTROL` scope, applicability and its reason, source
authority/URL/version/clause/effective timestamp/review deadline, adoption
reference/actor/time, and evidence IDs. Timestamps use UTC ISO strings.
The accepted reference domains are Saudi government subdomains and swsdf.sa.
URL validation does not authenticate the document, clause, issuer or legal
approval. Those facts require review before recording any real adoption.
There is no general-state API that writes or removes this envelope.

An applicable, complete, time-current envelope forces effective ENABLED even
when the stored generic state is DISABLED or REVIEW. A declared but malformed,
stale, future, differently scoped or mismatched envelope raises
MANDATORY_SOURCE_REVIEW_REQUIRED instead of silently allowing operation.
A complete adopted NOT_APPLICABLE record preserves the optional state.
Controls without this new envelope retain their existing behavior.

The boundary is consumed by policy decisions and direct training policy reads.
The independent weather setting cannot override mandatory weather review, nor
can a disabled crew qualification master bypass a mandatory child credential.
Booking policy/weather reads now occur inside the reservation transaction.
The administrative state routes and operational-controls editor reject weaker
states for protected controls. Operational-control revisions include binding
metadata; the editor exposes effective state and canDisable.

Validation after API build:

    node apps/api/scripts/mandatory-policy-validation.cjs
    node apps/api/scripts/compliance-transaction-validation.cjs
    node apps/api/scripts/clearance-snapshot-validation.cjs
    node apps/api/scripts/operational-controls-validation.cjs
    node apps/api/scripts/booking-safety-policy-validation.cjs

The existing disposable operational-controls HTTP/PostgreSQL runner executes
22 clearance acceptance groups, including source-bound permit checks under all
three generic states, approved-proof success, both legacy edit denials, stale
source rejection, weather-switch denial and snapshot/audit rollback. Fixtures
are synthetic and guarded by loopback, CI and test-environment assertions.
The separate local PGlite run proves HTTP and persistence behavior; PostgreSQL
16 CI remains the evidence for that database environment.

No schema, package, live binding, live control state, license date, source
manifest or production fixture is changed. Full A14 still needs the actual
requirement/adoption entries and verified applicability for the operating
scope, plus acceptance against those real entries. A project-owner statement
may be recorded as such; it is not a file read or external verification.
