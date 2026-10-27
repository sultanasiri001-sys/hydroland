# Internal research owner/reviewer interface

This UI depends on the persisted `INTERNAL_DESK_RESEARCH_V1` API described in INTERNAL_RESEARCH_RUNTIME.md. It adds no roles, API permissions, schema, migration or operational evidence.

## Entry points

Authenticated ADMIN accounts see **سجلات البحث الداخلي (للمالك)** in the profile menu; the server still accepts only the current verified internal-platform owner. Existing STAFF/ADMIN accounts see **مراجعات البحث المكلّفة**; the server returns only their actual active scoped assignments. A visible menu item never establishes owner or reviewer eligibility.

The owner can page through records, prepare briefs/result revisions, browse paginated eligible real employees, preview exact assignment sources/permissions/expiry, explicitly confirm assignment, revoke pending review, and separately preview/confirm start, completion, cancellation or archive. Reviewers read their exact assigned phase/source fields and separately preview/confirm APPROVE/RETURN/REJECT from their own account.

Creation/revision preview is explicitly **local content preview**, not server evidence validation. The server validates actual current references on confirmation. Assignment/lifecycle previews are server plans, pinned to the read revision. References use `document UUID @ version`, at most five; arbitrary URLs/hashes or invented employee identities cannot be submitted as evidence/qualifications.

## Browser safety boundaries

- Every data read and write first freshly reads `/me` and verifies active role/account and unchanged actual account/session; server remains authoritative for owner scope and employee/independence qualification.
- Exact policy/version/organization/record/phase/state/source-reference/receipt schemas fail closed. Proposal grants reject result bytes. Responses cannot claim external execution or department closure.
- Editing a form removes its previous preview. Confirm checkboxes do not invalidate themselves; a separate explicit confirmation is required. Requests are single-flight.
- A conflict, failed transport, malformed/empty successful response, mismatched scope/actor/state or unconfirmed result clears the form and locks writes until explicit readback. No automatic retry after an uncertain mutation result. The shared authentication fetch wrapper may perform its existing bounded 401/token-refresh retry before an authenticated operation.
- Close, Escape, browser Back/Forward, session/auth/role/portal/workspace change abort pending requests and erase private DOM/data. Late responses cannot reappear in a newer context.
- Server/user text is rendered with `textContent`, not dynamic HTML. Dialog is keyboard accessible and responsive; no localStorage/sessionStorage private draft persistence.
- Labels explicitly distinguish internal record completion from operational acceptance, publishing, expenditure or department closure.

## Checks

`npm test -w @hydroland/web` includes 10 actual contract-library Node tests and 28 actual-runtime state/replay tests with a limited DOM shim, alongside the 14 existing Node tests and existing validators. `npm run build -w @hydroland/web` packages the module; the loader orders contract before runtime. `npm run test:e2e -w @hydroland/web -- research-runtime.spec.js` is the dedicated shipped-browser suite, also discovered by the normal full browser run.

Local contract/static/build checks pass. Thirty browser cases are authored/discovered, not claimed executed locally: the environment's established Chromium IPC restriction remains in force. The independent security review additionally used a limited DOM/VM shim for actual runtime write/session behavior; it is not a substitute for Chromium rendering, native form events or focus/mobile verification. Browser execution remains pending authorized publication/CI or another explicitly permitted environment. No remote publication or deployment of this UI is implied by this document.
