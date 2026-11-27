# D02 — internal training results and certification adapter preparation

## Scope and current evidence

D02.01 requires correct internal results, separation from an external agency
certificate, and an adapter with contract tests. An official connection is not
ready before the selected agency provides the required evidence.

This implementation prepares and exercises a **HYDROLAND-owned TEST contract**.
It does not claim compatibility with any unselected agency's API, conduct an
external training operation, issue an agency certificate, or approve a real
participant's medical/guardian requirements. A future agency must accept this
contract or have a separately implemented adapter for its actual contract.

The existing native enrollment, assignment, session, skill, source-bound program,
completion and independent internal-certificate workflow remains the source of
truth. The adapter cannot turn a `COMPLETED` record into an approved internal
certificate. It requires a current `APPROVED` internal certificate and its
original `HYD-TRN-*` number.

The implementation builds on merged D01 commit
`631d4437ec1ec4239235053e1a4ca708919ca324`. Local checks use synthetic records.
PR, main CI and live-release evidence are recorded separately after they occur;
this document does not claim a completed release or agency acceptance.

## Internal result, reconsideration and revocation

The instructor's certificate readiness and the independent review queue use the
same current completion gate as recommendation and approval. A stored 100% flag
cannot hide a withdrawn program, missing qualification, invalid participation
source or incomplete original training evidence. Readiness reads do not write
training records, certificates, consent or audit entries. Unexpected database
errors remain errors. The displayed reasons are coarse codes and never disclose
medical, guardian, identity or attachment contents to a certificate reviewer.

An authenticated student can read their own internal results through
`GET /training/mine/certificates`. `GET /training/certificates/:id` rechecks the
current student, assigned instructor or reviewer scope. The existing instructor
list and review queue include server-derived action permissions and separate
`internalResult` / `externalCertification` objects. The website has Arabic and
English controls for the following internal actions:

| Route | State and authority |
|---|---|
| `POST /training/certificates/:id/reconsideration` | The student or currently assigned instructor requests reconsideration of a rejection. The original rejection remains in force while the request is pending. |
| `POST /training/certificates/:id/reconsideration-decision` | An independent reviewer dismisses the request or reopens it as `RECOMMENDED`. Reopening grants no approval or number; ordinary approval must pass all current source gates again. |
| `POST /training/certificates/:id/revoke` | An independent reviewer revokes an approved internal result. `REVOKED` is terminal, and the original number, issuance time and decision history remain available. No external certificate is revoked. |

The original rejecting reviewer may consider new information when still
independent of the participant, instructor and requester. No unsupported
requirement for an entirely different reviewer is imposed. Lifecycle commands
carry an exact request ID and expected revision. The same request is idempotent;
changed input, stale revisions and competing decisions cannot overwrite history.
Audit and state changes commit together in a serializable transaction. The
existing append-only audit migration protects the original decision evidence.

Program adoption changes the D01 source binding. The native acceptance sequence
keeps the first consent that permits adoption, confirms `PARTICIPATION_SUBJECT_CHANGED`
after adoption, refreshes the case sources, and obtains a new personal signature
and independent review before scheduling the activity. The earlier signature
is retained unchanged; no consent is backdated.

An approved result supplies an adapter binding only when its original approval
audit event, reviewer identity, certificate state and native evidence digest
still match. Historical approvals without that new digest remain internal
history and do not silently become certified adapter input.

## Components

| Component | Responsibility |
|---|---|
| `apps/api/src/governance/training-certification-contract.ts` | Strict request/source/receipt parsing, canonical digest, contract descriptor, immutable external boundary returned as a new DTO. |
| `apps/api/src/governance/training-certification-adapter.ts` | TEST-only execution with a trusted current-source reader, atomic attempt-store interface, bounded synthetic driver, freshness checks, sanitized outcomes and idempotency. |
| `TrainingCertificateService.readCertificationSource(actorId, certificateId)` | Read-only native input reader: current reviewer authorization, approved internal result and original audit evidence, real completion/participation/program readiness, and a digest of current native evidence. It returns a source DTO or `null`; it does not dispatch. |
| `apps/api/scripts/d02-certification-adapter.test.mjs` | Executable parser/adversarial tests and actual HTTP exchanges against an ephemeral server bound to `127.0.0.1`; no database, provider credential or external network target. |

