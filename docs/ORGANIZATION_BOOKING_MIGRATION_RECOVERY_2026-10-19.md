# Organization booking migration recovery — 2026-10-19

## Observed deployment failure

PR #470 merged at `54f9da211480e68268181eec83f35bc18f32e1b5` after all 14 checks passed. Web deployment `dep-dbb8pr67bikc73digsgg` became live at `2026-10-19T21:35:24.098872Z`. API deployment `dep-dbb8pr67bikc73digrs0` failed at `2026-10-19T21:35:50.228238Z`; the previous API release `8ea3db7f5ec2845c2788cb778fe42046963e1919` remained live.

The first organization migration applied. The second, `20261005130000_organization_booking_safety`, failed on its first statement, `DROP INDEX "Booking_tripId_accountId_key"`, with PostgreSQL `2BP01` and Prisma `P3018`. Production owns that index through a validated `UNIQUE ("tripId", "accountId")` constraint. The existing migration rehearsal covered standalone indexes and TEXT/UUID referenced keys, but omitted the constraint-backed index form. A subsequent platform startup attempt reported `P3009` for the unresolved migration.

## Backup and read-only evidence

A fresh logical export of the production database completed before the release: `2026-10-19T21:23Z.dir.tar.gz`, visible as successful on the Render Recovery page. No backup credentials, download tokens, or customer records are included here.

At `2026-10-19T21:37:51.891978Z`, read-only verification found:

- 85 successful source-matching migrations, one unresolved migration, 111 ledger records, and 25 historical rolled-back records.
- The failed migration has zero applied steps, no finish timestamp, and no rollback timestamp. All four new booking/safety columns and all six new indexes are absent.
- The old booking unique constraint and index remain intact and valid.
- The first migration's customer-case organization foreign key is present and validated, with zero orphan references.
- The five protected table counts and complete row fingerprints remain equal to the pre-deployment snapshot: Booking 1, BookingParticipant 1, Payment 1, Invoice 0, CustomerCase 1.

The two migration files remain byte-for-byte unchanged:

| Migration | SHA-256 |
| --- | --- |
| `20261005090000_customer_case_organization_relation` | `2028fec2d985196211610d9f25a6df79f025d417c35541a230d4accebc6df3b6` |
| `20261005130000_organization_booking_safety` | `fe561ded137754d9cdc24f9320fa5f20ab18ff57cfca9992074eb0c16f638804` |

Further catalog inspection confirmed a local, nondeferrable, validated unique constraint over two UUID NOT NULL columns. Its backing index is a valid, ready, live, immediate btree with default UUID operator classes and sort options, NULLS DISTINCT, no included columns, predicate, expression, or custom options. It is not a cluster or replica identity index. Booking is an ordinary permanent table without partitions or inheritance. No foreign key uses this unique index; both existing incoming booking references use the primary key.

The exact helper catalog queries were also executed through the read-only connector. All five inspection SELECTs and all 15 guard groups passed against production, including the actual unquoted constraint-name error signature. The inspected helper SHA-256 is `2df756d68b78b07a543a1f07037551be6fd51d5a484d6180ee8f0c3ac251c50b`. This was a predicate assessment, not execution of the recovery helper. A direct HTTP readiness check at `2026-10-19T21:52:55.365Z` confirmed the previous API commit still returned `status: ready` and `database: ok`.

## Recovery design

The forward startup helper runs before the existing `prisma migrate deploy`. It does not edit historical SQL or write directly to the Prisma migration ledger.

For the exact failed migration, it verifies the immutable source checksum, failed-record checksum and error signature, zero applied steps, absent target schema objects, and the expected old uniqueness definition. Unexpected state stops deployment.

Inside a bounded transaction and table lock, the helper creates an equivalent unique index before dropping only the old unique constraint with `RESTRICT`, then renames the replacement to the expected original index name. All existing rows and the uniqueness invariant are preserved. After the transaction commits, the supported Prisma CLI marks only this proven failed attempt rolled back. The unchanged migration then runs through the normal deploy command. An interrupted normalization can resume from the verified equivalent standalone-index state.

## Validation and release acceptance

The expanded migration regression covers the previously missing constraint-backed form alongside standalone indexes and TEXT/UUID key variants, and exercises failure recovery and refusal conditions. The regular API suite runs on PostgreSQL 16; a focused workflow runs the recovery checks on PostgreSQL 18, matching production's major version.

This document records the incident, verified preconditions, and intended repair. CI results and the final deployment/postmigration evidence must be recorded in the recovery PR before the release is reported complete. Acceptance requires both services live on the intended commit, API readiness with database connectivity, 86 source-matching successful migrations with no unresolved attempt, all expected new columns/indexes/foreign keys, and unchanged protected records. If exactly one failed attempt is marked rolled back and retried once, the ledger will contain 112 total records and 26 rolled-back records.

This recovery does not constitute human acceptance of the entire organization portal, organization billing/calendar policy, or the separate center UAT and full migration-replay work.
