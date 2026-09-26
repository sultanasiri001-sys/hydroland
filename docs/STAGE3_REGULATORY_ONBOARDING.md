# Stage 3 — Saudi Ministry of Tourism Licensing API onboarding

Status: PRE-CONTRACT / ACCESS REQUEST REQUIRED
Parent blocker: #329
Closure task: #334

## Official route

- Ministry of Tourism Developer Portal: https://developer.tourism.sa/
- Public catalog exposes `Submit Licensing access request` for ministry-admin approval of Licensing inquiry APIs.
- Public catalog does not expose the approved Licensing OpenAPI/contract details before onboarding/approval. Do not infer endpoint paths, schemas, auth scopes, or response semantics.

## HYDROLAND integration purpose

HYDROLAND is a Saudi marine/diving activities platform. The Regulatory integration is read-only compliance verification for provider onboarding and operational checks. The requested Licensing API scope should be limited to verifying relevant tourism licence identity/status/validity and other fields explicitly approved by the Ministry.

The integration must not issue, modify, renew, suspend, or cancel licences unless a later approved Ministry contract explicitly authorizes those operations.

## Access request text

Use case:

> HYDROLAND requests access to the Ministry of Tourism Licensing inquiry APIs to perform read-only licence verification during provider onboarding and compliance review. The platform requires authoritative licence identity/status/validity information for Saudi tourism-service providers participating in marine and diving activities. Access will be server-to-server, least-privilege, auditable, and restricted to the fields and scopes approved by the Ministry. HYDROLAND will not scrape public licensing pages or infer undocumented endpoints.

Requested integration characteristics:

- Read-only Licensing inquiry API access.
- Production and sandbox/UAT environments if offered.
- Approved authentication mechanism and credential lifecycle.
- Approved API contract/version and change-management policy.
- Rate limits, retry guidance, timeout policy, and error taxonomy.
- Data-retention and permitted-use requirements.
- Audit/logging requirements.
- Support/escalation channel for production incidents.

## Operator information required before submission

Do not store secrets in this document.

- Legal entity name: operator-provided
- Commercial Registration / licence identifiers: operator-provided
- Technical contact: operator-provided
- Compliance/legal contact: operator-provided
- Production domain/origins: operator-provided
- Callback/webhook origins: only if the approved contract requires them

## Runtime configuration contract

Current code intentionally requires these production values before Regulatory can become contract-access-ready:

- `HYDROLAND_INTEGRATION_REGULATORY_STATUS`
- `HYDROLAND_REGULATORY_PROVIDER=SAUDI_MINISTRY_OF_TOURISM`
- `HYDROLAND_REGULATORY_ACCESS_APPROVED=true`
- `SAUDI_TOURISM_API_BASE_URL`
- `SAUDI_TOURISM_API_TOKEN`
- `SAUDI_TOURISM_LICENSING_CONTRACT_VERSION`

Secrets must be configured only in the approved production secret store. Do not commit tokens, client secrets, API keys, or approval documents containing credentials.

## Adapter implementation gate

The current readiness controller intentionally keeps `adapterImplemented=false` and therefore `productionReady=false` until the Ministry supplies the approved contract/specification.

After approval:

1. Record the approved contract/version and allowed scopes.
2. Implement a contract-specific adapter; do not use guessed URL paths or undocumented payload fields.
3. Add schema/contract tests using Ministry sandbox/UAT fixtures or approved examples.
4. Add timeout, retry, rate-limit, error mapping, and audit behavior consistent with the Ministry contract.
5. Configure production credentials in the secret store.
6. Set the lifecycle to `SANDBOX` for UAT, then `PRODUCTION_ENABLED` only after production approval.
7. Verify `/api/v1/health/integrations/regulatory` as ADMIN.
8. Run the production integration inventory and Stage 3 gates.

## Acceptance criteria

REGULATORY is production-closed only when all are true:

- Ministry access request approved.
- Approved Licensing API contract/version received.
- Provider and access flags configured.
- Credentials configured in the production secret store.
- Contract-specific adapter implemented.
- Sandbox/UAT evidence passes.
- Authenticated readiness returns `productionReady=true`.
- Production integration inventory has no `REGULATORY:LICENSING_API_CONTRACT_AND_ADAPTER_REQUIRED` blocker.
- Stage 3 Technical Closure and Main Integrity gates remain green.

## Prohibited shortcuts

- No scraping of public Ministry licensing pages.
- No guessed endpoints or auth flows.
- No hard-coded credentials.
- No marking `adapterImplemented=true` before a real approved adapter exists.
- No transition to `PRODUCTION_ENABLED` before Ministry production approval and successful UAT.
