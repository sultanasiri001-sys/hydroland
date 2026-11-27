# D05 — Native mobile product journeys

## Scope and acceptance boundary

Tracker: **D05 / HYD-59**. The original criterion remains:

> مسارات كاملة لعقد API نفسه: حساب/مؤهل/حجز/تدريب/رحلة/مالية/إشعار؛ كل وظيفة ويب مستبعدة لها قرار منتج صريح

This implementation adds seven native Expo Router destinations connected to the existing API. It replaces the previous guest/login/TripDay-only product surface with account, credentials, trip discovery, personal booking, training, financial records and notification workflows. Shared session, MFA, encrypted offline storage and TripDay are supplied by D06. Native packaging and virtual-device evidence are supplied by D07/D10.

**This evidence does not establish full web/mobile parity or record a product decision to exclude a web function.** The uncovered web areas below remain visible for an explicit product decision or further implementation. The original criterion must not be changed to “fully satisfied” solely from these tests. Real device acceptance remains Q01. No actual customer account, operational approval, financial payment/refund, external certificate, message or production provider configuration was created for this work.

## Implemented journeys and API contracts

All paths below are relative to the existing `/api/v1` base. The mobile transport uses the same authenticated server controllers as the web; there is no mobile-specific authority override, alternate mock production API, client-supplied acting account, owner identity or role.

| Journey | Native destination and completed behavior | Main server contracts |
|---|---|---|
| Account | Guest entry; register, email verification, password reset, password/MFA login; native protected return; profile correction; diver/emergency details and personal equipment; MFA enrollment/disable/recovery-code display; scoped data export and correction/erasure requests; logout | `/auth/*`, `/me`, `/me/diver-profile/*`, `/me/data-export*`, `/me/data-requests*`, `/me/membership-pass` |
| Credential | List/create personal credential; native PDF/JPEG/PNG selection and actual-byte upload; submit for verification; original signed document access; authorized reviewer queue, official verification-source selection, evidence recording and review decision | `/credentials`, `/credentials/:id/documents`, `/credentials/:id/submit`, `/credentials/:id/documents/:documentId/access`, `/credentials/verification-organizations`, `/credentials/admin/*` |
| Trip | Public live catalog with original server price, time, capacity and policy state; confirmed seat request; actual returned booking; own instructor/boat completed-history pages; native TripDay link | `/trips`, `/trips/:id/bookings`, `/trips/completed/mine?role=instructor\|boat&page=N`; D06 `/mobile-offline/trips/:id/{status,package,drafts}` and `/trip-intelligence/:id/offline-package/payloads/:mediaKey` |
| Booking | Own booking list/detail and participants; participant correction without granting eligibility; original terms; explicit accepted-quote checkout; server payment refresh after provider return; owner cancellation and financial-review boundary | `/trips/bookings/mine`, `/trips/bookings/:id/participants`, `/trips/bookings/:id/participants/:participantId`, `/trips/bookings/:id/cancel`, `/payments/bookings/:id/quote`, `/payments` |
| Training | Public course catalog/enrollment; own course record/stages/skills/sessions; original course terms, checkout and cancellation evaluation; internal certificate result/history/reconsideration; authorized instructor assignments, plan, fixed standard selection, skill assessment, attendance, completion and certificate recommendation | `/store/courses`, `/store/courses/:id/enroll`, `/training/mine/*`, `/training/enrollments/:id`, `/training/professional/me/*`, `/training/skills/:id/assessment`, `/training/certificates/:id*`, `/payments/courses/:id/*` |
| Finance | Own payments, provider refresh and refund-review request; authenticated original invoice download/share; permission-gated original PDF attachment and organization invoice finalization; paged purchase/sale register; read-only wallet and instructor earnings | `/payments/mine`, `/payments/:id/refresh`, `/payments/:id/refund-request`, `/account/invoices*`, `/wallet/mine*`, `/training/professional/me/earnings` |
| Notification | Private inbox/read marking; only known local booking/course links; per-channel/event consent and quiet hours; phone verification/removal; separate device registration/consent; provider outcomes and authorized review closure | `/notifications`, `/notifications/:id/read`, `/notifications/delivery/*`, `/notifications/device/*`, `/admin/customer-channel-deliveries*` |

### Account contract detail

`POST /auth/register`, `/auth/email-verification/request`, `/auth/email-verification/confirm`, `/auth/password-reset/request`, `/auth/password-reset/confirm`, `/auth/login`, `/auth/mfa/verify`, `/auth/refresh` and `/auth/logout` retain their existing meaning. Login is complete only after current `/me` identity validation and durable native session persistence. Cancellation/unmount rejects and revokes a late issued session. MFA challenges and recovery-code display remain in memory; they are not placed in URLs or saved as product preferences.

