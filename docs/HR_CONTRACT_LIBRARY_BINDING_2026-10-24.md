# HR contract drafts bound to the central library

The library previously exposed HR template metadata without creating an EmploymentContract. The internal owner can now open **عقود الموظف من المكتبة** on a staff record and save a draft from a currently published employment template. The API also supports scoped active HR managers, with HR reviewers limited to reading. External-center contracts and employee self-service signing are outside this draft step.

## Canonical ownership

Employment remains the employee source; EmploymentContract remains the HR contract/version source. An additive nullable JSONB `librarySnapshot` column pins the approved DocumentTemplate ID/version/hash, full template content, the canonical employee/organization/job values, manually entered terms, creation reason and source references. The existing Document evidence FK is unchanged. No fake Document, signed evidence, employment, identity or IAM grant is created.

Snapshots are immutable. Creating another draft increments the employee contract version; old rows and evidence remain unchanged. Existing rows with null snapshots are displayed as historical records without retrospective template binding. The snapshot digest binds its contract ID/version, employment ID, type, effective dates, template, values and reason. This implementation supports bound DRAFT rows only; later signing/evidence workflows must deliberately extend that reader and preserve the draft history.

## Authorization and consistency

- Current verified active canonical platform owner/ADMIN, or a current active internal HR Employment, active membership and STAFF + HR_MANAGER/HR_REVIEWER roles. HR reviewers cannot create. Other administrators, Legal-only staff, employees viewing themselves and center members do not gain access.
- Creation rechecks authority and active source state inside a serializable transaction. The library write barrier coordinates publication/retirement with creation; account, organization, employment and unit locks protect the relevant records.
- Clients send a fresh employee update time, source digest, latest contract version and template version/hash. Stale sources or a retired/unpublished template return a conflict. Automatic fields cannot be supplied as manual terms.
- Request IDs are idempotent for the same actor/command. Concurrent requests cannot create the same next version. Audit creation and the draft commit are atomic; audit failure rolls back the draft.
- The browser fences stale responses by session, workspace, connected form and per-box load generation. Lost authority clears private draft values.

## Boundaries

Saving is DRAFT_ONLY and does not sign, approve or activate employment, pay, benefits or permissions. Incomplete fields remain visibly missing. HR/legal template approvals, worker/establishment eligibility, official documentation and the employee's later consent remain separate. HR templates currently awaiting review in production are not silently published by this release.

GET/POST `/hr/employments/:employmentId/contracts` returns a private workspace or creates one draft. No mutation endpoint changes a pinned snapshot.

## Validation and rollout

API build; Web unit/design/access validation; 20 onboarding browser tests including five draft/privacy cases; isolated Nest/PGlite library/HR binding checks and cooperation regressions. A dedicated migration check applies the real additive SQL to TEXT and UUID fixture rows and confirms signed status/evidence references survive. Native PostgreSQL CI is required before release.

Rollout adds one nullable column; there is no backfill. Do not drop it on rollback. Older builds do not expose the new feature; keep stored snapshots and evidence intact and ensure the reader remains available before resuming draft operations. No production draft is created as part of deployment verification.
