# Independently gated release channels

Approved continuation on 2026-10-03 after the user was asked to separate the
web/API release from the blocked native mobile release. This supersedes the
previous all-project dependency hold for web/API only. It does not accept,
waive, suppress or mark the mobile advisories fixed.

| Channel | Dependency scope, including dev/build tools | Security evidence |
| --- | --- | --- |
| Web/API | apps/api, apps/web, root dependencies | Security audit / audit; Dependency lock audit / lock-and-audit |
| Mobile | apps/mobile and all transitive dependencies | Mobile release security / mobile-security |
| Repository visibility | Entire existing root lock and all workspaces | repository-audit.json in mobile security artifacts |

All scopes use the same fail-closed validator. Registry failures, invalid JSON,
missing/invalid severity counts, malformed vulnerability rows and high/critical
findings fail. There are no package-name exceptions or severity changes. The
mobile workflow and full repository audit intentionally remain red until the
upstream dependency chain is actually fixed; their evidence is retained even
on failure. No continue-on-error or success substitution is introduced.

## Matching release construction

Web/API RC and production validation install/test/typecheck/build only those
workspaces and root dependencies. API/browser validation uses its own scoped
install. Mobile keeps independent functional validation and a security blocker.
The shared lock remains committed and unfiltered; lock validation uses npm ci
and rejects mutation instead of silently regenerating resolution during CI.
Both API Dockerfiles retain the tested clean runtime dependency stage and
actual installed-file inventory checks from the preceding architectural fix.

The manually triggered Pages pipeline installs only web/root dependencies,
runs web validation and the web/API dependency audit before uploading its static
artifact. Existing Render deployments/configuration are not changed by this
continuation. Before any production release, verify the target service builds
only its approved workspace and the exact tested commit. This document is not
proof of production deployment, migration success or external acceptance.

## Merge and deployment controls

Web/API still requires exact-head API and browser tests, API image boundary and
runtime checks, RC/production validation, main integrity and the applicable
existing regressions, plus clean web/API dependency gates. A mobile release
requires BOTH Mobile validation and Mobile release security to succeed. There
is currently no mobile deployment workflow; any future one must require both.

The GitHub connector returned 403 for main branch-protection inspection. No
branch rules, required checks or administrative bypass settings were changed.
Do not force merge or bypass protection to implement this split. If an existing
rule requires the full/mobile audit for every web/API change, an authorized
repository administrator must explicitly align it with the approved channels.
Until that can be verified, green scoped checks are review evidence, not an
assertion that GitHub authorizes merge or that production has been released.

The API boundary report is at API_DEPENDENCY_BOUNDARY_2026-10-03.md; exact commit
workflow results are recorded in PR #409.
