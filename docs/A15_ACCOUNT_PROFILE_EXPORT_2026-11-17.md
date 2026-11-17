# Account profile correction and scoped download

The account editor previously saved personal-data corrections without an attributed audit event. A correction now commits with its audit in the existing serializable transaction. If audit storage fails, the correction rolls back. Input is bounded and restricted to the existing profile fields, and membership credential references must belong to the account's person. The audit records changed field names without copying the submitted personal values.

`POST /api/v1/me/data-export` downloads the authenticated account's account details, person contact fields, professional profile and role metadata through an explicit field projection. It accepts no target account or arbitrary scope. The response names its included and excluded domains and sets `completePlatformExport: false`: bookings, payments, messages, credential files, medical/emergency-contact data and organization records are outside this version. Password hashes, session tokens, role scopes and storage keys are not selected. The output has a version, SHA-256 digest and attributed audit receipt; a failed audit withholds the response. Profile reads, corrections and downloads carry `Cache-Control: private, no-store`.

The existing account editor exposes a download button with the scope stated before download. It checks the active session and returned account identity after the response. Signing out clears and closes the editor and discards any in-flight export result.

## Validation

The API workflow runs focused compiled-service tests and extends its existing isolated profile HTTP/PostgreSQL suite. The native fixture uses two actual sign-in sessions, checks private headers, account separation, excluded sensitive fields, receipt hashes and actor attribution, injects a real audit-table failure to verify correction rollback and withheld exports, and checks concurrent partial edits and suspended-session denial. Browser regressions exercise a downloaded file, failure/foreign-account refusal and logout while a response is pending.

This supplies the account-profile portion of A15. The full data-subject request lifecycle, exports for other domains, erasure/refusal and appeal decisions, authorized retention periods and legal-hold enforcement remain separate acceptance work. It does not introduce erasure, invent retention periods or assert legal compliance for the entire platform.
