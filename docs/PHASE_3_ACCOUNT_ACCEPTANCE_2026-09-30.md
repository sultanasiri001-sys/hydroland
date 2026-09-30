# Phase 3 account acceptance — 2026-09-30

This is Phase 3 of the current eight-phase interface plan: account registration,
authentication/recovery, sessions, profile, credentials/documents and settings.
It is not the older Stage 3 external-integration programme in issue #329.
The external-integration programme and general recovery blocker #369 remain
separate release controls; this document does not close either.

## Implemented handoff

PR #368 was merged into main as b63af4f27f614bf58b941686a425e2c9ad34ced1.
The exact PR head had six successful workflows, including 38 actual service
scenarios across text/UUID PostgreSQL schemas. The change covers messaging
key conversion without changing historical migrations or account privileges.
The PR's initial pending-CI and unmerged notes are historical; the verified
CI comment and merge record supersede them.

## Acceptance still requires evidence

- Exact approved code deployed and database readiness healthy.
- Authenticated conversation list and permitted operations work after deployment.
- Real Google sign-in/consent, session persistence and logout succeed.
- Authorized email verification/recovery delivery and actual single-use link
  acceptance succeed within the documented recipient restriction.
- Profile, settings, permissions, credential submission/review and session
  lifecycle complete their final live account acceptance.

Prior owner-confirmed credential upload/open is retained as bounded acceptance;
do not recreate storage credentials or discard that result.

## Evidence collection added here

The public observer makes bounded GET requests only to the two existing
HYDROLAND Render origins. It has no secrets, cannot create accounts, cannot
reset passwords and does not fetch private documents. It records only approved
public fields and HTTP guest-denial outcomes. Disabled Google or restricted
email remains explicitly visible. Successful public observation is NOT a
full Phase 3 acceptance result: phase3Closed remains false by construction.
The source commit, expected deployed commit and observed deployed commit are
recorded separately.

A separate job reruns the existing browser suite against isolated fixtures and
preserves account screenshots. These are not authenticated production-user
screenshots. No result is claimed before the workflow has run.

This PR changes test/evidence files only. It does not change application code,
provider settings, credentials, account data, Render settings, storage, billing
or the recovery workflow. Read-only provider configuration cannot substitute
for an owner-controlled OAuth interaction or a consumed email challenge.
