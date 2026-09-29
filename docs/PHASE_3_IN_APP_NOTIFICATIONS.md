# Phase 3 — in-app safety notification trial

## User flow

After signing in, open the notifications bell and select **تجربة تنبيه سلامة**.
The server stores a notification for the signed-in account with the example area
**منطقة الرأس**. The card and its content explicitly identify the alert as a
simulation. It remains available after reload and supports marking it as read;
unread badges update across the public header and account workspaces.

This is a manual, self-only trial of in-app delivery. It does not report a real
hazard, publish to other users, send email, request device notification permission,
or provide geographic targeting. Genuine area-wide hazard alerts still need a
verified source, an authorized publishing workflow, recipient rules, and expiry.
The existing visible-page polling interval remains 60 seconds. This change does
not close Phase 3 or the deferred maps work.

## API and data boundaries

- `GET /api/v1/notifications`: authenticated account's latest 100 in-app entries.
- `POST /api/v1/notifications/safety-test`: fixed simulation content; recipient
  comes only from the authenticated session. No recipient or hazard input is
  accepted. Returns `{ created, notification }` with HTTP 200.
- A serializable transaction reuses a test created in the last minute, including
  across simultaneous tabs. A reused test preserves its read status.
- `POST /api/v1/notifications/:id/read`: ownership is enforced; inaccessible IDs
  return 404.
- All `AUTH_` challenge records are excluded from list and mark-read operations.
  Reading the notification center cannot consume an email verification or password
  reset challenge. No schema migration or provider credentials are required.
- The interface escapes notification content, presents Arabic titles and selected
  user-facing details, and discards stale responses when the session changes.

## Verification

- `notifications-http-e2e.mjs` runs only against a local API and local test database:
  anonymous access, cross-account isolation, challenge integrity, concurrent test
  deduplication, ignored recipient/content injection, persistence, and read status.
  It is part of the API validation workflow's HTTP/DB gate.
- `safety-notifications.spec.js` covers the trial on mobile/desktop, read persistence,
  failure/retry states, logout during creation, safe content rendering, and auth
  challenge filtering during rolling deployments.
- Existing `activity-indicators.spec.js` checks badges across signed-in workspaces.

Production delivery to a user's account is verified only after that user invokes
the trial from a valid signed-in session. Deployment alone is not delivery evidence.
