# A14 — owner onboarding HTTP/PostgreSQL verification

Date: 2026-11-28 (Asia/Riyadh).

## Scope and result

The new `apps/api/scripts/a14-owner-onboarding-http-e2e.mjs` closes the
registration coverage gap in the existing marine document fixtures. The boat
owner begins with the real `POST /api/v1/auth/register` route, verifies the
original email challenge, accepts an actual organization invitation, and uses
that resulting session through vessel and document review. The owner's account,
session, roles, memberships, organization, vessel and document are not seeded
or advanced directly through the database.

The local run passed **10 of 10 scenario groups**, with zero failed groups,
one delivery to the local synthetic email gateway, and zero attempted HTTP
requests outside the three permitted local servers. Seven additional startup
guard checks rejected unsafe or ambiguous invocation before database bootstrap.

This is technical evidence from synthetic identities, data and providers.
It is not real owner acceptance, real document validation, or authorization
for a vessel, course or trip to operate. The existing A14 adoption requirements
and Q01 acceptance work retain their own evidence and decisions.

## Exact code and execution boundary

| Item | Evidence |
| --- | --- |
| Product baseline | [`0b26c759ac9a4be6815ede66b0977f6d8fc60fb7`](https://github.com/sultanasiri001-sys/hydroland/commit/0b26c759ac9a4be6815ede66b0977f6d8fc60fb7) |
| Source tree | `ae5d3d69ae8febccff75b8e28297ded6569e95f2` |
| Isolation from concurrent changes | Detached baseline checkout, with only the new test copied into it; the existing compiled application was built from that baseline |
| Build | `npm run build -w @hydroland/api` — exit 0 |
| Local runtime | Node `v22.23.5`; PostgreSQL `17.12 (Debian 17.12-0+deb13u1)` |
| Run began | `2026-11-27T21:44:59.627Z` / 2026-11-28 00:44:59.627 Asia/Riyadh |
| Run completed | `2026-11-27T21:45:04.543Z` / 2026-11-28 00:45:04.543 Asia/Riyadh |
| Result | Exit 0; `PASS`; 10 passed / 0 failed scenario groups |
| HTTP provider destinations | Local Nest application, local synthetic email gateway, local synthetic object store only |
| External HTTP attempts | `0` |
| Auth email deliveries | `1`, to a generated `example.invalid` identity through the local gateway |
| Cleanup | Application and local gateways closed; a follow-up SQL check found zero `a14_owner_*` schemas; the disposable PostgreSQL process was terminated |

The shared working checkout had concurrent unrelated changes. This result
therefore does **not** claim verification of their integrated tree. The Node 22
and PostgreSQL 16/18 CI matrix must execute the test on the actual proposed
commit before it is used as evidence for that integrated commit. The local
application was rebuilt successfully with Node 22 immediately before the
reported run. No CI result for the new test is claimed here.

## Verified scenarios

| Group | What the real HTTP route and persisted state establish |
| --- | --- |
| Registration | A new account starts `PENDING_VERIFICATION`; no session or bearer tokens are issued. The auth outbox contains no raw challenge. Login and anonymous marine access fail, and the pending identity cannot receive a center membership invitation. |
| Email verification | The application's original auth worker delivers one idempotent email to the local gateway. The test extracts the challenge from that delivered message. A modified challenge fails; the original activates the account and creates its first session. The consumed challenge cannot be replayed or resent. |
| Boat-owner role | The newly verified owner submits a real activation request. An independent administrator approves it. Self-review is denied, and the owner gains no administrator, reviewer or dive-center role. |
| Invitation | An authorized center owner issues a real `OPERATOR` invitation. Unauthorized invitation is denied. Duplicate invitation is idempotent, only the intended recipient sees its notification, and pending membership grants no vessel write access. |
| Acceptance | Only the intended account can accept. Invalid choice types and stale revisions fail; the current invitation becomes active once. Replay fails, and the expected audit actor and owner notification are persisted once. |
| Organization | The registered owner creates a marine organization through HTTP. It remains pending until an independent administrator approves it. The unapproved organization cannot be used to create a vessel, and self-review fails. |
| Vessel | The owner creates a synthetic vessel with its own generated registration identifier and binds it to the review center. The unrelated account cannot bind or see that vessel. The vessel remains `DRAFT`. |
| Document and attachment | The owner submits a synthetic registration document. Missing bytes block forwarding, administration cannot skip the center stage, and an unrelated account cannot modify the document. The synthetic PDF is uploaded through the actual document route, and the center reads back the same bytes. |
| Review sequence | Center `FORWARD` → independent operations `RECOMMEND` → independent platform `VERIFIED`. Skipping operations is denied. The owner cannot act as an operations reviewer. The persisted file hash, stage actors and ordered audit outcomes match the actions. |
| Final state | Verified document bytes and metadata stay immutable. The owner reads back the verified document, while the vessel remains `DRAFT` and no trip is created. The local email and external HTTP counters retain their expected values. |

The existing center, platform administrator, operations reviewer and unrelated
account are synthetic fixture identities. They model independent actors and
use real login and HTTP review routes. Their prerequisite organizational setup
is seeded in the isolated schema. That setup is not evidence of real staffing,
delegation or approval authority.

The local object store preserves uploaded bytes and exercises the application's
upload and signed-access code paths. It does not prove an external storage
provider's credentials, bucket policy, access controls, availability or retention.
Likewise, the local email gateway proves the application delivery and challenge
flow, not delivery to a real mailbox or the mail provider's production health.

## Isolation and refusal checks

The script requires all of the following before it constructs a database
client: `CI=true`, `NODE_ENV=test`, and
`A14_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY`. The database must have a loopback
host and a name matching `a14_owner_onboarding_test` with an optional restricted
test suffix. Connection overrides and an existing API base URL are rejected.

Each execution creates its own random `a14_owner_*` schema, runs the repository's
Prisma schema against that schema, and destroys only that newly created schema
in cleanup. It never drops the database or resets an existing application
schema. The tested database and PostgreSQL process were disposable and local.

The application's provider configuration is replaced for this process only.
Email and object storage point at random loopback ports; other external
integrations are disabled. An HTTP origin allowlist rejects any `fetch` to a
destination outside the three local servers and rejects redirects. Synthetic
credentials and challenges are not included in the result receipt.

The following negative invocations were all rejected by the startup assertions
before database bootstrap: absent CI flag, production environment, absent
disposable-database confirmation, remote database host, unexpected database
name, connection override, and an existing API URL. These are seven separate
startup checks; they are not included in the 10 scenario groups above.

## Reproduction

Use a disposable local PostgreSQL service and a newly created database with the
required test name. Install the repository dependencies, generate the Prisma
client for the code being tested, and build the API before running:

```sh
CI=true \
NODE_ENV=test \
A14_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY \
DATABASE_URL=postgresql://hydroland@127.0.0.1:55432/a14_owner_onboarding_test \
A14_ONBOARDING_RESULT_FILE=/tmp/a14-owner-onboarding-result.json \
node apps/api/scripts/a14-owner-onboarding-http-e2e.mjs
```

The database identity in this example is for the disposable local fixture.
The script starts its own HTTP application and fake gateways. Do not point it
at an existing application or reuse production credentials. Environments that
isolate processes or networks between command invocations must start the local
PostgreSQL server and run the Node test within the same invocation.

The optional result file contains scenario results, runtimes, timestamps,
source and executed-module hashes, counts, and explicit synthetic/production boundaries. It contains
no account identifiers, passwords, access tokens or verification links. CI
should retain that receipt with the job's actual commit identifier.

## Source fingerprints from the passing local run

| File | SHA-256 |
| --- | --- |
| `apps/api/scripts/a14-owner-onboarding-http-e2e.mjs` | `bec80a12846ba7bbb05dafcbda8c55d2a072f9cd35ea4f342ec2980c837e2531` |
| `apps/api/scripts/marine-review-fixture.mjs` | `e5d5e49793acf58b4c6e85bb3925570c536f40cfbca025bd5545e67ea59dae92` |
| `apps/api/prisma/schema.prisma` | `518501bed5d11c8d7ccc90683baca176036ed8e356772ae8dc4fd1d6daf67727` |
| `apps/api/src/auth/auth.service.ts` | `d63151e647172b0f73f765bfafc7b0d0276e08fbef6fc7b63da047c4f5c34d3c` |
| `apps/api/src/organizations/organization-membership.service.ts` | `fe787813b8344037c0007ad8f3c08da87bd4ca572e7ae0d2a24e39cd71f82e8a` |
| `apps/api/src/marine-operations/marine-operations.service.ts` | `7c67a174aa93d6b75cd0dd033a8627cb9e980a2ab3d41b3bef83729363ddbce6` |

### Executed compiled-module fingerprints

These fingerprints bind the receipt to the compiled modules actually loaded.
They supplement the successful build; a hash of a source file alone cannot
establish that an existing `dist` directory was built from it.

| File | SHA-256 |
| --- | --- |
| `apps/api/dist/app.module.js` | `b55d5a8d34e9213d52f1a5b00c31c44c4698521596b66511f0ba8492fd8039ef` |
| `apps/api/dist/auth/auth.service.js` | `da858e3997e827823ae99d0f47f46484cba95b3dbd36fc0ed4c7c2184e21ab89` |
| `apps/api/dist/auth/auth-email-outbox.worker.js` | `37a69ca8039909c3d3773a89c0639ec6a3c26c86feb78d4f357df8daa8587e2e` |
| `apps/api/dist/integrations/email-delivery.service.js` | `7523c6724841be3226a16683bb1f81328081abae08c5b1e48332fad06eb4a3d6` |
| `apps/api/dist/credentials/credential-object-storage.service.js` | `1e13257de609fe12aa5b0c2dbf8b018f0d755418e43d616650426f53f1f14976` |
| `apps/api/dist/organizations/organization-membership.service.js` | `11ff3173c39ff9a5581f0ff85526495567fd2f000d803e65a15e2cf7e74e5586` |
| `apps/api/dist/marine-operations/marine-operations.service.js` | `8264d846b35043cd8cb89de1d7e91fb994622d955b553b1492d26614bb426cd7` |

## Q01 and remaining acceptance

This evidence covers the technical onboarding and review path. Q01 retains
real owner and organization participation, actual original documents, the
authority and suitability of real reviewers, and the browser experience with
the deployed release. Live provider delivery and storage controls also need
their own evidence. No private production record, document, account or link is
copied into this report.

Broader A14 requirements remain governed by their own source and adoption
evidence: see [the clearance snapshot scope](A14_CLEARANCE_SNAPSHOT_2026-11-07.md)
and [the existing-course adoption preflight](A14_STANDARD_ADOPTION_PREFLIGHT_2026-11-13.md).
Passing this fixture does not approve missing source manifests, adopt legacy
training history, close a legal or operational requirement, or grant permission
to start physical operations. Technical completion and operational acceptance
must be recorded against their respective scopes.
