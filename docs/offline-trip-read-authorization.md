# Offline trip read authorization

## Established policy

Applies to GET `/api/v1/trip-intelligence/:tripId/offline-package`, `/content`
and `/payloads/:mediaKey`. These are private operational resources, not the public
trip listing. Packages may reference arbitrary operational/sensitive media,
dive/emergency plans and controlled translations. A personal booking does not
establish entitlement to all such material or third-party information.

The repository specifies no customer/participant offline reader policy. Preserve
only its established private operational trip scopes:

| Reader | Current authority | Canonical source |
| --- | --- | --- |
| Administrator | ACTIVE `ADMIN` role | `BookingManagementService.scope` admin mode |
| Dive center | ACTIVE `DIVE_CENTER` role; ACTIVE OWNER/ADMIN membership in an ACTIVE DIVE_CENTER; trip belongs to the oldest such managed center | `CenterTripManagementService.scope`, `BookingManagementService.scope` center mode |
| Marine operator | ACTIVE `BOAT_OWNER` role; ACTIVE OWNER/ADMIN/OPERATOR/STAFF membership in the trip's ACTIVE MARINE_OPERATOR | `MarineTripManagementService.organizations`, `BookingManagementService.scope` marine mode |

All require an active, email-verified account and a live persisted session. No
roles, grants, memberships, persistent settings or schema are created or changed.
The new authorization service mirrors these exact predicates without modifying
unrelated trip/booking implementations. Future canonical policy changes must
update the offline predicates and regression tests together.

## Unsupported reader contract: fail closed

Personal booking ownership (pending or confirmed), linked/named participation,
organization-booking membership, accepted crew/instructor assignment, generic
STAFF/INSTRUCTOR/REVIEWER/author status, center OPERATOR/STAFF/VIEWER and marine
VIEWER membership do **not**, by themselves, grant full private offline access.
They receive generic HTTP 403 pending an explicit product contract covering:

- eligible booking/trip states and identity-linked participants;
- organization booking delegation and crew/professional-role requirements;
- content classifications, third-party information redaction and retention;
- cancellation, role/membership revocation and offline expiry.

Do not enable these scopes merely because the client supplies a trip ID or owns
a cached package.

## Enforcement and client contract

- Identity comes only from `AccessTokenGuard`, never query/body scope.
- One bound PostgreSQL statement checks live session/account, current roles,
  memberships/organization status and requested trip together. This avoids
  mixed authorization snapshots; no briefing/manifest/media are read by it.
  Session expiry uses bound epoch comparison for both canonical UTC
  `timestamp(3)` and historical identity-migration `timestamptz` columns,
  without implicit conversion through the database session timezone.
- Run the check before private reads, before storage delivery and after awaited
  reads/signing, including failures. Revocation observed by the final gate
  suppresses both data and resource-specific errors.
- Missing/out-of-scope trips share generic 403. Invalid/revoked sessions return
  401. Legitimate 200 shapes remain unchanged with `Cache-Control: private, no-store`.
- Sessionless test identities cannot read private packages. A definitive trip
  403 should clear that trip cache, not log out the whole mobile session.

This is request-time authorization, not revocation of already-downloaded bytes
or delivery URLs returned before revocation. The final database snapshot is the
read's authorization point; no claim is made about revocation after HTTP bytes
are sent. Existing storage-signing TTL/provider behavior and creation/publishing/
generation/write-route policy are unchanged and outside this fix.

## Synthetic verification

`apps/api/scripts/offline-trip-access-db-checks.cjs` exercises real Nest HTTP,
AccessTokenGuard, AuthService, data services and PostgreSQL. Storage delivery is
stubbed: no URLs, providers, real objects, customer data or notifications.

Use an **empty dedicated disposable loopback database**, name prefixed
`offline_access_test_`, and explicit
`OFFLINE_ACCESS_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY`. The fixture rejects
other targets and never truncates/drops an existing database.

1. Start disposable PostgreSQL bound only to loopback with a non-UTC timezone
   (tested: `Asia/Riyadh`); set its `DATABASE_URL`.
2. Apply the existing schema there with `prisma db push --skip-generate`.
3. Run the script with the confirmation variable above.
4. Tear down the dedicated instance/database.

`--prove-unfixed` runs the same synthetic reproduction against pre-fix source and
expects unauthorized 200s; it must fail against repaired code. It is not the
normal regression command.

Repeat the same fixture with `--legacy-session-timestamptz` against a new empty
dedicated database. This test-only option converts that fixture's Session expiry
column to the type in `20260913150000_initial_identity`; it does not change the
repository schema/migrations. Both runs check the physical future expiry epoch
and expired-session denial through the service and real HTTP routes.
