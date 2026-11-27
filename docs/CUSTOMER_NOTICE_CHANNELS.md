# B07: customer booking and invoice channels

This module adds automatic, event-linked SMS, WhatsApp and Push delivery to the existing customer inbox and transactional email flow. It is disabled until explicit channel policy, provider readiness and bounded budgets are configured. Existing customers keep their inbox and email behavior without creating preferences. Authentication and security email use their existing separate flow.

## Native event and recipient

The additive `20261127113000_customer_notice_channels` migration observes the existing `Notification` insert. It accepts only a confirmed booking belonging to that account, or an issued invoice notice backed by its canonical `CustomerNoticeEmail` source. It queues additional channels only when a preference row already exists, the relevant event/channel is opted in, and its phone proof or current device enrollment is present. It does not scan or backfill existing notifications. Explicitly historical notices older than the preference record are excluded.

The unique event/source/account/channel key prevents SMS and WhatsApp duplicates, including a later phone binding change. Push deduplicates the exact event per account and device token hash, and retains the native enrollment identity separately. Different enrolled devices can each receive one attempt. The existing inbox remains independent of external delivery and the email outbox remains invisible to the customer notification list.

Before any reservation, and again immediately before provider transport, the worker checks the current verified active account, the exact preference revision, channel/event choices, quiet hours, source access and recipient binding. The invoice check uses the shared purchase register and locks its native original, buyer memberships/roles, employment, organization/unit/position scope and source evidence. A cancelled booking, void invoice, changed buyer authority, revoked device or withdrawn consent cannot pass that current check.

## Preferences and phone verification

All customer endpoints require a current non-MFA access session for an active, email-verified account. They derive the account and session from authentication and reject an injected recipient/account field. Responses use `Cache-Control: private, no-store`.

| Method and path under `/api/v1` | Purpose |
| --- | --- |
| `GET /notifications/delivery/preferences` | Defaults or current revision; masked phone; availability; native admin-review capability |
| `POST /notifications/delivery/preferences` | Explicit channel/event choices and optional quiet hours, with `expectedRevision` and `confirmed: true` |
| `POST /notifications/delivery/phone/challenges` | Explicitly request a verification SMS to one approved international-format phone |
| `POST /notifications/delivery/phone/challenges/:id/verify` | Consume a six-digit code for that account and native session |
| `POST /notifications/delivery/phone/remove` | Remove the notification-phone binding and turn off SMS/WhatsApp with a current revision |
| `GET /notifications/delivery/deliveries` | The caller's last 50 dispatch states; no provider IDs, token hashes, phone or encrypted secret |
| `GET /admin/customer-channel-deliveries` | Current active administrator's review queue |
| `POST /admin/customer-channel-deliveries/:id/close` | Reasoned, explicitly confirmed review closure without another send or a delivery assertion |

A preference write supplies all seven Boolean fields (`email`, `sms`, `whatsapp`, `push`, `bookings`, `invoices`, plus the separate confirmation), `quietStart`/`quietEnd` as both null or distinct minutes from 0–1439, and a valid IANA `timeZone`. Quiet hours support windows crossing midnight. The default timezone is `Asia/Riyadh`. Only the defined booking/invoice external notices are affected; the inbox stays available.

The code is valid for ten minutes and permits at most five guesses. Requests are limited to three per hour for either the account or the hashed phone, including unsuccessful/ambiguous reservations. The same finite SMS ledger pays for verification attempts. The number is encrypted with account-bound authenticated encryption, the code is HMAC-bound to its random challenge ID, and a consumed proof never opts the account into SMS or WhatsApp. `Person.phone` is not a phone ownership proof. Two accounts cannot retain the same verified notification phone.

Challenges bind the authenticated native session and preference revision. Logout/revocation, a preference change, another challenge, expiry or consumption invalidates use. A refresh-created challenge returns its own session ID so the web form can retain a response from the current successor session and discard a late response from the old session. The session ID is an own-session identifier, not an access or refresh credential.

