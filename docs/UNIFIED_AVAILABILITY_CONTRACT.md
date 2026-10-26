# Unified availability: first integration contract

Status: local implementation and PostgreSQL verification; not published/deployed.
Base: `908f3899e2e95931cec7cdba72bacd67b575107c` (2026-10-26).

## Source of truth and identity

| Domain | Canonical identity | Reservation source |
| --- | --- | --- |
| Trip resources | `CalendarResource.id` | `CalendarEvent(referenceType=TRIP, referenceId=Trip.id)` + active `CalendarAllocation` |
| Human resources | `CalendarResource.referenceId = Account.id`, only for `INSTRUCTOR`, `CREW`, `CAPTAIN` | Resolve the account, not a display name, role, or resource ID |
| Training | Instructor account + enrollment student account | `TrainingSession` remains canonical; no shadow calendar records are created |
| Equipment rentals | `EquipmentRentalItem.resourceId = CalendarResource.id` | Rental/item lifecycle and `EquipmentBarcode.stockStatus`; not yet temporal calendar reservations |

Missing or unknown human account references fail closed on allocation. Non-human
reference IDs are not interpreted as accounts. Multiple human-role resource IDs
for one account all resolve to that account when checking training conflicts.
Training site/vessel fields are **not** assumed to be CalendarResource IDs.

## Availability and transaction contract

- Half-open interval `[startsAt, endsAt)`: conflict iff existing start < proposed
  end and existing end > proposed start. Adjacent reservations remain legal.
- Training's existing `SCHEDULED`, `CHECK_IN_OPEN`, `IN_PROGRESS` states block;
  `IN_PROGRESS` remains conservatively busy beyond its planned end and a legacy
  null end remains open-ended. Cancelled/completed training releases its slot.
- Active calendar allocations block training even if legacy resource/event
  metadata is inconsistent. Allocation release must be explicit.
- Existing `TRAINING/SCHEDULE_CONFLICT` semantics are unchanged: `DISABLED` and
  `REVIEW` are non-enforcing in both directions; no missing policy is invented.
- Training create/reschedule/START and session/bulk instructor transfers reuse
  `TrainingSessionService.assertAvailable`. Trip allocation and automatic crew
  replacement recheck the other domain **inside the same serializable transaction
  as the write**. Candidate lists/read-only availability are advisory, not holds.
- Both domains read the other's persisted reservation predicate before writing.
  PostgreSQL serializable isolation detects write-skew; the existing bounded
  `DatabaseService.serializable` retry rereads the winner and returns a conflict.
  An outside-transaction check or advisory lock without a fresh snapshot is not
  an equivalent reservation contract. No new schema, mutex table or lock order
  is needed for this slice.

## Time-zone contract

`Date` values represent UTC instants; Prisma `DateTime` is stored as UTC in the
existing PostgreSQL timestamp-without-time-zone columns. Training continues to
require ISO timestamps with `Z` or an explicit offset; UI display can remain
`Asia/Riyadh` without moving persisted instants.

Raw SQL binds dates as timestamptz, so calendar allocation/replacement transactions
set `SET LOCAL TIME ZONE 'UTC'` (not global/database configuration). Read-side
calendar/crew interval comparisons explicitly convert bound instants with
`::timestamptz AT TIME ZONE 'UTC'`. No schema conversion or historical backfill is
performed. Existing production rows should be inspected separately before any
repair: this patch cannot infer which historical timestamps were shifted.

## Evidence and reproducible checks

Unmodified main reproduced a double booking with actual stored overlap: trip,
allocation, and training all at `2036-01-01T06:00:00Z` under UTC. A separate Riyadh
baseline exposed allocation shifted to 09:00 while the trip remained 06:00.

`apps/api/scripts/calendar-training-availability-db-e2e.mjs` refuses execution
unless CI/test mode and a loopback database whose name ends `_availability_ci`.
It invokes compiled services with actual PostgreSQL, authorization, audit and
in-app notification persistence; no real booking/payment/provider operations.

Checks cover both directions, instructor/student roles, mapped/unmapped accounts,
non-human resources, adjacent boundaries, offset input, winter/summer defaults,
release/cancel/complete, null end and in-progress sessions, reschedule/reassignment,
bulk rollback, START, replacement rejection/success and policy bypass modes.
Three races per time-zone hold both actual transactions after their conflict
reads: exactly one write survives and the loser receives 409.

A dedicated CI workflow runs PostgreSQL 16 and Node 22 against UTC, Asia/Riyadh
and America/New_York defaults. Local runs use embedded PostgreSQL 16 and Node 24;
remote CI has not run because publication is blocked. API typecheck/build,
training/completion, phase12, trip intelligence, marine, booking safety and
operational-control validations passed. The API lint command is blocked by the
baseline package's missing `eslint` executable/dependency, not reported as passed.

## Next bounded slices (not silently activated)

1. Couple allocation mutation and its audit in one transaction (existing audit is
   post-commit); use injected audit failure and serialization retry regressions.
2. Resolve rental hold policy before integration: does RESERVED hold inventory,
   when does a hold expire, what interval/turnaround applies, how do extensions,
   overdue items and partial returns release assets? Current create checks stock
   before its transaction; payment/check-out takes row locks but does not reserve
   a calendar interval. Do not invent a paid/unpaid hold policy in this patch.
3. Agree mappings for training site/vessel IDs and shared training-on-trip events,
   then route writes through the same contract. No field should be repurposed by
   assumption. Coordinate any uniqueness/index/schema work with the schema owner.
4. Human alias conflicts between two different trip resource IDs, stale historical
   allocations, and cross-domain read models remain separate closure work; this
   is a tested trip/training integration, not a claim of universal availability.
