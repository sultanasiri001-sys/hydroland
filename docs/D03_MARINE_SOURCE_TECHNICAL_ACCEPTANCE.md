# D03 — marine source and integration technical acceptance

## Scope

This change prepares the existing weather, AIS and informational-map paths for explicit source and time assessment. It does not connect a new provider, alter a live credential or lifecycle setting, approve a licence or tariff, create a budget, grant navigation authority, transmit an official distress message, or implement Nafath/regulatory access.

The starting revision is `631d4437ec1ec4239235053e1a4ca708919ca324`. Closure criterion D03.01 requires attributed, time-bounded information and a failure/staleness/cost plan without presenting a mock as an official connection or an automatic safety authorization. The external boundaries in D10/X02/X03/X04/X05 remain explicit.

## Source and time behavior

### Stormglass

The existing request selects `source=sg`. The adapter now accepts measurements only from the `sg` member. It no longer falls back to NOAA or meteo while retaining an `sg` label. Valid zero measurements remain valid. If the requested source has no usable measurement, the operation fails with `WEATHER_REQUESTED_SOURCE_MISSING`.

Provider time must be an actual UTC instant, including a valid calendar date, in the original requested trip window. The existing forecast-window rules, trip/location revision binding, review hash, concurrent-decision guard, human approval and mandatory-policy behavior remain in place. A future forecast is not confused with an impossible future fetch time.

The snapshot gains `sourceEvidence` with the provider, dataset, requested time, requested window and a digest of the selected source data/request binding. Fetch time remains in the original native review record. The evidence digest excludes volatile response receipt metadata so that unchanged forecasts preserve the prior human review, as before.

### MarineTraffic AIS

Both MMSI and IMO are validated as string identifiers. An IMO-only request must match the returned IMO. A request supplying both identifiers must match both. The single-vessel endpoint must return exactly one row; an empty, malformed or ambiguous response is unavailable. Numeric coordinates remain finite and bounded, including zero. Missing/sentinel headings stay absent; SAR altitude is not presented as a vessel heading.

The parser requires a UTC `TIMESTAMP`, rejects impossible/local-time/missing values and rejects an observation later than receipt time. It records normalized observation time, fetch time, identity binding and the response digest.

The existing v6 endpoint is requested with its documented five-minute provider window explicitly:

| Result | Meaning | Use in an incident |
| --- | --- | --- |
| `UNASSESSED` | The observation is inside the provider request window, but no applicable operational freshness policy is verified. | Retain labelled informational evidence; do not replace caller coordinates. |
| `STALE` | The observation falls outside that provider window. | Retain the stale assessment; do not replace caller coordinates. |
| `UNAVAILABLE` | Identity, time, response, configuration or transport validation failed. | Preserve the internal report and caller coordinates, if supplied. |
| `NOT_REQUESTED` | No vessel identifier was supplied. | Preserve the internal report without making an AIS request. |

The provider request window is **not an adopted navigation or safety policy**. No result in this change becomes operationally `FRESH`; `operationalPolicyReference` remains null and `operationalUseAllowed` remains false. Actual operational-policy binding requires a later source-backed configuration decision. No arbitrary TTL is invented.

## Internal incident behavior

The native trip reference and active reporting account are checked before optional enrichment, and checked again after it. Invalid identifiers, coordinates, trip references and oversized location input fail before a provider request. A removed trip or revoked reporting account cannot commit a late report after lookup.

AIS enrichment cannot displace the supplied caller position in this preparation scope. Both positions, when available, remain separately labelled. Without caller coordinates, the effective position is null. A provider outage does not prevent the valid internal incident from being recorded.

The response and audit retain:

```text
workflow: INTERNAL_CRITICAL_INCIDENT
externalTransmission: NOT_IMPLEMENTED
externalDistressSent: false
humanEmergencyEscalationRequired: true
aisUsedForEffectivePosition: false
operationalAcceptance: false
navigationGranted: false
```

No external emergency recipient, endpoint, acknowledgement or transmission has been added.