Authenticated account actions use:

```text
GET/PATCH /me
GET/PATCH /me/diver-profile
POST      /me/diver-profile/equipment
PATCH     /me/diver-profile/equipment/:equipmentId
GET       /auth/mfa/status
POST      /auth/mfa/totp/setup
POST      /auth/mfa/totp/confirm
POST      /auth/mfa/disable
POST      /me/membership-pass
POST      /me/data-export
POST      /me/data-export/trip-records       {domain: BOOKINGS|PAYMENTS, after?}
POST      /me/data-export/sent-messages     {after?}
GET       /me/data-requests?page=N
GET       /me/data-requests/centers
POST      /me/data-requests
```

Profile forms send only their explicit editable fields, including empty strings required by `/me`. Data exports expose their original scope and audit receipt; paged exports do not claim to be an entire-platform export. A privacy request has a stable request key and remains a request for review. It does not claim executed erasure or correction. No original credential or medical approval is created by editing personal information.

### Credential and participant boundaries

The native picker submits the selected file's bytes, content type and original name, not a device path or public URL. The server retains document validation, SHA-256 deduplication, owner binding, private storage and lifecycle guards. Signed original-document access is obtained afresh only after the user requests it. Reviewer controls depend on current server roles, and the server resolves their actual authority independently.

Personal participant edits send name and self-reported credential fields. They do not submit `eligibilityStatus`, an acting account or a reviewer identity. The returned pending-eligibility state remains visible. Booking requests are confirmed by the user, deduplicated by the original backend rules, and never confirm operational participation automatically.

### Checkout and financial boundaries

The original quote is checked for source kind/ID, customer, currency, amount, supported version and its server quote hash. The user must accept the exact displayed quote. Current catalog price changes do not replace original booking/course terms. A stale quote resets acceptance and requires review; it is never silently accepted or resubmitted.

The native app opens only the HTTPS checkout URL returned by the existing server. It does not place bearer credentials in that URL. Returning from the provider triggers an authenticated server refresh; returning alone never marks an operation paid. The customer-facing cancellation/refund actions preserve the distinction between a recorded request, evaluated amount, independently posted accounting evidence and actual provider execution.

Invoice contracts are:

```text
GET  /account/invoices?view=all|purchases|sales&offset=N
GET  /account/invoices/:sourceType/:sourceId/document
POST /account/invoices/:sourceType/:sourceId/document    multipart: number, document
GET  /account/invoices/TRIP_PAYMENT/:sourceId/finalization
POST /account/invoices/TRIP_PAYMENT/:sourceId/finalization
GET  /wallet/mine
GET  /wallet/mine/entries
```

Original invoice bytes are fetched with authorization and shared through a temporary private cache copy. The copy is deleted after the share flow and on session clearing. The app cannot revoke a copy the user intentionally exports to another application. Attachment and finalization controls use the server's returned permissions, blockers, revision/hash and source identity. There is no client-side invoice-authority grant. Currency formatting and entered refund units respect the currency on the persisted payment.

### Training contract detail

The student's original course contract comes from `TrainingEnrollment.metadata.contractSnapshot`; public offer data is not a replacement. Existing record stages, skills and sessions are shown without converting progress into a certificate or operational clearance.

```text
GET  /training/mine/enrollments
GET  /training/enrollments/:enrollmentId
GET  /training/mine/certificates
GET  /training/certificates/:certificateId
POST /training/certificates/:certificateId/reconsideration
GET  /payments/courses/:enrollmentId/quote
POST /payments/courses/:enrollmentId/checkout
POST /payments/courses/:enrollmentId/refresh
POST /payments/courses/:enrollmentId/cancellation
GET  /training/professional/me/assignments|schedule|skills|certificates|earnings
GET  /training/professional/me/enrollments/:enrollmentId/plan
POST /training/professional/me/enrollments/:enrollmentId/plan
GET  /training/professional/me/enrollments/:enrollmentId/standard-options
POST /training/professional/me/enrollments/:enrollmentId/standard
POST /training/professional/me/enrollments/:enrollmentId/complete
PATCH /training/skills/:skillId/assessment
PATCH /training/professional/me/sessions/:sessionId/attendance
POST /training/professional/me/records/:recordId/certificate-recommendation
```

