# D04 — Return accountability and incident closure

This change completes the missing technical paths in D04. Existing trip planning,
safety review, native D01 participation consent, operational clearance, financial
retention and explicit diving attendance remain authoritative. A factual return
record never grants a departure, regulatory or navigation permission.

## Factual return

The center manager or verified platform administrator reads and records the
current native roster through `/trips/return-accountability/:tripId`.
Every named confirmed participant and accepted crew assignment is included.
Legacy accepted crew remain visible even when qualification evidence is absent.
People already recorded remain in subsequent accountability after a booking
cancellation or crew change. Their historical presence cannot silently disappear.

The operator explicitly chooses returned, did not board, needs assistance, or
transferred to assistance for each person. A transfer requires a same-trip
incident and a handover reference. The observed time, correction reason, previous
entries and revision are retained in the original append-only audit system.
Recording an unlinked assistance need creates a native critical internal incident
and an in-app administrator notice in the same transaction. Neither is an external
emergency transmission.

Commands bind the current roster digest and revision. Duplicate concurrent or
lost-response retries return the original result. Changed meaning under the same
request ID is rejected. Role, membership, source and account changes are checked
against original rows; persistence, audit and notices commit or roll back together.

Trip completion additionally requires a current complete return record with no
unresolved assistance. Physical return and actual diving attendance are separate:
returning passengers need not receive a dive log. Only explicitly selected current
participants whose return allows attendance can be included in the existing
completion action, which retains its original D01 and clearance gates.

## Incident decision and CAPA

Incident review now binds an exact incident revision and request identity. A
resolved or closed decision requires an explicit applicability decision by a
verified administrator independent of the reporter's person identity.

Where corrective action applies, the decision pins two original independently
approved managed-document revisions:

- `SAF-CAPA`, bound to the incident ID and containing the root cause and action.
- `SAF-EFFECTIVENESS-CLOSE`, bound to that action's native reference number in
  the **same organization**, with independent effectiveness evidence.

The existing document source reader verifies the original revision, payload,
brand snapshot and independent approval event. The effectiveness approver cannot
be the corrective-action author. Both source-document and template rows are
locked against concurrent changes. Version, hash, scope, source history or
applicability failures reject the decision without a partial incident update.

Where the reviewer records non-applicability, an explicit independent reason is
retained. This does not create a corrective-action approval. Closed incidents are
terminal apart from an exact retry of the original command.

## Incident Pack and privacy

`GET /safety/incidents/:incidentId/pack` provides a digest-bound JSON export:

| Access | Projection |
| --- | --- |
| Verified administrator | Incident, exact closure evidence, relevant trip and return roster, minimal chronological audit references |
| Authorized trip operator | Trip and return accountability; another reporter's narrative and private reviewer notes withheld |
| Reporter without trip authority | Own report and minimal history; no return counts, passenger names, trip timetable or operational status |

Submitting a report about a known foreign trip never grants operational access.
Reads use `Cache-Control: private, no-store`. Exports explicitly retain
`externalTransmission: NOT_IMPLEMENTED`, `externalDistressSent: false` and
`operationalAuthority: false`.

The Arabic/English interface exposes the full roster, historical entries,
correction reason, transfer references and source-pinned closure. It never
preselects a factual return, diving attendance or CAPA applicability. Failed
writes retain inputs and retry identities. Session changes remove private views.

## Verification

Local acceptance uses a fresh explicitly confirmed loopback database and synthetic
accounts, documents, incidents and observations. No real emergency, external
report, policy adoption or production authorization is created.

- Native HTTP/PostgreSQL acceptance: `apps/api/scripts/d04-trip-return-incident-acceptance.cjs`.
  It exercises the real application and original document approval API, concurrent
  retries, authorization revocation, audit failure rollback, source changes,
  historical roster retention, disclosure boundaries and the digest of the export.
  Factual return versus diving attendance is also checked by the shared completion
  gate inside a real database transaction; the existing complete-trip HTTP gate
  separately verifies full lifecycle completion.
- Native SQL migration acceptance: `apps/api/scripts/d04-trip-return-migration-checks.mjs`.
  Five checks cover the four original TEXT/UUID foreign-key combinations,
  data-preserving repeated application, row constraints, FK protection and
  transaction rollback for unsupported native keys.
- Built-web Playwright: 17 tests across the trip-lifecycle, safety-incident and
  incident-evidence files, including mobile Arabic/English views, retry identity,
  revoked access, independent source selection and the downloaded JSON.
- Local environment: PostgreSQL 17.12, Node 24.22.3, Chromium 156. These local
  results do not substitute for the Node 22 / PostgreSQL 18 CI gates.

CI retains separate D04 native acceptance and migration receipts. Technical
deployment evidence must be taken from the exact merged commit and live services.
Real operational acceptance and Q01 remain distinct from these isolated tests.
