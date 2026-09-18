# HYDROLAND Architecture Freeze v1

Status: **Logical architecture frozen; persistence/runtime implementation remains gated by validation.**

This document is the canonical architecture baseline for HYDROLAND. New work should conform to this baseline unless an explicit architecture decision changes it.

## 1. Core principle

HYDROLAND is architected from day one for the fully operating enterprise: all departments, regions, centers, human workers, AI agents, workflows, permissions and governance exist structurally. Operational capabilities are activated progressively by configuration rather than by redesign.

## 2. Organization hierarchy

`HEADQUARTERS -> REGION -> CENTER -> DEPARTMENT -> UNIT -> TEAM`

Activation states: `INACTIVE | PILOT | ACTIVE | SUSPENDED`.

Leadership modes: `EXECUTIVE_SECRETARY | AI_MANAGER | HUMAN_MANAGER | HYBRID`.

Operating stages:
1. Executive Secretary
2. Department Managers
3. Center Managers
4. Specialized Workforce

## 3. Canonical departments

The canonical 14-department catalog and domain ownership rules are defined in `apps/api/src/governance/department-ownership.domain.ts`.

Important boundaries:
- Executive Governance owns enterprise authority, approval architecture, delegation and enterprise policy.
- Legal owns legal review, contracts, obligations, insurance, claims and legal compliance support.
- Safety owns operational safety/risk decisions; Legal owns legal interpretation.
- Administrative Affairs administers official records; Legal owns contract legal terms/review.
- Marketing owns campaign/growth execution; R&D owns market intelligence, feasibility and experiments.
- Technology owns technical AI operations; Executive Governance owns activation/capacity/cost authority.

## 4. Authorization model

Authorization is evaluated from role, action, resource, department, center, conditions and effective period.

Rules:
- least privilege;
- DENY wins over ALLOW unless a specifically permitted override policy applies;
- sensitive actions use separation of duties (Maker -> Reviewer -> Approver);
- requester must not approve their own sensitive request;
- temporary delegation is scoped and expires automatically;
- employment, account identity, credentials and authorization are separate concepts;
- AI agents cannot self-grant permissions.

## 5. Cross-department workflow model

Canonical lifecycle:

`Request -> Validate -> Route -> Review -> Approve -> Execute -> Verify -> Close -> Audit`

A workflow retains one identity while responsibility can move from Executive Secretary to Department Head, Center Manager or specialist as operating stages activate.

Core enterprise workflows include recruitment, procurement, trips/marine operations, training, center activation, incidents/emergencies, contracts/insurance and innovation/new-service evaluation.

## 6. Data ownership

One canonical entity ID and one source of truth per domain. Departments reference canonical records instead of creating shadow copies.

Existing persisted canonical sources include organizations/memberships, credentials, audit, notifications, trip policy controls and reservation/calendar data where present. Workforce/recruitment/capacity semantics currently live in governance domain code and require additive persistence later.

Sensitive data requires field-level access controls. Secrets must never be exposed as ordinary business data.

## 7. Integration architecture

External systems do not receive direct database access.

Canonical route:

`Client/Center/Agent -> API/Authorization -> Business Service -> Persistence`

External route:

`HYDROLAND -> Integration Hub/Adapter -> External Provider`

Payment, communications, weather/marine data, AI providers, logistics, training organizations and government/regulatory sources should be adapter-based. Reliability controls include timeout, retry, idempotency, circuit breaking, failure queues/handling, monitoring and audit where applicable.

## 8. AI architecture

AI agents have independent agent identity, department/center scope, permissions, capability limits, usage and cost attribution. Agent operations are attributable to agent, action, department, center, workflow, resource, cost and timestamp.

Executive capacity analytics may recommend trial/activation/deactivation but do not bypass approval policy.

## 9. Executive control

Executive Control Center aggregates operations, departments, centers, human workforce, AI workforce, finance/cost, safety, SLA, customer experience, alerts and smart expansion recommendations.

The architecture supports simulation/trial/approve/postpone/reject decisions for capacity changes.

## 10. Persistence gate

Do not reset, squash or destructively rewrite Prisma migration history as part of this freeze.

Before adding persistence for the full organization tree, multi-center/multi-department role assignments, recruitment, contracts, temporary assignments, center controls, capacity history, asset registry or legal/R&D registries:
1. reconcile the deployed database `_prisma_migrations` state;
2. resolve the known migration-history/P3011 risk;
3. review `RoleAssignment` uniqueness for multi-scope assignments;
4. use additive migrations;
5. validate Prisma generation/migration behavior before deployment.

## 11. Gap disposition

- Existing domain capabilities: preserve and map to canonical owners.
- Partial capabilities: consolidate behind canonical ownership/workflow boundaries.
- Missing enterprise layers: add without duplicating existing domain data.
- Duplicate representations: merge/retire after dependency review, never by blind deletion.
- Database changes: remain behind the persistence gate above.

## 12. Freeze rule

Architecture Freeze v1 freezes the logical target and ownership boundaries, **not implementation completeness**. It does not claim TypeScript compilation, Prisma validation, CI, Render deployment or runtime validation. Those are separate implementation gates.
