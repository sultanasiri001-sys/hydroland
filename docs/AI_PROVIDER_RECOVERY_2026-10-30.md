# AI provider pacing and bounded recovery

A temporary provider rejection previously failed the logical task and paused its agent. The runtime now preserves that task in the queue and stores a shared provider cooldown. Completed output is never regenerated.

## Dispatch and recovery

- One global in-flight task remains enforced by the existing serializable runtime lock. A durable interval spaces task starts by 15 seconds by default. Production configuration accepts 5–300 seconds; zero is permitted only in the existing isolated manual-worker loopback fixture. Token counting and generation are also separated in production.
- Retry-After (seconds or HTTP date), exhausted request/token/project-token reset headers and safe numeric bucket values are parsed. Only the allowlisted RPM/RPD/TPM/TPD category is extracted from a bounded error body; raw messages, organization IDs and credentials are discarded.
- A strictly validated compact try-again duration can supply a daily wait when headers omit it. Unrecognized text never becomes a guessed reset time. Recovery deadlines are checked before dispatch, including after long downtime; reviewed operator recovery can renew the time window but never the total attempt cap.
- A confirmed 429 rate rejection or explicit 503 model-overload rejection can be retried. The server minimum is never shortened. Missing hints use exponential backoff with jitter. Four total attempts and a 72-hour automatic recovery window bound retries.
- Daily limits without a known daily reset, invalid delays, unknown 429s and exhausted quota retain queued work behind a durable operator-review hold. A reviewed, revision-bound admin action can clear that hold after any recorded server minimum, subject to current authorization, worker readiness and budget.
- Timeouts, uncertain network outcomes, malformed/incomplete generation output and completed tasks are never automatically replayed. Owner pauses remain effective during a cooldown.
- A separate reviewed recovery action can requeue a failed task with a recorded definite rate/overload rejection. It keeps the logical task ID and receipt history, rejects uncertain/completed work and cannot bypass the total attempt cap.

## Cost and evidence

Each claim has an immutable identity and a separate reservation on its UTC budget day. Reservations remain conservative, including rejected and uncertain attempts. Existing attempts are backfilled without changing their task identities, prompts, outputs or costs; a compatibility path preserves late legacy claims during rollout. Retries across midnight cannot reuse the prior day's reservation.

The logical task retains cumulative reserved/known estimated cost and the count of dispatched attempts whose cost is unknown. These figures are estimates and reservations, not invoices. No provider, model, credential or existing daily budget is changed.

Operation snapshots are matched to the exact successful claim. Prior rejected-attempt snapshots remain in the audit trail and cannot replace or invalidate the successful input. Linked review routing runs only once after successful completion. Email delivery and its existing idempotency/uncertainty protections are unchanged.

Office JSON reviews request at most 1024 output tokens (or the configured lower limit); Abdullah retains the configured formatter allowance. Outputs are never truncated or silently accepted when incomplete.

## Validation

Unit and loopback provider tests cover parsing, clock skew, daily/minute distinctions, invalid/long delays, privacy, quota/unknown holds and bounded policies. HTTP/PostgreSQL acceptance covers worker replacement, shared cooldowns, concurrent claims, duplicate-dispatch fencing, owner pauses, per-claim operation evidence, attempt budgets across UTC midnight, legacy receipt preservation, operator authorization and revoked requesters. Browser regressions cover wait visibility, explicit recovery, safe task identity, mobile layout and role revocation.

Reference: https://developers.openai.com/api/docs/guides/rate-limits (retrieved 2026-10-30).

External provider limits can still be reached. This change handles known temporary limits without losing work or repeatedly requesting completed/uncertain generations; account limits requiring operator action remain explicit.
