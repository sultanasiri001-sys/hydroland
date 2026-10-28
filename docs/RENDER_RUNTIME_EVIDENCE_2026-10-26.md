# Render runtime evidence and repository reconciliation — 2026-10-26

> Historical snapshot: the empty health paths below describe 26 October only.
> After the main coordinating chat configured both production services, independent
> readback and healthy post-change deploys verified API `/api/v1/health/ready` and
> web `/`. See the [28 October health evidence](RENDER_HEALTH_EVIDENCE_2026-10-28.md).
> The original observations are retained; broader A02 acceptance remains open.

## Scope and evidence boundary

This is a sanitized, dated **read-only observation**, not a provisioning manifest
or authorization to apply a Blueprint. Service/deploy metadata and public HTTP
checks were inspected on 2026-10-26, approximately 19:33–19:37 UTC. No service,
database, environment value, network rule, plan, deploy trigger or deployment was
changed. No credentials, connection strings or private environment values are
recorded here. Re-read the actual services before a future release; this snapshot
does not establish their state at any later time.

## Production services observed

Both services were live on commit
`908f3899e2e95931cec7cdba72bacd67b575107c` from `main`.

| Field | API | Public web |
| --- | --- | --- |
| Service | `srv-dakelt142hec73aavvsg` | `srv-daknr0tbvr0c73ea69a0` |
| Live deploy | `dep-dbfornou01pc73ccndag` | `dep-dbfornou01pc73ccne60` |
| Runtime | Native Node | Native Node |
| Build working directory | `apps/api` | Repository root |
| Build command | `node ../../scripts/build-api-release.mjs` | `node scripts/build-web-release.mjs` |
| Configured `healthCheckPath` | Empty | Empty |
| Auto-deploy | `on_commit` | `on_commit` |

The native build-command gap described on 2026-10-03 is therefore no longer
present in the observed service configuration. That is **not** evidence that this
reconciliation branch is deployed, nor a certification of all release gates.
Native runtime/inventory is not inferred from the Dockerfile.

### Public behavior observed

- At 19:33:31 UTC, API `/api/v1/health/ready` returned HTTP 200 with
  `status: ready` and `database: ok`.
- `https://hydroland-web.onrender.com` returned HTTP 200. Sampled deployed index,
  application and authentication assets matched `main` at the observed commit.
- Public API CORS probes permitted `https://hydroland-web.onrender.com` and did
  not permit the former `https://sultanasiri001-sys.github.io` origin. This is
  behavioral evidence, not an export of private environment configuration.
- These probes do not prove end-to-end booking, payment, messaging, recovery or
  external-provider acceptance. An available readiness route does **not** mean
  Render is configured to use that route for platform health checks.

### UAT is not the same release

The separate UAT API (`srv-db8741e89jmc73cfs1ag`) was live on
`b58b5942589c68f9f827fee627c8b378bfcf0534`, deploy
`dep-dbbk5ugn74is73cvgjf0`, with auto-deploy disabled and the readiness path
configured. Its readiness returned HTTP 200 at 19:37:05 UTC. This is not UAT
acceptance of production commit `908f3899` or of this patch. Detailed UAT SQL
inspection returned `INVALID_ARGUMENT`; no database-level acceptance is claimed.

## What this code-only reconciliation changes

1. `render.yaml` sets the non-secret `WEB_ORIGIN` literal to
   `https://hydroland-web.onrender.com`, matching `HYDROLAND_PUBLIC_WEB_ORIGIN`
   and the observed public CORS behavior. No live variable was written.
2. The release-channel and free-MVP guides now distinguish the current native
   services from the historical Docker/GitHub Pages setup. Historical decisions
   and instructions are retained, explicitly marked as historical.
3. Focused regression tests protect the literal origins, intended API readiness
   route, scoped native build command sequence, repository-root resolution and
   failure propagation. They do not apply a Blueprint or call Render.

## Remaining drift at 2026-10-26 — not closed by that patch

| Gap | Required next evidence/action before claiming closure |
| --- | --- |
| `render.yaml` is a Docker API-only template, while production has native API and web services | Review resource mapping and the intended source of truth before a separately authorized migration/sync. Do not change runtime or add resources blindly. |
| API Blueprint intends `/api/v1/health/ready`, but production's platform health-check field is empty | A separately authorized live setting change, then service readback and healthy-deploy verification. Preserve readiness intent in code meanwhile. |
| Production auto-deploy is `on_commit` | Review release-trigger policy and exact-head gates before any authorized change. This patch does not disable or change deployment behavior. |
| UAT is on an older commit | Validate the intended candidate in UAT through an authorized release process; current readiness alone is insufficient. |

No database lifecycle, backup, network exposure, billing, external integration or
mobile-security gap is considered resolved by this document. In particular,
the historical free-MVP cost table is not evidence of the current invoice.

## Validation and limits

Run the focused offline check from the repository root:

```sh
node --test scripts/render-release-contract.test.mjs
node scripts/release-dependency-audit.test.mjs
node apps/api/scripts/integration-readiness-validation.mjs
```

The build contract tests execute copies of the real entrypoints with recording
child executables in a temporary tree. They verify command construction/order,
working directory and fail-fast behavior, **not** a fresh dependency install,
compiled artifact, security audit or deployed runtime. Existing Phase 11 checks
remain responsible for actual native builds and disposable-database readiness.
No global workflow or required-check configuration is changed by this patch.

The edited Blueprint passed structural validation against the current
[Render JSON Schema](https://render.com/schema/render.yaml.json), retrieved on
2026-10-26. Render CLI validation was not run because the CLI was unavailable;
schema success is not platform-aware validation or permission to sync. The
[current Blueprint reference](https://render.com/docs/blueprint-spec) and
[environment configuration reference](https://render.com/docs/configure-environment-variables)
were reviewed. A Blueprint can change existing resources; review its complete
diff and mapping before any separately authorized application.
