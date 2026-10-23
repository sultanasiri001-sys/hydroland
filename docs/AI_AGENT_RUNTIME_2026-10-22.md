# Managed AI execution and workforce controls

The previous agent catalogue and `/agents/plans` endpoint describe safe planning boundaries; they are not an execution engine. The managed runtime adds a canonical persisted identity/control record for each of the eight catalogue agents and a durable task ledger. Human employment, platform accounts, centre membership and IAM assignments stay independent.

## Ownership and permissions

The internal platform agents map to canonical departments: executive governance; marketing/growth (marketing, sales and social); customer experience; inventory/logistics; legal/contracts/insurance; and technology/cybersecurity. A fresh active, verified global ADMIN is required for every management read/write. Initialisation creates PAUSED controls only and grants no roles. Each task is attributable to its requester, agent, action, model, execution policy, UTC budget day and immutable audit events. Provider requests contain the administrator's reviewed brief and, for READ_OPERATIONS, only an aggregate business-service snapshot. No account, credential, medical or HR records are automatically sent.

## Pause, restart and duplicate prevention

Pause and claim share the same serialised database boundary. Work admitted before pause may finish; queued work remains stored and cannot start until explicitly enabled. Global and per-agent concurrency are one. Each task has one claim and a durable dispatch marker. A repeated HTTP request uses the same requester/request UUID and fingerprint; a changed payload conflicts. Repeated dispatch/finalisation cannot repeat a model request or its receipt.

A process interruption or uncertain provider response leaves INTERRUPTED work for human review and pauses the agent. It never returns that task to QUEUED. Late results are retained without reviving the interrupted task. Reviewing failure preserves history and does not retry. Queued tasks can be cancelled explicitly. The runtime rechecks a queued requester's administrative authority before claim. Provider/audit failures cannot partially commit controls, task creation, claims, cost reservation or receipts.

## Measured workload

The worker polls every five seconds and persists its observation/configuration identity. Measurements older than 90 seconds or from an unavailable provider produce `UNAVAILABLE` and null counts. Fresh counts come from task rows: running, queued, waiting more than 15 minutes, and unresolved FAILED/INTERRUPTED tasks. Three queued tasks, any overdue task or unresolved failure means HIGH; other running/queued work means BUSY; a measured empty workload means AVAILABLE. Operating state is reported separately. No browser timer invents counts or availability.

## Provider and cost gate

There is no default live model or budget. AI_MODEL must be SANDBOX or PRODUCTION_ENABLED, the selected provider must be OPENAI, and credentials, a model, input/output prices and a positive daily budget must be explicitly configured. The adapter uses Responses with no tools, no external actions and `store:false`. It counts the same input messages before generation and bounds total output tokens. Only completed, bounded text and valid usage become a completed receipt. Every non-read result remains a draft requiring a separate human decision; this runtime cannot send messages, change roles, bypass safety, charge/refund payments or sign contracts.

Configuration uses `HYDROLAND_AI_MODEL`, `HYDROLAND_AI_INPUT_MICRO_USD_PER_MILLION`, `HYDROLAND_AI_OUTPUT_MICRO_USD_PER_MILLION`, `HYDROLAND_AI_DAILY_BUDGET_MICRO_USD`, and optional bounded input/output token limits. `OPENAI_API_KEY` is server-only. Cost is an estimate using the stored rate snapshot, not a provider invoice. A task reserves its maximum input/output cost before dispatch. Reservations remain charged against the UTC admission day even after uncertainty/failure; the runtime does not assume a failed network response was free. The daily budget cannot be exceeded by concurrent claims. There are no automatic provider retries. Test endpoint overrides require NODE_ENV=test and loopback HTTP; invalid overrides fail closed.

Official API contracts: [text generation](https://developers.openai.com/api/docs/guides/text) and [token counting](https://developers.openai.com/api/docs/guides/token-counting). The adapter reads text message items without assuming the first output item is text, and uses reported input/output usage including non-visible generated tokens.

## Persistence and verification

Before adding persistence, the production database was inspected read-only on 22 October: 87 completed migrations, zero unresolved migrations, and all 87 checksums identical to the repository. The latest staffing-structure audit matched the live setup. Canonical Account identifiers are UUID. The additive migration preserves both UUID and legacy TEXT accounts and does not change any existing migration or identity/role table.

Local API typecheck/build and phase-10/RBAC checks passed. All ten checks on backend commit 08b6c7b passed, including isolated TEXT/UUID forward migration, actual HTTP/PostgreSQL admission, concurrent requests/claims, durable dispatch, in-flight pause, persisted resume, budget exhaustion with queued work, stale measurements, interrupted/late results and revoked administrator tests. Model traffic was loopback only.

The unified employee screen now includes expandable AI controls, measured workload, a reviewed task form, cursor task history and per-agent pause/resume. The AI sidebar opens this same employee workspace. Fresh authorization precedes actions; losing access or leaving the workspace clears private fields. Old measurements become unknown, provider readiness cannot be bypassed by refreshing the human section, failures retain reviewed form values and queue retries retain their request identity. Provider text is escaped. No credential entry is exposed in the workforce UI.

Six focused browser regressions and connected browser/PostgreSQL acceptance are included in the initial runtime release. Connected acceptance uses the real automatic worker, holds a loopback generation while pausing, restarts the API process with a task still queued, then resumes and checks exactly one dispatch per task, aggregate business reads, escaped model output and logout privacy. That release shipped in `c7d32da641a53abf8844914515e32e7ec78dab39` (#490). No production model generation, employee change or paid usage is part of those fixtures.

## Explicit connection check without generation

`GET /admin/agents/provider-connection` requires an active, verified global ADMIN before the provider call and again before returning its result. The employee workspace offers an explicit **فحص الاتصال دون توليد** button; opening or refreshing the workspace never calls this diagnostic automatically. It reads only `GET /v1/models/{configured-model}` with the server credential. It does not count input tokens, create a response, enable agents, create tasks or reserve budget. A five-second deadline, bounded response, redirect rejection and sanitized error codes keep the diagnostic separate from model execution. No credential or upstream error text is returned.

Success means the key could read the selected model's metadata at the displayed time. It does not establish generation access, paid quota, billing credit or end-to-end task completion. The UI labels configuration readiness separately, clears obsolete checks when the model/configuration becomes unavailable, preserves reviewed drafts, and discards late results after navigation or access loss.

On 23 October 2026 (Saudi time), read-only verification of the initial release confirmed Web/API live on `c7d32da`, API/database readiness, 88 completed migrations with none unresolved, a fresh worker heartbeat matching the configured model/budget, eight PAUSED controls and zero tasks, dispatches or reservations. Server configuration selected `gpt-6-luna`, standard input/output rates of $0.10/$0.50 per million tokens, 2048/512 input/output bounds, and an internal conservative budget of $0.01 per UTC day. A separate model-metadata GET using the approved local key returned HTTP 200. This is not a provider billing statement or proof of generation. Dedicated production employee acceptance and actual model-generation acceptance remain open in #472; do not close them based on this diagnostic.
