# Phase 4 — Notifications and audit ledger — CLOSED 2026-09-30

## Scope
1. Authenticated in-app notification inbox.
2. Read/unread state and indicator lifecycle.
3. Audit recording for sensitive operations.
4. Append-only historical audit ledger at the application database boundary.

## Automated evidence
- Notification backend HTTP/DB E2E verifies authentication, ownership, auth-challenge isolation, persistence, read state, concurrent self-only safety tests and cross-account denial.
- Current-main browser suite passed 113/113 tests after the Phase 4 audit protection deployment.
- Focused safety-notifications Playwright suite passed 4/4: Arabic simulation labels, persistence/read indicator, retry/error handling, logout race isolation and escaped/private payload handling.
- PR #376 passed all seven triggered gates before merge. Its PostgreSQL migration rejects AuditEvent UPDATE, DELETE and TRUNCATE while preserving INSERT/SELECT.
- The recovery rehearsal includes the append-only migration so the trigger contract is preserved through the synthetic logical backup/restore exercise.
- Production read-only verification after deployment found both AuditEvent triggers installed.

## Owner live acceptance
On 2026-09-30 Sultan supplied an iPhone screenshot of the deployed notifications dialog showing the self-only safety-test notification in the account. A read-only production query immediately after that acceptance found the newest SAFETY_TEST notification at 2026-09-30T08:14:38.321Z with status READ. The previous safety-test notification was also READ. This records the live create/display/read lifecycle without reproducing account identifiers or notification payload secrets.

## Security boundary
The database trigger protects the ledger from normal application-role UPDATE, DELETE and TRUNCATE operations. It does not claim protection from a database owner deliberately altering or dropping the trigger, and it does not replace provider backups/PITR. External SMS/WhatsApp/push delivery is not part of this Phase 4 in-app-notification scope.

## Closure
Phase 4 is CLOSED. Reopen only for a regression or approved scope change. Production recovery/PITR issue #369 and external integrations #329 remain independent controls.
