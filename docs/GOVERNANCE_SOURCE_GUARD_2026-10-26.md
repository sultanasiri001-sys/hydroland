# Governance source verification before provider calls

The worker previously allowed a governance task with no valid linked context to reach the model. Routing stopped after the response, which prevented owner approval but still sent a context-free request and consumed provider usage. The worker now fails such tasks with `GOVERNANCE_SOURCE_INVALID` before token counting or response generation. It retains the normal failure receipt, pauses the affected agent and does not retry or create another review.

Each link must have exactly one queue receipt, matching sender and recipient agents, source revision, requester, language, completed source and expected review order. Prior review actions must be `READ_OPERATIONS` and decisions must permit continuation. Source outputs and prior reviews remain unchanged. Missing aggregate snapshots retain their separate `SOURCE_EVIDENCE_UNAVAILABLE` boundary. No schema, business approval, financial limit or automatic correction behavior changes.

The existing loopback HTTP/PostgreSQL acceptance suite checks both provider endpoints for zero calls on standalone, stale, duplicate, mismatched-agent, cross-requester, cross-language, missing-source, wrong prior-action and noncontinuing-prior-review cases. The existing six-stage success path remains the positive control. These fixtures do not call OpenAI or modify production.

Code, tests and release belong to this chat under coordination issue [#523](https://github.com/sultanasiri001-sys/hydroland/issues/523). The evidence chat owns its evidence workbook and operating-gate mapping.
