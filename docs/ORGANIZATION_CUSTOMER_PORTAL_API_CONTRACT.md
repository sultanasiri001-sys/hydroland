# Organization Customer Portal API Contract

Status: organization profile/membership, customer requests, booking, participant-roster, and safety-report routes/UI are implemented in the local codebase. Additive customer-case and booking/safety migration candidates have not been applied to production. Organization billing remains blocked on Finance policy. API CI, including typecheck/build, four isolated PostgreSQL forward-migration rehearsals and organization-booking HTTP/DB checks, passed on revision 6bfa9c4e. The 12 focused organization browser regressions passed; the full browser suite is being verified separately.

2026-10-08 verification update: work is recoverable in draft PR #442. The first revision passed API CI, but it did not yet rehearse the forward organization migrations or exercise the new booking permission boundary. The follow-up revision adds TEXT/UUID migration rehearsals and organization-booking HTTP/PostgreSQL regressions. API run 37810595700 passed all four Organization.id/Booking.id TEXT/UUID combinations and the scoped HTTP/DB regression on revision 6bfa9c4e. This is a candidate forward-migration rehearsal, not a complete historical migration replay or production deployment. Personal booking lists, participant routes, cancellation and payment creation exclude organization-owned bookings; the contact account cannot bypass current organization membership through personal routes. Participant writes submit the revision displayed with the form, preserving optimistic concurrency. Production migration, organization billing, calendar booking-gate acceptance and recovery acceptance remain open.

## Goal

Complete the company and government customer portal on top of the existing organization, booking, customer service, document, finance, calendar, safety, and audit capabilities. The portal is a tenant-scoped view of those domains; it must not introduce a second source of truth for them.

## Existing contract and ownership

| Capability | Current source of truth | Current state |
|---|---|---|
| Organization identity and membership | `Organization`, `OrganizationMember` | `GET /organizations/mine`, `PATCH /organizations/:id`, member listing and invitation exist. Mutations require active OWNER/ADMIN membership. |
| Booking and trip operations | `Trip`, `Booking`, `BookingParticipant`, calendar services | Organization requests use the canonical `Booking` and roster models. The request path checks trip status/start, current safety/weather policies, capacity, and idempotency. Unified-calendar resource checks and operational clearance remain with trip operations; the customer request path does not make or imply an operational clearance decision. |
| Customer requests | `CustomerCase`, `CustomerInteraction` | Nullable `CustomerCase.organizationId` now has an optional Prisma relation to `Organization`; the additive FK candidate preserves individual cases. Personal routes remain `customerId` scoped; organization routes validate an ACTIVE organization and membership, scope nested case access, and audit create/reply operations. |
| Documents | `DocumentTemplate`, `ManagedDocument`, revisions and lifecycle | Organization-scoped document APIs and role checks exist. Reuse these routes and models. |
| Customer payment and invoice | `Payment`, `Invoice` | Payment is tied to a booking and account; invoice is tied to one payment. These are not organization receivables or a business billing ledger. |
| Finance | `FinanceAccount`, `FinanceEntry` and finance services | Organization IDs exist, but account/entry endpoints are platform-admin guarded. They are not exposed as an organization customer ledger. |
| Safety | `SafetyIncident` and safety services | Organization reports attach to both the scoped booking and its trip; list responses expose customer-safe incident fields. Safety decision authority stays with Safety. |
| Scheduling | `CalendarEvent`, `CalendarResource`, `CalendarAllocation` | Unified calendar is the operational source of truth. Resource allocation and conflict checks remain in trip operations; they are not currently part of organization request creation. |
| Audit | `AuditEvent` | Reuse the existing audit source of truth for successful sensitive organization actions. |

Administrative Affairs records and routings are not customer service requests. HR, internal finance entries, and center operations are not customer portal APIs.

## Proposed organization-scoped routes

All routes require an authenticated account. `:organizationId` is checked against an ACTIVE organization and the caller's ACTIVE membership on every request. The server derives the acting account from the access token; clients cannot nominate it.

