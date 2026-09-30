# HYDROLAND Production Recovery Runbook

Status: production recovery acceptance is OPEN. A synthetic CI rehearsal is not a production backup restore or evidence that provider PITR is active.

## Objectives and independent recovery modes

PostgreSQL is the system of record. Keep these operations separate:

1. Application rollback: redeploy a known-good application commit; do not roll back database state to repair an application-only defect.
2. Failed migration recovery: the controlled Production Prisma Recovery workflow is only for specific reviewed, failed migrations.
3. Logical backup restore: restore a pg_dump custom-format backup to a different clean database; verify its schema, data, constraints and complete migration history before any cutover.
4. Point-in-time recovery (PITR): verify provider capability and activation, select an appropriate recovery point, and restore to a separate target. Do not overwrite the only production copy.

## Production restore sequence

1. Declare the incident, preserve the affected database and stop nonessential writes when integrity is uncertain.
2. Record the incident time, corruption window, active application commit, database version and actual migration state.
3. Restore an authorized existing backup/PITR point to a separate recovery database.
4. Verify connectivity, schema/operational extensions, the actual `_prisma_migrations` records, data checksums and record counts, foreign keys, indexes and representative bookings, payments, credentials/document metadata, audit events and roles.
5. Confirm separately that referenced private object-storage bytes and versions can be recovered. Database metadata is not a backup of externally stored files.
6. Run application readiness and authorized acceptance checks against the isolated recovery target.
7. Obtain the designated production owner's approval before changing the production connection string or switching traffic.
8. Verify the recovery target after cutover, monitor errors/connections, and reopen writes only after approval.
9. Preserve evidence of achieved RPO/RTO and document any remaining limitations.

## Synthetic automated rehearsal

The old CI drill failed before taking a backup: it invoked production-repair helpers against an empty database lacking `_prisma_migrations`. The repository's historical migration chain also contains documented TEXT/UUID drift and cannot be treated as a validated fresh-install path merely by skipping that initial error. See issue #369 and API validation.

`.github/workflows/phase11-recovery-drill.yml` now invokes `apps/api/scripts/recovery-rehearsal.mjs` on an explicitly labelled, loopback-only disposable PostgreSQL 18 container. The script refuses production mode, unconfirmed operation, remote hosts, any database outside its fixed test names, an unlabelled container or non-loopback binding. It requires an empty source database before schema creation.

The rehearsal creates a TEMPORARY migration directory outside the production migration tree. It generates the current canonical schema's baseline with the locked Prisma 6 CLI, and copies the exact raw equipment, weather and messaging migration lists already used by API validation. It actually EXECUTES those migrations with `migrate deploy` and verifies their recorded checksums/completion. It never calls `migrate resolve`, invents previously-applied history, edits historical files or presents CI history as production history.

It creates synthetic account, role, revoked-session, profile, credential, document-metadata, binary-asset, booking, payment, invoice, audit, safety and conversation fixtures. It takes a genuine custom-format `pg_dump`, restores it into TWO independent empty databases with `pg_restore --exit-on-error --single-transaction`, then compares all tables' row counts/content digests, schema columns, enums, constraints, indexes, sequences, triggers/functions, views and policies. The entire actual rehearsal migration history must match, and re-running those migrations must be a no-op. Actual Prisma reads verify the restored relationships and binary bytes. Foreign-key and unique-constraint rejection must still work.

A negative control deliberately alters only the FIRST disposable restored target and must detect the changed data. The second restore must still match the source, which must remain unchanged throughout. This is a stronger rehearsal than checking a single sentinel or merely bootstrapping an empty schema.

The artifact retains sanitized JSON results and the fixture-migration source/checksum manifest for 30 days. It does not upload database backups, production records, provider secrets or authentication credentials. Successful output explicitly retains `productionRecoveryVerified=false` and `historicalProductionReplayVerified=false`.

## Release blockers not waived by CI

Production recovery/launch remains blocked if managed PITR or a separately approved recovery method is unavailable/unverified; production ingress is unrestricted without approval; the current rehearsal fails; no production owner can approve cutover; or the real backup/restore strategy has not met the approved RPO/RTO.

The temporary canonical CI baseline does NOT resolve historical production UUID/TEXT replay drift. That still requires a reviewed production-specific baseline/replay plan or an authorized real-backup restoration test. Keep issue #369 open for that remaining distinction. Phase 3 account-card live acceptance is also independent; no overall phase is closed by this rehearsal.

## Primary references

- Prisma Migrate / baseline and diff concepts: https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining and https://www.prisma.io/docs/orm/reference/prisma-cli-reference . This CI uses the repository's locked Prisma 6 flags and does not baseline production.
- PostgreSQL logical restore and empty targets: https://www.postgresql.org/docs/current/app-pgrestore.html .
