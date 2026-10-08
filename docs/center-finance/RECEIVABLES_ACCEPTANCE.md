# Center receivables and collections workspace

Depends on the accountant workspace in #450. Center navigation exposes a separate receivables page while preserving the approved dashboard shortcut layout.

Implemented:
- Paginated lists of center receivables (open or all), issued SAR invoices eligible for an unpaid receivable, and captured payment candidates for a selected receivable.
- Read authority comes from active, consistent accountant employment. Queries bind native keys and scope every result to the selected center. Invoice discovery also rejects ambiguous organization/center mappings.
- Candidate invoices have linked, non-captured CREATED/PENDING/AUTHORIZED payments and an active customer; existing receivables, drafts, unlinked invoices and other centers are excluded from creation choices.
- Payment choices match invoice booking, customer, currency, captured status, available balance and unused collection evidence. Unsupported/void/unlinked provenance exposes no collection action.
- Manual receivable creation uses authoritative invoice/customer/total values, a Riyadh due date and optional explicitly entered installments. Installment amounts must exactly sum to the debt.
- Initial paid evidence cannot reuse an already allocated payment, and collection cannot consume a payment attached to a different receivable. Unissued invoices and cancelled/refunded/failed source payments cannot establish new debt.
- Collection uses the selected payment's exact amount and a receipt number; scheduled receivables require an installment and cancelled installments are denied. Existing transactional guards enforce provenance, duplicate prevention and overpayment limits.
- Detail shows installment balances and the latest 50 collection receipts. Pagination is available for receivables, eligible invoices and payment candidates.
- Role/session fencing, duplicate-submit disabling and stale-data clearing follow the accountant workspace pattern.

Validation scope:
- Compile/type checks, finance validation and web validation/build.
- The four core/finance TEXT/UUID PostgreSQL matrices exercise actual migrations and compiled services; added cases cover discovery isolation, pagination, cancelled/required installments, currency exclusions, receipt history and paid-state views. A concurrent creation/collection race proves a captured payment can be allocated only once; payment candidates are also checked beyond 25 records.
- Real HTTP controller/guard/service/database tests create and fully collect a receivable in each matrix. Token verification alone is fixture-backed.
- Ten browser cases cover creation with installment validation, collection with receipt evidence, overpayment prevention, pagination, empty permissions, recovery, revoked roles and delayed responses after logout.

Remaining before whole-center closure:
- Shift/day close, review and settlement persistence/UI.
- Real-user acceptance using approved center/accountant assignments and invoice/payment evidence.
- The previously observed timing-sensitive global role-revocation/marine-readiness browser checks retain their separate stability follow-up from #450.

No production record is created or collected by these tests or this delivery. This UI records allocations of existing captured payments; provider capture uses the existing payment flow.
