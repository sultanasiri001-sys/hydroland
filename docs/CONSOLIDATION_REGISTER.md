# HYDROLAND Consolidation Register

## Sources discovered
- `main`: lightweight baseline; not the complete platform.
- `release/integrated-platform`: broadest known integrated implementation; 561 commits ahead of main at audit start.
- `feat/database-foundation`: Prisma/database/auth/profile foundation.
- `fix/prisma-api-validation`: historical Prisma/API correction line.
- `fix/training-recovery`: historical training recovery line.
- `feat/training-governance-v1`: current governance/training/workforce candidate.
- Multiple feature branches for admin, credentials, payments, notifications/audit, safety, trips, themes, integrations, UI and launch operations.

## Confirmed duplicate-risk areas
| Area | Existing integrated implementation | New/parallel implementation | Action |
|---|---|---|---|
| Audit | `src/audit` | governance `audit.service.ts` | Reuse/extend canonical audit; do not keep two audit engines |
| Notifications | `src/notifications` | governance notification domain | Extend canonical notifications with governance event types |
| Resource conflicts/calendar | `src/trips/calendar-*` | governance resource conflict primitives | Unify behind one resource allocation invariant |
| Policy control | `src/trips/policy-control.*` | governance policy engine | Evaluate and consolidate into platform governance policy service |
| Credentials | `src/credentials` | governance workforce credential model | Persist through canonical credentials capability; add missing employment/training semantics |
| Payments | `src/payments` | governance payable/compensation model | Keep customer payments separate from workforce payables but share finance references |
| Database | Prisma schema/migrations | persistence abstractions | Keep repository abstraction; Prisma adapter must target reconciled canonical schema |
| Training UI | one-line/placeholder web training files observed | governance has real domain primitives | Replace placeholder only after API contracts are stable |

## Known quality risks
- Numerous one-line web JS/CSS placeholders exist in the integrated branch. They must not be counted as completed functionality.
- Migration history is extensive and previously had Prisma/Render recovery work. No destructive migration or squash is permitted before deployed DB reconciliation.
- Some modules evolved across many feature branches; branch age alone is not proof of authority.
- Legal/compliance logic must reference current official source/version/effective date and remain configurable.

## Current decision
`consolidation/hydroland-unified` is the only branch for consolidation work. Feature branches remain untouched as historical recovery sources until validation is complete.