Instructor choices use the actual assigned record, approved fixed standard edition, source revision, allowed actions and `canAssess`/`canComplete`/recommendation readiness returned by the backend. Completion does not issue an external agency certificate. The student interface does not call the privileged standard-readiness reviewer endpoint to infer additional access.

### Notification contract detail

```text
GET/POST /notifications/delivery/preferences
GET      /notifications/delivery/deliveries
POST     /notifications/delivery/phone/challenges
POST     /notifications/delivery/phone/challenges/:challengeId/verify
POST     /notifications/delivery/phone/remove
POST     /notifications/device/register
POST     /notifications/device/unregister
GET      /admin/customer-channel-deliveries
POST     /admin/customer-channel-deliveries/:dispatchId/close
```

Preference updates include `expectedRevision` and explicit confirmation. SMS/WhatsApp require the existing verified phone and channel availability; push registration is distinct from consent to delivery. Requesting an OTP and removing a verified phone use independent confirmations. The OTP is scoped to the server session that created it: rotation removes the old challenge, a newly created post-rotation challenge remains usable, and a late pre-rotation response cannot restore the old code form. Provider acceptance/delivery is not described as the customer reading a message or the device displaying it.

## Session, privacy and navigation

Private resource state is bound to account/session generation and the latest authoritative `/me` role fingerprint. Source reads and mutations recheck identity; account replacement, role changes and stale responses cannot reuse prior account data. Confirmed authority changes also invalidate D06's independent offline read leases. Transport failure hides online product data while preserving a still-valid offline lease; it does not invent a server revocation.

The seven product screens support authored Arabic and English labels. Switching language preserves form drafts. Native accessibility labels, live error notices, minimum touch targets and keyboard-aware scrolling are included. Product content is masked and hidden from accessibility while the app is in the background. Dates use the Gregorian calendar and Riyadh time.

Protected return destinations are an explicit native allowlist. Only the documented `bookingId`, `tripId`, `paymentId`, `enrollmentId` or `credentialId` query for its corresponding screen is accepted. External URLs, token-bearing queries, fragments, malformed encodings and unexpected arguments are rejected. Product authentication does not depend on a WebView or a browser cookie.

## Tests and reproducibility

### Actual React + HTTP behavior

```sh
node apps/mobile/scripts/product-ui.test.mjs
```

This runs the real mobile React 19.2.3, real `react-test-renderer` 19.2.3, actual TSX components, session/API/product code and a loopback HTTP fixture. RN/Expo filesystem, secure storage, picker, sharing, navigation and device boundaries are controlled test doubles. The test does not claim native hardware, push display, real provider delivery or human acceptance.

The existing monorepo lock also contains a different root React. The isolated harness resolves the actual mobile React and makes the renderer use that same module instance, matching the native Metro resolution. It does not upgrade the application version or substitute artificial hooks. An optional `D05_SECURITY_ROOT` exists only for local sibling-worktree review; integrated CI uses the committed source directly.

The final run passed **26 behavioral groups**. Coverage includes duplicate login, cancellation during SecureStore persistence, MFA cancellation and late tokens, protected returns, seven screen routes, account replacement, role revocation, D06 lease invalidation, network outage, language/draft preservation, account empty-field serialization, localized validation, notification revision/quiet hours, independent phone confirmations, session-bound OTP races, participant editing, stale quotes, provider return, private file cleanup, original invoice bytes, refund units and instructor-only actions. The script prints its actual passing group count; static source-presence checks are not treated as product acceptance.

### Actual API + PostgreSQL contracts

```sh
MOBILE_PRODUCT_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY \
DATABASE_URL=postgresql://TEST_USER@127.0.0.1:TEST_PORT/mobile_product_test \
node apps/mobile/scripts/product-api-http-db.mjs
```

The database name and loopback host are mandatory guards. The script loads the actual mobile `product-client.ts`, runs built Nest `AppModule` on a random loopback port and executes requests through real guards/controllers/services against PostgreSQL. It does not rely on the screenshot fixture. It rejects unexpected external network access and intercepts only explicitly named synthetic object-storage/payment provider hosts.

Prepare the disposable database after Prisma generation and API compilation:

1. Create `mobile_product_test` on the isolated PostgreSQL service.
2. Apply `20261123003000_customer_notice_email_budget` before `prisma db push --skip-generate`.
3. Apply `20261122233000_customer_notification_email`, `20261123034000_session_push_registration` and `20261127113000_customer_notice_channels` after the push.
4. Run `bootstrap-equipment-runtime-schema.mjs`, `bootstrap-trip-weather-runtime-schema.mjs` and `bootstrap-messaging-runtime-schema.mjs` from `apps/api/scripts`.
5. Run the guarded script above. It starts and closes its own Nest server.

