# Production Migration Reconciliation

## Safety policy
- Forward-only production changes.
- No `prisma migrate reset`.
- No destructive schema/data operations for reconciliation.
- Production deploy remains blocked until migration history and Finance migration collisions are reconciled and CI passes.

## Current Render production blocker
Migration: `20260916191500_hr_candidate_verification_fields`

The migration intends to:
1. Add `hrReviewedById`, `source`, `hrVerification`, `hrNote`, `hrReviewedAt` to `WorkforceHiringRequest`.
2. Set `WorkforceHiringRequest.status` default to `PENDING_HR_REVIEW`.
3. Add `WorkforceHiringRequest_hrReviewedById_fkey` referencing `Account(id)` with DELETE RESTRICT / UPDATE CASCADE.
4. Add `WorkforceHiringRequest_hrReviewedById_status_idx`.

## Read-only production verification — 2026-09-17
All intended database effects are already present in Render production:
- `hrReviewedById`: present, nullable.
- `source`: present, NOT NULL, default `HUMAN_RESOURCES`.
- `hrVerification`: present, nullable.
- `hrNote`: present, nullable.
- `hrReviewedAt`: present, nullable.
- `status`: default `PENDING_HR_REVIEW`.
- FK `WorkforceHiringRequest_hrReviewedById_fkey`: present and references `Account(id)` with ON DELETE RESTRICT / ON UPDATE CASCADE.
- Index `WorkforceHiringRequest_hrReviewedById_status_idx`: present on (`hrReviewedById`, `status`).

Therefore this is a Prisma migration-history reconciliation issue, not a missing production-schema change. Do not rerun the SQL blindly.

## Required recovery gate
Before any Finance migration is allowed to run:
1. Reconcile the failed Prisma migration record using Prisma migration-resolution semantics only after the deployment branch is prepared consistently.
2. Re-read `_prisma_migrations` and confirm there is no unresolved failed migration.
3. Audit the Finance shift migration collision (`20260917003000` vs `20260917003500`).
4. Reconcile duplicate deferred-invoice migrations (`20260917014500` vs `20260917015000`) without deleting an already-applied production migration.
5. Align `schema.prisma` with the intended nullable deferred invoice payment relation.
6. Run Prisma generation, all validation gates, typecheck, build, and migration validation before deployment.

## Branch policy
Reconciliation branch: `release/production-reconciliation`.
It is based on the current Render operational branch and must preserve operational commits while Finance L1-L4 is integrated selectively.
