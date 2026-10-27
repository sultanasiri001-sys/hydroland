# API correctness lint

The API's `lint` command checks all `apps/api/src/**/*.ts`, including specs, with
29 explicit correctness rules from ESLint. It is not a formatter or a claim of
full static/security analysis. Keep running the existing strict TypeScript check
separately; the config does not replace it with JavaScript scope/type rules such
as `no-undef`, or introduce broad style and unused-variable cleanup.

## Toolchain

- Use Node **22.13.0 or newer within the project's Node 22 line** for development
  linting; verified with Node 22.23.4 and the declared npm 10.9.8.
- ESLint 10.13.0 requires Node `^20.19.0 || ^22.13.0 || >=24`. This development
  tool requirement does not change the application's declared runtime engines.
- `@typescript-eslint/parser` 8.72.1 supports ESLint 10 and TypeScript
  `>=4.8.4 <6.1.0`, including the API's locked TypeScript 5.9.3.
- Both direct tools are exact-pinned dev dependencies in `apps/api/package.json`.
  The root npm lock records official-registry tarballs and integrity hashes.
- No plugin preset, formatting tool, global installation, `npx` auto-install, or
  application bootstrap/database connection is needed to lint.

See the official [ESLint prerequisites](https://eslint.org/docs/latest/use/getting-started),
[version support](https://eslint.org/version-support/), and
[TypeScript parser compatibility](https://typescript-eslint.io/users/dependency-versions/).

## Reproduce from the repository root

```sh
npm ci --workspace=@hydroland/api --workspace=@hydroland/web --include-workspace-root=true
npm run validate:lint -w @hydroland/api
npm run lint -w @hydroland/api
npm run db:generate -w @hydroland/api
npm run typecheck -w @hydroland/api
npm run build -w @hydroland/api
```

The focused config rejects runtime hazards such as async Promise executors,
missing callback returns, unsafe optional chaining, fallthrough, unreachable
code, malformed regular expressions, precision loss, and invalid NaN/typeof
comparisons. Every enabled rule has a deliberately invalid fixture in
`apps/api/scripts/lint-toolchain.test.mjs`, alongside valid typed/decorated code,
config-discovery/scope checks, and an unused-suppression failure check. The lint
command fails on warnings too and does not rewrite source files.

Only API source is covered: generated output, JavaScript maintenance scripts,
web, and mobile are outside this initial lint boundary. No CI workflow is
changed by this package. Integrators can add both `validate:lint` and `lint` to
the API validation workflow after the clean scoped installation.

## Baseline classification

On main `908f3899e2e95931cec7cdba72bacd67b575107c`, lint failed before analyzing
any source because neither the ESLint executable dependency nor a config was
present. All 394 API TypeScript files pass the new correctness boundary. The
only source edit removes a stale suppression comment for an uninstalled
`@typescript-eslint/no-require-imports` rule in the Arabic PDF contract; no
runtime logic or formatting was changed, and no lint rule was disabled to pass.

Dependency verification uses the existing fail-closed web/API release audit
(including development dependencies):

```sh
node scripts/release-dependency-audit.test.mjs
node scripts/release-dependency-audit.mjs web-api audit.json
```

This scoped audit must not be represented as an audit of the separately gated
mobile workspace or entire repository.
