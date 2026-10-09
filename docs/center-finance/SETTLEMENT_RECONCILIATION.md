# Center settlement reconciliation

The accountant workspace can import a Moyasar settlement by UUID using the existing read-only settlement adapter. The operator first synchronizes up to ten older captured invoices at a time when their payment IDs have not yet been linked locally. The importer then matches Moyasar line `payment_id` values exactly against persisted IDs and scopes results to the selected center's organization.

Each import is an immutable, content-hashed snapshot. It stores only matched rows and the safe reconciliation fields needed for review: local/provider payment IDs, line type, currencies, amounts, fees, taxes, transaction time and amount-match result. Card/source payloads, payer IPs, references and provider document URLs are not persisted. A line with an amount or currency mismatch prevents approval.

The submitter cannot review their own import. A first independent approval leaves it pending; a second distinct authorized reviewer closes it as approved. Rejection requires a reason. The workflow creates no finance ledger entries and never captures, refunds, pays out or transfers funds.

The integration lifecycle remains `NOT_SELECTED` unless an operator separately activates it. Provider credentials and production configuration are unchanged. Settlement exports can contain transactions for several organizations, so only exact matches belonging to the selected center are returned; this workspace does not claim to reconcile the merchant-wide bank transfer total.

Validation covers Finance TEXT/UUID migration matrices, API build/type checks, schema validation, finance workflow validation and web syntax/build checks. Real-account acceptance and any production provider activation remain separate operational steps.
