# Current mobile security remediation — 24 October 2026

Reviewed base: production main `9a353ae274fc66843e1d0d61505c545904fe73b9`.

The old #443 description no longer describes production dependencies. Main
already pins shell-quote 1.11.0 and source-map-js 1.2.2. The shell-quote
maintainer identifies 1.11.0 as the fix for GHSA-pqg4-j6r4-53mv; upgrading
to 1.12.0 is not required to fix that advisory. The existing local braces
and node-forge replacements and their behavioral regressions are preserved.

A fresh registry audit instead reports **3 high, 6 moderate, 0 critical**
affected dependency entries in mobile. The high rows are Zod 3.25.76 and its
Expo CLI/Expo parent chain, from GHSA-mrhx-c7xc-m3w5. These are propagated
package counts, not three distinct vulnerabilities.

## Change and compatibility boundary

Scope the published Zod 4.6.6 override to `@expo/cli` and update only the
corresponding Zod lock entry, retaining npm registry integrity metadata.
Expo SDK, React Native, application runtime code and audit policy are unchanged.
The registry's automatic Expo downgrade is not used.

**This is an explicit major transitive override:** the installed CLI declares
Zod `^3.25.76`. Its two actual importing modules are the DevTools plugin schemas
and the MCP extension input-schema factory. The mobile test command now executes
those installed modules, checking valid plugin descriptors, empty/invalid plugin
rejection, strict command names/parameters, parameter types and plugin output
variants. It also exercises synchronous and asynchronous array/map/set bounds
through the Zod instance resolved from the installed CLI.

The regression failed on the base dependency: a three-element array exceeding
max(2) still visited all three elements. This verifies the behavioral failure
rather than relying on a version string or audit-count change alone.

## Validation status

Node 22.23.3 / npm 10.9.9 clean mobile installation, all mobile behavioral
regressions, installed Expo schema checks and TypeScript validation passed
locally. Offline Expo configuration generation and the unchanged fail-closed
audit contract passed. Fresh mobile and full-repository registry audits each
passed with **0 high, 0 critical, 6 moderate** affected entries. Offline Metro
exports also passed for iOS (1,137 modules) and Android (1,283 modules). Exact-head
CI results are recorded in the PR as they finish. No merge or deployment is
claimed by these local results.

The original scope intentionally allows moderate findings while rejecting
high/critical findings and malformed or unavailable registry reports. No
exception, severity substitution or failure-to-success conversion is added.
Neither an export nor TypeScript validation establishes a device build,
app-store release or user acceptance.

## Primary references

- https://github.com/ljharb/shell-quote/security/advisories/GHSA-pqg4-j6r4-53mv
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd
- Published package metadata: `npm view zod@4.6.6 dist --json`.
- Registry checks confirm Expo CLI 57.x and current 58.1.15 still declare Zod 3;
  no upstream compatible Zod 3 security release was established.
