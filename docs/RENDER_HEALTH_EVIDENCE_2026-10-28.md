# Render HTTP health evidence — 2026-10-28

## Observation and attribution

The main coordinating chat configured the two existing production health-check
paths. This record is an independent read-only verification by the review chat;
it does not attribute the settings write or a deployment action to the reviewer.
The latest public API response recorded here is dated **28 October 2026,
02:25:08.701 Asia/Riyadh** (`2026-10-27T23:25:08.701Z`). Service configuration,
deploy metadata and bounded event/error-log reads corroborate that observation.
This is a dated snapshot; re-read the services before a later release.

The observed source was `a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d` (PR #533),
tree `7fb1bb0aa1e6e8c51b21ff7fdd608ea1ed76d993`. This documentation change is
not itself part of that observed production release.

## Service readback

| Field | API | Public web |
| --- | --- | --- |
| Service name | `hydroland` | `hydroland-web` |
| Service ID | `srv-dakelt142hec73aavvsg` | `srv-daknr0tbvr0c73ea69a0` |
| Runtime | Native Node | Native Node |
| Branch | `main` | `main` |
| Build working directory | `apps/api` | Repository root |
| Build command | `node ../../scripts/build-api-release.mjs` | `node scripts/build-web-release.mjs` |
| Saved `healthCheckPath` | `/api/v1/health/ready` | `/` |
| `autoDeployTrigger` | `commit` | `commit` |
| Post-change live deploy | `dep-dbgj396c6qcc739cjrgg` | `dep-dbgj3p6i0phs73fujbmg` |
| Deploy finished, UTC | `2026-10-27T23:20:40.033740Z` | `2026-10-27T23:21:21.165787Z` |

Both deploys reported `live` on the exact source commit above. Render also
returned `deploy_ended` events with `deployStatus: succeeded` for both deploys.
No `server_failed` event was returned in the bounded query since
`2026-10-27T23:19:00Z`. The application-error query for both resources over that
window returned `logs: []`, `hasMore: false`, ending at
`2026-10-27T23:25:16.970037944Z`. These are observations of that window, not a
guarantee of continuous availability or a fault-injection/rollback rehearsal.

## Public HTTP verification

- `https://hydroland.onrender.com/api/v1/health/ready` returned HTTP 200 with
  `status: ready`, `database: ok`, the exact observed commit, and timestamp
  `2026-10-27T23:25:08.701Z`.
- `https://hydroland-web.onrender.com/` returned HTTP 200.
- The configured path is independently present in service metadata. The claim
  therefore includes saved platform configuration, not just an available route.
- API readiness executes the existing database check in
  `apps/api/src/health/health.controller.ts`. The web root check establishes an
  HTTP response; it does not establish authenticated or external-provider
  business acceptance.

## Configuration authority and remaining acceptance

The table describes the existing native services. `render.yaml` remains a Docker
API-only template and was not applied or edited. It is not a complete export of
these two running services. No migration or Blueprint source-of-truth decision
is inferred from this observation.

The HTTP health-path component of A02 is verified. Broader A02 remains PARTIAL:

- Approved rollback/release rehearsal and exact candidate acceptance remain with
  the coordinating team; none was performed by this documentation task.
- Auto-deploy on commit still requires its separate release-policy review.
- Network/client inventory, least-privilege access plan and approved rollback
  remain separate. No network rule was changed or declared accepted here.
- UAT continuity, PITR, object bytes/ACL, restore measurements, and A14 source
  applicability remain with their assigned teams. No resource, plan, secret,
  UAT state, business data or live safety flag was changed by this review.

This component does not close A02 as a whole, change the 77-item register totals, or
establish broad operating/launch acceptance. The older
[26 October snapshot](RENDER_RUNTIME_EVIDENCE_2026-10-26.md) remains historical.

## Coordination evidence

- [Execution handoff](https://github.com/sultanasiri001-sys/hydroland/issues/523#issuecomment-6455995701).
- [Review chat acknowledgement and saved-field readback](https://github.com/sultanasiri001-sys/hydroland/issues/523#issuecomment-6456083609).
- [Independent deploy, HTTP, event and error-log verification](https://github.com/sultanasiri001-sys/hydroland/issues/523#issuecomment-6456091371).

No new application tests were added for this documentation-only update. Its
validation consists of matching the recorded facts to the retrieved evidence,
checking the changed-file scope, local Markdown link resolution and whitespace.
The source release's prior CI evidence is not presented as a test of this
documentation commit.
