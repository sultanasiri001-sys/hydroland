# Historical migration replay diagnosis — 2026-10-08

## Observed failure

CI run 37819034237 executed the unchanged 78-migration directory on an empty PostgreSQL 18 database. Thirty-three migrations completed. Migration `20260916191500_hr_candidate_verification_fields` failed with SQLSTATE 42701: `hrReviewedById` already exists on `WorkforceHiringRequest`.

Migration `20260916071000_hr_candidate_verification_columns` already adds all five columns, the same foreign key and the same index. The later migration repeats that DDL. This is the first demonstrated historical replay blocker; failures later in the chain remain unknown because execution stops here. It does not establish that UUID/TEXT incompatibilities elsewhere are resolved.

The diagnostic correctly remains red. Migration files and checksums were unchanged. An additional migration at the end cannot repair a failure before that migration is reached.

## Separate restoration evidence

Run 37819034226 passed the current-schema synthetic logical backup rehearsal: 109 tables, two independent empty restore targets, schema and all-table data comparison, migration-history preservation, ORM relationship reads, binary preservation, foreign-key and uniqueness enforcement, migration rerun no-op, and a corruption negative control. This is not a real production backup or provider PITR test.

## Root remediation contract

1. Preserve the production-applied historical files and checksum manifest. Do not silently edit the duplicate migration, ignore SQL errors or mark failed migrations applied merely to obtain a green replay.
2. Separate fresh installation from restoration. A fresh installation needs a versioned canonical baseline with the raw SQL extensions and append-only audit protections, followed by future additive migrations. The existing temporary rehearsal baseline is evidence for this approach, not an approved production bootstrap artifact.
3. Before introducing that baseline, capture the actual production migration ledger and schema without exposing credentials or customer data. Compare native column types, foreign keys, indexes, defaults, extensions and raw SQL objects with the baseline. The existing 18-entry production checksum validator does not certify the entire 78-entry historical directory.
4. Define an explicit ledger transition for existing installations and empty installations. Existing installations retain their ledger and data; empty installations must not execute the broken historical chain. Test upgrade and fresh-install paths independently. Any baselining/resolve operation belongs to that reviewed transition, never to this unchanged-history diagnostic.
5. Restore a real production backup into an isolated target, validate schema, full data integrity, migration ledger and application authorization, and rehearse provider PITR separately. Keep issue #369 open until this evidence exists. Never restore over production as part of the rehearsal.

## Release acceptance

The diagnostic remains a truthful record of historical replay failure. A replacement installation path must have its own green gate: empty database, complete baseline including raw SQL objects, subsequent migrations, second deploy no-op, schema equivalence, representative application reads and enforced constraints. Production recovery additionally requires actual backup/PITR evidence and a reviewed cutover/rollback procedure. No production connection, historical SQL change, ledger rewrite, merge or deployment was performed by this diagnosis.
