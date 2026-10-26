# Explicit resumption of a deferred governance route

A completed source can retain a queue-full or uninitialized-reviewer receipt without a child review. It previously had no recovery action. A verified administrator can now explicitly resume that referral from the task list, retaining the source result and revision. The review inbox remains read-only.

The POST route rechecks current administration authority, source requester authority, completed state, expected revision, original aggregate evidence when required and valid prior reviews. Only a single operational deferral to the expected reviewer qualifies. Correction requests, owner escalations, missing evidence and failed/interrupted tasks cannot be resumed through this action.

The runtime uses its existing transaction lock and stable review request identity. Concurrent submissions create one child review and one resume receipt; a repeated request returns the existing child without dispatching a model request or changing the source. Audit failure rolls back child creation and both receipts. A still-full queue fails without accumulating duplicate deferral receipts. Paused reviewers and exhausted budgets retain the queued review for the normal worker policy.

The source result is never regenerated. This does not add automatic correction, replay an uncertain model request, approve a recommendation, increase the budget or enable an agent. The UI requires an explicit reason and acknowledgement before referring the saved output and prior reviews to OpenAI within the existing cap. Fresh role revocation, stale revisions and malformed responses cannot appear as a confirmed referral.

Code/release ownership follows coordination issue [#523](https://github.com/sultanasiri001-sys/hydroland/issues/523); evidence-workbook maintenance remains with the evidence chat.
