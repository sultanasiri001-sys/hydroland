# A02 network and release verification — 1 November 2026

The owner requested completion of the partially accepted register items. This
record describes implemented controls and their observed limits. It does not
approve an operating launch or mark the full A02 item complete.

## Published candidate

PR #567 is merged as `ebfccb46a60ea04725c7272f8cd54317eee4f333`, with source tree
`84d2eb4187cae4c61a2f55c891de294ab9c725cf`. Its 29 PR workflows passed; all 31
main-push workflows subsequently passed on this exact merge commit. The collector
run `41302911678` passed on attempt 2 at 12:07:28 UTC after its first observation
had rejected duplicate paginated rows while other checks were running.

Render's native API and web services automatically deployed after those checks:

| Service | Deploy | Commit | LIVE at UTC |
| --- | --- | --- | --- |
| API `srv-dakelt142hec73aavvsg` | `dep-dbjin0jncjis73dk2or0` | `ebfccb46a60ea04725c7272f8cd54317eee4f333` | 12:08:57 |
| Web `srv-daknr0tbvr0c73ea69a0` | `dep-dbjin0rncjis73dk2pkg` | `ebfccb46a60ea04725c7272f8cd54317eee4f333` | 12:08:18 |

Both services retain `autoDeploy: yes` and `autoDeployTrigger: checksPass`.
The API's configured health path is `/api/v1/health/ready`; the web path is `/`.
The API uses root `apps/api`, build `node ../../scripts/build-api-release.mjs`
and start `npm run db:deploy && exec node dist/main.js`. The web uses the scoped
web release script. Native service settings are the active authority;
`render.yaml` is a historical Docker template and was not applied.

`main` has an enforced branch protection rule, including administrators, requiring
a PR, an up-to-date branch, resolved conversations, and four checks specifically
from GitHub Actions: `production-readiness`, `build`, `rc`, and `audit`.
Force pushes and deletion are disabled. This is a basic protection rule, not an
assertion that all 28 proposed workflow requirements are protected checks.

## Implemented database ingress plan

| Database | Intended access | Internet IP allowlist |
| --- | --- | --- |
| Production `dpg-dakd8g5g1s2s73bu70bg-a` | API and authorized maintenance on Render's private network | `[]` |
| Recovery `dpg-db7v3mks728c739pb05g-a` | Authorized isolated recovery and maintenance on Render's private network | `[]` |
| UAT `dpg-db873n689jmc73cfqs60-a` | Existing UAT service and authorized maintenance on Render's private network | `[]` |

The production and recovery database rules were narrowed from `0.0.0.0/0` to an
empty internet allowlist. UAT already had an empty allowlist. Workspace and
environment inherited rules were not broadened. An empty database allowlist
blocks public ingress even when an inherited rule permits it; it does not block
Render's private network. This is not a claim of per-service east/west firewall
isolation or acceptance of every database credential's privilege level.

Before narrowing recovery ingress, a read-only connection census found only
local/private connections. The production API's authenticated Render Web Shell
successfully ran an explicitly read-only PostgreSQL transaction. The result
contained only `read_only: on` and `client_network: private`; no account records,
credentials, connection strings or raw client addresses were retained.
The same API shell established a private TCP connection to the recovery database
before the ingress change. Post-change checks must retain the distinction between
TCP reachability, authenticated SQL, file recovery and full recovery acceptance.

### Maintenance procedure

1. Keep public database allowlists empty for ordinary operation. Use the existing
   authenticated Render Web Shell or an explicitly authorized internal job in the
   same workspace/region. Use the relevant database's existing authorized
   credential; never copy its connection string into Git, a report or an issue.
2. Use an explicit read-only transaction for inspection. Migration, restore,
   deletion and credential changes remain separately scoped actions; network
   access alone does not authorize them.
3. Hosted Render SQL inspection and GitHub-hosted jobs using external database
   URLs cannot be assumed to work with these rules. Do not reopen `0.0.0.0/0`
   for tool convenience. An exceptional external maintenance path requires a
   reviewed fixed source IP, narrow time window, named purpose and removal
   afterwards. No such exception is currently configured or authorized here.
4. After a network change, read back the database rule and verify private
   reachability plus application readiness. A failed check stops follow-on
   mutations; it does not automatically reopen public ingress.

Existing manual production/recovery workflows remain historical, gated tools.
Their external database transport must be reconciled with this internal-only
procedure before another live drill. No scheduled restore, real payment,
credential rotation or database content write was executed for this change.

## Collector scheduling correction

The live two-workflow sample can start while the complete main-push run set is
changing. The added scheduling preflight waits for two identical observations
of a completed run set before invoking the existing strict collector once.
Only this exact collector workflow's current run may remain in progress;
another observer or browser run is not excluded. A moved branch, foreign run,
duplicate/truncated page, missing required run, API error, timeout or backwards
clock cannot become settled evidence. Completed failures remain visible to the
unchanged evaluator and deployment checks.

The wait is bounded to 35 minutes and 400 GET requests. The job allows 40 minutes
including setup and collection. A collection race still fails; no failed
collection is retried, no evidence row is deduplicated into a pass, and no
`neutral` or `skipped` result becomes evaluator success.

The full source inventory is still `PROPOSED_NOT_ADOPTED`. This two-workflow
sample is read-only, CI evidence only, and never production authorization. Full
A02 closure still requires adoption/enforcement of the complete release policy
and approval of the exact safe rollback procedure and target. Provider PITR,
object byte/ACL recovery and actual UAT restore remain their separate items.

## Sources

- [Integrated candidate](https://github.com/sultanasiri001-sys/hydroland/pull/567)
- [Main collector attempt history](https://github.com/sultanasiri001-sys/hydroland/actions/runs/41302911678)
- [Main web acceptance](https://github.com/sultanasiri001-sys/hydroland/actions/runs/41302911826)
- [Render deployment behavior](https://render.com/docs/deploys)
- [Render HTTP readiness checks](https://render.com/docs/health-checks)
- [Render PostgreSQL private/external access](https://render.com/docs/postgresql-creating-connecting)
