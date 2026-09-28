# HYDROLAND Production Recovery Runbook

Status: operational baseline; provider-level PITR activation remains a Phase 11 launch prerequisite.

## Objectives

This runbook defines database recovery controls for HYDROLAND. PostgreSQL remains the system of record. Application deployment recovery and failed Prisma migration recovery are separate from database backup restoration.

## Recovery modes

1. **Application rollback** — redeploy the last known-good application commit. Do not roll back database state merely to repair an application regression.
2. **Failed migration recovery** — use the controlled `Production Prisma Recovery` workflow only for migrations explicitly listed and confirmed as failed.
3. **Logical backup restore** — restore a `pg_dump` custom-format backup into a clean database, validate data and Prisma migration history, then switch the application only after verification.
4. **Point-in-time recovery (PITR)** — use the managed PostgreSQL provider's PITR facility once the production database is on a PITR-capable paid plan. Select the last known-good point before the incident and restore to a separate database first. Never overwrite the only production copy as the first recovery action.

## Restore sequence

1. Declare an incident and stop nonessential writes when data integrity is in doubt.
2. Record the incident time, suspected corruption window, active application commit, database version, and current migration state.
3. Preserve the affected database; do not delete or reset it.
4. Restore the selected backup/PITR point to a separate recovery database.
5. Validate database connectivity, schema, `_prisma_migrations`, key record counts, integrity constraints, and a representative sample of bookings, payments, credentials/documents metadata, audit events, and role assignments.
6. Run API readiness and production E2E checks against the recovery target in an isolated environment.
7. Obtain the designated production owner's approval before switching the production connection string.
8. Switch traffic, verify `/api/v1/health/ready`, monitor error rate and database connections, then reopen writes.
9. Preserve recovery evidence and document actual RPO/RTO achieved.

## Automated rehearsal

`.github/workflows/phase11-recovery-drill.yml` runs a disposable PostgreSQL 18 recovery drill. It deploys the current Prisma schema, writes a sentinel, creates a custom-format logical backup, restores it into a clean database, and verifies both the sentinel and migration history. The workflow retains a recovery evidence artifact for 30 days.

This rehearsal validates the logical restore procedure and application schema compatibility. It does **not** prove that the production hosting provider has PITR enabled; provider-level PITR must be separately verified before launch.

## Release blockers

Production launch remains blocked if any of the following is true:

- managed database PITR is unavailable or not enabled;
- production database accepts unrestricted public ingress;
- a recovery drill on the current schema is failing;
- no designated production owner can authorize a recovery cutover;
- the current backup/restore mechanism cannot meet the approved RPO/RTO targets.
