# A15 source erasure and recovery

## Release boundary

This implements source erasure for an individually reviewed data request and protects the existing private-message retention worker with an external encrypted journal. It does not create a production approval, supply a retention effective date, or enable general erasure at deployment. The accepted duration schedule remains version `0.1` in `apps/api/src/profile/export-retention-policy.ts`; its effective date must come from the original approved document workflow.

Keep Q01 for the owner's final interface acceptance. Local synthetic acceptance is recorded separately in `A15_TECHNICAL_VERIFICATION_2026-11-28.md`.

## Deployment configuration

Use the existing private object-storage connection. No additional bucket, provider account, public object access or public endpoint is required. The API needs `ListObjectsV2`, `GetObject` and `PutObject` on its privacy namespace. Retain the existing production requirements: HTTPS, private access, encryption at rest and versioning, as checked by `credential-object-storage.config.ts`.

The journal also respects `HYDROLAND_INTEGRATION_OBJECT_STORAGE_STATUS` through the existing integration service. A disabled or otherwise non-operational provider prevents every journal HTTP request, including the maintenance CLI. Each network operation has an eight-second deadline that includes the complete response body. Transport success/failure produces the same sanitized A06 observations as the existing storage adapter. An expected missing object is a successful provider response; invalid ciphertext or content-address conflicts are integrity failures, not provider-outage signals.

| Variable | Initial release value and purpose |
| --- | --- |
| `HYDROLAND_PRIVACY_RECOVERY_REQUIRED` | `true`; mandatory before any new erasure or private-message purge. Preserve it across restores. |
| `HYDROLAND_PRIVACY_JOURNAL_NAMESPACE` | One stable, unique lowercase namespace of 8–80 letters, digits or hyphens. Preserve the same namespace across restores. |
| `HYDROLAND_PRIVACY_JOURNAL_KEY` | One securely generated 32-byte key encoded as 64 lowercase hexadecimal characters. Preserve it outside the PostgreSQL backup; do not print it or store it in the repository. |
| `HYDROLAND_PRIVACY_ERASURE_ENABLED` | `false` for this deployment. This gates case-based erasure; it does not stop the already accepted private-message retention workflow once the recovery gate succeeds. |
| `HYDROLAND_PRIVACY_JOURNAL_INITIALIZE` | Temporarily `INITIALIZE_EMPTY_JOURNAL_ONCE` for the first deployment only. Remove it after successful initialization and startup verification. |

