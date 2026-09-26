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

### CERTIFICATION

HYDROLAND supports validation of a user/operator-provided PADI eCard verification link as official evidence. The boundary accepts only HTTPS links on `livewebservices.padi.com` using the PADI eCard v4 verification path, fingerprints the evidence, and requires human review. It does not scrape PADI, does not claim automated API verification, and does not expose the verification query values through readiness output.

This is evidence validation only. `CERTIFICATION` remains `NOT_SELECTED` and production-unready until an approved certification-verification API contract is implemented. Additional agencies such as SSI/SDI are not treated as integrated without their own verified contracts.

### DISTRESS_AIS

`DISTRESS_AIS` has an AIS-only adapter using MarineTraffic for read-only vessel situational awareness by MMSI/IMO. This does not implement, transmit, acknowledge or manage maritime distress alerts. The overall `DISTRESS_AIS` integration therefore remains provider-selection-required and must not report production-ready until an approved distress contract is implemented.

## Contract/access onboarding required

The provider category is known for the following official integrations, but production implementation must wait for approved access and the authoritative technical contract:

- NAFATH — official Nafath identity integration. HYDROLAND may record onboarding readiness for issuer/client credentials after approval, but no OIDC endpoint or payload contract is hard-coded until the authorized contract is available.
- REGULATORY — Saudi Ministry of Tourism Developer Portal is the selected official boundary for licensing inquiry APIs. Ministry approval, the authorized base URL/token and a versioned licensing API contract are required before an adapter is implemented.

Both integrations remain `NOT_SELECTED` in runtime until their approved adapter is implemented. Onboarding readiness never makes either integration production-ready by itself.

## Provider selection / capability still required

The following integrations still need a complete provider/capability contract:

- CERTIFICATION — PADI eCard human-verifiable evidence exists as partial coverage, but no approved automated certification API contract exists.
- DISTRESS_AIS — distress capability still required; MarineTraffic AIS-only partial coverage exists.

No production adapter should be invented without a verifiable provider contract, authentication model, endpoint specification, data handling requirements and commercial/regulatory approval where applicable.

## Closure rule

Stage 3 may only be considered production-closed when:

1. every required integration is explicitly classified;
2. required provider contracts are selected and implemented;
3. secrets/configuration are provisioned outside source control;
4. readiness probes show the required production state;
5. provider-specific functional verification passes;
6. the Stage 3 production inventory reports no unresolved blocker required for launch.
