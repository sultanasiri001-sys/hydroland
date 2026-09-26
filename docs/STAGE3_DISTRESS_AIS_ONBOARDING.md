# Stage 3 — DISTRESS_AIS production onboarding

Status: PARTIAL / AIS ADAPTER AVAILABLE / EXTERNAL DISTRESS PROVIDER OR AUTHORITY INTEGRATION REQUIRED
Parent blocker: #329
Closure task: #332

## Architecture boundary

`DISTRESS_AIS` contains two different capabilities that must never be conflated:

1. AIS situational awareness — vessel position/voyage context.
2. Emergency distress escalation — an operational emergency channel to an approved external authority/provider.

AIS data is contextual information only. It is not proof that an emergency signal was delivered, acknowledged, or dispatched.

## AIS provider

MarineTraffic publishes AIS API documentation and an OpenAPI specification:

- https://servicedocs.marinetraffic.com/

Authentication uses an API key and access/rate limits are controlled by the purchased API service contract. Online-plan access does not automatically imply API-service entitlement.

HYDROLAND already contains a MarineTraffic AIS adapter. Production AIS activation requires a valid API service contract/key and contract-compliant rate-limit behavior.

## Saudi emergency authority boundary

For public maritime emergencies in Saudi Arabia, official Border Guard guidance directs callers to:

- 911 in Makkah, Madinah, and Eastern Province regions.
- 994 in the rest of the Kingdom.

These published telephone channels are not an API contract and must not be represented as an automated machine-to-machine distress integration.

No public, approved Border Guard emergency-dispatch API contract for HYDROLAND is currently stored in the repository.

## HYDROLAND emergency behavior before external integration

Until an approved external distress channel exists:

- Keep the internal incident/distress workflow available as a fail-safe operational record.
- Surface the appropriate official emergency number clearly based on the trip region when location/region is known.
- Preserve trip, vessel, participant, last-known position, and incident timestamps for the operator/emergency workflow.
- Never display a status that implies an external authority received or acknowledged a distress signal unless a real approved provider returns that state.
- Do not auto-trigger or simulate emergency dispatch in tests against real emergency channels.

## External authority/provider onboarding request

> HYDROLAND is a Saudi marine and diving activities platform seeking an approved integration path for emergency maritime incident escalation. The platform already maintains internal incident records and AIS situational context, but it will not represent AIS as a distress-delivery mechanism. Please advise whether an approved machine-to-machine emergency notification/escalation service is available for authorized platforms, including onboarding authority, authentication, message schema, required incident/location/vessel fields, acknowledgement semantics, retry/timeout rules, audit requirements, sandbox/UAT procedures, production approval, and operational support/escalation contacts.

## AIS production requirements

- MarineTraffic API service contract active.
- API key configured in the approved production secret store.
- Contract rate limits documented.
- MMSI/IMO lookup behavior validated against the contracted endpoint version.
- 429, timeout, stale-data, and missing-vessel cases handled without affecting emergency escalation semantics.
- AIS age/freshness visible to downstream safety logic.

## Distress adapter acceptance criteria

DISTRESS_AIS is production-closed only when all are true:

- AIS provider contract/key is valid if AIS is retained.
- Approved external emergency authority/provider contract or formal access approval exists.
- Contract-specific distress adapter implemented.
- Required incident/location/vessel payload fields are validated.
- Acknowledgement states distinguish `submitted`, `accepted`, `rejected`, `unknown`, and provider failure according to the approved contract.
- Timeouts/retries cannot create duplicate unsafe dispatches; idempotency follows the approved contract.
- Complete audit trail exists without leaking provider secrets.
- Sandbox/UAT uses non-production endpoints or explicit test procedures; never real emergency dispatch.
- Authenticated readiness reports `distressReady=true` and `productionReady=true` only after real approved integration.
- Production inventory has no `DISTRESS_AIS:DISTRESS_PROVIDER_REQUIRED` blocker.
- Stage 3 Technical Closure and Main Integrity gates remain green.

## Prohibited shortcuts

- No treating MarineTraffic/AIS as a distress provider.
- No automated calls/messages to 911/994 through unofficial gateways.
- No test distress messages to real emergency channels.
- No fake acknowledgement state.
- No production-ready flag based only on AIS availability.
