# Stage 3 — Nafath service-provider onboarding

Status: PRE-CONTRACT / SERVICE-PROVIDER ONBOARDING REQUIRED
Parent blocker: #329
Closure task: #333

## Official route

- Nafath / National Digital Identity: https://www.iam.gov.sa/
- The official Nafath description includes online service-provider onboarding and automated federation with service providers.
- Technical support: Support@nic.gov.sa
- Call center: 8001221111
- Official support channel: @NIC_Care

No approved HYDROLAND-specific OIDC issuer, client credentials, scopes, callback rules, or production contract are currently stored in the repository. Do not guess them.

## HYDROLAND integration purpose

HYDROLAND requests Nafath service-provider onboarding to authenticate Saudi citizens/residents where strong national digital identity assurance is required for regulated platform actions. The initial requested scope should be authentication/identity assurance only, with least-privilege claims and no collection of identity attributes that are not required by the approved use case.

Potential regulated actions include provider onboarding, privileged contract acceptance, and other workflows explicitly approved by the National Information Center/SDAIA contract. Final scope is controlled by the approved Nafath agreement.

## Onboarding request text

Subject: HYDROLAND — Nafath service-provider onboarding request

> HYDROLAND is a Saudi marine and diving activities platform requesting onboarding as a Nafath service provider. We require approved national digital identity authentication for regulated platform workflows, using least-privilege identity claims and server-side security controls. Please provide the official service-provider onboarding process, technical integration specification, sandbox/UAT requirements, approved issuer/endpoints, credential model, redirect/callback requirements, assurance levels, production approval process, and support/escalation procedure. We will not use guessed endpoints or unofficial credentials.

## Information to provide when requested

Do not store credentials or sensitive identity data in this document.

- Legal entity name: operator-provided
- Commercial Registration / regulatory identifiers: operator-provided
- Authorized representative: operator-provided
- Technical contact: operator-provided
- Security/compliance contact: operator-provided
- Production domain/origins: operator-provided
- Redirect/callback URLs: generated only after the approved flow is known
- Intended user population: Saudi citizens/residents using regulated HYDROLAND workflows
- Requested claims/scopes: minimum set approved by Nafath

## Runtime configuration contract

Current code intentionally requires approved configuration before Nafath can become contract-access-ready:

- `HYDROLAND_INTEGRATION_NAFATH_STATUS`
- `HYDROLAND_NAFATH_PROVIDER=NAFATH`
- `HYDROLAND_NAFATH_ACCESS_APPROVED=true`
- `NAFATH_OIDC_ISSUER`
- `NAFATH_CLIENT_ID`
- `NAFATH_CLIENT_SECRET`

Secrets must exist only in the approved production secret store.

## Adapter implementation gate

The current readiness controller intentionally keeps `adapterImplemented=false`, `sandboxReady=false`, and `productionReady=false` until the approved Nafath specification and credentials are received.

After approval:

1. Record the approved contract/specification and assurance requirements.
2. Implement the adapter only against approved issuer/endpoints and flows.
3. Enforce state/nonce/PKCE or other controls exactly as required by the approved contract.
4. Implement redirect/callback origin allow-listing and replay protection.
5. Minimize stored claims and define retention/deletion rules.
6. Add sandbox/UAT contract tests and negative authentication tests.
7. Configure secrets in the production secret store.
8. Set lifecycle to `SANDBOX` for UAT, then `PRODUCTION_ENABLED` only after formal production approval.
9. Verify `/api/v1/health/integrations/nafath` as ADMIN.
10. Run production integration inventory and Stage 3 gates.

## Acceptance criteria

NAFATH is production-closed only when all are true:

- Service-provider onboarding approved by NIC/SDAIA.
- Approved integration specification received.
- Issuer/endpoints and credential model are contract-confirmed.
- Credentials configured in the production secret store.
- Contract-specific adapter implemented.
- Sandbox/UAT evidence passes, including negative/replay cases required by the contract.
- Authenticated readiness returns `productionReady=true`.
- Production integration inventory has no `NAFATH:APPROVED_CONTRACT_AND_ADAPTER_REQUIRED` blocker.
- Stage 3 Technical Closure and Main Integrity gates remain green.

## Prohibited shortcuts

- No guessed OIDC issuer or authorization/token endpoints.
- No use of consumer Nafath credentials as service-provider credentials.
- No hard-coded client secret.
- No over-collection of identity claims.
- No marking `adapterImplemented=true` before an approved adapter exists.
- No production enablement before NIC/SDAIA approval and successful UAT.
