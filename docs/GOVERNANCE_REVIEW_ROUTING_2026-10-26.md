# Governance & Quality Office — Review Routing (candidate)

The deterministic policy module is `apps/api/src/governance/governance-review-routing.ts`. It is an advisory **pure function**, not an automatic decision endpoint, queue dispatcher or IAM actor.

## Route contract
- Execution departments submit an immutable work reference, source department, risk markers and evidence references.
- Five independent governance reviews must be present exactly once, each with a verdict and evidence.
- Failed reviews return work to its original department; missing reviewers or evidence hold the item.
- After five PASS reviews, low/medium risk work is marked `INTERNAL_REVIEW_COMPLETE` and handed to its existing authorized departmental workflow. This **does not mean legal, safety, financial or production approval has occurred**.
- Owner-reserved/high/critical items are marked `READY_FOR_OWNER` but not approved. The final governance agent may prepare a recommendation; only the authorized human owner may decide.
- Safety and regulatory controls are never bypassed or switched off.

## Next integration required
1. Add persistence for work packages, five review decisions and signed immutable evidence references with organization scope, maker/reviewer separation and transactional audit.
2. Add an authorized server API for submitting work packages and recording review evidence. Never accept caller-provided risk classifications as the sole source of truth: derive protected risk signals server-side.
3. Dispatch reviewers on the managed runtime with their own credentials and policy scopes; wire completion to the validated routing policy.
4. Provide a single owner summary UI, tied to the actual global owner account via authoritative IAM, rather than interpreting literal '001' as a database account ID.
5. Add HTTP/PostgreSQL and browser regression tests for permission revocation, parallel completion, retries, forged evidence, conflicting decisions, and high-risk cases before deployment.

No live automatic routing or owner approval is claimed in this candidate.
