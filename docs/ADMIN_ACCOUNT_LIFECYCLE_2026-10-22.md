# Administration: account suspension and reactivation

The former status endpoint returned an unfiltered Account record, including its password hash. Its audit write followed the committed status/session changes, so an audit failure could leave an unaudited suspension. Administrators also had no connected account-management screen.

The Users navigation and Manage Users shortcut now open an administration-only screen with server search and 50-account cursor pages. Each eligible account exposes a reason, explicit review acknowledgement and suspension or reactivation action. The current administrator is read-only. Pending verification and archived accounts cannot be activated through this workflow.

Status writes require the displayed `expectedUpdatedAt`, a 5–1000 character reason and `reviewed: true`. A serializable transaction locks the account identities and administrator roles, rechecks the acting administrator's active verified account and ADMIN assignment, protects the last active administrator, changes status, revokes sessions and records the decision together. Both list and mutation responses use an explicit public-field selection. Conflicts require a refresh; retries at an unchanged current state create no duplicate successful audit.

Password/Google login session issuance, refresh rotation and MFA challenges share the account lock with suspension. Reactivation invalidates any remaining sessions and requires a new login. Existing account data, center memberships, role assignments and employment records are preserved. Account state and center membership remain separate controls.

The browser uses the existing authorized request and portal-freshness controllers, captures form data before asynchronous authorization, and fences late responses by session and view generation. Leaving the view, logging out or losing the role clears private records. Error responses retain decision notes for review.

Action authorization also waits for any older role refresh before starting a current request. A delayed response sampled before revocation cannot authorize a later write; a deterministic invitation regression holds that older response and verifies that no write occurs after the role is revoked.

Validation includes API typecheck/build and auth invariants, web static checks/build, four browser regressions, and a loopback-only HTTP/PostgreSQL fixture. The database fixture verifies credential-field exclusion, search/pagination, audit-failure rollback, stale and concurrent decisions, administrator loss, session/refresh/MFA races, rejection while suspended, fresh-login reactivation and retained center data. It creates and removes only synthetic accounts in an isolated test database.

This delivers the account lifecycle portion of issue #472. Employee creation/linking and job/department/IAM assignment, plus durable agent execution, live workload metrics and agent pause/resume acceptance, remain open. No production employee account is changed by these tests, and no new schema migration is required.
