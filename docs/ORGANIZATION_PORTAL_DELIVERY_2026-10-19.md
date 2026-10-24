# Organization portal release candidate — 19 October 2026

Integrates #442 on published main `09432b5757ce3a5517b4410397289d961c35ca36`.
The candidate includes scoped organization profiles/members, customer requests,
pending booking requests and rosters, cancellation and customer safety reports.
It preserves current marine uploads/trips, center finance and the 29 operational
controls. Organization billing policy is not activated or inferred as approved.

## Corrections during integration

- Personal customer-case list/reply routes exclude organization-owned cases.
  Revoking organization membership cannot be bypassed through the original
  submitting contact's personal routes.
- Organization case writes check an active account and reject malformed fields.
- Organization booking creation preserves an explicit DEFERRED safety decision
  even when the optional safety-approval requirement is off, matching the
  existing individual booking behavior. Enabled/disabled controls still govern
  pending requests without an explicit deferral.
- HTTP/PostgreSQL regressions exercise those boundaries, booking replay and
  changed-payload denial, and unchanged personal-case access. Test actors and
  policy overrides are confined to a guarded ephemeral CI database.
- Organization navigation now opens the scoped directory for requests, rosters
  and safety reports. Read-only members can view bookings without edit/create/
  cancellation controls. Request forms show the per-seat and selected-seat
  prices before submission and distinguish an unconfigured price from a free
  trip. Prices are informational; no invoice, charge or confirmation is created.

## Read-only production preflight

At 18:29 UTC, all 84 latest production migration checksums matched this source.
There were no unresolved migrations. Only these two migrations are pending:

- `20261005090000_customer_case_organization_relation`
- `20261005130000_organization_booking_safety`

Organization and Booking keys are native UUID. The current personal composite
unique booking index exists; there are no orphan customer-case organization
references. The forward migration discovers native key types and replaces that
index with separate active personal/organization uniqueness while preserving
cancelled history. No historical SQL or ledger entry is rewritten.

Protected preflight row counts and fingerprints (no row content):

| Table | Rows | Fingerprint |
| --- | ---: | --- |
| Booking | 1 | 39110a042435aef37f86f8914c023124 |
| BookingParticipant | 1 | abe5bc67cef3e708691495aeb904f60d |
| Payment | 1 | ac48b59096d76b72cc21f3a7c4963457 |
| Invoice | 0 | d41d8cd98f00b204e9800998ecf8427e |
| CustomerCase | 1 | 8b5691ddb758e614c67a0660953ac38b |

Booking fingerprints exclude the three candidate nullable ownership/request
columns so the same comparison can be repeated after migration. Refresh these
checks if production records change before deployment.

## Release gates and acceptance boundary

Local API build and Web validation/build passed. Exact-head CI must pass before
merge. The organization contract requires a current durable production backup
before applying the two candidate migrations. That gate was initially held by
Dashboard sign-in and was completed by the refreshed preflight recorded below.
No production migration or release is claimed by this preflight record.

After deployment, verify migration checksums/indexes/FKs, preserved records,
runtime readiness and tenant-scoped UI. Operator acceptance, organization billing
decisions, canonical calendar confirmation-gate acceptance and the remaining
full production recovery exercise are separate. Calendar reservation details
are visibility/staleness protection and do not grant departure clearance.

## Release preflight refresh — 20 October 2026 (Saudi Arabia)

The production backup gate was completed before deployment. In the authenticated
Render Recovery page for `hydroland-db` (`dpg-dakd8g5g1s2s73bu70bg-a`), a fresh
logical export dated `2026-10-19T21:23Z` completed successfully and exposed its
`.dir.tar.gz` download. The provider retains exports for at least seven days;
the prior `19:26Z` export also remains available. The page shows the three-day
PITR window. No credentials or signed download URLs are included in this record.
This establishes the current provider-held pre-migration backup, while full
application/object-storage recovery acceptance remains tracked by #369.

At `2026-10-19T21:24:43.542228Z`, a fresh read-only production transaction
confirmed all 84 latest successful migration checksums against this candidate,
zero unresolved or mismatched migrations, and exactly the two pending
organization migrations named above. The ledger has 109 historical records,
including 25 rolled-back records; these are retained as history and are not
unresolved failures. Native UUID keys, the original personal booking unique
index and 11 existing foreign keys are valid, with no orphan organization
references. All five protected row counts and fingerprints above match exactly.

The candidate is synchronized with main `8ea3db7f5ec2845c2788cb778fe42046963e1919`,
preserving #471's protection of all 84 applied migration files. The merge was
clean and local checksum validation passed. Full CI for the synchronized head
must pass before merge; deployment and post-migration verification are recorded
separately. This refresh does not activate organization billing or confirm any
booking, payment, safety or operational decision.
