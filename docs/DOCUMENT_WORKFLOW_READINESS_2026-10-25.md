# Internal document approval: read-only preflight (#509)

This delivery explains the combined authorization/lifecycle restriction inside the existing document workspace. It deliberately does **not** resolve #509 by weakening independence or granting new access.

## Implemented boundary

`GET /documents/organizations/:organizationId/documents/:documentId/workflow-readiness`

- Existing AccessTokenGuard and DocumentAuthorizationService run before any scoped document read, within a serializable transaction.
- Returns version/status, actor-local action explanations and remaining-path blockers, without payload, names, creator/approver IDs, signatures or audit data.
- Private/no-store, no writes, no permission tokens. Actual transitions always perform their existing fresh authorization.
- Internal owner-created draft/pending records expose the unavailable independent approver and signer. A historical different creator does not imply that one current owner can both approve and independently sign. Historical records with genuinely distinct existing actors are assessed using their actual stored attribution; no history is rewritten.
- Center membership remains unchanged. An actor-local check is not an assertion that all independent participants or other business requirements are available.
- Specialized contracts stay outside the generic endpoint.

## User interface

The internal workspace shows a policy warning and each generic document has a `فحص مسار الاعتماد` read-only button. Diagnostics never activate approval/signing controls. Scope/version/shape checks, plain text, detached-target/session fences, private current-denial cleanup, and retention of typed draft inputs are covered by browser fixtures.

## Unresolved policy choice

The owner remains responsible for administrative approval through the existing owner account (user label 001 is not an authorization mechanism). No new human/agent identity, membership or delegated role is created. No service token is minted and no owner is impersonated.

Owner must explicitly review a future policy: either real narrowly authorized distinct actors, or a separately named, scope-limited owner administrative-decision path for eligible non-financial/non-contractual records. The latter must not be presented as independent review, a legal sign-off, or an electronic signature from another person. Sensitive HR/legal/contract controls remain separate. This document proposes alternatives; it does not approve or enable them.

#509 stays open. Existing production form setup remains a separate authenticated owner action. No automatic setup, business-content approval, schema migration or historical backfill is part of this change.

## Verification

- 17 source-transpiled synthetic checks ran locally, including the actual authorization and controller composed together with mocked data dependencies. This is not full local Nest/API build acceptance.
- 12 local Chromium checks ran on the actual workspace source with synthetic authorized-fetch responses, not a production browser session.
- Added both scripts to focused CI and a dedicated guarded loopback HTTP/PostgreSQL scenario to integration CI. The latter also verifies owner approval refusal, non-owner denial, explicit membership suspension, role revocation, cross-organization isolation, specialized-path refusal, unchanged records, and the existing distinct-actor center lifecycle.
- Existing test suites and production authorization/lifecycle implementations remain unchanged.