`Session.pushRegistrationId` is additive raw runtime state. Repeated registration of the same token in the same session preserves it; token replacement starts a new enrollment. Native refresh moves it to the authenticated successor session while reencrypting the token for that session. Logout, password reset, administrator revocation and unregister clear it through the existing native session lifecycle. Historical tokens are not silently given a new automatic-delivery enrollment. Late `DeviceNotRegistered` handling matches the original account, enrollment and token hash, so it cannot clear a later account's binding.

## Attempts, budgets and receipts

The worker polls every 15 seconds, claims at most 25 due rows per poll and returns before optional-table access when policy is off. Each channel has a monthly SAR-halalas ledger with an approved positive integer cap and per-attempt upper bound. The cap cannot exceed 2,147,483,647 and the attempt bound cannot exceed the cap. Reservations are atomic across workers and are never refunded merely because delivery is uncertain. This ledger bounds attempts; it does not assert an actual provider invoice or tariff.

An attempt reservation commits **before** provider I/O. The final account/preference/source/session check and provider call run in a separate transaction that is never automatically retried. The provider request uses a fixed HTTPS origin, rejects redirects, has a four-second timeout and a bounded JSON response. A lost response, transaction failure after acceptance or abandoned reservation becomes review-required. There is no reset-to-pending or automatic resend for these optional channels. Pending notices expire after seven days instead of producing a late message indefinitely.

| State | Meaning |
| --- | --- |
| `PENDING` | Waiting for a current eligible recipient, allowed time, ready policy or budget |
| `RESERVED` | One attempt is reserved; an unresolved reservation older than two minutes needs review |
| `PROVIDER_ACCEPTED` | A valid submission/ticket is stored; it does not establish delivery |
| `PROVIDER_DELIVERED` | Matched SMS DLR or matched WhatsApp delivered/read status |
| `PUSH_SERVICE_CONFIRMED` | The exact Expo receipt says FCM/APNs accepted the message; handset display is unproven |
| `PROVIDER_REJECTED` | A definite rejection, including a scoped unregistered-device response |
| `REVIEW_REQUIRED` | Ambiguous attempt, conflicting provider ID, mismatched or unconfirmed receipt |
| `SUPPRESSED` | Sending stopped, including a source/consent change or explicit manual review closure; this does not prove non-delivery of an earlier ambiguous attempt |

Receipt reads begin after 15 minutes and have at most 12 checks or a 23-hour age window. Retrying a read never returns a row to the sending queue. SMS uses the existing signed gateway and HMAC-bound submission/DLR audit, including exact provider account, message, correlation, destination and fully delivered positive multipart count. WhatsApp reads the official message-status endpoint and matches message ID, sender application, contact, channel and our dispatch reference. Expo reads the exact ticket key. A provider ID reused for another dispatch moves both associations into review, including an earlier provisional delivery conclusion.

Push content is generic, contains no invoice/booking payload or deep-link private identifier, and uses `ttl: 0`. A sleeping/offline device can miss it; the native inbox is the durable record. Provider duplication or failure outside the application is still possible. No state claims that the recipient opened or read a Push alert.

Existing customer email retains its stable Resend idempotency key, same-recipient retry window and conservative email ledger. It now respects explicit opt-out/quiet hours and locks the account, preference and current native invoice/source during the final send. The customer-email timeout is four seconds; authentication and executive-report behavior retain their existing defaults.

## Explicit external activation inputs

No activation values or provider credentials are written by this change. `SANDBOX` still calls a real provider when manually configured; only the deterministic test harness replaces transport. These inputs require real operational verification before use.

Common inputs for each `C` in `SMS`, `WHATSAPP`, `PUSH`:

| Input | Required value or meaning |
| --- | --- |
| `HYDROLAND_CUSTOMER_CHANNEL_POLICY` | Exact policy `BOOKING_INVOICE_V1` |
| `HYDROLAND_CUSTOMER_CHANNEL_C_ENABLED` | Explicit `true` |
| `HYDROLAND_CUSTOMER_CHANNEL_C_PROVIDER_VERIFIED` | Explicit `true` after operational verification |
| `HYDROLAND_CUSTOMER_CHANNEL_C_MONTHLY_CAP_HALALAS` | Approved finite monthly bound |
| `HYDROLAND_CUSTOMER_CHANNEL_C_MAX_ATTEMPT_HALALAS` | Approved conservative positive attempt bound |
| `HYDROLAND_CUSTOMER_CHANNEL_C_ALLOWED_ACCOUNT_IDS` | Exact account allowlist; mandatory and nonempty in sandbox, restrictive if set in production |

