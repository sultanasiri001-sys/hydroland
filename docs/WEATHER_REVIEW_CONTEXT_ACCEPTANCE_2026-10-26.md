# Weather-review context and approval integrity

Local follow-on to coordinate validation commit `9607dba`; external provider onboarding remains open (#329/#331–334). This package does not activate providers, change safety policies, dispatch emergencies, or authorize production publication.

## Contract
- Forecast snapshots carry versioned immutable context: trip ID, start/end, named coordinates, and the exact DB location revision.
- A legacy/malformed/mismatched snapshot is effectively PENDING and refresh-required, never ALLOWED. Stored status remains audit context, not operational approval.
- Admin clients submit the `decisionToken` from the displayed review as `expectedReview`. Missing/stale tokens fail with 409. Decisions recheck active ADMIN authority, context, and exact persisted revision inside a serializable transaction; the conditional update and audit share that transaction.
- Exact `updatedAt::text` revisions preserve PostgreSQL TIMESTAMPTZ microseconds; JS Date millisecond truncation is not used for CAS.
- Provider fetch is outside the transaction. The captured trip/location context is compared again under the trip lock before persistence. A changed context discards the response.
- Identical forecast plus identical context can retain an existing approval. Changed forecast/context requires human review. New review order uses DB-owned creation time rather than a corrupt/future `fetchedAt` value.
- Stormglass accepts valid finite optional measurements and forecast times within its existing requested start ±1 hour window. No meteorological safety limits, new data-age TTL, or blanket rejection of in-progress-trip weather is introduced. Future forecast times can be legitimate; future fetch-record timestamps are invalid.
- Existing confirmation-time refresh, ENFORCE/ADVISORY behavior, general safety decisions, and policy controls remain intact.

## Integration
`TripWeatherReviewService.latest(tripId, tx?)` returns the effective `TripWeatherReviewView` (including `context`, `fetchedAt`, `requiresRefresh`, `decisionToken`) or null. Consumers call:

```ts
weatherGate.evaluateReview(review?.snapshot, review?.status, settings, review?.context, review?.fetchedAt)
```

The calendar owner supplies a separate dependent consumer hunk after their alias-conflict work; it must use this canonical review instead of `SafetyChecklist.items.weather`. Do not overwrite that branch's unrelated availability changes.

No schema migration, secrets, provider settings, or operational-toggle changes are required. Existing unbound reviews require a real operator-initiated forecast refresh and human review after deployment; local test success does not approve real trips.

## Verification
- API build/typecheck; coordinate regression 225 assertions; weather context 103 offline assertions; existing booking-policy 18 assertions; integration and six Stage 3 boundary validations pass.
- Actual disposable loopback PostgreSQL: 29 checks each under UTC, Asia/Riyadh and America/New_York. Covers exact one-microsecond stale revision detection, concurrent single-winner decision, transaction/audit rollback, revoked authority, changed location/trip time, mid-fetch context change, legacy binding, future-fetch recovery and out-of-window data. Provider is an in-memory fixture; no operational setting changes.
- DOM runtime token-contract test passes (visible revision submitted, cancelled prompt no write, stale conflict reload, refresh-required buttons disabled, missing metric not displayed as zero).
- Focused browser test was attempted but cannot launch in this executor: bundled Chromium absent; installed Chromium denied socket creation; tool-reviewed elevated retry failed before command execution on a read-only runtime mount. This is NOT a browser pass. Existing browser test was updated for expectedReview and blocks non-loopback requests.
- Production operational test script payload was updated for the token contract but was NOT executed. No full HTTP/DB suite, live provider UAT, remote CI or production acceptance is claimed.

Integration owner should add the offline scripts after API build and the guarded PostgreSQL script to an isolated `*_weather_ci` job, without duplicating or replacing shared workflows.
