# Mobile dependency security recheck — 2026-10-08

Base: main `05a876bb546a22c80b822330525e32990a195f18`.

The current mobile-scoped audit of the unchanged lockfile reports 20 high,
10 moderate and 1 critical affected dependency entries. These counts describe
affected packages, including propagated findings, rather than distinct CVEs.

## Compatible fixes

| Package | Previous lock | Updated lock | Advisory |
|---|---|---|---|
| shell-quote | 1.10.0 | 1.12.0 | GHSA-pqg4-j6r4-53mv, critical; fixed from 1.11.0 |
| source-map-js | 1.2.1 | 1.2.2 | GHSA-68fv-2mgg-jv7q, high; fixed from 1.2.2 |

`npm update shell-quote source-map-js --package-lock-only --ignore-scripts`
changed exactly these two package entries. Application manifests, Expo SDK,
React Native and the audit policy are unchanged. Registry URLs and integrity
hashes are recorded in the updated lockfile.

The resulting mobile audit reports **19 high, 10 moderate and 0 critical**.
Neither patched package appears in its vulnerability rows. The release audit
still exits 1 because high-severity dependencies remain. The existing audit
contract tests pass, including fail-closed behavior and full mobile coverage.

A clean mobile-scoped `npm ci --ignore-scripts` succeeds. Mobile static checks
and TypeScript pass. Installed versions match the lockfile. A direct check of
shell-quote rejects the advisory's comment-followed-by-newline input with
TypeError while ordinary quoting continues to work. These checks do not claim
device build, app-store submission or production release acceptance.

## Remaining blockers

| Package | Locked version | Direct parents in the lockfile | Current upstream evidence |
|---|---|---|---|
| node-forge | 1.4.0 | Expo CLI 57.0.27 and @expo/code-signing-certificates 0.0.6 require ^1.3.3 | GHSA-86w9-cpqp-85rv affects <=1.4.0; no patched release listed. Forge PR #1152 is open. |
| braces | 3.0.3 | micromatch 4.0.8 requires ^3.0.3 | GHSA-vfj7-8cjw-p6xm affects <=3.0.3; no patched release listed. |

Registry checks on this date still advertise node-forge 1.4.0 and braces 3.0.3.
Expo 57.0.27 depends on CLI ^57.0.28; CLI 57.0.28 still requires node-forge
^1.3.3. The latest code-signing package 0.0.7 requires node-forge ^1.4.0;
micromatch 4.0.8 still requires braces ^3.0.3. Upgrading Expo alone therefore
does not establish a fix for these blockers.

Moderate findings also remain for decode-uri-component and uuid. This patch
does not attempt a major SDK migration or change transitive dependency APIs.

Release remains held. No audit exception, forced downgrade, unpublished package
replacement, production migration or deployment is included.

## Sources and reproduction

- https://github.com/advisories/GHSA-pqg4-j6r4-53mv
- https://github.com/advisories/GHSA-68fv-2mgg-jv7q
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/digitalbazaar/forge/pull/1152
- Registry metadata queried using `npm view` for the packages above.
- `node scripts/release-dependency-audit.mjs mobile /tmp/mobile-audit.json`
- `node scripts/release-dependency-audit.test.mjs`
