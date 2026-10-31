# Internal marketing campaign planning and source version 4

The owner can create, read, revise, archive and restore campaign planning drafts
under **Administration → Employees → Marketing campaign drafts**. This is an
internal planning registry. It does not activate or approve campaigns, publish
content, send messages, spend an advertising budget, import audiences, or claim
external analytics. No production draft is seeded by the migration or rollout.

## Persisted boundary

`MarketingCampaignDraft` belongs to the canonical internal organization. Every
request resolves its current owner and verifies the active ADMIN account,
verification and membership where present. Unrelated administrators and other
organizations cannot read, edit or page through these records. Mutations lock
the authority and record, then check authority again in a serializable transaction.

Creation accepts a UUID request key, a title of at most 160 characters, an
objective of at most 2,000 characters, and distinct allowlisted planning channels.
Organization, approval, publication, analytics and delivery fields are rejected.
The original request digest is retained: retrying the same creation cannot
overwrite a later revision. Conflicting reuse returns 409.

Edits, archive and restore bind the visible integer revision. Only drafts may be
edited. Archive and restore require explicit confirmation and a reason. Every
change writes an append-only revision snapshot and minimal audit metadata in
the same transaction; an audit failure rolls back the record and its history.
Record/history digests detect inconsistent application records. Browser views
clear on logout, workspace or role changes, and late responses cannot restore
private content. Drafts and history are never sent to the model as free text.

The additive migration adapts only new FK columns to the existing TEXT or UUID
parent key types. It preserves all existing records, roles, approvals, agent
controls and budgets. Native migration acceptance covers all four parent type
combinations, constraints, FK behavior, append-only history and rollback.

## Source version 4

New cycles pin `department-source:v4:` and capture `DEPARTMENT_AGGREGATE_V4`.
The owner preview returns `sourceVersion: 4`. Marketing receives only:

| Metric | Meaning |
| --- | --- |
| `marketingCampaignDrafts` | All recorded planning drafts in the internal organization |
| `openMarketingCampaignDrafts` | Those currently in state `DRAFT` |
| `archivedMarketingCampaignDrafts` | Those currently in state `ARCHIVED` |

All fourteen departments now have some count adapter. This does not make any
department's coverage complete. Every packet remains `PARTIAL`, operational
acceptance remains `NOT_ASSESSED`, and marketing retains the explicit
`CAMPAIGN_PUBLICATION_ANALYTICS` gap. Store goods and marine assets remain only
their previously documented subsets; warehouse/procurement and unified asset
registries are still missing.

Queued and historical v2/v3 tasks keep their exact original profiles. In
particular, v3 marketing still has empty operational metrics after this upgrade.
The current production cycle retains its original general v1 inputs. Version,
fingerprint, receipt scope, original claim and captured values must agree; an
unknown source version fails closed. Live record changes cannot rewrite a
captured source passed to the governance office.

## Validation and rollout

Acceptance uses dedicated disposable loopback databases and fixture tokens.
It covers idempotency, concurrent writes, privacy, fresh authorization changes,
native append-only history, audit-failure rollback, pagination, typed count
readers, all fourteen director inputs and historical v2/v3 compatibility.
Browser coverage includes mobile layout, stored text, archive/restore,
uncertain-save retries, late responses, revoked roles and owner-only denials.

Deploy while the persistent provider wait is active and no task is running.
Preserve completed results and queued work; do not restart the current cycle or
override Retry-After. Before rolling back to a worker without v4 support, stop
new claims and review pinned queued tasks. No credential, provider model, paid
request, budget increase or external publishing integration is required.