The **15 HTTP/PostgreSQL groups** cover all seven journeys: actual authenticated profile and equipment mutations, original credential bytes and review boundary, booking capacity/duplicates/participants, original trip and course prices, accepted quote checks, provider-bound collection, refund requests, course cancellation with the independent accounting gate, authenticated invoice bytes, wallet isolation, inbox isolation, revisioned notification consent and revocation across all seven private journey entry points.

Synthetic catalog/operational rows are explicitly marked. Course cancellation first fails without independently posted collection evidence. A labelled synthetic pre-existing accounting fixture then supplies that boundary so the customer route itself can be tested. That fixture is not evidence of a real approval, accountancy process acceptance or payment. Provider responses are parsed by the real adapters; no request reaches an actual provider.

### Virtual-device screenshot fixture

```sh
node apps/mobile/scripts/product-native-fixture.mjs
```

This separate fixture binds only `127.0.0.1:3001`, with `/api/v1` as prefix. `NATIVE_FIXTURE_PORT` may select another unprivileged loopback port. Its synthetic credentials are `qa-mobile@example.test` / `NativeFixtureOnly!123`; they are not valid for the application API. The health marker `/health/native-fixture` states `VIRTUAL_DEVICE_UI_ONLY` and `actualAcceptance:false`. The application does not import the fixture.

Stable login IDs: `home-login`, `login-email`, `login-password`, `login-submit`, `login-error`, `login-back`. Home destinations are `nav-account`, `nav-credentials`, `nav-trips`, `nav-bookings`, `nav-training`, `nav-finance`, `nav-notifications`; screen roots are the corresponding `<name>-screen` and top return controls `<name>-screen-back`. Maestro should scroll the home list to reach lower cards. HYDROLAND remains visible. D07/D10 own actual build/install/screenshots and should pin their evidence to the integrated commit, not this read-only fixture alone.

## Web coverage gaps retained for a product decision

These are **unimplemented native surfaces, not approved exclusions**. Related API operations remain available to the existing web application, under their original guards. This list identifies the concrete adjacent web modules reviewed; it is not an assertion that no other web surface exists.

| Existing web area | Source examples | Native gap that remains |
|---|---|---|
| Authentication and onboarding | `hydroland-auth.js`, account activation flows | Google OAuth/browser callback entry, role-activation application/review and administration of other accounts |
| Professional profile | `hydroland-profile-data.js`, `hydroland-training.js` | Selecting the national-license/qualification evidence links and the full professional/dive-log presentation beyond editable profile and credential workflows |
| Center operations and booking administration | `hydroland-center-operations.js`, `hydroland-center-bookings.js`, `hydroland-booking-admin.js`, `hydroland-booking-safety-control.js` | Center trip creation/lifecycle/crew/calendar/weather/safety review, participation-case evidence/review, attendance/closure and center-wide customer administration |
| Organization portal | `hydroland-organizations.js`, `hydroland-organization-procurement.js` | Organization invitation/delegation, group booking and procurement workflows; native personal booking does not grant organizational authority |
| Center training and certificate review | `hydroland-center-training.js`, `hydroland-training-certificate-admin.js` | Center assignment/scheduling, standard authoring/approval, operational eligibility review and independent certificate decision; instructor recommendation is implemented but is not the reviewer decision |
| Wider finance | `hydroland-center-finance.js`, `hydroland-center-receivables.js`, `hydroland-commerce-finance.js`, `hydroland-finance.js` | Accountant shifts/handover, ledger approval/posting, receivables, bank settlement, provider reconciliation/refund execution, period close and full center reports |
| Store, rental and loyalty | `hydroland-store-unified.js`, `hydroland-store-provider.js`, `hydroland-store-inventory.js`, `hydroland-store-fulfillment.js`, `hydroland-wallet-rewards.js` | Goods/service cart, unified order composition, equipment rental/return/damage, provider inventory/fulfilment, loyalty redemption and its administrative decisions |
| Community and private messaging | `hydroland-community.js`, `hydroland-messages.js` | Community content/moderation and private text/audio conversation interfaces; their D16 gates remain unchanged |
| Department and governance workspaces | Marketing, research, documents, HR, technology/security and executive web modules | Native departmental authoring/review/reporting surfaces; no mobile exclusion decision is recorded here |

The test evidence closes the stated implementation work and exposes these remaining decisions. It must be combined with the original tracker text, explicit product decisions where applicable, integrated CI/build evidence and final Q01 device acceptance; it does not replace them.
