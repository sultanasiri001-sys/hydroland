# Maintained security backport

This is the private HYDROLAND backport of **picomatch 4.0.7**, distributed with its original MIT license. `4.0.8-hydroland.1` identifies this local build; it is not an upstream release. The root dependency and override resolve the original `picomatch` name to this vendored source.

Upstream advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf

The only runtime modification is the leading-quantifier safeguard from upstream proposal https://github.com/micromatch/picomatch/pull/238 at `44f192261f312ddf236cb7bdc05d8f22663f98f9`. The proposal remains unmerged at this review. It makes repeated extglobs with a leading bare wildcard and trailing content literal, including the reported `+(*a)` and `*(*a)` cases. The original parser's other safeguards and option semantics remain in place. This is not a guarantee about all possible regular expressions or explicitly disabled safeguards.

`provenance.json` records the original npm archive digest and all shipped source digests. Upstream npm archive SHA-256: `697b463be3cdbd9ffc8f4194fd5019a69ddf95875fb703d78b2b115cc9e740a8`. All original runtime files are retained, including the POSIX entry point.

The root override resolves every installed picomatch to this vendored source. Each release audit must run `scripts/picomatch-security.test.cjs` first: fixed source hashes, installed dependency resolution, bounded exploit regressions, ordinary glob/API compatibility and a child-process negative control that reproduces the original defect after removing only the guard. Vendored file source is not assessed by the npm advisory endpoint; a clean registry report alone is therefore insufficient. High/critical rejection and existing web/API, mobile and full-repository scopes remain unchanged.

Replace this backport with an upstream release once the advisory is resolved and the same regressions and application checks pass.
