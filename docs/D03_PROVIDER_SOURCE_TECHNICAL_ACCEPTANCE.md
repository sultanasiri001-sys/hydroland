# D03 — native source evidence, bounded reads and visible data validity

Date: 2026-11-27. Baseline: `ed5a68bff706f901d7e2b198bf2ca8365fb0d665`.
Tracker: D03 / [HYD-55](https://linear.app/hydroland/issue/HYD-55/d03-almsadr-alrsmyh-waltqadm-walkhraet-waltkamlat), criterion D03.01.

The criterion is **بيانات مسندة ومحددة الصلاحية ومخطط فشل/تقادم/تكلفة، بلا mock كربط رسمي أو تصريح سلامة تلقائي**. This change completes the technical source, validity, failure and cost controls in the existing maps, Stormglass and MarineTraffic adapters. It creates no real entitlement, provider connection acceptance, payment, human approval or operating clearance. Q01 retains actual provider/license/device/user acceptance; D11 and D16 remain `REQUESTED_NOT_GRANTED`.

## What changed

| Boundary | Enforced behavior |
|---|---|
| Original source | Every provider read needs a pinned, current native `ManagedDocument`, its matching immutable revision and source digest, active template, branding snapshot, independent recorded approval by the current verified platform owner, and the referenced original PDF bytes/digest. |
| Scope | Integration, provider, sandbox/production mode, source, origins, validity period and limits must match. Weather consumes only `sg`. AIS accepts only the requested MMSI/IMO and the approved `TER`, `SAT` or `ROAM` source set. |
| Native authority | Changed document, inactive template, revoked owner authority, changed platform organization, altered attachment, expired source or stale pin closes access. Original document workflows remain responsible for authoring and approval. |
| Durable limits | Native `AuditEvent` reservations count all attempted reads, including failures. One PostgreSQL advisory lock prevents concurrent requests from exceeding the configured daily request/cost reservation limits. Rolling-minute reservations include the previous day at midnight. Changing a document, API key or currency cannot erase the current day's reservations. |
| Failure | A reservation must commit before transport. Source/owner locks and a fresh check cover the bounded single transport operation. There is no automatic transport retry. Failed or ambiguous transport and failed receipt recording retain the reservation. Missing reservation audit means no transport. |
| Provider quota | A 429 receipt closes further reads for the current UTC day. A 401/403 receipt closes the same policy binding pending reviewed correction. These are operational fail-closed decisions, not declarations of actual provider billing. |
| Network | Stormglass and MarineTraffic use fixed official HTTPS hosts, no redirects, an eight-second transport timeout and a 128-KiB streamed response cap. The sole alternative is an explicit loopback Stormglass transport in `NODE_ENV=test`. |
| Weather validity | The existing trip forecast window and human decision remain. The source-approved maximum fetch age and source expiry are separate from forecast time. Native source revocation invalidates an existing forecast decision. Identical valid source/forecast/context can retain the previous human review; expired data requires fresh review. |
| AIS validity | Missing/future timestamps, stale positions, mismatched identity, extra rows, invalid coordinates and an unapproved reception source are unavailable. Heading sentinels and SAR altitude are not presented as vessel heading. Unknown speed stays unknown; the AIS 102.2-knot lower-bound encoding is identified explicitly. |
| Maps | Only approved public layers with no per-request charge and no account-level request quota can use direct browser delivery. Metered/unknown scope remains unavailable. Each view enforces its approved resource count, HTTPS origin scope and expiry, then falls back to the existing local geographic view. This client control is not represented as a global provider quota or financial cap. |
| Privacy | Public maps/weather configuration exposes safe attribution, validity and reasons. Public trip weather and incident-return AIS omit private document identifiers/digests. Native operational evidence retains those bindings. Detailed source readiness is ADMIN-only; inspecting a candidate pin additionally requires the current platform owner. |
| User interface | The actual map entry remains usable when providers are unavailable. It states that the view is informational, not navigation or safety clearance. Configuration is labelled as configuration, not a successful provider connection. Weather administration displays source expiry/fetch age and localized usage/failure explanations. |

The internal critical-incident workflow remains available when AIS fails, using supplied caller coordinates when present. It still reports `externalDistressSent=false`, `externalTransmission=NOT_IMPLEMENTED` and `humanEmergencyEscalationRequired=true`. Supplying both MMSI and IMO requires them to agree with the returned vessel.

## Native source contract and review path

No template, document, approval or configuration is created by deployment. An authorized user prepares a native document through the existing document workspace. The template code is `TECH-PROVIDER-ENTITLEMENT`, department `TECHNOLOGY_SECURITY`, with two required fields:

- `purpose`: SELECT, the sole value `D03_PROVIDER_ENTITLEMENT`.
- `policy`: TEXTAREA containing the proposed JSON source contract below.

Attach the original entitlement/terms PDF to the draft, record its native attachment identifier and digest in the proposed policy, revise the draft through the existing versioned workflow, and obtain independent owner approval. The author and approver must be different people. The attachment must precede approval and match its original bytes. A signed or approved document is eligible; an archived document is not active permission.

An authenticated current platform owner can inspect the exact current binding with:

`GET /api/v1/integrations/marine/source-candidates/{MAPS_GEO|WEATHER_MARINE|DISTRESS_AIS}/{documentId}`

The response supplies `{documentId,version,contentHash,sourceHash}` as `pin` and explicitly returns `configured=false`, `providerVerified=false` and `automaticSafetyPermission=false`. Inspection neither configures nor contacts a provider. Bind the reviewed pin separately through `HYDROLAND_D03_<INTEGRATION>_DOCUMENT`. This routing input never replaces native approval. Existing lifecycle and credential inputs must also match the reviewed source mode. Source changes require a newly reviewed binding; there is no automatic adoption of the latest document.

Policy fields are strict; unknown or omitted fields fail closed:

| Field | Required meaning |
|---|---|
| `kind`, `version`, `integration` | `D03_PROVIDER_ENTITLEMENT`, numeric `1`, and the exact integration key. |
| `provider`, `source` | Weather: `STORMGLASS` / `sg`; AIS: `MARINETRAFFIC_AIS_ONLY` / `AIS`; maps: the configured public provider / `MAP_STYLE`. |
| `mode`, `enabled` | `SANDBOX` or `PRODUCTION`, and explicit Boolean `true`, within the independently approved native document. |
| `validFrom`, `validUntil` | Real ISO UTC instants. Current time must lie inside the period. |
| `attribution`, `termsUrl`, `entitlementReference` | Plain public attribution, a clean public HTTPS terms URL, and the original entitlement reference. A reference alone is insufficient. |
| `attachmentId`, `attachmentSha256` | The original native PDF attachment and its SHA-256 digest. |
| `maxDataAgeSeconds` | Explicit approved validity after a weather fetch or AIS observation, 1–86400 seconds. The implementation supplies no operating default. |
| `allowedAisDataSources` | For AIS, a nonempty approved subset of `TER`, `SAT`, `ROAM`. An empty array for maps/weather. |
| `maxRequestsPerMinute`, `maxRequestsPerDay` | Finite server read reservation limits, at most 100/minute and 100000/day. Maps require both values `0`, denoting that no account quota is supported by direct public delivery. |
| `costMode`, `currency` | `BOUNDED` or an explicitly documented `NO_CHARGE`, with a three-letter currency code. No-charge read cost does not establish free commercial-use rights or absence of a subscription fee. |
| `maxCostMicrosPerRequest`, `maxCostMicrosPerDay` | Integer conservative upper bounds in millionths of the stated currency. Bounded reads require positive per-read cost and a sufficient daily cap; no-charge requires both zero. These are reservation limits, never posted finance entries or actual provider invoices. |
| `allowedOrigins` | The exact official server origin, or up to eight clean approved public HTTPS map origins. No secrets, userinfo, query strings, local/IP hosts or ports in the origin contract. |
| `maxResourcesPerView` | 1–1000 resources per direct map view; recorded but unused for server weather/AIS reads. |

For direct maps, source documentation must authorize public distribution and no metered/account-quota dependence. A client can be modified; its view counter cannot protect a paid account. Such a provider needs a separately implemented and accepted server delivery/billing path before eligibility. This change deliberately leaves that scope disabled.

`GET /api/v1/integrations/marine/readiness` exposes current source status and precise limits to authenticated administrators, with no-store caching. Public configuration never exposes a source pin or credential. The existing distress readiness retains all external-transmission readiness flags as false.

## Failure, expiry and operating consequences

Native source reads and budget reservation fail closed. A timeout, malformed response, unrelated weather model, stale AIS observation, exhausted quota or invalid entitlement never becomes an operating approval. A failed response may still consume provider capacity, so the reservation is not refunded. Audit timestamps use the actual reservation/receipt time rather than the PostgreSQL transaction's earlier start, including when a lock wait crosses midnight.

Source absence after deployment is expected until real evidence is reviewed and explicitly bound. Existing stored weather approvals without this binding become `requiresRefresh=true` with no decision token. Existing `ENFORCE`, `ADVISORY` and optional-policy choices are preserved; no operating-policy flag is changed. The real provider's license, plan quota, commercial rights, actual costs, device behavior and acceptance remain explicit Q01 evidence.

## Verification completed locally

- API build and correctness lint: PASS.
- New policy/adapter unit suite: 10/10 groups, including body bounds, host scope, exact model attribution, AIS identity/age/source/sentinels, source validity and public redaction.
- New native PostgreSQL suite: 41/41 checks. Twelve simultaneous requests produce exactly five reservations/transports under a five-request cap. Revocation before transport, revocation during the held source lock, expiry, native approval/attachment corruption, currency changes, quota cooldown, pre/post-transport audit failures and midnight rollover are covered. The original append-only database guard prevents deletion of budget reservations.
- Existing weather PostgreSQL suite: 29/29 checks, including raw microsecond CAS, concurrent reviewer decisions, audit rollback, context changes and legacy fail-closed behavior.
- Existing offline regressions: 225 coordinate assertions, 118 weather-context assertions, and 16 calendar-readiness assertions including 1080 policy/decision combinations.
- Actual local API HTTP checks: public maps/weather contracts and private readiness authorization PASS, using original native fixture documents and no provider connection.
- Browser: 10/10 cases across `provider-source-boundaries`, `maps-booking-location`, `map-bootstrap-state` and `weather-trip-admin`. Actual map/admin entries, Arabic/English labels, stale approval controls, origin/request-limit/expiry fallback, and desktop/390-pixel screenshots were checked. The MapLibre transport is a clearly named local test double; this is not an accepted live layer.
- Existing AIS, internal-distress, integration-readiness, typed-readiness and Stage 3 coverage validators: PASS.

All native policy approvals and PDF attachments in these tests are synthetic prerequisites inside a disposable loopback PostgreSQL database. Transport responses are in memory or loopback. Real provider calls: **0**. Real human approvals: **0**. Production authorization granted: **false**. No live/CI/deployment acceptance is asserted by this local receipt; root integration records those separately.

### Reproduction and shared CI wiring

Build the existing API; no Prisma schema change or new migration is required. For native tests, use a disposable `white_d03_*` or `hydroland_d03_*` database with `CI=true`, `NODE_ENV=test` and `D03_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY`. The source fixture also permits the existing `hydroland` GitHub Actions service on loopback port 5432/5433. It refuses other databases.

Prepare the native schema using the existing budget migration before `prisma db push --skip-generate`, then the existing `bootstrap-trip-weather-runtime-schema.mjs`. Run:

```sh
node --test apps/api/scripts/provider-read-policy.test.cjs
node apps/api/scripts/provider-read-native-db-e2e.mjs
```

The native suite uses the original audit append-only migration for its final preservation assertion. Its resets happen only in the disposable test fixture before that guard is installed. Do not run it against a shared or production database.

The existing HR HTTP fixture needs original source prerequisites before starting its API process:

```sh
node apps/api/scripts/provider-read-fixture.mjs > /tmp/d03-provider.env
node --env-file=/tmp/d03-provider.env apps/api/dist/main.js
```

The generated file is Node environment-file data, not shell code: never `source` or `eval` it. Existing test credentials and loopback weather settings remain fixtures. Run `maps-runtime-http-e2e.mjs` against that process; its following booking-weather checks reuse the same real native source binding. The original weather PostgreSQL regression still owns its separate fresh `*_weather_ci` database and source collaborator stub; it does not stand in for the new native entitlement tests.

## Primary documentation checked

- [MarineTraffic AIS API, Single Vessel Positions](https://servicedocs.marinetraffic.com/tag/AIS-API/): existing version 6 single-vessel endpoint, MMSI/IMO selection, UTC response example, speed scaling, heading/SAR distinction, reception source, bounded timespan and contract-specific call limits. A new Kpler endpoint requires separately obtained access; this change does not silently migrate or claim that access.
- [US Coast Guard Navigation Center, Class A AIS position report](https://www.navcen.uscg.gov/ais-class-a-reports): unavailable speed and lower-bound encodings; used only for interpreting data, not adopting an operating or jurisdictional standard.
- [Stormglass FAQ](https://stormglass.io/faq/) and [API documentation](https://docs.stormglass.io/): selectable weather sources and the `sg` model selection, forecasts distinct from live streaming, plan/usage and commercial-use boundaries. A configured key does not prove the applicable entitlement.
- [MapLibre RequestParameters](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/RequestParameters/): request transformation and credential omission. Those browser mechanisms are not a server-side billing ledger.
