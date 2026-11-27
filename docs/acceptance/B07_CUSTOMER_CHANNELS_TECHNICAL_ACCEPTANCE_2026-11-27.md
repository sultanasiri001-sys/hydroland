# B07 optional customer channels — technical acceptance

Date: 2026-11-27 UTC. Baseline audited: `95b0d91cc7f8090b5f17a63d12bf81c05232e402`. This receipt covers the new B07 source in this commit, with C07's earlier documentation-only commit as its local parent. The root integration owns the common loader/profile and CI workflow wiring and the final combined-main verification/deployment.

## Finding and implemented closure

The baseline already had working inbox/email delivery, finite budgets, matched SMS delivery audits, native Push session revocation and a bounded one-record trial-Push command. It did not have a production-domain caller for SMS/WhatsApp booking/invoice delivery or an automatic event-linked Push worker. Those technical gaps are now implemented behind an explicit default-off policy, rather than treating an unused adapter as an activated channel.

| Technical criterion | Implementation and verified result |
| --- | --- |
| Intentional recipient and event | Canonical booking/invoice queue; current native source and buyer access recheck; no caller-selected account or event payload |
| Consent and quiet hours | Own-session preferences with optimistic revision; inbox/email defaults retained; explicit optional opt-in; consent withdrawal and crossing-midnight windows |
| Phone proof | Approved-recipient SMS code; account/session/revision binding; encrypted phone; HMAC code; 10-minute expiry, five guesses and three hourly requests per account/phone |
| Device lifecycle | Native registration ID retained across authenticated refresh, preserved on repeated same-device registration, removed on revocation/unregister; late rejection scoped to the old binding |
| No duplicate application attempt | Exact event/channel/device uniqueness; committed single-use reservation; transport outside automatic transaction retries; ambiguous attempts never reset for resend |
| Finite cost and approved content | Atomic monthly per-channel upper-bound ledger, including verification; all activation/approval gates default off; exact approved WhatsApp template/language |
| Provider evidence | Submission separated from matched SMS/WhatsApp delivery and Expo FCM/APNs confirmation; wrong recipient/reference/ticket cannot confirm; conflicting IDs require review |
| Manual disposition | Actual active administrator, fresh guarded queue, explicit reason and confirmation; audited close without resend or a delivery claim |
| Usable private interface | Actual account-settings entry, own recent states, admin-only review; account/authority invalidation; safe live Arabic/English switching and localized errors |

## Executed isolated verification

All database and provider fixtures were synthetic. PostgreSQL ran on an isolated local instance. The HTTP harness intercepts the fixed official provider URLs in-process and rejects every unexpected non-loopback request. No real provider request, production record, provider setting or user notification was created.

- API TypeScript compilation: **PASS**.
- API ESLint correctness gate: **PASS**.
- `customer-channel-policy.test.cjs`, `whatsapp-template-policy.test.cjs`, `unifonic-sms-receipt.test.cjs`: **9/9 PASS** in total; five tests are the new policy/receipt suite.
- Existing Unifonic static readiness validator: **PASS**, updated for the bounded four-second request.
- `customer-channels-http-db-e2e.mjs`: **16/16 actual Nest HTTP/PostgreSQL groups PASS**. They cover guarded defaults, exact OTP scope/replay/storage, attempts/expiry/quota/revision, concurrent phone claims, canonical event/source dedup, concurrent workers and budgets, refresh, matched/wrong receipts, quiet hours, cancelled/void originals, uncertain reservations, reused provider tickets, finite receipt reads, logout/account switch/late rejection, admin review, default email/withdrawal races, native invoice mutation locking and phone removal.
- `customer-channels-schema-db-e2e.mjs`: **8/8 native type combinations PASS**: Account `TEXT`/`UUID` × Session `TEXT`/`UUID` × Booking/Notification `TEXT`/`UUID`. It applies the actual old Push migration and new migration, verifies typed account foreign keys, explicit binding, defaults, dedup, source isolation, historical-date exclusion, constraints and revocation. An independent reviewer separately ran all eight combinations before the committed harness was adapted.
- Existing `customer-notice-email-db-e2e.mjs`, `customer-email-delivery-db-e2e.mjs`, `sms-dlr-db-e2e.mjs`, `push-session-db-e2e.mjs` and `trial-push-db-e2e.mjs`: **all PASS** with the additive migration present.
- `apps/web/e2e/notification-preferences.spec.js`: **10/10 Chromium cases PASS**. Tests use the actual auth/session and profile runtime, open the real account editor, and click `[data-notification-preferences]`. The local disposable web build used the root integration's common `app.js` and `hydroland-profile-data.js` loader/entry wiring. Responsive 390px/1280px screenshots were inspected; target size uses the actual border box. Locale switching preserves live drafts, and a same-session native ADMIN loss clears both current and delayed privileged responses.
- Independent review rechecked the old-code-form, refresh-created-code, Close-button and same-session authority-loss cases: **PASS**, with no remaining substantive frontend blocker reported.

For the native scripts, the database URL must be loopback with database name `customer_channels_test`, and `CUSTOMER_CHANNEL_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY` is mandatory. Schema preparation and configuration are documented in `docs/CUSTOMER_NOTICE_CHANNELS.md`. The root's existing API workflow adds these checks and migrates the existing email/push fixtures; its Web workflow includes the new browser file.

## Exact limits of this receipt

This closes the identified **technical implementation** gaps and supplies reviewable source, native fixtures and a usable preference/review interface. Final combined-main CI, migration and deployment evidence must be recorded by the root integration on its own resulting SHA.

It does not approve an actual phone owner, real device, paid budget, SMS sender, WhatsApp template or provider project. Operational activation remains off until its explicit configuration and real acceptance are supplied. Expo receipt success is FCM/APNs acceptance, never proof of handset display or reading; `ttl: 0` intentionally permits loss while offline/asleep. Provider-side duplication cannot be ruled out by an application-level reservation. These real recipient/provider/device checks and actual user acceptance remain **Q01**. The existing hourly B07 automation was not altered.
