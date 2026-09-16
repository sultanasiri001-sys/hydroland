# HYDROLAND Governance V1 Acceptance Criteria

## Workforce
- Relationship and probation are independent dimensions.
- Job title supports governed custom titles.
- Temporary/seasonal access can expire automatically.
- Operational eligibility rejects inactive contracts or missing/expired required credentials.

## Dynamic permissions
- Permission evaluation scopes role + action + resource + center + department + effective period.
- HQ can enable/disable configurable workflow steps without code changes once persistence/admin UI are added.
- Emergency override must be separately authorized and audited.

## Training
- Enrollment source, referrer, preferred instructor and assigned instructor are separate fields.
- Digital Training Record contains delivery mode, stages, skills and progress.
- Student cannot formally sign off an official skill.
- Session evidence supports timestamps, QR/geofence evidence and offline synchronization metadata.
- Corrections must append audit/correction history rather than silently replace evidence.

## Continuity
- Protected delays do not automatically penalize instructor/student.
- Warning level 3 leads to review, not automatic transfer/cancellation.
- Suspension, complaint, delay report and instructor transfer are distinct records.
- Instructor handover preserves completed and remaining skills.

## Inter-center support
- Generic support request works across departments/resource types.
- Temporary personnel support preserves the home center.
- Resource conflict detection blocks overlapping allocation.
- Approval chain is configurable and may include department, center, central function, supporting center and HQ.
- Cost allocation is retained with the support case.

## Persistence boundary
This phase intentionally defines domain and policy primitives without adding a new ORM or database migration. Persistence must be introduced only after reconciling the production database/migration history to avoid repeating destructive or conflicting migration failures.

## Next implementation gate
Before database persistence:
1. Reconcile current production DB and migration state.
2. Select/confirm ORM strategy.
3. Map these V1 domain primitives to persistence models.
4. Generate additive migrations only.
5. Run typecheck/build and migration validation in a non-production environment.
6. Add API endpoints and admin/student/instructor/center/HQ interfaces.
