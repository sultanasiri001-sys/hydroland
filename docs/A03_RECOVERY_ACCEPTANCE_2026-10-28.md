# A03 — remaining recovery acceptance

Status: **PARTIAL**. The user explicitly redirected work to A03 on 28 October
2026. This isolated branch starts from main `a3d5ad1`; it does not modify A02
PR540/PR541 or adopt their unpublished changes.

## Evidence retained and fresh read-only findings

The [24 October native archive receipt](evidence/native-production-archive-restore-2026-10-24.json)
and [operator account](NATIVE_PRODUCTION_ARCHIVE_RESTORE_2026-10-24.md) remain
unchanged. Both historical targets had 126 identical COPY streams and 90
successful migrations. Their 118.704-second operator duration is not a measured
end-to-end RTO. No logical restore was repeated in this task.

The user selected the existing Render workspace for read-only inspection.
Connected resource metadata and explicitly read-only SQL on 28 October at
17:19–17:23 UTC establish the [new inventory](evidence/a03-readonly-inventory-2026-10-28.json):

| Boundary | Observed | Remaining acceptance |
| --- | --- | --- |
| Production database | Available PostgreSQL 18.6; 130 public tables, 1,376 columns, 118 history records, 92 successful, zero unfinished/non-rolled-back entries | Current recovery point, current-schema recovered target and application acceptance |
| Existing recovery resource | Available; original database has 118 tables; both previously verified logical target names still exist | Existence is not a rerun or revalidation of those targets |
| Account documents | Two external references under `credentials/`, both with valid SHA-256; total 6,069,866 bytes | Recover the referenced provider versions and verify bytes and access |
| Marine documents | One record, no attached external storage reference | Do not describe an unattached metadata row as a lost external file |
| Briefing/offline media | Zero stored media references at inspection | Empty inventory does not prove future R2 recovery capability |
| Organization document assets | Bytes are stored inside PostgreSQL | Keep database-byte recovery separate from external bucket recovery |

The 130-table current inventory and the 126-table historical archive are dated,
different scopes. Neither a historical archive nor the synthetic 122-table CI
fixture certifies a fresh restoration of today's complete production database.
No document contents, object keys, file names, customer identities, credentials,
connection strings or signed URLs are included in this package.

## PITR execution packet

Current [Render recovery documentation](https://render.com/docs/postgresql-backups)
states that PITR creates a **new instance**, that its window depends on workspace
plan, that a point within ten minutes of now cannot be selected, and that the
source IP allow list is copied. These platform facts are not evidence of this
instance's actual available window. The connected API has no PITR-window or
restore operation; the dashboard sign-in did not complete. No alternative auth
path or restore request was attempted.

Before executing a new provider recovery, retain the actual source resource,
window, exact UTC point, approved target plan/cost/lifetime and target access
settings. Keep the source unchanged. Start an independent clock when the drill
incident is declared, record request acceptance and database availability, then
validate schema/history, representative application reads, external objects and
permissions. No traffic cutover or deletion is part of this packet. The prior
archive targets remain evidence; they are not overwritten or restored again.

## Read-only external-object probe

`apps/api/scripts/a03-object-readback.mjs` is a **prepared operator**, not a
record of provider execution. It runs only with `--confirmed-read-only` inside
the existing API service ID. It requires the already configured credential-
storage endpoint, bucket, explicit region and keys; it never displays them.
It does not change integration flags, private/encryption/versioning assertions,
bucket settings, database rows or objects. It queries document references inside
a read-only database transaction and verifies the expected database identity.

Using the existing locked Prisma/S3 clients, the operator:

1. Requires provider-reported enabled versioning and bucket encryption.
2. Reads only bounded exact-key version listings, refusing truncated coverage,
   null/duplicate version IDs, unrelated prefix matches and excessive history.
3. Streams version bytes into SHA-256 and compares the actual byte count and
   hash with the database reference. It does not retain payloads.
4. Requires encryption on the recovered version and an explicit owner-only ACL.
5. Probes the **same authenticated, hash-verified version** anonymously. A random
   404 cannot stand in for denied access to an existing object.

At most four references, four versions per reference, 8 MiB per object,
32 MiB aggregate, 30 provider requests, eight seconds per request and 120 seconds
for the probe are permitted. The CLI has a 150-second process watchdog and
retains a private write-ahead FAIL receipt before client work. Use an additional
external watchdog when executing from the approved service shell:

```sh
timeout --signal=TERM --kill-after=5s 150s node apps/api/scripts/a03-object-readback.mjs --confirmed-read-only
```

Execute only the reviewed exact operator bytes in an approved runtime containing
the existing locked dependencies. This code is not currently deployed, and this
document is not an instruction to deploy it or change production configuration.
The receipt records operator SHA-256 and deployed application commit when known.
It excludes keys, bucket/owner/version identifiers, object hashes and raw errors.
The read-only probe accepts no arbitrary command or connection URL from stdin.

PASS is limited to the referenced version-readback scope. If only current
versions match, it returns PARTIAL and explicitly leaves the historical-version
exercise open. Application cross-account denial and owner/ACL transfer remain
false, even when provider readback passes. Unsupported provider capabilities
are failures requiring review, not permission to turn confirmation flags on.

Cloudflare's [current S3 compatibility table](https://developers.cloudflare.com/r2/api/s3/api/)
still lists bucket versioning and bucket ACL APIs as unimplemented.
The separate R2 offline-delivery adapter is therefore not evidence of the
credential bucket's version/ACL recovery. Provider choice remains unchanged;
the old Backblaze proposal is not treated as an active account.

## RPO/RTO measurement and decision

`measureRecoveryTimes` in `a03-recovery-evidence.mjs` consumes documented UTC
events: incident declaration, recovery request, database availability, object
validation, access validation, application validation, readiness for cutover,
and the latest verified recovered commit time. These must come from actual
execution evidence. Use canonical UTC timestamps, not an estimated duration.

- Observed RTO = readiness-for-cutover time minus incident declaration.
- Observed RPO = incident time minus latest verified recovered commit time.
- Object/access/application checks must finish before readiness for cutover.
- Missing measurements and unknown targets remain `null`, never zero.
- Target comparisons require separately recorded RPO/RTO values and an approval
  reference. A supplied reference is input evidence, not verified authority;
  every result keeps `productionAccepted=false`.

| Criterion | Disposition after this package |
| --- | --- |
| Proven native logical restore | Retained; not rerun |
| Source-specific PITR window and actual provider recovery | Unverified; dashboard access and a scoped new-target decision remain necessary |
| External version/byte recovery and anonymous denial | Operator prepared; real-provider execution not performed |
| Application cross-account denial / target owner and ACL transfer | Separate live acceptance required |
| End-to-end measured RPO/RTO and agreed targets | Measurement tool prepared; actual values and owner decision pending |
| Full A03 closure | OPEN |

The new dedicated CI workflow runs contract/stream tests and the actual locked
S3 SDK against a loopback HTTP fixture, with read-only repository permissions and
no provider credentials. Actual transport checks cover signatures, XML/header
decoding, version/byte identity, public denial, timeout and redirect refusal.
Only the test fixture uses HTTP; the production CLI still requires HTTPS.
CI success proves these guards and calculations, not PITR, live storage recovery or RTO.
No paid instance, private archive export, object write, production migration,
service deploy or cutover is created by this package. Issue #369 remains open.
