# HYDROLAND Canonical Architecture

Status: ACTIVE CONSOLIDATION BASELINE
Canonical branch: `consolidation/hydroland-unified`
Historical integration source: `release/integrated-platform`
Governance candidate source: `feat/training-governance-v1`

## Rule
HYDROLAND has one canonical implementation per capability. Historical feature/release branches are evidence and recovery sources, not parallel development targets.

## Canonical layers
1. `apps/api` — NestJS application and domain services.
2. `apps/api/prisma/schema.prisma` — one canonical database schema.
3. `apps/api/prisma/migrations` — immutable ordered migration history; never squash production-applied migrations during consolidation.
4. `apps/web` — one web application.
5. `docs` — architecture, compliance-source registry and operating decisions.
6. `.github/workflows` — canonical validation/security workflows.
7. `infra` + `render.yaml` — deployment configuration.

## Capability ownership
- Identity/Auth: `src/auth`, `src/profile`
- Administration: `src/admin`, `src/activation`
- Organizations/Centers: `src/organizations`
- Credentials: `src/credentials`
- Trips/Bookings/Resources/Equipment: `src/trips`
- Safety: `src/safety`
- Dive logs: `src/dive-logs`
- Payments: `src/payments`
- Notifications: `src/notifications`
- Audit: `src/audit`
- Themes: `src/themes`
- Integrations/AI: `src/integrations`, `src/agents`
- Governance/Training/Workforce: consolidate from `feat/training-governance-v1` into a single `src/governance` boundary, then split only when stable contracts justify it.

## Consolidation rules
- Never copy a whole historical branch over this branch.
- Compare capability by capability and port only the strongest non-duplicated implementation.
- Preserve migrations that may have been applied; create additive migrations after DB reconciliation.
- One controller route owner per endpoint.
- One service owner per business invariant.
- One model owner per persisted concept.
- Placeholder files (empty/1-line stubs) are not considered implementations and must be replaced or removed after dependency checks.
- Legal/regulatory rules must be configuration/version/source-driven; do not hard-code changing external requirements as permanent truth.
- Sensitive actions require scoped authorization, separation of duties where configured, and audit evidence.
- No destructive branch deletion during consolidation. Old branches become read-only historical references after acceptance.

## Acceptance gates
1. Inventory branches and capabilities.
2. Identify duplicate/placeholder/conflicting implementations.
3. Reconcile Prisma schema and migration history with deployed DB before persistence changes.
4. Port governance V1 without duplicating existing audit/notification/resource services.
5. Consolidate API modules and route ownership.
6. Consolidate web modules and remove confirmed placeholders/dead includes.
7. Typecheck/build/API validation/web validation/security checks.
8. Compare canonical branch against historical integrated release and governance branch.
9. Review PR; merge only after explicit approval.
