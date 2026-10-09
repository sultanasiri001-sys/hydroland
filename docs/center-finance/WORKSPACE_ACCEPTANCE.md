# Center accountant shift workspace

Scope: continue center-portal delivery after merged #448 (b4d7b33f). The center portal now links to accountant shifts separately from its existing period/payment reports.

Implemented:
- Discover centers through active accountant employment, consistent Position/OrgUnit/Organization mapping and active account. Center ownership alone does not grant finance authority. Web entry also requires current center portal access.
- Read only the current accountant's active shift, full-ledger totals, latest 50 entries, empty eligible recipient shifts, and incoming/outgoing pending handovers. API repeats employment authorization inside the snapshot transaction and rejects ambiguous center mappings.
- Open a shift, submit counted cash with a mandatory explanation for variance, and accept incoming custody after explicit acknowledgment. The existing service owns all writes.
- Freeze incoming recipients against entries/outgoing handovers until acceptance, and reject a second pending handover to that recipient. Checks and receiver locks run in serializable transactions.
- Invalidate web data on role/session loss, fence delayed reads/writes, disable duplicate submissions, clear stale balances after failed refresh, and reload after successful writes.
- Reject payment/shift currency mismatches and non-SAR or mismatched handovers; recipient discovery excludes unsupported currencies.
- Preserve native TEXT/UUID keys, existing schema/migrations and accounting policy. No production records are changed by this PR.

Validation:
- API build, finance validation, web static validation and web production build.
- Existing loopback PostgreSQL matrix extended with workspace isolation, totals, revocation, receiver exclusion, handover interference and real HTTP/controller checks across all four core/financial TEXT/UUID combinations. HTTP uses the actual AccessTokenGuard with only token verification replaced by a fixture token map; it does not replace existing authentication E2E coverage.
- Ten browser cases cover navigation, responsive layout, exact money conversion, duplicate-click prevention, variance, acceptance, empty permissions, center switching, refresh recovery, role loss and late read/write responses after logout.

Not claimed closed by this slice:
- Manual end-user acceptance with real center/accountant assignments.
- Receivable creation/collection UI with scoped invoice/payment selection.
- Center shift close/review/settlement workflow and complete center-portal acceptance.
- Marine and organization portals, historical database adoption (#446), and real production backup/restore verification.

Draft changes require successful CI and review before deployment. A successful synthetic fixture is not proof of a real production operation or backup.
