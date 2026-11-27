# D06 — secure offline reads and draft synchronization

Date: 27 November 2026. Tracker: D06 / HYD-60, criterion D06.01.
Base: `ed5a68bff706f901d7e2b198bf2ca8365fb0d665`.

This change completes the technical server/client contract for secure offline
reads and retryable draft batches. Server acceptance, source-level client tests,
native adapter checks, and physical-device acceptance are separate evidence.
It does not approve operational decisions while disconnected. Q01 remains the
final human/device acceptance gate.

## Scope and actual behavior

The original full-package authorization remains unchanged: native administrators
and the existing scoped dive-center/marine operational roles. Booking ownership,
participant/crew links, an instructor role, or a reviewer role alone do not grant
a full private operational package. The current account, persisted session,
roles, memberships, organizations and trip scope are checked by the original
`OfflineTripAuthorizationService`.

New authenticated, `private, no-store` routes:

| Route | Purpose |
| --- | --- |
| `GET /mobile-offline/trips/:tripId/status` | Validate the current published package and issue a resource-bound read lease. |
| `GET /mobile-offline/trips/:tripId/package` | Return the canonical manifest and matching published briefing with the read lease. |
| `GET /mobile-offline/trips/:tripId/drafts` | Return at most 20 of the current author's editable drafts and their leases. |
| `GET /mobile-offline/trips/:tripId/drafts/:briefingId` | Revalidate one owned draft and its exact source revision. |
| `POST /mobile-offline/sync` | Process a bounded batch of title/notes changes to owned drafts. |

The TripDay screen now provides encrypted package/media download, verified
briefing text, own draft editing, local save, explicit synchronization/retry,
conflict review and local erasure. The screen distinguishes a pending local
change from a server-accepted result. Structured briefing summaries stay in the
online editor; the mobile draft editor cannot discard their structured fields.
No raw decrypted private file URI is returned to other applications.

## Trusted, short-lived read authority

The lease is server-signed with a domain-separated HMAC and binds the account,
persisted session, trip, resource kind, resource ID and SHA-256 source revision.
The expiry is the minimum of the verified current access JWT expiry, persisted
session expiry and the existing **900-second** access-token lifetime. This change
exports that existing constant; it does not extend or create a new business
retention policy. MFA challenges additionally return their existing server-owned
five-minute `expiresAt` for the native login flow.

For session-bound phone OTP integration, `getCurrentSessionId()` exposes only the
in-memory token sid as a response-correlation fence. It grants no authority.
`subscribeSessionRotation()` notifies only after a changed sid is successfully
persisted; a failed refresh or logout-raced response emits no adopted sid. The
account generation/cache ID and encrypted pending intent remain unchanged.

The client installs an in-memory lease anchor only after a successful
authenticated response. It conservatively subtracts the entire request duration,
uses a monotonic deadline, checks backwards wall/monotonic clock movement, and
also rejects a wall-clock forward jump beyond the remaining duration. Stored
metadata cannot install an anchor. A process restart, expired lease, missing
monotonic clock, account/session replacement or confirmed authority change
requires online verification before opening private cached bytes.

A known missing/outdated/conflicting package (`404`, `409` or an explicit
non-ready status) invalidates its old package lease; it is not treated as a
network outage. A trip authorization `403` invalidates and erases the affected
trip. A draft-author-only denial clears its separate draft access and records
without erasing a separately permitted published package. Package absence or
corruption never erases an independent pending draft.

Disconnected revocation cannot be learned instantly. Its upper bound is the
remaining verified lease, never more than the existing access-token lifetime.
Reconnection/focus/foreground and explicit retry recheck current server authority.
The screen hides private content on background, route/account replacement and
lease expiry; it discards late responses and clears displayed plaintext.

## Encryption and local lifecycle

All v3 package content, metadata, payloads, draft sources and pending operations
are encrypted with the installed Expo Crypto **AES-256-GCM** implementation.
Each encryption uses a new 12-byte nonce and 16-byte authentication tag. AAD binds
format version, verified account ID, random per-login cache ID and the individual
record/file purpose. Ciphertext copied between purposes or account/cache scopes
cannot authenticate.