The adapter imports neither the F08 lab nor its permissions. An integration
environment variable, including `CERTIFICATION=PRODUCTION_ENABLED`, cannot grant
this adapter real external issuance. It does not select an agency endpoint or
read a secret registry. The existing generic integration remains disconnected
until actual commissioning is implemented and evidenced.

## Request contract

The exact protocol is `HYDROLAND_TRAINING_CERTIFICATION_V1`. Every listed key is
required; unknown keys, arrays used as enum values, non-string identifiers,
control characters and invalid timestamps are rejected. All IDs are lowercase
UUIDs, digests are lowercase 64-character SHA-256 values, and timestamps are
explicit UTC. Requests expire after fifteen minutes. The maximum encoded
message size is 16 KiB.

```json
{
  "protocol": "HYDROLAND_TRAINING_CERTIFICATION_V1",
  "mode": "TEST",
  "requestId": "<UUID>",
  "requestedAt": "<UTC timestamp>",
  "binding": {
    "organizationId": "<UUID>",
    "enrollmentId": "<UUID>",
    "trainingRecordId": "<UUID>",
    "participantAccountId": "<UUID>",
    "agencyCode": "<native program source>",
    "programCode": "<native program source>",
    "edition": "<native program source>",
    "profileHash": "<SHA-256>",
    "resultDigest": "<current native evidence SHA-256>"
  },
  "internalResult": {
    "status": "APPROVED",
    "certificateId": "<UUID>",
    "certificateNumber": "HYD-TRN-2026-1234567890ABCDEF"
  }
}
```

The example is structural, with placeholders; it is not an operational payload.
The real caller must build the binding and result digest from native records and
current evidence. A browser assertion is not a trusted source. The shared source
reader must freshly authorize the actor and return `null` when native completion,
current participant prerequisites, or the approved internal result do not hold.
Authorization and database failures propagate; they do not become a successful
contract result.

The future external data-use contract must determine which participant reference
may be exchanged. This TEST schema does not itself authorize exporting account
identifiers. No medical payload, identity attachment, password or provider secret
is part of the contract or adapter result.

## Execution and receipt binding

1. Parse the request, including the internal approval and number.
2. Read and authorize the current native source; compare the complete binding and
   internal result with the request.
3. With no driver, return `NOT_CONNECTED` without reserving or dispatching.
4. With an explicitly synthetic driver, reserve the actor/organization/request-ID
   key atomically against the complete request digest. The store starts the lease
   when it acquires the reservation; its duration is the driver timeout plus ten
   seconds, not time spent waiting for a lock.
5. Read the source again after reservation and before dispatch.
6. Atomically mark the exchange start with the exact unexpired token, then execute
   the driver with an abort signal and a 1–8000 ms timeout; default 2000 ms.
7. Parse the synthetic receipt, match the entire binding, internal certificate ID,
   request ID and request digest, and check receipt chronology.
8. Read the source again, then complete the exact reservation. The store must
   compare its token atomically. A persistence/audit failure is an error, not
   acceptance.

Every receipt must declare `mode: TEST`, `synthetic: true`,
`officialIssuance: false` and `externalCertificateNumber: null`. Its outcome is
only `CONTRACT_ACCEPTED` or `UNKNOWN`. A matching receipt demonstrates agreement
with this platform test contract, not agreement by an actual agency.

Source drift invalidates an otherwise valid response. Replayed attempts re-read
current source authority and reject a changed source. A concurrent request sees
`REQUEST_IN_FLIGHT`; reusing the ID with different content returns
`IDEMPOTENCY_CONFLICT`. Timeout/failure results are retained and replayed without
another dispatch. A late success cannot overwrite a stored timeout result.

## Persistence and recovery boundary

The engine requires an injected `TrainingCertificationAttemptStore`. The test
suite provides an explicitly ephemeral, atomic-in-process store to exercise the
contract. That substitute is **not** durable production storage or a multi-worker
idempotency claim.

The required atomic operations are `reserve`, `beginExchange`, `finish` and
`recover`. A future connected caller must implement them on native persistence,
bind the attempt to its authorized actor/source, and commit the audit with each
transition. The lease and consumed token fence workers before exchange start and
before completion. An existing key is never deleted or re-reserved.

