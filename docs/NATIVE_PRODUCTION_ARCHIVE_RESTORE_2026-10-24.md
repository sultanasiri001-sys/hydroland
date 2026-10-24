# Real production archive restored on native PostgreSQL

The 24 October Render production export was restored into two new logical
databases on the existing, separately hosted recovery instance. This closes the
native logical-archive verification gap that remained after the earlier WASM
test. It does not certify provider PITR, approve a traffic cutover, adopt a
fresh-install baseline or establish the owner's RPO/RTO policy.

## Scope and protection

- Source: the existing 15:26 UTC archive, 1,980,853 bytes, SHA-256
  `4514bac1e5dc6779b81edfb07ab68a49eb5d2b27b8fc07b015154db7afb1c787`.
- Target: existing recovery resource `dpg-db7v3mks728c739pb05g-a`, native
  PostgreSQL 18.6. Original database `hydroland_32rz` is preserved.
- New logical targets: `hydroland_restore_20261024_4514_a` and
  `hydroland_restore_20261024_4514_b`. Each was empty before restoration;
  an already existing target makes the operator refuse rather than overwrite.
- Execution used the existing Render Web Shell, existing native 18.6 clients,
  private-network hostname and TLS. No new paid resource, credentials, grants,
  ingress change, production connection-string change or application worker.
- Private configuration was read once through hidden stdin; child processes
  receive only their recovery connection and necessary local runtime settings.
  Backup bytes, private COPY output, connection secrets and row data are not
  committed or uploaded as CI artifacts. The private download/extraction work
  directory was removed after success.

The operator is intentionally scoped to this reviewed archive and existing
recovery resource. Future incidents need a newly reviewed scope and archive
hash; changing a URL is not an authorization to restore elsewhere.

## Observed results

Both native targets passed the same checks:

| Evidence | Result per target |
| --- | --- |
| Complete COPY byte streams round-tripped to archive SHA-256 digests | 126/126 |
| Tables / columns | 126 / 1,318 |
| Constraints / indexes | 1,339 / 400 |
| Enum members / triggers / functions / extensions | 306 / 6 / 39 / 2 |
| Original migration-history records / successful applied migrations | 116 / 90 |
| Applied names and checksums versus deployed migration files | Exact match |
| `prisma migrate deploy` rerun | No pending migrations; full snapshot unchanged |
| Application reads | Account/person/roles, booking/payment/invoice and employment relationships |
| Existing application readiness component against recovered data | Ready, database OK |
| Unique and foreign-key rejection | SQLSTATE 23505 / 23503 |

The complete catalog/data/history snapshot digest is identical on both targets:
`2f752dfb76fff389b84c82d0ce1a956300fe4578c5b876b38f79dd423823e56b`.
An inserted synthetic corruption marker changed the first target's checksum
inside a transaction. Rollback restored its exact snapshot, and the second
target still matched. The pre-existing recovery database's full snapshot also
remained unchanged. The job took 118.704 seconds; this is job duration, **not**
an approved end-to-end recovery-time objective.

The source application was `9a353ae274fc66843e1d0d61505c545904fe73b9`.
The executed operator's SHA-256 is
`613fa1360a3b76c0d7d2d4769c85f48e4fd26c199f294ecd1cd897694a3d8c33`.
The committed operator bytes must retain that digest; CI verifies their binding
to the sanitized evidence. These production checks are not re-executed in CI.

## Empty-database startup and historical replay

The ordinary production repair entry point now checks for a present, populated
Prisma ledger before inspecting repair candidates. Missing or empty history
raises `MIGRATION_HISTORY_REQUIRED` with an explicit restore/baseline instruction.
It creates no history, runs no repair and does not mark migrations applied.
Existing failed-history rows remain available to the original narrow repair
logic. Native CI tests cover absent, empty and existing history, preserving
synthetic application rows and all original fixture-history values.

The old historical replay failure remains recorded: the unchanged empty replay
stopped at duplicated HR verification columns (SQLSTATE 42701). Its failed run
is not made successful, and no historical migration SQL or checksum is edited.
The current-schema synthetic recovery gate remains intact. The earlier
unmerged replay-only proposal is retained in PR history; the final change
implements the actual archive recovery path and explicit startup refusal.

## Remaining recovery acceptance

Provider PITR has not been exercised. The archive restore used `--no-owner` and
`--no-privileges`; cluster credential/ACL transfer is not certified. The existing
recovery instance's access rules remain unchanged. Referenced external storage
objects need their own version/byte recovery evidence. Full production recovery
acceptance, agreed RPO/RTO and any cutover still require their separate review.
The fresh-install/type/ledger-transition candidate in #446 is not adopted by
this test. No overall platform or human acceptance is inferred.

Machine evidence: [native restore evidence](evidence/native-production-archive-restore-2026-10-24.json).
