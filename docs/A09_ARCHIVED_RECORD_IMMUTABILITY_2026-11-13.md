# A09 — archived administrative records retain their routing state

Routing creation checked a record's status before opening its transaction.
Assignment and decision checked the routing but did not check its parent
record's current status. An archive between preflight and commit, or a pending
routing on an already archived record, could therefore receive a new change.

Routing creation, assignment and decision now lock the parent record inside
the existing transaction and re-read its status before writing the child.
The ordinary record archive/update acquires the same parent row lock. If
archiving wins, the child mutation fails with conflict and writes neither the
child nor its audit. If a valid child mutation wins, it commits before archive.
Child compare-and-set predicates, existing permissions, assignee eligibility,
independent decision maker and transactional audit remain unchanged.

Thirteen compiled-service scenarios exercise an archive after preflight,
active-record success, unavailable lock, and DRAFT/ARCHIVED parents. They check
zero writes/audits on refusal and parent lock/status ordering before success.
The existing real HTTP/PostgreSQL lifecycle now retains a pending routing,
archives its parent and rejects subsequent creation, assignment and decision;
it compares persisted routing, routing count and audit count after refusals.

Local API build/lint, all thirteen scenarios and whitespace checks passed.
Full current-head HTTP/PostgreSQL CI is required before release. This does not
claim a complete document retention/disposal policy, immutable document-version
workflow or full A09 operational acceptance. No schema, dependency, new role,
real administrative record, production permission or legal decision changes.