If a source read or final persistence throws, the engine aborts the synthetic
driver and asks `recover` to record `UNKNOWN / ATTEMPT_INTERRUPTED` for its exact
token. The original authorization/database error still propagates. If recovery
also fails, an `AggregateError` preserves both errors and the original cause;
neither error is converted into acceptance. A retry while the lease is live
reports `REQUEST_IN_FLIGHT`. After expiry, recovery consumes the reservation into
the fixed unknown result without another exchange. A delayed original worker
cannot dispatch after fencing or replace that result with a late success.

Recovery always preserves a previously committed result, including when only
the commit acknowledgment was lost. Its `syntheticRequestAttempted` value comes
from the store's recorded exchange-start marker. That boolean records the start
of an application attempt, not proof of receipt by a remote party. A failure
before this marker remains `false`. Stored results are projected through a
closed outcome-code list, valid UTC chronology, boolean checks and the fixed
external boundary; arbitrary cached content is never returned.

The fifteen-minute request expiry remains enforced on normal execution. A
durable caller must also reconcile older expired leases through the same
`recover` primitive under its own current authorization and audit boundary;
it must not refresh the timestamp or create a new attempt to conceal unresolved
history. This TEST framework exposes no production dispatch endpoint or
provider business operation.

## Truthful output

| Adapter status | Meaning |
|---|---|
| `NOT_CONNECTED` | No adapter driver is connected. No synthetic or external request was made. |
| `UNKNOWN` | Source mismatch, in-flight/conflicting request, timeout, failure, invalid receipt or explicit unknown test result. It never authorizes issuance. |
| `CONTRACT_ACCEPTED` | An exact synthetic receipt passed this platform contract and current-source checks. |

Every outcome retains:

```json
{
  "officialIssuance": false,
  "externalCertification": {
    "status": "NOT_CONNECTED",
    "provider": null,
    "program": null,
    "edition": null,
    "certificateNumber": null,
    "verifiedAt": null,
    "officialIssuance": false,
    "operationalAuthority": false
  }
}
```

Driver messages and response bodies are not echoed in errors. The engine returns
fixed codes, correlation digest, time, replay indicator and whether a synthetic
request was attempted. It does not return native participant/program details or
the internal certificate number in the adapter outcome. The ordinary certificate
presentation keeps its existing separately labeled internal result.

## Validation command and coverage

```sh
node --experimental-strip-types --test --test-reporter=tap apps/api/scripts/d02-certification-adapter.test.mjs
```

The suite exercises exact request/receipt binding, enum coercion and unknown
fields, invalid/future/expired time, approval requirement, current source drift
before and after dispatch, separate actor/organization keys, concurrent duplicate
requests, idempotent failure, sanitized errors, malformed cached results, late
responses and persistence failure. Actual loopback HTTP cases cover acceptance,
redirect refusal, authentication failure, non-JSON/malformed/oversized responses
and timeout. No external provider is contacted or selected.

Local isolated result after the recovery changes: **70 tests passed, 0 failed,
0 skipped, 0 cancelled**. This count includes source failure before and after
exchange, lost reservation/commit acknowledgments, failed recovery followed by
lease expiry, and fencing of paused workers before dispatch and completion.
The native database suite separately connects this engine to
`readCertificationSource`; its execution result must be recorded from its own
receipt, not inferred from these isolated test doubles.

`apps/api/scripts/d02-training-certification-http-checks.cjs` passed **19/19 native
HTTP/PostgreSQL groups** locally on PostgreSQL 16.16. It completes nine synthetic
courses through the actual registration, source adoption, consent, attendance,
assessment and completion routes. It then verifies current readiness, internal
approval, immutable audit evidence, reconsideration, revocation, concurrent
requests, rollback and the adapter bridge against the real native source reader.
Program and D01 revocation both invalidate a receipt during dispatch and prevent
a later dispatch. The run made no external HTTP requests and issued no agency
certificate. CI repeats this suite on PostgreSQL 18 with the original audit and
D01 migrations, retaining its actual-version receipt and the 70-case contract TAP.

Acceptance of this layer establishes platform-side technical preparation. Official
certification still requires the selected agency, program and edition, authorized
data-use/connection terms, its adapter mapping, verified provider evidence and
actual commissioning. D17/D19 and the final personal Q01 acceptance are unchanged.
