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

### CERTIFICATION — manual official verification evidence

HYDROLAND can record reviewer-verified official certification evidence without pretending that an automated certification API exists.

The Saudi boundary is kept distinct from international training-agency certification:

- SWSDF — Saudi Water Sports and Diving Federation. National professional diver license validation through the federation's official professional-license validation service.
- PADI — eCard evidence.
- SSI — QR / official digital certification evidence.
- NAUI — official online diver certification verification.
- RAID — official diver lookup.
- SDI / TDI — official Certification Search through International Training.
- IANTD — official digital certification / global database evidence.
- GUE — official Verify Certification card lookup.
- CMAS — official CMAS Certification Search; Saudi Water Sports and Diving Federation is the Saudi national federation affiliated with CMAS.
- BSAC — MyBSAC digital Qualification Card / QCard evidence.

The platform also exposes a governed verification-organization catalog for these sources. Each source defines its allowed verification method and official domain family. Reviewers may record source, method, reference, verification timestamp and official HTTPS evidence URL. The evidence is written to the credential audit trail and does not itself approve the credential.

Saudi professional status is not inferred from an international agency card. A professional diver operating under the Saudi national professional licensing regime must still be validated against the SWSDF professional license boundary.

For non-professional divers, the Saudi federation rules treat a diving license issued by an organization licensed by the federation as sufficient diving-license evidence, subject to the diver remaining within the limits of that training level and other applicable federation/authority rules.

This does **not** make `CERTIFICATION` code-ready. `CERTIFICATION` remains `NOT_SELECTED` and provider-selection-required until an approved automated provider/API contract is available. The production inventory therefore continues to emit `CERTIFICATION:AUTOMATED_PROVIDER_REQUIRED`.

### DISTRESS_AIS — AIS only

`DISTRESS_AIS` has an AIS-only adapter using MarineTraffic for read-only vessel situational awareness by MMSI/IMO. This does not implement, transmit, acknowledge or manage maritime distress alerts. The overall `DISTRESS_AIS` integration therefore remains provider-selection-required and must not report production-ready until an approved distress contract is implemented.

## Contract/access onboarding required

The provider category is known for the following official integrations, but production implementation must wait for approved access and the authoritative technical contract:

- NAFATH — official Nafath identity integration. HYDROLAND may record onboarding readiness for issuer/client credentials after approval, but no OIDC endpoint or payload contract is hard-coded until the authorized contract is available.
- REGULATORY — Saudi Ministry of Tourism Developer Portal is the selected official boundary for licensing inquiry APIs. Ministry approval, the authorized base URL/token and a versioned licensing API contract are required before an adapter is implemented.

Both integrations remain `NOT_SELECTED` in runtime until their approved adapter is implemented. Onboarding readiness never makes either integration production-ready by itself.

## Provider selection / capability still required

The following integrations still need a complete provider/capability contract:

- CERTIFICATION — official manual verification evidence exists for Saudi and supported international diving organizations, but no approved automated certification-verification API contract is implemented.
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
