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

## Existing provider PITR evidence — reuse before requesting another restore

The merged [PR460 execution record](https://github.com/sultanasiri001-sys/hydroland/pull/460)
documents an actual provider PITR on 15 October, Asia/Riyadh. Its target is the
same existing recovery resource inspected in this task. The selected point was
00:09:43, request creation was 00:19:22.806, provider completion was
00:19:58.873, final startup was 00:20:53.695 and database verification completed
at 00:22:22.279. The current resource metadata independently matches its ID and
creation timestamp. The original row/schema verifier was not rerun.

That report covers 118 tables/648 rows, 104 migration records and 195 foreign
keys. It explicitly accounts for the two live scheduler timestamp differences
rather than excluding a table. It reports owner acceptance for the technical
Web/API release, while leaving runtime, external objects and numerical RPO/RTO
outside that acceptance. The cited report is the historical approval source;
this package does not authenticate a new owner decision or reuse the old
resource authorization for a new paid instance.

Request-to-database-verification duration computes to **179.473 seconds**.
Selected-point age at request computes to **579.806 seconds**. Neither value is
an end-to-end service RTO or measured business-data RPO: incident declaration,
latest recovered business commit, application and external-object completion
were not established by that drill. The absolute times and derived component
durations are retained separately in the machine inventory.

The 24 October native-archive job's `providerPitrVerified=false` describes that
logical-restore job; it does not erase this earlier provider execution. Reuse
both bounded evidence records. Today's actual PITR window and complete current
130-table/application/object acceptance remain unverified. A new paid provider
recovery is proposed only if the reviewed fresh-drill requirements demand it.

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
4. Requires encryption on the recovered version. For Backblaze B2, the ACL
   response proves only the containing bucket's private, owner-only grant shape.
   It cannot establish object/version-specific ACL ownership.
5. Requires the returned canonical owner to exactly match an independently supplied
   `HYDROLAND_A03_EXPECTED_OBJECT_OWNER_ID`, in addition to the owner-only grants.
   This operator-only input must come from the reviewed provider-account record,
   never from the ACL response being verified. Missing or malformed input is
   refused before client loading/provider requests. No owner value is persisted
   in receipts, and `ownerApprovalVerified` remains false: an input is not an
   authenticated approval. This change does not set a production environment
   variable or deployment configuration.
6. Probes the **same authenticated, hash-verified version** anonymously. A random
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
exercise open. The expected-owner comparison does not prove a source-to-target mapping.
Application cross-account denial and owner/ACL transfer remain
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
| Historical provider PITR | PR460 execution retained and resource metadata corroborated; limited technical-release acceptance reported |
| Current source-specific PITR window / fresh-drill requirement | Unverified; read current window and review the historical evidence first; a new target requires a separate scoped decision |
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


## 29 October follow-on: expected-owner binding

Frozen Draft PR542 head `9f5b370` accepted an ACL whose `Owner.ID` and sole
FULL_CONTROL grantee both named an unexpected owner. Its private-grant shape
was correct but the independently intended principal was never compared. The
new regression reproduces that baseline PASS and obtains VERSION_ACL FAIL from
the candidate with the same synthetic bytes, version and denial response.

The verifier now requires the expected owner independently, compares it exactly
(no trimming/case folding), and reports only `expectedOwnerMatched=true` on
success. `ownerApprovalVerified`, `ownerAclTransferVerified`,
`applicationAuthorizationVerified` and `productionAccepted` stay false. No
expected real owner has been guessed, read from the candidate ACL or added to
repository configuration. Existing fixtures pass an explicit synthetic owner
so earlier encryption/version/byte/deadline failures still reach their intended
gates. This is a source-owner binding guard, not target owner/ACL-transfer proof.

Local verification: 32 non-network contracts passed, including five new owner
guards. Seven actual SDK transport tests (one new wrong-owner XML case) were
blocked at local loopback listen with EPERM, before assertions; no alternate
route or permission change was attempted. The existing dedicated CI remains
the route to verify all 39 candidate tests. These are this suite's new counts,
not recovered historical test receipts.

Fresh connected Render resource metadata on 29 October still reports the
existing source available, primary, PostgreSQL18, with no PITR-window fields.
No private database rows or object keys were requested in this follow-on. The
connector inventory contains metadata/read-only SQL but no provider PITR-window
operation, object/version/ACL reader or authenticated service-shell execution
operation. Therefore actual object execution and current PITR applicability
remain unverified; no new token, grant, browser authentication route, network
setting or local copy of private data was attempted.

The prepared operator is not deployed. A separately approved existing-runtime
execution route, the independently confirmed expected canonical owner, and
current provider-window evidence are still needed. The bounded object action
would read/hash at most four referenced objects within the existing API runtime
(up to 32 MiB aggregate), inspect versions/encryption/ACL and anonymously test
the same version; it must export only the sanitized receipt, not document
contents or identifiers. No new paid target or destructive restore is justified
by this code change. Approved numerical RPO/RTO targets remain unknown/null.


## Provider ACL semantics correction (code-only follow-on to frozen PR546)

Backblaze documents that [Get Object ACL returns the containing bucket ACL](https://www.backblaze.com/docs/cloud-storage-s3-compatible-api#access-control-lists).
The former per-version `ownerOnlyAcl` and `expectedOwnerMatched` fields could
therefore misrepresent bucket evidence as version-specific authorization.
The candidate records `bucketAclEvidence` with `scope=bucket` and
`source=GetObjectAcl`; it no longer puts owner assertions on individual versions.
Both report and object entries explicitly keep `objectVersionAclVerified=false`.
Actual version identity, streamed SHA-256/byte count, version encryption and
anonymous denial continue to require their own checks. A successful bounded
readback still does not prove application authorization, owner/ACL transfer,
independent owner approval, PITR or production acceptance.

The runtime now requires the operator-only declaration
`HYDROLAND_A03_STORAGE_PROVIDER=backblaze-b2`, plus the unchanged independently
established expected canonical owner. Configuration must match the exact regional
Backblaze HTTPS host `s3.<region>.backblazeb2.com`, without custom port or path.
This host validation selects supported semantics; it does NOT authenticate the
intended account or link a dashboard bucket to the application's configuration.
Unknown providers, missing/unknown ACL scope and endpoint/provider mismatches
fail closed before provider I/O. Other providers need separately reviewed
adapters; a caller cannot select generic S3 semantics as a fallback.

The three new regression contracts fail against the frozen PR546 source and pass
against this candidate. All 35 non-network contracts pass locally. Seven locked
SDK loopback transport cases are locally blocked by `listen EPERM` before their
assertions; the existing credential-free repository CI is the verification route.
No dependency, workflow, provider resource, production configuration or historical
receipt changes are part of this correction.

These changed modules are NOT covered by any approval pinned to the previous
operator hashes. No runtime staging or provider execution is authorized by this
code proposal. Independent canonical-owner provenance, intended production
bucket linkage and provider-aware execution review remain required.
