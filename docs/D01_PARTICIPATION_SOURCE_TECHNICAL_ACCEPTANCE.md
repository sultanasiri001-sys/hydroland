# D01 — participant consent, guardian authority and source-bound eligibility

## Scope and product behavior

D01 separates the account's editable health declaration from a documented source,
the participant's personal consent, and an independent administrative eligibility
decision. A self-reported `FIT` value or editable expiry date never becomes a
medical clearance. The account dashboard labels that information as a personal
declaration. The participation workspace displays only `CLEARED` or
`ACTION_REQUIRED`, with the current reasons and applicable source wording.

The workspace supports the original `BookingParticipant` and
`TrainingEnrollment` records. The operating organization is the trip operator or
course provider. A customer organization, financial mandate, booking owner or
free-text guardian name does not grant participant or guardian authority.

Policies do not contain a built-in legal age, a universal medical requirement or
a clinical questionnaire interpreted by the application. An approved source
specifies the service, activity, version, clause, applicability explanation, age
thresholds, consent requirement, medical applicability and effective dates.
Medical outcomes and professional references are recorded from the original
source; this workflow performs administrative source review, not a clinical act
or official issuer verification.

## Same-site workflow

Open **موافقات المشاركة والأهلية** in the account menu, or the participation link
beside a booking participant. A participant or documented guardian uses their own
active verified account and does not need membership in the operator's
organization.

Authorized reviewers prepare four kinds of private source:

| Source | Binding and purpose |
| --- | --- |
| Policy | Named service and activity, source authority/reference/version/clause, applicability, age and consent/medical requirements, Arabic and English wording, effective dates. |
| Identity | Native participant/enrollment, actual account when applicable, participant name, date of birth, issuer/reference and expiry. |
| Guardian | Same participant, service and current identity source hash; actual guardian account; documented relationship and participation-consent scope; issuer and validity. |
| Medical | Same participant, service, activity and current identity source hash; original issuer and professional reference; recorded outcome, limitations and validity. |

Each source has one original private PDF and uses the existing
`ManagedDocument`, `DocumentRevision`, `DocumentLifecycleEvent` and
`ManagedDocumentAttachment` stores. No second medical-file or document ledger is
introduced. Source preparation, independent approval and administrative signing
are separate account/person actions. Those signatures do not substitute for a
participant's consent or the original medical issuer's signature.

A reviewer creates the case against its policy and identity sources and links
any applicable guardian or medical evidence. The actual participant or currently
authorized guardian sees the service and the complete wording before signing.
An independent current reviewer then records the eligibility decision. The
original account may withdraw its consent. Renewing consent after withdrawal or
revocation requires an explicit reason and a new independent review.

The UI supplies revisions and digests internally; people enter named fields,
select the applicable records and upload a PDF. Displayed dates use readable
Arabic/English formatting in Riyadh time. The exact original timestamps remain
in the persisted data and request contracts.

## Operational boundaries

The same current-source evaluator is consumed by participant review, booking
confirmation, trip operational readiness/clearance, trip completion and training
standard/session gates. It checks current document versions, payload hashes,
PDF bytes, lifecycle evidence, reviewer authority, identity/service binding,
applicability, expiry, consent and the independent decision.

A source-bound case with missing, expired, changed, rejected or revoked evidence
does not become eligible through a generic policy toggle. Explicit withdrawal,
revocation and a recorded negative medical outcome remain blocking. A later
administrative policy replacement cannot erase the person's withdrawal.
Existing operational `ENABLED`/`REVIEW`/`DISABLED` behavior for a legacy record
without an adopted source case remains distinct from a `CLEARED` source decision.

Operational-clearance displays read the same current authority and source
assessment as execution. They show a stale grant without writing from the read
request; the transactional scanner records its revocation once. Training checks
use the actual activity time. A signature captured today cannot authorize an
earlier activity merely because an enrollment has no scheduled dates.

