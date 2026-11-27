# B14 community and D09 private audio technical acceptance

Date: 2026-11-27. Scope: isolated technical completion of B14 and D09 in the yellow group. No production account, business record, public post, outbound message, provider delivery or real policy approval was created by these checks. Final real user acceptance remains Q01.

## B14: native community workflow

The community screen now uses the native API for posts, consultation and meeting requests, events and volunteering. Members can submit and edit their posts, see their review status, withdraw content, report published content, request consultations, register as volunteers and cancel their own requests. Moderators can review posts, draft and manage events, review volunteer attendance and approved minutes, and schedule or resolve consultations.

Post edits preserve the previous revision, reject stale updates and return the post to pending review. The author cannot approve their own post. Withdrawal removes content from member, public and ordinary moderator lists; a withdrawn post cannot be edited or republished. Withdrawal and cancellation remain available when community activation is suspended.

Reports create native customer-service cases. Held snapshots are available only to the verified platform owner or a verified administrator assigned to that case. Reads are audited. The case must be closed and two different authorized people must review release before its hold is released. The owner can preview and explicitly purge content whose pinned retention period has expired and which has no active hold. Release and due deletion remain available while the policy is inactive. There is no newly activated automatic deletion job.

### D16 source and activation boundary

Participation and ordinary moderator operations require a current approved D16 policy and explicit platform-owner activation. The binding contains the native document, version, content hash, complete review-source hash and owner. Runtime checks cover the current canonical platform organization, active template, native payload validation, original revision, independent approval and approval lifecycle event. Source edits, retirement, owner changes or loss of the named moderator's authority suspend activation.

No D16 policy, moderator, duration or approval is seeded by this change. The owner has a guided draft form with a named moderator selector, explicit retention days and bilingual notices. It creates an ordinary native DRAFT document through `DocumentPersistenceService`; it does not submit, approve or activate the policy. The document opens in the existing document workspace for review. A separate selector displays approved sources by title/reference/version and holds binding hashes internally.

The native template uses flat compatible fields: `kind`, `enabled`, `privateAudioEnabled`, `moderatorAccountId`, `retentionDays`, `noticeAr`, `noticeEn`. The two enable choices are independent and unchecked by default in the draft form. The generic document payload validator is unchanged. Community post retention accepts an explicit integer from 1 to 3650 days. This is a technical bound, not a selected policy, and does not change private-message/audio retention. Each new post pins the policy and duration at creation; later policy changes do not silently change its withdrawal clock. Legacy content without an authorized duration is hidden on withdrawal without inventing a purge date.

The isolated fixture exercises the real policy draft endpoint and the real document submission endpoint before recording a clearly labelled synthetic independent approval for technical tests. That fixture is not evidence of a human policy decision or production approval.

### Community interface and session handling

The screen includes Arabic and English messages, preserves input on a failed save and maps common API failures to readable messages. An assigned case reviewer can see their reports independently of moderator permissions or active policy. The owner can reach retention controls when activation is suspended. Role changes, account changes and session clearing immediately remove private state; replies from prior authority generations cannot restore it.

## D09: recorded and uploaded private PCM audio

The current D16 requirement covers both B14 and D09. **New native audio is disabled by default until an independently approved native D16 source explicitly permits private audio and the platform owner activates that exact source.** Enabling community participation does not grant audio permission, and an audio-only source can leave community participation disabled. No actual D16 decision was supplied or granted during this implementation.

The owner-authorable `HYD-CONTENT-D16` template contains a separate required `privateAudioEnabled` boolean and fixed bilingual audio terms. Its statement names the existing 30-day retention after withdrawal, continued protection of held case evidence, and fixed two-minute / 4 MiB / 32 MiB limits. Runtime requires that exact native schema and terms, and the complete source hash binds both fields and payload. Existing community-only templates remain immutable and cannot acquire audio permission implicitly. No environment flag grants this approval.

Before a new upload is persisted, the same serializable transaction locks and rechecks the source binding, native document/revision/lifecycle/template and current owner/moderator authority. Each created audio message audits its policy source/version/hash. Source drift, retirement, changed terms or authority loss prevents new uploads. Authenticated existing playback, withdrawal and authorized case evidence remain available while activation is suspended.

The message composer shows the inactive policy reason and disables recording, file selection and sending until it reads the approved audio gate. Policy reads bypass caching; recording and upload recheck the gate, and suspension stops capture and invalidates pending microphone permission. Stale responses from a previous account cannot re-enable controls.

Members can record microphone audio, stop and preview it, choose a WAV file, discard it, explicitly consent and send. Microphone capture produces canonical 16-bit PCM WAV. Capture is downsampled to 16 kHz, bounded to two minutes, and stopped when discarded, navigated away from or signed out. A generation guard prevents a delayed microphone permission response from creating an orphan stream after discard or file selection.

Native audio is persisted as PostgreSQL `bytea` alongside a message with typed foreign keys. It does not depend on ephemeral application-server files or a public media URL. The implementation accepts canonical PCM WAV only: mono/stereo, 8–48 kHz, 16-bit samples, exact RIFF/data lengths and at most 4 MiB. Duration is derived from the bytes and must not exceed 120 seconds. Each sender has a 32 MiB stored-audio quota. MIME labels, client duration claims, invalid base64, executable/non-audio bytes, extra chunks/trailing data and malformed headers cannot substitute for validation.

