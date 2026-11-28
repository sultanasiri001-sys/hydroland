# F01 — Native asset passport lifecycle

## Scope and meaning

F01 adds issue, update, revoke, version history and authenticated QR verification
over the existing equipment and marine asset records. It does not create another
asset registry, inspection approval, marine document approval or dive-log review
path. Existing dive-log review behavior is unchanged.

`CURRENT` means that the immutable revision matches the current native source
digest. It is separate from the native inspection/document evidence and operating
state. An incomplete factual record can be issued: missing, expired or unreviewed
evidence remains explicit. `operationalClearance` is always `false`.

| Record status | Meaning |
| --- | --- |
| CURRENT | This latest revision matches the current native source. |
| STALE | The current source, its evidence, expiry or policy result changed. |
| SUPERSEDED | A later revision replaced this version; the original snapshot remains. |
| REVOKED | Explicit terminal revocation applies to all versions and their QR references. |

The verification projection also includes the current equipment stock/active
state or vessel state, organization state and native evidence. A newly recorded
retired/suspended asset therefore cannot hide that state behind `CURRENT`.
Marine readiness uses the same pure projection as the existing native readiness
writer. A passport read does not append a readiness snapshot or approve anything.

## Authorization and privacy

All routes require the existing access-token guard. Every read, verification,
command and retry re-resolves the active account and current native ownership.
The QR reference is a random 256-bit identifier, not an authorization token.

| Scope | Access |
| --- | --- |
| Active platform administrator | Existing global asset administration scope. |
| Equipment center | Active DIVE_CENTER role plus active OWNER/ADMIN membership in the source's active center. |
| Marine organization | Active native membership in the source's active dive center/marine operator; OWNER/ADMIN/OPERATOR/STAFF may write, other members may read. |
| Anonymous, unrelated organization, revoked membership/account | No access. |

QR results omit serial/registration numbers, locations, prices, source and
organization IDs, file references, actor IDs, inspection narratives and private
revocation reasons. Authorized history retains safe asset identity and evidence
snapshots. Every new GET and mutation response is `private, no-store`.

## Consistency and persistence

`20261128020000_asset_passport_lifecycle` adds three tables without altering native
asset rows. Polymorphic TEXT references support native TEXT/UUID identity shapes;
timestamps use TIMESTAMPTZ. Revisions and command receipts reject UPDATE/DELETE
in PostgreSQL. History is bounded to the latest 100 displayed revisions; older QR
references continue to resolve under the same authorization checks.

Commands bind request ID, actor, native source, action, expected passport version
and source digest. The source digest is required for issue/update; revocation can
still record a reason after the source becomes stale. A serializable transaction
and per-source lock commit the state, immutable revision/command and audit event
together. Identical retries return their original receipt without reapplying the
operation; changed payloads conflict. A revoked passport cannot be reactivated.

Before authorizing a command, native account/role, organization/member and asset
ownership rows are locked until commit. Equipment locks cover both the barcode
and calendar resource; marine locks cover the marine asset. A revocation or
ownership transfer committed after the transaction snapshot forces a retry that
reads the new authority and denies the former manager. Read/QR status semantics
are unchanged.

## Native acceptance evidence

The isolated `f01-asset-passports-http-e2e.mjs` suite passed **18/18** with zero
failures on PostgreSQL **17.12** and Node **24.22.3**, from
**2026-11-28T14:28:59.793Z** to **2026-11-28T14:29:09.111Z**. It starts the compiled
native API against a fresh, explicitly named loopback database. The receipt
contains eight source hashes and six compiled hashes.

Coverage includes original equipment creation/review HTTP, incomplete and expired
evidence, six synthetic marine attachments reviewed through the original
independent center → operations → platform HTTP workflow, role/tenant/current
ownership denial, concurrent issue and update, exact retry, audit-failure rollback
for all three actions, immutable SQL receipts, terminal revocation of old QR
references, legacy UUID ownership, read-only verification and ordinary API restart.
External fetch attempts: **0**. Real operational acceptance: **false**.

Three deterministic HTTP/PostgreSQL interleavings pause the compiled service
after reading its native source, commit a change through a separate connection,
and resume it: membership withdrawal during equipment issue, equipment ownership
transfer during revocation, and marine ownership transfer during revocation.
Each returns **404**, creates no command receipt, revision or passport audit, and
preserves the prior passport state. The barriers exist only in the test harness;
production code has no test hooks. The receipt records all three outcomes.

The focused Playwright suite passed **4/4** against the built web application with
explicit API response fixtures, using Chromium 156 locally. It covers the actual
equipment-card entry, issue/update/history/revoke controls, local SVG QR rendering,
identical retry after uncertain failure, source-text escaping, read-only controls,
logout during an in-flight read and the 375px mobile layout/keyboard dismissal.
These UI fixtures are separate from the native HTTP/PostgreSQL evidence above.

API TypeScript compilation, focused API lint, changed JavaScript syntax and
`git diff --check` passed. The shared Prisma client was not regenerated.

## Integration and repeatability

Import `AssetPassportsModule` into the main AppModule. The web bootstrap includes
`hydroland-asset-passports.js` before the equipment module. Equipment, inventory
admin and marine cards use the shared passport UI. The QR encoder is vendored
locally with its upstream MIT/Apache notices; rendering contacts no third party.

Run the native suite only on a **fresh empty** loopback database named
`f01_asset_passport_test` (or the explicitly allowed suffix):

```sh
CI=true NODE_ENV=test F01_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY \
F01_RESULT_FILE=/tmp/f01-result.json \
node apps/api/scripts/f01-asset-passports-http-e2e.mjs
```

The caller supplies `DATABASE_URL`. The script applies the canonical schema,
existing raw equipment bootstrap and actual additive passport migration without
generating Prisma. CI must repeat it on its PostgreSQL 18.7 runner, then run the
web suite. This document records local technical acceptance only; merge, CI and
production deployment evidence must be attached separately. Q01 retains real
asset/source and operational acceptance.