## Bounded provider transport

The two adapters use a shared GET-only transport with an eight-second deadline covering the response body, a 256 KiB response bound, JSON content-type/UTF-8/JSON validation, explicit refusal of redirects, and no automatic retry. Authentication failure, quota exhaustion, timeout, malformed/oversized content and configuration change have controlled failure codes; provider URLs containing credentials are not copied into error payloads.

Production origins are restricted to `https://api.stormglass.io` and `https://services.marinetraffic.com`. Origin overrides containing credentials, a path, query, fragment, another host, another port or another protocol are rejected.

A literal loopback HTTP origin with an explicit port is allowed only when all three test conditions are present:

```text
CI=true
NODE_ENV=test
D03_MARINE_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY
```

This exception cannot enable arbitrary test DNS names or production custom URLs. Existing local HTTP fixtures must opt in explicitly. Configuration is checked again after the response, so a response captured under replaced credentials, origin or lifecycle cannot be accepted under the new configuration.

## Configuration, observation and acceptance

The existing public fields `enabled`, `styleUrl`, `configured` and `sandbox` retain their configuration meaning. They do not become a licence decision or a new gate that disables the existing informational map. Unsafe public style URLs are treated as unconfigured.

Public map/weather metadata and protected AIS readiness additionally expose:

```text
configuration: { configured, status }
providerObservation: { status, checkedAt, scope: CURRENT_PROCESS, reasonCode }
license: { status: NOT_VERIFIED, reference: null }
usagePlan: { status: NOT_VERIFIED, reference: null, unitCost: null, budgetLimit: null }
providerAcceptance: { status: NOT_VERIFIED, verifiedAt: null }
operationalAcceptance: false
navigationGranted: false
```

`providerObservation.status` is `NOT_OBSERVED`, `RESPONSE_RECEIVED` or `FAILED`. It describes the current server process's last observation, not persistent global availability, freshness, licensing or acceptance. It does not contain credentials or a provider URL carrying a secret.

Map `dataFreshness` is `NOT_ASSESSED`. General weather configuration is `TRIP_REVIEW_REQUIRED`; a public configuration read cannot approve a trip. AIS readiness separates `aisConfigured` from `aisReady`; the former can be true while the latter remains false because no operational freshness policy is verified.

The web interface removes connected/ready claims derived from configuration. It displays source attribution as text, the informational/non-navigation boundary, the unverified licence and usage plan, and a separate local map-layer loading/failure state. Planned centers remain approximate and unbookable, and a provider-layer failure retains the local geographic view. Loading a browser layer does not alter the server's provider observation or external acceptance.

## Failure, staleness and cost plan

Each provider operation has at most one outbound attempt and bounded time and bytes. Failed, redirected or throttled requests do not retry silently. Optional AIS enrichment degrades to the internal report with caller data. Weather failure leaves the original human gate unsatisfied according to its existing policy; it does not manufacture a new approval.

No tariff, allowance or financial cap is assumed. `usagePlan` explicitly states that unit cost and budget have not been verified. Before any later real-provider acceptance, the actual provider account, permitted use, licence version/validity, request allowance, approved budget and failure/overage behavior must be recorded from their real sources. An environment lifecycle flag and a successful response are insufficient evidence for those facts.

The actual operational freshness policy also remains unverified. This change neither invents such a policy nor introduces a generic ledger, licence database or budget system to stand in for it.

## Verification entry points

The new isolated acceptance is `apps/api/scripts/d03-marine-source-http-checks.cjs`. It starts the actual Nest application against disposable PostgreSQL, logs in real synthetic accounts, uses native weather review/incident/audit records, and sends provider requests through the actual bounded transport to one literal loopback HTTP server. A network fence rejects all other origins.

Required environment:

```text
CI=true
NODE_ENV=test
DATABASE_URL=<disposable loopback participation_test_d01_d03_* database>
D01_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY
D03_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY
D03_MARINE_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY
D03_MARINE_EVIDENCE_FILE=<local receipt path>
```