SMS additionally uses the existing `HYDROLAND_INTEGRATION_SMS_STATUS` (`SANDBOX` or `PRODUCTION_ENABLED`), `HYDROLAND_SMS_PROVIDER=UNIFONIC`, `UNIFONIC_SMS_APPSID`, `UNIFONIC_SMS_SENDER_ID`, `UNIFONIC_SMS_DLR_ACCOUNT_ID` and `HYDROLAND_WEBHOOK_SMS_SECRET`. `HYDROLAND_CUSTOMER_CHANNEL_SMS_DLR_GATEWAY_VERIFIED=true` and `HYDROLAND_CUSTOMER_CHANNEL_SMS_CONTENT_APPROVED=true` are required. The latter covers the fixed booking, invoice and verification texts. Verification also requires `HYDROLAND_CUSTOMER_PHONE_VERIFICATION_ENABLED=true`. `HYDROLAND_CUSTOMER_CHANNEL_SMS_TEST_RECIPIENTS` contains exact `+E164` approved recipients, mandatory in sandbox and restrictive whenever populated.

WhatsApp additionally uses the existing integration status/provider, `UNIFONIC_WHATSAPP_PUBLIC_ID`, `UNIFONIC_WHATSAPP_SECRET`, and `UNIFONIC_WHATSAPP_APPLICATION_ID`. Its `HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_LANGUAGE`, `..._BOOKING_TEMPLATE` and `..._INVOICE_TEMPLATE` must match exact approved entries in `HYDROLAND_WHATSAPP_APPROVED_TEMPLATES`. Templates must be approved for this purpose and require no runtime body parameters. `HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_TEST_RECIPIENTS` follows the same exact-recipient restriction.

Push additionally requires `HYDROLAND_CUSTOMER_CHANNEL_PUSH_MODE` (`SANDBOX` or `PRODUCTION_ENABLED`), an approved UUID `HYDROLAND_CUSTOMER_CHANNEL_PUSH_PROJECT_ID` and `EXPO_ACCESS_TOKEN`. Project ownership, enhanced Push security and actual device enrollment/delivery are operational checks, not assertions made by this implementation.

## Interface and integration

`notification-preferences.js`/`.css` expose `HydrolandNotificationPreferences.open()`. The account editor's **خيارات الإشعارات / Notification preferences** entry invokes it after the normal script loader. The admin review section appears only after the API returns native admin capability and its guarded queue succeeds.

The dialog fences every asynchronous response by authentication generation and actual profile authority, aborts and removes private data on account change or role loss, clears invalidated phone-code forms, and preserves a newly created challenge only for its current native session. Authored Arabic/English labels and direction change without rebuilding inputs or losing unsaved phone, code, preference or review drafts. Errors are localized without echoing provider/database messages.

Apply the new migration after the existing customer-notification-email and session-push migrations. Only new empty account-reference columns adapt to native `TEXT` or `UUID`; existing identity types are not rewritten. For disposable `prisma db push` fixtures, apply the existing email-budget migration **before** `db push` because that table is also represented by Prisma, then email, session-push and this migration. Existing email/push regression fixtures require the new migration too.

## Primary provider contracts consulted

- Unifonic SMS DLR fields: <https://docs.unifonic.com/articles/products-documentation/sms-03-sending-api/>
- Unifonic WhatsApp accepted/sent/delivered/read distinctions: <https://docs.unifonic.com/articles/products-documentation/wa-14-webhooks-status>
- Unifonic exact message status read: <https://docs.unifonic.com/articles/products-documentation/message-delivery-status/a/get-message-status>
- Expo tickets, receipt meanings, receipt timing, token rejection and TTL: <https://docs.expo.dev/push-notifications/sending-notifications/>

See the accompanying acceptance receipt for isolated checks and the boundary between technical implementation and Q01 real recipient/provider/device acceptance.