The 256-bit key is stored only in Expo SecureStore with
`WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Availability, key creation/import and a native
roundtrip are checked before a new private offline request. A failed/missing key,
unavailable crypto/SecureStore, malformed ciphertext or failed authentication
returns an offline security error, invalidates active cached read grants and
never falls back to plaintext. Opening an existing record never creates a
replacement missing key. Key persistence is serialized with deletion, including
late SecureStore completions.

The account/cache-scoped v3 application directory is separate from old plaintext
cache versions. Old v1/v2 directories are purged and never imported. Logout and
account replacement invalidate the session generation synchronously before
cleanup, remove files/key/token records and fence delayed work. Cleanup failures
surface while token invalidation still runs; successful physical erasure is not
claimed when the native adapter returns an error.

Explicit local trip erasure also invalidates its pending work epoch. A delayed
crypto preflight, HTTP reply or encrypted write cannot recreate deleted bytes,
even if a newer user request subsequently obtains another lease. The user can
erase local trip data without first refreshing an expired session online.
Encrypted files that have merely expired may remain on disk until local cleanup;
they are not readable without a new authenticated, current source lease.

## Private object delivery and bounds

The original authenticated payload endpoint returns an R2 delivery descriptor,
not media bytes. The client verifies the manifest classification, exact checksum,
nonnegative integer size and descriptor expiry. Only native
`CLOUDFLARE_R2` HTTPS hosts under `.r2.cloudflarestorage.com` are accepted, without
embedded credentials, fragments or alternate ports. The signed object request
receives no API bearer token or cookies, and redirects are rejected.

`PUBLIC_CACHE`, `OPERATIONAL_OFFLINE` and `SENSITIVE_ENCRYPTED` all use the same
mandatory encrypted pipeline. `ONLINE_ONLY`, absent and unknown classifications
remain excluded; caller-supplied classification cannot override the manifest.
Each persisted plaintext record/payload is bounded to **8 MiB**. The original
server-side classification and approved manifest remain the source authority.

The object download deadline is the smaller of **15 seconds** and the current
trusted lease's remaining duration. Logout and local deletion abort its request.
Rejected headers cancel the body. `Content-Length` must exactly match the signed
size and `Content-Encoding` must be absent or `identity`. Where the fetch adapter
exposes a readable stream, the byte count is enforced while reading and the
reader is canceled on overflow. Some React Native adapters expose only
`arrayBuffer()`: those use the verified length/identity contract and abort
deadline, then verify actual length and raw-byte SHA-256 before encryption.
For that adapter the application cannot inspect intermediate native allocations;
real-device network/storage acceptance must exercise this boundary. No broader
streaming-memory guarantee is claimed.

## Retryable, conflict-safe writes

The only accepted mutation is `PATCH_BRIEFING_DRAFT` for **title** and
`summary.notes` on an owned `TripBriefing` currently in `DRAFT`. Current native
author and trip permissions are rechecked. A source with additional structured
summary fields must use its online editor. Publish, review/approval, safety,
operational readiness, finance and other kinds/fields return
`NEEDS_ONLINE_VERIFICATION`; they are never queued or applied as critical writes.

A batch contains 1–20 unique operation IDs and at most 64 KiB of JSON. The client
keeps a pending operation ID and payload immutable until a definitive outcome;
a lost response retries the same business intent. A fresh lease or rotated
session may accompany the retry without changing its idempotency fingerprint.
The server checks current authority before returning any original receipt.

The server runs each batch in a serializable transaction, with current authority
rows and affected draft rows locked. It compares both the client's expected
revision and the signed source revision to the actual locked draft. A different
revision returns a durable `CONFLICT` without overwriting text. Reusing an
operation ID with another intent returns `NEEDS_ONLINE_VERIFICATION`. Repeating
the same intent returns its existing result without a second update/audit event.

Draft update, `MOBILE_OFFLINE_DRAFT_APPLIED` audit and idempotency receipt commit
or roll back together. A forbidden operation later in a batch, audit failure or
lease expiry before completion rolls back earlier writes. Due lease expiry at
completion returns HTTP 409 with `code: NEEDS_ONLINE_VERIFICATION`.

Conflict UI preserves local intent and shows the latest server text. Choosing
the server version explicitly discards the local intent. A merge requires the
exact revision the user reviewed, performs a fresh online check, and creates a
**new** operation ID; a further intervening edit requires another review.
The receipt table stores IDs, fingerprints and result metadata, never draft
bodies. The additive migration derives actual native Account/TripBriefing key
types and has validated cascading foreign keys.

## Verified local evidence

Executed against real source, synthetic accounts/data and isolated local storage:

| Evidence | Result / boundary |
| --- | --- |
| `apps/mobile/scripts/offline-session.test.mjs` | 25 retained session/push/cache/TripDay regression groups. Uses synthetic device/hooks/HTTP boundaries. |
| `apps/mobile/scripts/offline-security.test.mjs` | 26 focused encryption/clock/persistence/MFA/outbox/HTTP-boundary groups. Actual TypeScript source with Node GCM adapter; not native-device AES evidence. |
| `apps/api/scripts/mobile-offline-http-db-checks.cjs` | 16 groups through actual Nest HTTP/guards/services and PostgreSQL, run with canonical timestamp and historical session timestamptz layouts under a non-UTC database zone. |
| Exact new migration | All 9 combinations of TEXT, UUID and varchar(36) Account/TripBriefing keys exercised in the native DB fixture; validated FK and cascade behavior checked. |
| `apps/api/scripts/offline-trip-access-db-checks.cjs` | 47 existing native authorization checks in each timestamp layout; original trip access policy preserved. |
| API build/lint, mobile TypeScript, auth source contract and whitespace | Passed locally on the scoped source. |

The database suite covers native stale published-source rejection, protected
reads, wrong owner/trip, expiring/forged/old-session leases, concurrent conflict,
receipt replay and changed-intent refusal, structured/critical-field refusal,
revoked authority, audit rollback, lease-expiry rollback and bounded batches.
The mobile suite includes source retirement/missing/conflict, pending-draft
preservation when the package is absent/corrupt, lost-response retry, explicit
merge review, late storage/HTTP/logout/deletion races and bounded object delivery.

Login screen repeated-tap, delayed SecureStore unmount, protected return and MFA
cancel assertions are maintained in D05's real React `product-ui.test.mjs`, not
in the older synthetic-hook screen fixture. Shared package/workflow wiring and
integrated builds belong to D07/integration.

`apps/mobile/scripts/native-capabilities.tsx` is a separate, synthetic-only
native adapter fixture. It imports the actual Expo modules and probes AES-GCM
roundtrip, ciphertext/AAD tamper rejection, SecureStore key save/read/delete and
encrypted private file save/read/delete. D07 may copy it to a temporary QA-only
route for Android emulator/iOS simulator evidence. There is no production route,
HTTP request, user data or embedded credential in this fixture. Its presence is
not a claim that a native run or physical device test passed.

## Reproduction / integration

For mobile source tests:

```sh
node apps/mobile/scripts/offline-session.test.mjs
node apps/mobile/scripts/offline-security.test.mjs
```

For the native HTTP suite, create a dedicated empty loopback PostgreSQL database
named `mobile_offline_test_*`; set `DATABASE_URL`, `PGTZ=Asia/Riyadh` and
`MOBILE_OFFLINE_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY`, then:

```sh
node node_modules/prisma/build/index.js db push --schema apps/api/prisma/schema.prisma --skip-generate
node node_modules/prisma/build/index.js db execute --schema apps/api/prisma/schema.prisma --file apps/api/prisma/migrations/20261127150000_mobile_offline_sync/migration.sql
node apps/api/scripts/mobile-offline-http-db-checks.cjs
```

Repeat in another empty fixture database with
`--legacy-session-timestamptz`. Do not run these synthetic writers on production.
The migration remains the ordinary deployment migration; these commands are only
for empty fixture preparation.

## Remaining acceptance boundaries

Physical iOS/Android secure storage, process death, airplane mode, clock changes,
app lifecycle, accessibility/RTL, operational use and release acceptance remain
separate Q01 evidence. An emulator adapter probe is not full end-to-end session
or physical-device acceptance. No live customer/account data, external provider
message, signing identity, store action or production mutation was used for D06
verification. Offline content never grants live weather or safety approval.