Sending requires a verified active account and membership of a two-person private conversation. A stable retry key and the exact byte hash prevent duplicate sends and reject reuse for different contents or a withdrawn message. Message creation, audio persistence, audit and the recipient's in-app notification are one transaction. A forced notification failure was tested to roll all of them back; retry succeeds after the failure is removed.

Playback explicitly fetches bytes through authenticated participant access. Responses have `Cache-Control: private, no-store`, `audio/wav` and `nosniff`; lists and history expose metadata only. Download locks/rechecks the message and verifies byte length and SHA-256. Withdrawal makes native audio unavailable to participants. The existing case-scoped abuse-review path can read held bytes with authorization and audit; ordinary administrator lists cannot fetch them. Purging an eligible message cascades deletion of stored audio. Existing private-message retention and abuse escalation rules are preserved.

Existing HTTPS voice references remain compatible in the legacy API/history. They are external references, not new private uploads, and do not receive the storage or access guarantees of this native path. The closure evidence concerns recorded/uploaded private PCM WAV. The UI does not autoplay or preload those legacy references.

## Evidence executed

All database and HTTP checks used a disposable loopback PostgreSQL 16.16 database and synthetic accounts. API subprocesses, database and tests ran in one isolated harness; teardown stopped the servers and removed fixture records.

| Check | Observed result |
| --- | --- |
| API build, TypeScript and ESLint | Passed |
| PCM validation unit tests | 3 groups passed, including actual 120-second bytes and malformed/oversize inputs |
| Messaging native-key compatibility | 82/82 checks passed: 41 with TEXT and 41 with UUID keys |
| Independent new SQL rehearsal | 8/8 mixed TEXT/UUID Account, Conversation and Message key combinations passed |
| Original community HTTP/PostgreSQL suite | Passed publication review, private ownership, capacity-safe registration, approved-minute reconciliation and scheduled consultation |
| Community integrity suite | 16 groups passed, including ten audit rollback checks, three deterministic races and revoked-role/suspended-account checks |
| B14 completion HTTP checks | Passed edit/review, stale version, suspension, withdrawal, private report, retention hold, independent release and explicit purge |
| Original messaging HTTP/PostgreSQL suite | Passed auth, participant isolation, latest/older pagination, text/voice compatibility, reads and notifications |
| D09 private audio HTTP/PostgreSQL suite | Passed default-off, independent community/audio policy choices, source/term drift, retirement and authority revocation; content validation, consent, concurrent retry, existing private retrieval/withdrawal/evidence while suspended, hold and cascading purge |
| Forced notification rollback | No message or audio survived the injected notification insert failure; a later retry succeeded |
| Actual maximum upload through HTTP | A valid exact 4 MiB WAV uploaded and downloaded byte-for-byte; duration was derived from sample bytes |
| Browser acceptance | 16/16 tests passed in Chromium: 12 messaging and 4 community cases |
| Existing web node tests | 165/165 passed; shared source-marker validation is updated by yellow-group integration |

Browser coverage includes the default-off audio gate, existing private playback while new capture is disabled, stale policy responses, capture cancellation after policy suspension, explicit consent, captured PCM bytes, recorder cleanup after session loss, delayed permission after discard, retained text/audio drafts, private history races, account switches, real community navigation, failed-input preservation, inactive-policy exit controls, guided native policy drafting and stale authority responses. Microphone hardware was stubbed; actual device sound and permission behavior are reserved for Q01.

The independent migration receipt is [`b14-d09-migration-review-2026-11-27.json`](b14-d09-migration-review-2026-11-27.json). It binds the exact SQL hashes and checks native foreign keys, retry uniqueness, size/duration constraints, cascade deletion, community native-key joins and retention bounds.

## Reproducible checks and integration

Use a disposable loopback database with `NODE_ENV=test`. Run the normal API build before scripts that import `dist`. Existing messaging bootstrap now applies and verifies the additive native-audio table for raw-table fixtures; the community runtime script applies the additive content tables and calls the completion checks automatically.

```sh
npm --workspace apps/api run build
npm --workspace apps/api run typecheck
npm --workspace apps/api run lint
node --test apps/api/scripts/private-audio-validation.test.cjs
node apps/api/scripts/messaging-key-schema-db-e2e.mjs
node apps/api/scripts/community-runtime-http-e2e.mjs
node apps/api/scripts/messaging-http-e2e.mjs
node apps/api/scripts/private-audio-http-e2e.mjs
```

HTTP tests require the isolated API to be running. D09 uses the existing `MESSAGING_E2E_BASE_URL` variable; the existing community runtime uses its own normal fixture configuration. The production module registration, shared workflow commands and shared web source-marker validator belong to the yellow-group integration commit. `CommunityModule` must be normally registered: the explicit approved policy controls activation, rather than a test-only environment flag.

The additive migrations are `20261127090000_yellow_private_audio` and `20261127091000_yellow_community_content`. They do not rewrite existing message identifiers or change Prisma's established native tables. Database backups include the private audio bytes; the ordinary database access and retention controls therefore remain relevant.

## Remaining acceptance boundaries

Technical implementation and isolated acceptance are complete for this scope. A real current D16 policy for B14 and D09 still requires the owner's choices, the existing independent approval workflow and explicit activation; both features remain gated without those decisions. Real-device microphone/playback acceptance and final platform acceptance remain Q01. No technical fixture, synthetic approval, migration rehearsal or simulated microphone substitutes for those decisions.
