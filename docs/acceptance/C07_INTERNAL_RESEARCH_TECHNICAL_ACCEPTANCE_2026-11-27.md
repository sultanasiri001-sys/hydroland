# C07 — internal research technical acceptance

Reviewed on 27 November 2026 against main commit
`95b0d91cc7f8090b5f17a63d12bf81c05232e402` and tree
`831847ca03ba77d15095972b3339e5ad7e24fe65`.

## Result and scope

The existing internal research API and owner/reviewer interface implement the
technical C07 lifecycle. The review found no missing lifecycle implementation
that calls for rebuilding those parts. The verified scope is
`INTERNAL_DESK_RESEARCH_V1`: a controlled internal record with proposal and result
review. This receipt supports technical closure under the owner's instruction to
finish verified technical work and leave the final platform acceptance to Q01.

Actual study acceptance remains separate. This review did not create a study,
source document, employee appointment, reviewer assignment or human decision in
production. It did not authorize research outside the internal record, model
calls, expenditure, publishing, investment or a department closure. These
restrictions remain enforced by the service and the browser response contract.

## Existing implementation confirmed

| Capability | Implementation and verified boundary |
| --- | --- |
| Proposal and result | Owner creates a proposal containing title, objective, method, limitations and optional native source references. A result requires at least one valid native source. Unsupported fields and client-supplied authority are rejected. |
| Versioned evidence | Sources are exact-version RND documents in the same organization. Server-resolved content/source hashes and document authors bind the review. New proposal or result revisions invalidate their corresponding acceptance while preserving append-only history. |
| Independent review | The selected actual employee must have current verified account, department, position, employment, membership and role. The initiative creator, owner, content author and referenced source authors cannot approve their own evidence. |
| Explicit decisions | Proposal approval enables a separate owner START. Result approval enables a separate owner COMPLETE. Both accepted reviews, source versions and participant/owner bindings are checked again before completion. |
| Return and withdrawal | RETURN and REJECT support explicit rework. An active assignment must be revoked before content changes. Revoked and restored roles do not silently restore old review access. Cancellation is terminal; archive follows completion. |
| Concurrency and audit | Version checks, exact preview hashes, serializable transactions and conditional head writes stop stale/replayed confirmation. Audit failure rolls back the mutation. Database triggers protect revision/audit evidence. |
| Browser behavior | Owner and reviewer screens recheck the actual session before actions, clear private data on context changes, reject changed scope or authority, and require readback after uncertain writes. The browser never turns a fabricated `COMPLETED` response into accepted study evidence. |

The runtime is described in [the API documentation](../INTERNAL_RESEARCH_RUNTIME.md)
and [the owner/reviewer UI documentation](../INTERNAL_RESEARCH_UI.md). The
implementation uses the existing `internal-research.service.ts`,
`internal-research.domain.ts`, controller, migration and research browser modules.
This audit introduces no runtime, permission or schema changes.

## Exact-source verification

| Evidence | Observed result |
| --- | --- |
| [Internal research HTTP database acceptance, run 45950108966](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45950108966/job/140343743799) | Successful on the exact main commit. Typecheck/build passed; all **32 actual HTTP/PostgreSQL groups** passed. Fixtures used synthetic actors in an isolated database. |
| Same research job: additive migration | All **4 Organization/Account TEXT/UUID combinations** passed native Prisma access, foreign keys, state/expiry/receipt constraints, append-only history and atomic rollback checks. This is the tested identity matrix, not a claim about every possible deployment history. |
| [Web validation: scoped research owner and reviewer regression](https://github.com/sultanasiri001-sys/hydroland/actions/runs/45950109048/job/140343743987) | The dedicated `research-runtime.spec.js` step ran **30 Chromium cases, 30 passed** on the same main commit. These exercise the shipped UI with controlled API response fixtures. Actual persisted API behavior is covered independently by the HTTP/PostgreSQL job above. |
| Read-only live verification, 27 November 2026 | API readiness returned HTTP 200, database `ok`, and the exact source commit. The three served research JS/CSS assets returned HTTP 200 and matched the checked source bytes. Both owner and reviewer API collections rejected anonymous access with HTTP 401. No production record was written. |

Live asset hashes from that verification:

| Asset | SHA-256 of both served and checked source bytes |
| --- | --- |
| `hydroland-research-runtime.js` | `b72cce0e93fd4b49c4ec9e872e52727f2b512cfe96075e8edcc61e6ed2ec50b1` |
| `hydroland-research-contract.js` | `f077957b0d3701285b2fa830c97edd38cea0a15e43ad342f2a381801ac42e98b` |
| `hydroland-research-runtime.css` | `775b6dd588073a5900e831d0f91dae1543cdb7325c8bfcf78b2dccbbbecd3623` |

The HTTP log includes successful proposal-to-archive flow, rejected/self/source
author reviews, return/rework, stale evidence, revoked qualification and owner
changes, natural assignment expiry, raced confirmations, rollback, paging and
append-only protection. Natural expiry ends pending assignment access without
inventing a deadline for the study itself; a timely recorded receipt still
requires fresh authority/source checks when used.

These are retained results from the stated commit. They do not claim that any
future commit or changed study has passed. Q01 must reference its actual current
release and the real records selected for final acceptance.

## Acceptance criteria retained for Q01

The original criteria in [HYD-46](https://linear.app/hydroland/issue/HYD-46/c07-qbwl-dwrh-alabhath-alfalyh-walntyjh-lsahbha)
are preserved:

| Criterion | Technical result | Real operating evidence still required |
| --- | --- | --- |
| C07.01 — authorized pilot study | The proposal, scope, independent review and owner start path are implemented and tested. | An actual authorized study with its named owner and appropriate scope. |
| C07.02 — versions and evidence for the actual study | Exact source versions, revision history, invalidation and audit protections are implemented and tested. | That study's genuine sources, proposal/result versions and evidence. |
| C07.03 — correct review of the actual study | Scoped independent employee review, return/reject/rework and owner completion are implemented and tested. | The qualified independent reviewer's actual decision and the owner's actual result acceptance. |
| C07.04 — no AI recommendation presented as investment or final approval | Satisfied within the internal research path: API responses prohibit external execution and department closure; the UI rejects responses claiming them. | Any later operating, investment or external execution decision remains outside this receipt. |

The technical tracker may therefore use **owner-closed technical scope** while
keeping C07.01–C07.03 partial/unverified for actual use. Do not convert synthetic
fixtures, CI counts or this receipt into those human/operating acceptances, and
do not assign a fabricated 100% operating acceptance percentage.
