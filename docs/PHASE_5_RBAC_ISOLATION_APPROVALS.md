# Phase 5 — permissions, centers, roles, isolation and approvals

Approved order: permissions → centers → roles → isolation → approvals across all portals.

Existing evidence covers protected admin routes, same-session role revocation/reactivation, cross-user booking ownership denial, protected portal fail-closed refresh, dashboard action reauthorization, organization ownership/membership guards, and activation review workflow.

Protected portal mapping is exact: INSTRUCTOR → instructor, DIVE_CENTER → center, BOAT_OWNER → boat, ORGANIZATION → organization, ADMIN → admin. Diver is the base member portal.

New focused coverage iterates all five protected portals and requires no-role/PENDING_REVIEW/SUSPENDED denial, exact ACTIVE-role access, immediate fail-closed revocation, and cross-role isolation.

This is fixture validation only. No production role, center, user or approval is created or modified. Phase 5 closure requires green current-main tests plus approval/center/isolation evidence without granting test privileges to the owner account.
