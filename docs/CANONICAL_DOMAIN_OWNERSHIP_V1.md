# HYDROLAND Canonical Domain Ownership V1

Status: Phase 1 / Level 1 repository reconciliation — canonical ownership freeze.

## Non-duplication rule
Before adding any model, service, policy, workflow, regulatory source, or migration: REUSE -> CONSOLIDATE -> COMPLETE MISSING -> VALIDATE. A second production source of truth is prohibited unless this register is explicitly revised.

## Canonical technical source
- Working branch: `consolidation/hydroland-canonical-v1`.
- Database engine: PostgreSQL.
- ORM/schema source: `apps/api/prisma/schema.prisma`.
- Runtime database adapter: `apps/api/src/database/database.service.ts`.
- Existing migrations are immutable evidence until reconciled with deployed `_prisma_migrations`.

## Domain ownership register
| Domain | Canonical owner | Existing canonical persistence | Decision |
|---|---|---|---|
| Person / Account / Session | `src/auth`, `src/profile`, Prisma | Person, Account, Session, ProfessionalProfile | Extend only; Person != Account != Employee |
| Professional roles | IAM/Governance + Prisma | RoleAssignment | Extend scope safely; do not create parallel role tables |
| Credentials | `src/credentials` | Credential + Document | Single professional credential source |
| Organizations | `src/organizations` | Organization + OrganizationMember | Extend for HQ/Region/Center hierarchy |
| Departments / Units / Teams | Governance/Organization architecture | Missing strong persistence | Additive persistence required |
| Workforce / Employment / Contracts | Governance + HR domain | Missing | Additive persistence required; separate employment from IAM |
| Recruitment | Governance + HR domain | Domain semantics exist; persistence missing | Additive persistence required |
| Delegation | Governance | Domain semantics exist; persistence missing | Additive persistence required |
| Audit | `src/audit` | AuditEvent | ONLY production audit source; no governance audit store |
| Notifications | `src/notifications` | Notification | ONLY notification persistence; extend delivery lifecycle |
| Policy controls | current policy-control owner, later modular relocation allowed | PolicyControl | One policy source; relocation must not duplicate data |
| Calendar/resources | Trips/calendar services | CalendarResource + CalendarAllocation | Single allocation/conflict source; generalize additively |
| Trips/bookings | `src/trips` | Trip, Booking, BookingParticipant, CrewAssignment | Extend only |
| Dive logs | `src/dive-logs` | DiveLog | Single dive-log source |
| Safety | `src/safety` | SafetyChecklist + operational services | Extend for risk/incident/CAPA/Safety Hold |
| Boat compliance | Trips/compliance | BoatResourceCompliance | Extend; authority text fields are not regulatory truth |
| Trip compliance | Trips/compliance | TripComplianceReview | Link to canonical regulatory requirements later |
| Customer payments/invoices | `src/payments` | Payment + Invoice | Customer commerce only |
| Workforce compensation/payables | Governance/Finance | Missing | New additive models; MUST remain distinct from customer payments |
| Equipment/inventory/rentals | existing trips/inventory services + migrations | Existing operational persistence | Consolidate under Asset/Inventory domain without duplicate records |
| Training | Training domain | Release implementation exists; canonical persistence incomplete | Port missing behavior selectively; do not merge duplicate governance stores |
| Themes | `src/themes` | ThemeSchedule | Keep separate from business governance |
| Integrations | `src/integrations` | service/adapters | One Integration Hub; no provider-specific business truth duplication |
| AI agents | `src/agents` + future AI Gateway | action layer, no direct DB ownership | Agents may not become source of truth or final sensitive approver |
| Regulatory Library | Regulatory/Compliance domain | Missing canonical persistence | New single source: Authority -> Source -> Version -> Requirement |
| Compliance Engine | Compliance/Governance | Partial operational compliance only | Add applicability/evidence/findings/CAPA without duplicating regulatory sources |
| Workflow/Approvals | Governance workflow semantics | Activation/review exists; general workflow incomplete | Generalize one workflow/approval engine; preserve specialized domain state |
| Events | future Event Bus/Outbox | Partial notifications/audit only | Add canonical event/outbox infrastructure once DB state is reconciled |

## Canonical organization target
`HQ -> Region -> Center -> Department -> Unit -> Team`

The platform has 14 canonical departments. Department records are centrally defined once and assigned/enabled per organization unit/center rather than copied into separate department databases.

## Shared-core invariants
1. One PostgreSQL logical source of truth.
2. One regulatory source/version record, reusable by many departments and activities.
3. One AuditEvent production trail.
4. One Notification persistence model.
5. One Credential source for professional credentials.
6. One calendar/resource allocation conflict authority.
7. Customer payments and workforce payables are separate accounting concepts.
8. Employment/appointment does not automatically grant application permissions.
9. Center managers operate only within centrally enabled scope.
10. AI cannot directly own business truth, self-approve sensitive actions, delete legal/audit evidence, or bypass Safety Hold.

## Branch import policy
- Do not merge `release/hydroland-launch-2026-09-15-r2` wholesale: it diverges and modifies historical migrations and web behavior.
- Training implementation from release is a selective-port candidate after schema/migration reconciliation.
- Do not port the Governance V1 in-memory audit/notification repositories as production stores.
- Specialized branches are evidence/candidates, not independent production sources of truth.

## Database safety gate
No new Prisma migration for the 14-department architecture, regulatory library, HR/workforce, delegation, training consolidation, or compliance engine may be committed until:
1. deployed `_prisma_migrations` is inspected;
2. repository migration directories are matched in order;
3. the prior P3011/failed-migration history is understood;
4. Prisma validate/diff succeeds outside production;
5. the migration is additive and reviewed for existing data.

No production reset, drop-all, destructive squash, or blind migration rewrite.

## Phase 1 Level 1 exit criteria
- Canonical working branch exists.
- Canonical domain ownership is documented.
- Known duplicate production ownership is prohibited.
- Divergent release/features are treated as selective import sources.
- Next gate is deployed database reconciliation before persistence expansion.