| Route | Purpose | Access |
|---|---|---|
| `GET /organizations/:organizationId/requests` | Implemented. List the organization's customer service cases, paginated by `page`/`pageSize`, with stable ordering. | Any ACTIVE organization member can read; VIEWER is read only. |
| `POST /organizations/:organizationId/requests` | Implemented. Create a case with `type`, `subject`, and `description`; persist organization id, requester account, initial interaction, and audit event atomically. References are not accepted until resource validation is defined. | OWNER, ADMIN, OPERATOR, STAFF. |
| `GET /organizations/:organizationId/requests/:caseId` | Implemented. Read one case and its customer-visible interactions only when its organization id matches. | Active member. |
| `POST /organizations/:organizationId/requests/:caseId/replies` | Implemented. Append a customer interaction and audit event to a case in the same organization. | OWNER, ADMIN, OPERATOR, STAFF. |
| `GET /organizations/:organizationId/bookings` | Implemented. Lists scoped bookings and safe trip/roster fields with pagination. | Any ACTIVE member can read; VIEWER is read only. |
| `POST /organizations/:organizationId/bookings` | Implemented. Requests a canonical pending booking with participant snapshots, request key, safety/weather/capacity gates, and audit event. Names may be completed later by an authorized manager. | OWNER, ADMIN, OPERATOR. |
| `GET /organizations/:organizationId/bookings/:bookingId` | Implemented. Reads a scoped booking and safe lifecycle summary. | Active member; participant/emergency data follows least-privilege rules. |
| `PATCH /organizations/:organizationId/bookings/:bookingId/participants/:participantId` | Implemented. Updates name/certification before confirmation or trip start, with expected-version check and audit event. | OWNER, ADMIN, OPERATOR. |
| `POST /organizations/:organizationId/bookings/:bookingId/cancel` | Implemented through the canonical booking lifecycle. It does not trigger a refund. | OWNER, ADMIN. |
| `GET /organizations/:organizationId/safety/incidents` | Implemented. Lists reports linked to organization bookings and omits internal resolution notes. | OWNER, ADMIN, OPERATOR, STAFF. |
| `POST /organizations/:organizationId/safety/incidents` | Implemented. Submits an incident linked to an organization booking and trip with server-validated tenant scope and audit event. | OWNER, ADMIN, OPERATOR, STAFF. |
| `GET /organizations/:organizationId/billing` | List organization-facing invoices/payments once Finance defines the organization billing model. | OWNER, ADMIN and an explicit finance permission; never expose internal FinanceEntry records by default. |

The existing `GET /documents/organizations/:organizationId/list`, templates, branding, document lifecycle, revisions and PDF routes remain the document interface. Do not add an alternate organization document store.

## Required booking persistence decision

The organization booking persistence change now uses nullable `Booking.organizationId`, an idempotency request key/fingerprint, and `BookingParticipant` snapshots separate from the submitting contact. An additive migration candidate drops the old composite unique key and replaces it with partial unique indexes for active personal and organization bookings. The candidate passed isolated non-production PostgreSQL rehearsals for all four TEXT/UUID combinations of Organization.id and Booking.id; it has not been deployed. The migration discovers the actual referenced key types and creates matching foreign-key columns, preserving existing migration history. Full historical replay and production recovery acceptance remain separate open checks.

The implementation records:

- the organization the booking is for;
- the authenticated account that created or manages it;
- the booker/contact, who may be different from every participant;
- the activity/time slot; unified-calendar availability is not evaluated by organization request creation today;
- the participant manifest snapshot and the fields restricted to operational/safety roles;
- request idempotency and booking lifecycle/audit references.

Implementation review found two constraints the organization path must address:

- `TripsService.book` currently finds bookings by `(tripId, accountId)`, while `BookingParticipantService.ensureForBooking` automatically adds the account as participant one and fills the remaining seats with placeholders. For an organization booking, the submitting contact can be a non-participant, so this helper cannot be reused unchanged for roster creation.
- Keeping the existing unique key prevents one account from placing separate bookings for multiple organizations on the same trip. Replacing it with a nullable organization composite key alone would allow duplicate personal bookings in PostgreSQL. The migration must preserve personal uniqueness and define organization idempotency/uniqueness explicitly.

The booking remains in the canonical `Booking` model and lifecycle service. The current organization create path mirrors existing personal trip gates (trip open/not started, policy-controlled safety, weather and capacity) and does not add a second calendar engine. Calendar resource availability and operational clearance are not checked by the customer booking endpoint today; trip operations still own those checks. Do not imply those checks are complete until a canonical booking-gate decision is made and verified.

## Billing boundary

