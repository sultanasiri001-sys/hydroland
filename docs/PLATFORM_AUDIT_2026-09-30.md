# Platform audit — 2026-09-30

## Scope and baseline

Read-only review of repository history, workflow evidence, Render deployment metadata and selected application logs. This is not a complete browser, penetration, provider-acceptance or production-transaction audit.

Baseline main: `662e965990c0fda4f26aeec9f5c61594f3444ade` (PR #367).
Both Render services were live on this commit when inspected:

- Web: `dep-datudgc9v7es73auifsg`, completed 2026-09-29 16:27:20 UTC.
- API: `dep-dau175tg1s2s73b2r8b0`, completed 2026-09-29 19:39:27 UTC.
- Latest observed uptime job: `109718520107`, run `36661979603`, success at 2026-09-30 02:54 UTC. Uptime does not establish functional readiness.
- Both service health-check paths were empty. No hosting setting was changed during this review.

## Last known owner acceptance

The prior storage conversation ended with the owner confirming that the uploaded credential file opened. PR #367 had repaired the legacy DocumentStatus schema and large Base64 payload validation. This establishes that specific SANDBOX upload/save/open acceptance; it does not establish full production integration or review-workflow closure. Do not repeat key setup or represent the independent R2/offline adapter as credential-storage proof.

## P1 — production conversation listing returns HTTP 500

Render API log evidence on the baseline:

- 2026-09-29 20:04:25 UTC: `GET /api/v1/messages/conversations` returned 500.
- Stack: `MessagingService.listConversations`, `dist/messaging/messaging.service.js:25:31`.
- Prisma P2010; PostgreSQL 42883: `operator does not exist: uuid = text`.
- At the same observation, notifications returned 200. This is not a whole-service outage.

The canonical messaging migration defines text identifiers, while the production recovery defines native UUID identifiers. Raw bound string parameters were not converted to the deployed key types.

Proposed correction: use the existing profile-service pattern of `jsonb_populate_record` with static Account/Conversation/Message row types to type bound values. Keep indexed columns uncast, participant authorization, parameterized SQL and existing payload limits. Cover every messaging identifier read/write, not only the failing list query. Reject malformed client-supplied identifiers before a UUID conversion can become a server error.

New isolated PostgreSQL coverage invokes the actual MessagingService against both text and UUID key schemas. Nineteen scenarios per schema cover list/create/read/send/read-status, ownership denial, unavailable recipients, invalid inputs, text/voice persistence, bound SQL content and notification recipients. Notifications are a local test double; no email, push or external media upload is performed. The script refuses remote database hosts and requires NODE_ENV=test; all created test schemas are unique and cleaned up.

## P1 — recovery drill does not reach backup/restore

Baseline run `36597753662`, job `109506947346`, failed on 2026-09-29 before any backup or restore:

- `npm run db:deploy` invokes historical recovery scripts before canonical migrations.
- The first recovery script queries `_prisma_migrations` on a fresh database.
- PostgreSQL 42P01: `relation "_prisma_migrations" does not exist`.

There is a second relevant constraint: `.github/workflows/api-validation.yml` explicitly records that historical migrations cannot bootstrap a clean database because of earlier TEXT/UUID foreign-key drift. Therefore simply adding a missing-table guard or running `prisma migrate deploy` first is not a demonstrated complete fix.

This audit does NOT disable, bypass or mark the recovery drill successful. The original workflow remains unchanged. Closure needs an independently tested baseline/replay or genuine isolated backup-restore strategy, including operational extensions and migration-history verification. A successful synthetic fresh schema alone must not be reported as recovery of production data.

## Other release boundaries

- PR #356 records bounded Phase 2 public-interface delivery, not closure of all protected-portal workflows. Maps remain deferred; the training presentation does not establish a live schedules/pricing/enrollment catalog.
- Account, profile, MFA, credential and email-queue changes are merged in PRs #357–#367; their isolated tests do not establish every provider's production activation.
- Issue #329 is still open in the inspected tracker, covering #331 certification, #332 external distress/AIS, #333 Nafath and #334 regulatory access. This records tracker state, not an assertion that no newer owner-held approval exists.
- The internal incident workflow is not automatic external emergency dispatch.
- Stage 3 must not be marked production-closed and no overall completion percentage is inferred from the count of merged PRs.

## Change and validation status

Only messaging compatibility code, its isolated regression test/workflow and this audit are proposed. No production data, credentials, account privileges, historical migrations, provider settings or UI design are changed. No new paid service is created.

Local validation: JavaScript syntax check passed. Full application build and PostgreSQL execution were not available in the local review environment; authoritative results must come from this PR's CI. Do not claim the new 38 scenarios have passed until their workflow evidence is available. Merge, live deployment, authenticated production messaging acceptance and the recovery drill remain separate closure requirements.
