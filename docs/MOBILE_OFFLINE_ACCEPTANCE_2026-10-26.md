# Mobile/offline acceptance — 26 October 2026

Scope: canonical `apps/mobile` home, login and trip-day shell, reviewed from
`908f389`. This is a local implementation acceptance record, not a signed native
release, customer-data test, production-auth test or store-publication approval.
No dependency, lockfile, global CI or API contract change is part of this slice.
The completed mobile security remediation remains intact.

## Reproduced defects and narrow repair

Synthetic execution of the original TypeScript/TripDay reproduced five failures:
A's trip-id-only cache remained after logout and B sign-in; late refresh restored
cleared tokens; tampered manifests rendered MATCHED using copied checksum strings;
A's MATCHED state remained while B loaded; and rejected/revoked requests retained
cached metadata. The installed Expo Crypto contract also established a payload
checksum mismatch: `digestStringAsync` hashes text and its encoding option controls
**output**, not base64 input decoding. Base64 text/base64 digest did not equal the
server's raw-byte/hex SHA-256 convention.

Repairs:
- One serialized SecureStore session record, generation fences and single-flight
  refresh prevent split-token races and late login/refresh restoration. Definitive
  401 invalidates the session/cache; transport/5xx failures do not erase it. Local
  logout invalidates before the server call, including when the call fails. A
  late newly-issued token is best-effort revoked, never adopted after logout.
- Cache scope comes from protected `GET /me`'s authenticated account ID, **not**
  caller input or unsigned JWT subject. JWT expiry is only a refresh hint. A
  random per-login cache ID prevents reuse across logins, including the same
  account. Unverified legacy tokens cannot open private cache while offline.
- Manifest, payload and metadata files use one account/session-bound app-document
  directory lifecycle. This is not a new encryption claim. Logout removes the
  directory; trip denial/corruption removes that trip's content and payloads.
  Legacy unscoped files are purged and unscoped SecureStore metadata is never read.
  Old non-enumerable metadata keys may remain inert; no complete legacy keychain
  erasure is claimed. A filesystem failure surfaces an error while token clearing
  still runs, and the old cache scope is invalidated synchronously.
- TripDay invokes the canonical manifest rehash verifier, resets per trip/session,
  discards late work and rechecks on focus, foreground resume and visible retry.
  A 403 clears the affected trip cache without revoking unrelated account access.
- Payload verification uses Expo `digest` on raw bytes and renders lowercase hex.
  No dependency upgrade or new key material is introduced. Media payloads must
  belong to the rehashed canonical manifest. `SENSITIVE_ENCRYPTED`, `ONLINE_ONLY`
  and unknown classifications are rejected before download or stored-byte access;
  caller-supplied classification cannot override that exclusion.
- Login accepts only actual token responses, verifies account identity before
  persistence, suppresses duplicate taps and fences cancellation during storage.
  Post-login return routes are restricted to the implemented local destinations.

## Verified acceptance matrix

| Area | Local evidence / disposition |
| --- | --- |
| Home | Existing Arabic public shell and protected TripDay entry retained; no expanded portal parity claim. |
| Password login | Actual source/hook tests cover verified persistence, repeated taps, cancellation and delayed SecureStore completion. |
| Deep link | Safe return to `/` or `/trip-day` with encoded trip ID; external/protocol-relative/login/malformed/repeated parameters rejected. OS link dispatch is not tested. |
| Manifest hash | Canonical stable JSON SHA-256 checked on download, persisted data and TripDay read; altered payload with copied checksum metadata is rejected and removed. |
| Binary hash | Empty, binary, Arabic/emoji and 131,073-byte fixtures agree with Node/server-style raw-byte SHA-256 hex; wrong hash, size and stored corruption fail closed. |
| Cache isolation | Protected account identity plus per-login scope; legacy unverified read denied; A→B and logout/in-flight hash/refresh/storage races covered. |
| Reconnect | Foreground/focus/explicit retry rechecks and removes old transport-error state. No background sync or network-reachability subscription is claimed. |
| Revocation | Request 401→refresh→401 or refresh rejection clears session/cache and redirects mounted TripDay. 403 clears trip manifest, metadata and payloads. Disconnected revocation cannot be learned before reconnect; an offline file is never live authority. |
| Expiry | Unknown/invalid expiry remains UNKNOWN_CACHE; expired supplied expiry is STALE_CACHE. Current server package has no trusted expiry field, so freshly downloaded packages remain UNKNOWN_CACHE. No invented validity period. |
| Safety | Cached content never authorizes departure, current weather or a safety decision; the explicit Arabic warning remains. |
| Dependency controls | Existing braces, node-forge and Zod behavior checks and fail-closed audit-contract tests preserved. |

The retained `scripts/offline-session.test.mjs` executes actual app TS/TSX with
synthetic SecureStore, filesystem, Expo Crypto, React hook and HTTP boundaries.
It is run by the existing mobile `test` command through `scripts/validate.mjs`.
These are **not native-device or visual acceptance tests**.

## Local checks

Using Node 22.23.4 / npm 10.9.8 with an isolated clean mobile installation:
- Mobile test: 20 behavioral groups, existing source contracts and all three
  dependency-security regression suites passed.
- Mobile TypeScript/typecheck/build passed (`build` is TypeScript only).
- Release dependency-audit fail-closed contract passed; `git diff --check` passed.
- Offline Metro exports for iOS and Android passed. An export is not native
  compilation, signing, installation, startup or real-device acceptance.

The integration owner's fresh audit receipts reported **0 high, 0 critical,
6 moderate affected package entries**, not zero vulnerabilities. The unchanged
mobile lock resolves two moderate dependency chains:
- `expo-router 57.0.23 → query-string 7.1.3 → decode-uri-component 0.2.2`
  (malformed-percent-decoding DoS; npm's suggested router fix is a major 58 upgrade).
- `@expo/config-plugins 57.0.9 → xcode 3.0.1 → uuid 7.0.3`
  (UUID buffer-bounds advisory; audit reports a fix, but compatibility has not been
  established in this scope).
No blind upgrade, audit suppression or severity substitution was performed.

## Explicit remaining gates

1. **Server authorization:** the baseline offline GET routes authenticated the
   account but did not enforce per-trip resource scope. The separate API repair
   is blocked and no verified fix is claimed. It must be authorized, reviewed and
   validated before private offline delivery is accepted; this mobile lane does
   not retry or work around that blocked action.
2. **Trusted expiry policy:** a server-owned signed/versioned validity contract is
   absent. Local metadata must not invent one.
3. **Feature parity:** the native shell does not yet provide trip selection,
   package/media download controls, actual offline briefing/map/media rendering,
   MFA completion, logout UI, registration/recovery or full web portals.
4. **Sensitive offline encryption:** app document files are not an implemented
   `SENSITIVE_ENCRYPTED` cryptographic pipeline. Classification alone is not proof
   of encryption. The mobile helper therefore refuses sensitive/online-only/unknown
   manifest payloads, including existing cached bytes, rather than saving plaintext. Key lifecycle, device storage/backup and revocation policy need
   explicit design and acceptance; this slice creates no keys.
5. **Physical device:** iOS/Android secure-storage availability, filesystem failure,
   process death, app background/foreground, airplane mode, OS deep links,
   accessibility/RTL/small-screen layout and installed behavior remain untested.
6. **Release:** signing credentials, native identifiers/profiles, native builds,
   store accounts/review/privacy declarations and publication remain separate,
   unauthorized actions. No certificates, API keys, paid service, store action,
   publication, production mutation or real customer data was used.
