# HYDROLAND Governance & Quality Office

Status: IMPLEMENTATION CANDIDATE

## Purpose
The Governance & Quality Office is an independent review layer above execution departments. It reduces owner approval noise while preserving human authority for high-risk and stage-final decisions.

The office does not replace department ownership, IAM, legal authority, finance authority, safety authority, or the platform owner. It reviews evidence and prepares recommendations.

## Managed agents
The office adds six managed AI agents to the existing agent runtime:

1. `GOV_QUALITY_AUDIT` — validates requirements, scope and acceptance criteria.
2. `GOV_TECH_REVIEW` — reviews architecture, code, APIs, data design, integration quality and maintainability.
3. `GOV_SECURITY_RISK` — reviews security, permissions, data isolation, operational risk and change impact.
4. `GOV_COMPLIANCE_POLICY` — checks platform policy, delegation, budget boundaries, contracts and compliance constraints.
5. `GOV_VERIFICATION` — requires objective test evidence, logs, CI results and before/after verification.
6. `GOV_FINAL_GATE` — consolidates the five reviews into a single recommendation for the owner.

All six start PAUSED through the existing managed runtime. Their action boundary is intentionally narrow: read operations, draft review reports, and request human approval. They cannot directly mutate production state or exercise owner authority.

## Six review gates
1. Requirements gate
2. Implementation gate
3. Quality gate
4. Security and risk gate
5. Verification and evidence gate
6. Final approval gate

A failed gate returns work to the owning execution domain with findings and required evidence. It does not silently bypass the owning department.

## Owner escalation policy
Low- and medium-risk work should be reviewed and corrected inside the office workflow without creating individual owner approvals.

Owner review is required for:
- final stage acceptance;
- architecture-boundary changes;
- high-risk security or privacy changes;
- new or expanded privileges;
- budget or contractual threshold exceptions;
- production destructive actions;
- unresolved disagreement between governance gates;
- any explicit policy rule requiring owner approval.

## Independence and separation of duties
- The executing agent must not be the sole reviewer of its own output.
- `GOV_FINAL_GATE` cannot approve on behalf of the owner.
- No governance agent can sign contracts, capture/refund payments, change roles, bypass safety/regulatory blocks, or access the database directly.
- Existing maker/reviewer/approver and audit controls remain authoritative.
- Existing append-only audit evidence remains the canonical audit source.

## Runtime integration
The office is implemented as an additive extension of the existing managed AI runtime:
- Existing agent controls, queueing, cost reservation, pause/resume and task ledger are reused.
- Runtime initialization creates missing governance controls in PAUSED state.
- No new production model generation is automatically enabled.
- No migration is required because `AiAgentRuntime.key` and `AiAgentTask.agentKey` are string keys.
- The managed catalogue grows from 8 to 14 agents.

## Acceptance criteria
- API typecheck/build passes.
- Agent runtime HTTP/DB E2E passes with 14 managed agents.
- Existing browser agent-runtime regressions remain green.
- Existing security, release and dependency gates remain green.
- Initial runtime initialization creates the six missing controls PAUSED and preserves all existing controls/tasks.
- No governance agent receives direct mutation authority.

## Rollout
1. Merge only after CI is green.
2. Initialize the runtime as a verified global ADMIN; this adds any missing controls as PAUSED.
3. Enable governance agents individually only after provider/budget readiness is confirmed.
4. Start with read/review tasks and evidence reports.
5. Add automated routing between department outputs and governance gates in a later additive unit after acceptance of this office foundation.
