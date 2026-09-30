# Phase 7 — weather/sea, emergency and official integration boundary

## Internal capabilities that can be closed independently
- Stormglass marine forecast adapter validates coordinates, queries the trip-time window and returns wind, gust, wave, swell, current and water-temperature fields.
- WEATHER_GATE is configured in production as enabled=true, mode=ENFORCE, provider=STORMGLASS. A fresh forecast remains REVIEW_REQUIRED until an authorized human approves/rejects it.
- Trip/admin browser coverage exercises geolocated trip creation, forecast refresh and human approval.
- Internal safety incidents are authenticated, reporter-isolated, admin-reviewed and audit recorded.
- Internal maritime distress creates a CRITICAL SafetyIncident and explicitly returns externalTransmission=NOT_IMPLEMENTED, externalDistressSent=false and humanEmergencyEscalationRequired=true.
- AIS is read-only situational context and must never be represented as distress delivery.

## External blockers that must remain fail-closed
- DISTRESS_AIS: MarineTraffic AIS adapter may provide vessel context, but no approved external distress provider/authority adapter exists.
- NAFATH: approved service-provider contract/specification and adapter are still required.
- REGULATORY: approved Saudi Ministry of Tourism Licensing API contract/specification and adapter are still required.

Readiness endpoints intentionally keep productionReady=false for these incomplete external integrations. No guessed endpoints, unofficial emergency gateways or fake acknowledgements may be introduced to close this phase.

## Closure rule
The internal weather/sea and emergency workflow may be marked internally complete after green CI and deployment. Full Phase 7 remains EXTERNALLY BLOCKED until the approved external integrations meet their documented acceptance criteria.