Do not expose `/finance/admin/organizations/:id/accounts` or `/entries` as the customer billing API. Finance must define the payable entity, invoice lifecycle, payment terms, credit/collection rules, tax/reference requirements, and permissions. Existing individual `Invoice -> Payment -> Booking` records can be shown only when the organization is explicitly the booking customer under the agreed model. A business invoice model or relationship is a separate additive Finance design decision.

## Authorization invariants

1. Every query and mutation includes organization scope in the database predicate, including nested case, booking, participant, incident, document, and invoice identifiers.
2. Membership status must be ACTIVE and organization status must permit customer operations. Removed, suspended, pending, and cross-tenant memberships fail closed.
3. Roles are evaluated server-side for each action. Frontend route visibility is not authorization.
4. A booking manager cannot alter another organization's bookings or participant snapshots. Sensitive identity and emergency data are not returned to general organization roles.
5. Customer request actors and audit actors come from authenticated server context. Organization ids, actor ids, workflow status, payment state, and safety decisions cannot be client-assigned.
6. State-changing workflows validate current state and expected version within a transaction. Retries use idempotency keys where a repeated request could create duplicate bookings, cases, reports, or financial actions.
7. Successful sensitive mutations emit the existing `AuditEvent` in the same transaction. Denied operations do not mutate domain state.
8. Organization users may submit safety reports and view permitted status; they cannot approve safety checklists, resolve incidents, or change operational clearance.
9. Organization users may read customer-facing billing documents only after Finance authorizes the organization relationship. They cannot create/post/approve internal ledger entries through customer routes.

## Status and response expectations

- Lists are paginated and have stable ordering.
- Cross-tenant and nonexistent nested IDs return the same not-found result to avoid leaking resource existence.
- Validation errors identify rejected fields without returning sensitive tenant data.
- Booking responses distinguish the existing pending state from `CONFIRMED`; creating a request does not bypass availability, capacity, payment, safety, weather, or operational approval gates.
- Cancellation requests do not imply a refund. Refund decisions remain owned by Finance/payment workflows.

## Acceptance checks before implementation is considered complete

- OWNER/ADMIN can use authorized organization routes; VIEWER can read but cannot mutate; suspended and removed members are denied.
- A member of organization A cannot read or mutate any case, booking, participant, incident, document, or billing record belonging to organization B by substituting identifiers.
- Booking request creation checks trip lifecycle, capacity policy, safety/weather policy, and idempotency. A separate canonical booking-gate decision is still required to define where unified-calendar/resource checks and operational clearance apply; this acceptance item is open.
- Company roster snapshots remain historically stable when participant profiles later change; emergency and identity fields are hidden from roles without an operational need.
- Case conversations preserve the customer-visible/internal distinction and attribute each actor correctly.
- Safety and finance state transitions remain owned by their canonical services.
- Audit success and denial behavior is covered for sensitive mutations.
- Browser tests cover the portal, tenant isolation, role restrictions, empty/loading/error states, and stale responses after account or organization changes.

## Gate before booking, safety, billing, or schema implementation

Before applying this candidate or adding booking, safety, or billing persistence:

1. **Completed for the current deployment:** on 2026-10-05, the 78 latest production migration rows matched the 78 existing repository migration files/checksums; there were no current unresolved or latest rolled-back entries. The new local migration candidate is the one pending change.
2. **Still open:** this reconciliation does not prove a clean-database replay or close the documented recovery/P3011 concern. The recovery runbook records an empty-database `_prisma_migrations` failure and historical TEXT/UUID replay drift; keep issue #369 and production recovery acceptance open.
3. **Partially completed:** production has one personal `CustomerCase`, zero organization cases, and zero orphan organization references; `Booking`, `BookingParticipant`, `Payment`, and `Invoice` each currently have zero rows. Booking ownership and active-booking uniqueness are represented in the local migration candidate, and passed the isolated forward-migration rehearsal in API CI. Organization billing semantics still require Finance.
4. **Completed for the candidate:** API CI run 37810595700 rehearsed the forward migrations in four isolated PostgreSQL schemas, covering native key types, legacy rows, active uniqueness, cancelled history, request keys and foreign keys. This does not close complete migration-history replay or production recovery acceptance.
5. Back up production before any production migration.

Do not reset, squash, drop, or destructively rewrite the existing migration history.