Apply the original equipment/weather/messaging runtime prerequisites, original `20260930080000_audit_event_append_only` migration and D01 migration before the native gate, as in the reused isolated harness. No new schema or migration is introduced.

The gate covers source attribution, valid zero values, time bounds, both vessel identifiers, ambiguity, caller fallback, native audit evidence, human weather decisions, concurrent decisions, source/configuration drift, fresh reporting context, actual redirects, body size/encoding/content type, timeout, provider failure/quota and absence of external acceptance. It also checks that weather policy and financial records were not changed by the tests. The receipt records the actual Node/PostgreSQL versions and loopback request count.

Retained regressions:

- `safety-coordinate-validation.cjs`: the original coordinate/null/zero/mismatch/fallback checks, with an explicit UTC timestamp in valid AIS fixtures.
- `weather-review-context-validation.cjs`: the original context/revision/concurrency/audit checks and native adapter parser; only its transport collaborator is injected. New cases reject NOAA/meteo relabelling. The new HTTP gate separately executes the real transport.
- `weather-review-context-db-e2e.mjs`: the existing native PostgreSQL/time-zone matrix for weather reviews.
- `maps-runtime-http-e2e.mjs`: public configuration and protected diagnostics, now also checking the unverified acceptance metadata.
- Stage 3 AIS/distress/readiness source contracts: their assertions follow the new shared transport and truthful UI boundary instead of requiring the removed connected label.

### Verified local preparation on 2026-11-27

The native gate passed **22 of 22 groups** against PostgreSQL **16.16** and Node **24.22.3**, including a second fresh-database execution with the original append-only audit migration applied. Each execution made **44 actual loopback provider requests** and **zero external HTTP requests**. The two executions are repeated evidence for the same 22 groups, not 44 separate acceptance groups.

The retained coordinate and weather-context suites passed their **225** and **122** assertions. API build and correctness lint passed. The web scope passed **9 of 9 browser cases**, with no skip, retry or flaky result, plus **165 of 165 unit tests** and the existing validators. Arabic desktop/mobile source and failure states were visually reviewed. The first browser run exposed a map-dialog height regression; the CSS layout was corrected and the original containment assertion passed without being weakened.

The API workflow now repeats the native gate on disposable PostgreSQL 18 and retains `d03-marine-source-evidence`. Its existing local weather fixture explicitly opts into the bounded loopback transport. No workflow timeout was increased.

Release CI, main and deployment evidence belongs to the final source-bound PR/release receipt. These local results do not claim a successful release or live-provider acceptance.

## Primary documentation consulted

Read on **2026-11-27 UTC**:

- [MarineTraffic AIS API — Single Vessel Positions](https://servicedocs.marinetraffic.com/tag/AIS-API/): v6, the default five-minute request window, identifier query options and UTC timestamp examples. The implementation follows the `TIMESTAMP` instant in the response sample; it does not confuse it with the separate `UTC_SECONDS` field. The provider's request limits depend on the account contract, so this change does not assign a real allowance.
- [MarineTraffic legacy vessel-position API](https://servicedocs.marinetraffic.com/tag/Vessel-Positions-%28Legacy-API%29/): consulted to distinguish the older endpoint/version defaults. The old two-minute value is not used for v6.
- [Stormglass API documentation](https://docs.stormglass.io/) and [Stormglass FAQ](https://stormglass.io/faq/): source selection is explicit, and `sg` is a distinct requested source. The implementation does not relabel another model as `sg` or adopt a price/plan from public examples.

## Remaining external acceptance

Actual licence, permitted-use terms, financial authorization, operational policy, provider UAT and official integration acceptance remain `NOT_VERIFIED`. Nafath and regulatory adapters remain unimplemented under their existing explicit readiness boundary. Informational maps remain informational; AIS remains separate from official distress transmission. Technical preparation can be accepted on the tested source while these external facts remain accurately recorded as outstanding.