The object-storage variables already in use remain `HYDROLAND_OBJECT_STORAGE_ENDPOINT`, `BUCKET`, `REGION`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY` and the `PRIVATE_ACCESS_CONFIRMED`, `ENCRYPTION_CONFIRMED`, `VERSIONING_CONFIRMED` flags, each with the `HYDROLAND_OBJECT_STORAGE_` prefix.

Merge these privacy settings with the service's current environment. Do not replace or discard unrelated settings. A missing or mismatched journal configuration must not be worked around by choosing a new empty namespace.

### First deployment and the old worker

Apply the native migration `20261128010000_privacy_erasure_receipts` before starting the new API. It performs the following changes in one PostgreSQL transaction:

1. Creates the operation ledger and scoped retention holds.
2. Takes an exclusive lock on `AuditEvent` and installs a trigger that rejects the old `message.expired_content_purged` audit action.
3. Records a fresh database baseline nonce in `PRIVACY_RECOVERY_BASELINE:v1`.

The old worker deletes its rows and records that audit action in the same transaction. A purge that reached its audit insert before the migration's lock completes before the baseline. A later old-worker purge fails the trigger and rolls its deletion back. This protects the baseline during a rolling deployment while the old and new applications overlap. Normal audit actions and the new `PERSONAL_DATA_ERASED` operation are unaffected. Do not remove this trigger when rolling back application code.

With the explicit initialize variable present, the new application's bootstrap publishes the encrypted baseline only if the journal is empty and no local erasure operations exist. A matching existing baseline makes initialization idempotent. A different baseline, an occupied namespace or an unknown operation blocks startup. Normal bootstrap never creates a baseline implicitly.

The application reconciles the baseline, local receipts and actual native rows before opening its HTTP listener. The private worker also checks an in-process readiness gate; a long bootstrap cannot race a timer into deleting data. After the successful first startup, remove the initialize variable, keep the namespace/key/recovery settings, and verify a normal restart.

## Original decisions and owner binding

The owner-only privacy controls expose three additional blank templates through `POST /api/v1/privacy/retention-templates` with `{ "confirmed": true }`. This idempotent preparation does not change the fixed operational catalog, create an approved document, or set an effective date.

| Template | Original department and purpose |
| --- | --- |
| `LEGAL-A15-RETENTION-ACTIVATION` | Legal; technical completion, acceptance reference and the actual effective date for schedule `0.1`. |
| `LEGAL-A15-RECORD-DISPOSITION` | Legal; an individual account, booking or private-message record and its retention review. |
| `FIN-A15-RECORD-DISPOSITION` | Finance; an individual payment, its applicable commercial/tax periods and settlement review. |

The owner creates and submits the document through the existing Documents interface, then assigns independent reviewer and signer accounts through the existing internal review workflow. The reviewer approves through that workflow. Creating a template or submitting a draft is not approval. The finance disposition additionally requires the original approving reviewer to remain eligible in Finance.

After review, the owner selects the approved version in the privacy controls. `POST /privacy/retention-dispositions` binds the exact source pin and current owner authority without erasing anything. The authorized case handler then selects that source for the matching request. The approved document version, source fingerprint and current native content must still match immediately before erasure. Source changes or authority revocation require a new review/binding; an id alone is insufficient.

`POST /privacy/retention-activation` binds the actual approved activation source. Its effective date must be no earlier than the original approval and no later than the time of binding. Before that binding, exports continue to say that the durations are approved but await an effective date. Binding the activation does not authorize general automatic deletion. General case-based execution also needs its explicit runtime flag and an individually approved source.

## Native scope and holds

| Domain | Implemented erasure projection and blocking conditions |
| --- | --- |
| Account | Scrubs contact/public profile content and revokes sessions for an archived account. Independently retained identity and credential evidence remain. Native bookings, payments, ownership, employment, safety or credential dependencies block this operation. |
| Bookings | Deletes the member's mature booking and its unreferenced participant rows within the request's center. Payment, safety, dive-log, participation-case or independent financial references block erasure. |
| Payments | Deletes the classified, mature, settled member payment and its native invoice/document. The financial source must include the applicable period ends; independent financial references, unresolved service, refunds, safety or organization-owned invoice scope block erasure. |
| Private messages | Deletes a withdrawn two-person private message, its restricted text and native audio after 30 days. An active abuse-evidence hold or privacy hold blocks purge. External media and other conversation classes require their own supported disposition. |

The application never accepts table names, SQL, replacement content or arbitrary fields from a request. The source fingerprint covers the actual native projection, including payment provider identifiers and restricted message/audio content hashes. The journal contains the fingerprint, not private message text or audio bytes.

Hold creation and erasure use the existing case-processing authority. Releasing a hold requires two distinct authorized people. A resolved case preserves a separate hold-release permission under its original center/department authority; it does not regain preview, erasure or new-hold permission. Suspended center owners and inconsistent cross-organization department assignments do not confer access. A case can be marked `APPLIED` only after a matching published receipt and actual native erasure are verified.

## Journal and recovery behavior

Each operation publishes an encrypted intent before its destructive database transaction. The transaction commits the native change, audit event and local receipt together. The encrypted terminal receipt is then published and verified before the request receives proof of completion. An audit failure rolls the native change back. A lost receipt publication retries the same original receipt and does not repeat deletion.

Objects are AES-256-GCM encrypted with the full object key as authenticated associated data. The canonical plaintext hash forms the content address, for example `privacy-erasure/<namespace>/<operation-id>/commit-<digest>.json`. This does not rely on conditional PUT support. The AWS SDK uses `requestChecksumCalculation: WHEN_REQUIRED`. Every write verifies readback and enumerates the operation's phases; different values for one phase, malformed addresses and conflicting commit/abort terminals are rejected. The read path checks authenticated decryption and the content address again. This is a protocol-level consistency check, not a claim that the provider enforces WORM storage. Existing private access and versioning remain required.

### Restoring PostgreSQL

Keep the API and workers offline. Restore the original journal namespace and encryption key independently of PostgreSQL, then run:

```sh
node apps/api/scripts/privacy-erasure-recovery.mjs --verify
```

Verification does not change native source rows, erasure receipts or the baseline; ordinary sanitized provider-health observations may be recorded. If a committed external receipt identifies an unchanged native record restored by the backup, use the explicit offline repair mode:

```sh
HYDROLAND_PRIVACY_RESTORE_CONFIRM=OFFLINE_RESTORE_REPLAY \
  node apps/api/scripts/privacy-erasure-recovery.mjs --apply
node apps/api/scripts/privacy-erasure-recovery.mjs --verify
```

Repair rechecks the full original source plan and native dependencies before replaying the fixed erasure projection. A changed record, different tenant, new dependency or active hold blocks replay. It records a new recovery audit event; it does not forge a missing historical audit event.

Offline repair can republish an exact locally committed receipt or a known local abort. If an intent never reached the external store, it can cancel a matching unchanged local preparation and publish its intent/abort evidence without deleting the record. An external unresolved intent without adequate local proof remains blocked. Unknown terminal states, damaged ciphertext and conflicting entries require evidence review; do not repair them by removing journal objects.

An older backup without the original baseline, including a backup on which this migration was later reapplied with a new nonce, is rejected even when its erasure ledger is empty. The protection starts at the migration barrier and matching external baseline. This release does not reconstruct tombstones for purges performed before that boundary or prove that such historical purges never happened. Keep the established backup restoration controls for those earlier backups; do not expose them as a verified restored service.

The initialize maintenance command is available for an explicit first setup if needed:

```sh
HYDROLAND_PRIVACY_JOURNAL_INITIALIZE=INITIALIZE_EMPTY_JOURNAL_ONCE \
  node apps/api/scripts/privacy-erasure-recovery.mjs --initialize
```

It cannot re-baseline an existing journal or accept a mismatched restored database. Do not use initialization as a recovery shortcut.
