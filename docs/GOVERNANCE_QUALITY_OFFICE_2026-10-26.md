# HYDROLAND Governance & Quality Office

Status: REVIEW-ONLY FOUNDATION — controls start PAUSED

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

The runtime routes completed department-agent drafts in this order: quality audit → technical review → security/risk → compliance/policy → verification/testing → final recommendation. Each review is an advisory task, not a departmental approval or an operational closure gate.

Every stage receives the complete original brief/output plus all prior reviews, through version-bound links in the audit ledger. Text is not silently truncated to fit the input budget; the existing token limit stops oversized input. A direct standalone final-agent task cannot stand in for the five preceding reviews.

Only a valid structured `PASS` or `PASS_WITH_NOTES` with no evidence gaps and no escalation can advance. Missing evidence, a correction request, invalid output, high risk or an owner-escalation flag stops the route. Completion and the next queue entry share one transaction; retries cannot duplicate the next review. A full or uninitialized queue records deferral and retains the original result. Paused controls retain queued reviews without dispatch.

The final recommendation records all five preceding reviews and explicitly requires separate owner approval; it never records an approval. The task ledger displays correction, escalation, deferral and pending-owner states separately from model-generation completion.

## Unified review inbox
The AI workspace includes a read-only review inbox for completed outputs from the eight execution agents. A list shows up to twenty source outputs with department, six-stage progress, recorded estimated cost and routing status. The selected detail retains the complete original brief/output, all six stage slots, saved findings, evidence gaps and review text.

The server reconstructs each chain from the existing task and append-only audit ledgers. Each link must match the source revision, expected next agent, requester, language and read-only review action. Duplicate links, cross-requester tasks, changed revisions or a missing/conflicting final receipt block readiness. A final recommendation needs all six passing stages and the actual owner-reserved receipt. Listing summaries omits prompts, model output and requester identifiers.

Both endpoints require fresh verified global administrator authorization and return `Cache-Control: no-store`. They never dispatch a task, call the model, initialize controls, persist a new review decision or grant an approval. The client clears private content after logout, workspace exit, role revocation, malformed responses and late requests. An empty inbox means there are no completed execution-agent outputs to display.

This view reads the current advisory runtime ledger. It does not implement the separate proposed work-package/policy-decision ledger in draft #519, or substitute for departmental, legal, safety or financial approvals.

## Captured aggregate evidence
Before an execution-agent read is sent to the provider, the exact four aggregate values and observation time are saved in the append-only audit ledger. The receipt binds the execution claim and started revision and includes a digest. Failure to persist this evidence prevents the provider request. Every review receives the same captured input, and the inbox detail displays it without exposing execution claims or private ledger fields.

A historical read without a captured input is shown as requiring evidence; the current database is never used to backfill its past input. Conflicting evidence cannot appear ready for owner review, and existing review text remains visible. Review instructions identify the agent's actual stage: the first review correctly has no prior reviews. Reviewers assess the requested bounded output and its evidence without requiring unrelated operational or legal approvals.

## Owner escalation policy
The target workflow is to review and correct low- and medium-risk work inside the office without individual owner approvals. Automatic review routing stops at correction findings. The optional bounded draft-correction extension is documented in `GOVERNANCE_BOUNDED_DRAFT_CORRECTION_2026-10-27.md`: newly opted-in textual drafts may receive one revision and six fresh reviews. Historical tasks and business mutation authority are unchanged.

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
- A full six-agent HTTP/PostgreSQL chain retains the original evidence and produces exactly one owner recommendation.
- Correction, missing evidence, malformed output, high risk, policy escalation and invalid lineage stop routing.
- Queue limits, audit rollback, additive initialization and paused state preserve existing work.
- Existing security, release and dependency gates remain green.
- Initial runtime initialization creates the six missing controls PAUSED and preserves all existing controls/tasks.
- No governance agent receives direct mutation authority.

## Rollout
1. Merge only after CI is green.
2. Initialize the runtime as a verified global ADMIN; this adds any missing controls as PAUSED.
3. Enable governance agents individually only after provider/budget readiness is confirmed.
4. Start with read/review tasks and evidence reports.
5. Automatic routing uses the existing task budget and queue; no model request occurs until the corresponding agent is enabled. Production activation and paid end-to-end generation require their existing authorized configuration. The bounded draft-correction extension requires explicit per-draft opt-in and uses the same cap; it is disabled for historical tasks.
