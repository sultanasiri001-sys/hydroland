# Read-only production schema audit — 2026-10-08

Read-only Render queries inspected HYDROLAND PostgreSQL 18 at 18:19 UTC. No production mutation, restore, deployment or environment change occurred. No customer record contents or credentials were exported.

## Verified evidence

- Database available, 117 public tables.
- Ledger: 103 records; 78 finished/non-rolled-back entries, 25 rolled-back attempts, zero unfinished/non-rolled-back entries. All 78 successful checksums match main repository bytes. This does not prove every historical DDL statement executed; unchanged empty-history replay still fails on duplicate HR DDL.
- Existing guard protected 18 migrations. The updated manifest protects all 78 successfully recorded files without editing historical SQL.
- Account, Organization, Booking, SafetyIncident, CustomerCase and WorkforceHiringRequest keys are UUID. CalendarResource, CalendarEvent and CalendarAllocation keys are TEXT. Checked foreign keys are validated.
- Both AuditEvent mutation-rejection triggers are enabled. Actual destructive enforcement is tested only in isolated rehearsals.
- Booking, BookingParticipant, Payment and Invoice counts are zero; CustomerCase count is one. This does not justify discarding other production data.

## Production adoption remains blocked

The candidate contains 109 tables, all present in production. Production has eight additional tables:

| Domain | Tables missing from candidate |
| --- | --- |
| HR | WorkforceCenterDepartment, WorkforceDepartment, WorkforceHiringRequest, WorkforcePosition, WorkforceSeat |
| Training | TrainingCourse |
| Compliance | ComplianceAssessment, ComplianceEvidence |

These raw/legacy domains are outside the canonical Prisma models and selected rehearsal extensions. The candidate's green 109-table result is scoped evidence, not production-schema equivalence. Extend its domain definition with complete enums, columns, native relations, defaults, indexes and triggers, and test services. Production core UUID keys also differ from the candidate's TEXT keys; preserve native production types in any real restore.

## Next acceptance

1. Cover all eight omitted tables with an explicit fresh-install type strategy and complete raw objects; preserve historical checksums.
2. Restore an actual production logical backup to an isolated empty target; verify the complete 117-table schema/data/ledger and application behavior.
3. Verify actual backup-export/PITR availability and recovery window. Exposed MCP tools have no export or PITR-status operation; specific-instance availability remains unconfirmed. Provider procedure: https://render.com/docs/postgresql-backups .
4. Review future migration/ledger transition and rehearse cutover/rollback. Do not replace production with the synthetic candidate or rewrite its ledger.

Latest Web deploy reports 05a876bb; API reports preceding 9a3b4f81, with the intervening change Web-only. Production start still uses original db:deploy. New organization migrations remain unapplied. Issue #369 stays open.


## Follow-up checksum verification — 2026-10-13

A fresh read-only ledger query confirms 79 finished/non-rolled-back migrations, 25 rolled-back attempts, and zero unresolved entries. The latest finished migration is `20261009183000_unified_store_offerings`. Its SHA-256 from the repository SQL file (`595b6bb891fbc2ccd813e80397a0db3d4df3391298333fed551e49add6ba706f`) matches the production ledger exactly. The manifest now includes this 79th checksum; no production data, schema, migration ledger or service configuration was changed. This verifies migration-file integrity only; the production adoption and restore blockers above remain open.
