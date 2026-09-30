# Phase 3 account acceptance — CLOSED 2026-09-30

This is Phase 3 of the current eight-phase interface plan: account registration,
authentication/recovery, sessions, profile, credentials/documents, account
membership controls and settings. It is distinct from the older external-
integration programme in issue #329 and from production recovery/PITR control
#369.

## Closure decision

**CLOSED.** The owner acceptance completed on 2026-09-30 after the final
profile persistence check. This closure is scoped to the Phase 3 account
experience and does not certify unrelated external providers, production
backup/PITR, or later interface phases.

## Verified implementation and automated evidence

- PR #368 fixed production messaging key compatibility and was merged/deployed.
  Its service regression covered TEXT and UUID PostgreSQL schemas.
- The public Phase 3 observer verified the approved API deployment, database
  readiness, enabled Google/email public configuration and guest denial of
  protected account routes.
- The account/browser regression suite covers login cancellation, refresh/logout
  races, session expiry, re-login, MFA setup, credential rendering, profile,
  diver data, settings, documents and responsive account screens.
- Profile/Account HTTP/DB E2E verifies authenticated profile persistence,
  partial diver-profile updates, explicit clearing, concurrent changes,
  equipment ownership and credential guards.
- Credential/document tests cover attachment, protected access, submission and
  integrity. The previously uploaded owner credential was successfully opened
  and submitted for review.
- PR #374 corrected the live iPhone membership-card failure caused by device
  wall-clock skew. Before merge, all eight workflows passed; dedicated coverage
  included 30/30 Chromium/WebKit browser tests, 21/21 timing assertions,
  52 HTTP/PostgreSQL assertions and the QR reference vectors.
- The deployed PR #374 commit was confirmed live on both web and API.

## Owner live acceptance

The following are explicitly USER-CONFIRMED live acceptance, not synthetic CI
claims:

1. Google-authenticated account use and conversation access worked; after
   logout the protected conversation could not be re-entered.
2. Account email verification and password-recovery flows have completed in
   production evidence; delivered challenges were consumed rather than merely
   queued.
3. Credential/document upload, save and open succeeded. Storage credentials
   must not be recreated merely because this phase is closed.
4. On iPhone after PR #374 deployment, the internal HYDROLAND account card
   rendered with QR; PNG download completed; the share action succeeded.
   Issue #371 was closed as completed.
5. Final profile acceptance: the owner edited a profile field, saved it,
   refreshed the page and confirmed the edited value persisted.

## Boundaries retained after closure

- A submitted credential can remain PENDING until an authorized reviewer and
  the required external verification evidence complete the certification
  decision. That operational/external decision is not a failure of the Phase 3
  account interface.
- Issue #369 remains a separate production recovery/PITR control. The isolated
  logical restore rehearsal is repaired and tested, but that does not certify a
  provider production backup or historical production replay.
- Issue #329 remains the separate external-integration programme.
- This document does not claim later phases are complete.

## Handoff

Phase 3 account/authentication is closed. The next interface-plan work may begin
at Phase 4 without reopening Phase 3 unless a regression is observed or the
approved scope changes.
