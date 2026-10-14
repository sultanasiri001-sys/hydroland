# API dependency boundary: root cause and correction

## Causal chain

The monorepo lock covers API, browser and Expo/React Native mobile workspaces.
Expo CLI/code-signing requires node-forge; Metro/micromatch requires braces.
Current upstream advisories cover node-forge <=1.4.0 and braces <=3.0.3, with
no published patched versions verified on 2026-10-03. The full audit's 19 high
entries include propagation through their parents, not 19 independent flaws.

Both API Dockerfiles installed every workspace and copied the entire resulting
node_modules into production. Thus mobile tooling was physically shipped with
the API despite having no API runtime purpose. The original image also carried
development tools, and Prisma was marked dev-only despite the Render startup
command invoking its migration CLI. Changing only audit scope would leave that
physical exposure intact.

## Implemented correction

- Scope both API build installations to @hydroland/api with root workspace
  dependencies excluded. API declares its own required AWS dependencies.
- Install production dependencies in a separate clean stage using the existing
  lock. Keep mobile source, manifests, locked versions and the full audit intact.
- Classify Prisma as a runtime dependency, matching its migration-before-start
  use. No resolved package versions change. TypeScript remains an optional peer
  required by the installed Prisma dependency graph; Nest CLI does not ship.
- Use a common Debian/OpenSSL base for generation and runtime; copy generated
  Prisma client and matching engines so runtime does not download binaries.
- Apply the same isolation to Render's root Dockerfile and Compose's API
  Dockerfile, preserving each entrypoint's migration/direct-start behavior.
- Keep non-root execution and use exec after Render migrations for signal
  delivery to the API process.

## Verification

An isolated local install contains 247 inventoried packages and no Expo,
React Native, Metro, node-forge, braces, Playwright or Nest CLI. Its API runtime
dependency audit reports zero vulnerabilities. Loading AppModule and constructing
the generated Prisma client succeeds, and the Prisma CLI finds local engines.
No resolved dependency versions changed in the lockfile. These local results do
not claim a Docker build: Docker is unavailable in this workspace.

Phase 11 CI now builds both final images and inventories their actual installed
files, rejects mobile/browser tooling, imports the compiled application, runs
Prisma with networking disabled, and audits the API production graph in addition
to the unchanged full repository audit. It boots the root image as non-root on
a read-only filesystem and queries disposable PostgreSQL through /health/ready.
That smoke uses a canonical-schema bootstrap and a direct node entrypoint;
historical production migrations and production restore acceptance are not
claimed. Exact-head CI evidence is recorded in PR #409.

## Remaining release blocker

Update: the subsequently approved independent web/API and mobile release policy
is documented in RELEASE_CHANNELS_2026-10-03.md. The paragraph below records the
hold before that decision; mobile advisories remain unresolved and fully audited.

The full repository audit must continue to fail while mobile contains the two
unpatched dependencies. Isolating the API fixes accidental shipping; it does not
repair upstream cryptography or recursive brace parsing, nor certify the mobile
application. No severity exception, renamed package, fake version, removed
mobile workspace, force-downgrade or unreviewed fork is used. The existing
all-project release hold remains. A supported patched dependency chain is still
required to clear it; arbitrary Expo upgrades retain the affected dependencies.

References:
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/digitalbazaar/forge/pull/1152