Reviewing evidence does not confirm a booking, charge a payment, issue an external
certificate, grant IAM permissions or certify a real marine operation. Booking
confirmation and those other actions retain their original separate gates.

## Privacy and evidence integrity

All `D01-` templates and sources, including policies, are private to the
participation workflow. Generic organization viewers cannot obtain them from
document lists/counts, templates, direct IDs, revisions, lifecycle responses,
attachments, PDF/print contracts, source audit, internal review, owner approval
receipts, administrative records or general operational evidence. Filtering
happens before counts, searches and pagination.

Guardian access is revalidated against the current source and actual person,
including after asynchronous PDF loading. A stored guardian account ID alone
does not preserve access after guardian authority is revoked or expires. General
audit metadata records identifiers and hashes without copying private source
payloads, health documents or the personal wording.

`ParticipationCase` is a projection over exactly one native participant or
enrollment. `ParticipationEvent` holds the append-only revision chain. Commands
bind request identity, current revision and digest; exact retries recover the
committed receipt, and conflicting content or stale requests fail. Source
revocation and the affected participant/booking/training revision signals commit
in the same transaction. Historical consent and source documents remain present.

When a guest is replaced by a different identified person, current medical,
guardian and consent references are cleared. The replacement cannot obtain the
prior person's PDFs or signature history. Authorized reviewers retain the
immutable original events. Renewing an identity source for the same actual
account/person preserves that person's withdrawal and medical holds.

## Migration and technical verification

The additive migration is
`20261127010000_participation_source_eligibility`. It preserves existing business
rows and adapts only its new foreign-key column types to the existing TEXT/UUID
identities. It enforces exactly one typed subject, source/account/person foreign
keys, bounded valid state, occurrence/revision uniqueness and immutable events.
Do not drop these tables when rolling back application code.

The acceptance scripts are:

- `apps/api/scripts/d01-participation-migration-checks.mjs`: applies the exact SQL
  on TEXT and UUID identities, checks the constraints and immutable events, and
  replays it without changing retained rows.
- `apps/api/scripts/d01-participation-http-checks.cjs`: real Nest routes,
  persisted login sessions, native PostgreSQL cases, original synthetic PDFs,
  independent accounts, concurrent requests, privacy, source applicability,
  consent, withdrawal, source revocation, booking confirmation, training binding
  and independently reconstructed event hashes. Native regressions also cover
  private guest replacement, current-authority revocation and historical training
  dates under enforced, review and disabled generic preferences.
- `apps/api/scripts/d01-participation-native-recovery.mjs`: PostgreSQL 18 native
  `pg_dump`/`pg_restore`, every table/row/catalog/attachment fingerprint, forward
  migration replay, and an unchanged original disposable database.
- `apps/web/e2e/participant-eligibility.spec.js` and the existing participant
  review/profile suites: Arabic/English forms, real browser interactions,
  source wording, account changes, stale responses, denied actions, withdrawn
  sources, personal withdrawal and explicit consent renewal.

The API workflow retains `d01-http-acceptance.json` and
`d01-native-recovery.json`. The local diagnostics are preparatory evidence;
technical release acceptance requires the complete checks on the exact published
commit/tree and verification of the matching deployment. No test is treated as
passed merely because it is present or discovered.

All test identities, policies, PDFs, signatures and medical outcomes are visibly
synthetic and confined to confirmed disposable loopback databases. These tests
do not supply an actual guardian verification, participant consent, professional
medical clearance, outside issuer acceptance or the user's final acceptance.
The existing D17/D13/D19 decisions and final Q01 acceptance remain separate.

Pre-existing regression suites create source prerequisites through the native
participation services before their future activities. The explicitly marked
historical certificate/progression fixture retains a legacy review requirement
and has no D01 case: it exercises the existing agency-program evidence, not
retroactive participant consent. The separate native D01 test proves that an
adopted source case cannot bypass its consent time through that review setting.
Fixture cleanup is restricted to confirmed disposable loopback test databases,
owned IDs and a transaction that restores the append-only trigger before commit.
