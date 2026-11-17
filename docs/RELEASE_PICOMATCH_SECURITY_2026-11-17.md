# Release dependency repair — 17 November 2026

Privacy PR #605 merged at `33d14d797d0e1a7aae4f6646830f7d3060f48a59`, with all 35 main check runs passing. Render independently rejected API deploy `dep-dbu8regae00c73b567h0` and web deploy `dep-dbu8re8ae00c73b567d0` at the dependency gate. The existing deployments remained live. A fresh local web/API audit reproduced nine high findings propagated from picomatch, including build tooling; this was not a profile or database migration failure.

The maintained private backport in `vendor/picomatch` starts with the original npm 4.0.7 archive and applies the leading-quantifier safeguard from upstream PR #238. Its original MIT license, provenance, exact source hashes, patch reference and limits are retained. Its private version is `4.0.8-hydroland.1`, not an upstream release. The root dependency and override resolve every picomatch entry to that source, including previous 2.x transitive entries. The lock was regenerated with the repository's declared npm 10.9.8; no other package version changed.

Each release audit now verifies the backport before requesting the registry report. npm does not assess this vendored source, so a registry result alone is insufficient. The five required checks cover source digests, bounded reported exploit patterns, ordinary glob and public API compatibility, installed dependency resolution and a negative control: removing only the guard restores the original timeout in a separate process. High/critical rejection and all three audit scopes remain unchanged.

Local acceptance: five security tests and the audit contract passed; API build, strict typecheck and ESLint passed; all 123 web tests/static validations and the web build passed. The fresh web/API audit reported zero high and zero critical, with seven moderate findings retained. These moderate findings are not asserted fixed by this change. GitHub acceptance, Render publication and live readiness/source matching remain required before calling the release published. No application permission, retention, deletion, schema or provider configuration changed.

Upstream references:
- https://github.com/advisories/GHSA-fc5q-39xc-vjpf
- https://github.com/micromatch/picomatch/pull/238
