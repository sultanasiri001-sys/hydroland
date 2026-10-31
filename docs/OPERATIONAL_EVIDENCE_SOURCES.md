# Internal operational evidence sources

The platform is prelaunch. Do not seed operational facts or reuse synthetic evaluation values as business records. Source V6 connects existing organization-scoped financial settlement, period close and shift close tables, and an owner-only evidence intake for the other three departments.

The admin agent workspace provides **سجل أدلة الوقائع الداخلية**. The owner selects existing records and document references by name, saves a draft, and records the past event after checking its evidence. Referenced items, warehouse locations, administrative records, campaign drafts and proof documents must belong to the canonical internal organization. Search results use bounded keyset pagination and are private/no-store.

Supported evidence kinds are warehouse balance snapshots, receipts/issues, procurement, administrative delivery, retention/holds, prior authorized disposal, campaign publication and campaign analytics. These are recorded assertions supported by document versions. They do not execute stock movements, purchases, financial transactions, publication or disposal. They are not a stock balance calculation engine, an advertising-provider connection, legal authorization or independent verification of the event.

## Lifecycle and provenance

- `POST /admin/operational-evidence` creates a DRAFT. Request keys are idempotent; a different payload cannot reuse the key. Event references are unique per organization and kind.
- `POST /admin/operational-evidence/:id/record` requires the exact current revision, a reason, explicit confirmation, and a still-current APPROVED/SIGNED proof document. A document approval does not execute the described event.
- `POST /admin/operational-evidence/:id/archive` preserves the record and append-only revision history. Archived evidence is excluded from qualified counts.
- Facts are immutable. Corrections require a new clearly identified record and withdrawal of the incorrect one; previous receipts are retained.
- Disposal evidence requires the applicable latest recorded retention decision with no hold, elapsed retention, and a separately pinned authorization-document version. Recording evidence never deletes records or files.
- Analytics require recorded publication evidence for the same campaign and a completed measurement period. Withdrawal or invalidation of publication proof removes dependent analytics from qualified counts.

Qualified source counts require the matching immutable record snapshot and the current approved proof version/hash/payload. Changed or archived proof, inconsistent relations and out-of-organization references are excluded. Raw facts, monetary amounts, document payloads, record IDs and campaign metrics are not sent to the model through the department adapter; only allowlisted scalar counts leave it.

V2–V5 shapes and fingerprints remain readable. New report cycles pin V6; old source receipts are neither rewritten nor upgraded. Every department remains PARTIAL with operational acceptance NOT_ASSESSED. A zero count means no qualifying scoped record at capture time; it does not prove no physical stock, no business activity or launch readiness.

## Verification

`operational-evidence-validation.yml` uses a dedicated empty loopback PostgreSQL database. It exercises the additive migration against TEXT and UUID parents, HTTP authorization and same-session revocation, named reference pagination, strict types, idempotency, concurrent transitions, immutable history, audit rollback, changed proof, retention holds, publication dependencies and organization-scoped financial records. Browser tests exercise named intake, lifecycle, mobile layout, escaping and session clearing. No production records or provider generation are required.
