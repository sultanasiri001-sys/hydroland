# Stage 3 Integration Coverage

This document is the current code-coverage boundary for HYDROLAND Stage 3 external integrations.
It does **not** declare Stage 3 production-closed.

## Code-ready / governed runtime

The repository contains a concrete governed runtime path for:

- WEATHER_MARINE — Stormglass
- EMAIL — Resend
- SMS — Unifonic
- WHATSAPP — Unifonic
- PAYMENT_PSP — Moyasar
- BANKING_SETTLEMENT — Moyasar read-only settlement reconciliation
- OBJECT_STORAGE — Cloudflare R2
- TRANSLATION_ENGINE — Google Cloud Translation
- MAPS_GEO — MapLibre runtime with provider/style configuration boundary
- ESIGN — Signit

`BANKING_SETTLEMENT` is intentionally read-only. It may list/fetch Moyasar settlements and settlement lines for reconciliation, but it does not expose Payouts or any transfer/write operation.

A code-ready integration still requires the provider account, credentials, approved configuration and lifecycle status to be verified before production activation.

## Partial coverage

`DISTRESS_AIS` has an AIS-only adapter using MarineTraffic for read-only vessel situational awareness by MMSI/IMO. This does not implement, transmit, acknowledge or manage maritime distress alerts. The overall `DISTRESS_AIS` integration therefore remains provider-selection-required and must not report production-ready until an approved distress contract is implemented.

## Provider selection / contract still required

The following governed integrations remain intentionally `NOT_SELECTED` until the remaining approved provider/API contract exists:

- CERTIFICATION
- DISTRESS_AIS — distress capability still required; AIS-only partial coverage exists
- NAFATH
- REGULATORY

No production adapter should be invented for these categories without a verifiable provider contract, authentication model, endpoint specification, data handling requirements and commercial/regulatory approval where applicable.

## Closure rule

Stage 3 may only be considered production-closed when:

1. every required integration is explicitly classified;
2. required provider contracts are selected and implemented;
3. secrets/configuration are provisioned outside source control;
4. readiness probes show the required production state;
5. provider-specific functional verification passes;
6. the Stage 3 production inventory reports no unresolved blocker required for launch.
