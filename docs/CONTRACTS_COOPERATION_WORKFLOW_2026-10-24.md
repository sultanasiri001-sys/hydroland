# HYDROLAND — Cooperation contracts and electronic approval

Implementation proposal for review; production publication and legal acceptance are separate gates.

New cooperation contracts now require a published central library template. The library supplies their clauses and a pinned template ID, version and hash; existing party contracts keep their original text and evidence. See [the contract library implementation and HR/legal boundaries](CONTRACT_LIBRARY_2026-10-24.md).

## Architecture and prior drafts reviewed

- `HYDROLAND_CANONICAL_ARCHITECTURE.md`, `ARCHITECTURE_FREEZE_V1.md` and `CENTERS_HR_WORKFORCE_CONSOLIDATION_REPORT.md`: one owner per capability, canonical organization/person/account references, configurable regulatory sources and scoped authority.
- `HR_LEVEL_3_EMPLOYEE_LIFECYCLE.md`, `HR_SAUDI_LABOR_CONTROL_MAPPING.md`, `HR_CONTROL_REFERENCE_REVIEW_2026-10-23.md`: employment, compensation, roles and signed evidence remain separate. An internally approved document cannot activate employment or replace mandatory official documentation.
- Current saved `HYDROLAND_HR_Control_Mapping_2026-10-23.md` (version 1), executive summary, and `HYDROLAND_Diving_Professional_Cooperation_Contract.pdf` (version 3, document text version 1.2): existing cooperation terms, two party signatures, center identity and outstanding regulatory verification.
- The user approved the marine incident form as the visual identity of all contracts: fixed primary HYDROLAND mark, navy headings, cyan borders, pale input cells and gold accents. Center name/logo remain variable.

## Gap found in the actual implementation

The generic ManagedDocument lifecycle is `DRAFT → PENDING_APPROVAL → APPROVED → SIGNED → ARCHIVED`. It records one independent signer after an approver. It is suitable for its existing controlled documents but cannot represent the requested two-party contract followed by platform approval. The legal governance domain includes pure workflow definitions; these do not constitute a persisted party-signing implementation. EmploymentContract points to evidence in Document and remains owned by HR.

## Implemented boundary

The cooperation workflow stays in the shared `document-forms` module. It uses existing ManagedDocument, DocumentTemplate, DocumentRevision, DocumentLifecycleEvent, brand snapshots, audit and notifications. No shadow account/organization/employment table is introduced. The source-profile extension adds five nullable fields to existing canonical owners via one additive migration. The dedicated reserved template is `LEG-DIVE-COOPERATION-V1`.

| Responsibility | Implementation |
| --- | --- |
| Center identity / commercial terms | Identity comes from its canonical business profile and reviewed license; the named manager enters terms on a draft |
| Professional details / signature | Identity comes from its canonical membership profile and explicitly selected owned credentials; the named active verified INSTRUCTOR reviews and signs |
| Platform approval and seal | Canonical internal platform owner with a current active verified ADMIN account; a party cannot approve its own contract |
| Clauses and fixed identity | Versioned server-side draft from the existing cooperation document; clients cannot submit signer IDs, stamp data or alter clauses |
| Work/employment activation | Existing HR process; this contract workflow grants no employment, payment authority, center membership or IAM role |
| Evidence and history | Existing revision, lifecycle and audit records, transactionally committed with state changes |

## User journey

1. The center selects its authorized organization and the professional's registered email. The exact Arabic title is **عقد تعاون محترف غوص**. The server copies the necessary party details from canonical Person/Account, ProfessionalProfile, selected owned Credential records, Organization, current manager membership, and a registered, platform-reviewed current center license. A versioned source snapshot and the center branding are pinned to the contract.
2. Names, contact information, qualification/license references, center address/registration, training membership and representative capacity are read-only in the contract. Missing source data is shown explicitly; source corrections are saved in the membership or business profile. ProfessionalProfile adds optional owned-credential references and an eligibility evidence reference; Organization adds optional address/training-membership fields. The additive five-column migration must be reconciled/applied through the normal release process; no production migration has run here.
3. Draft sources refresh automatically when opened and after the profile is saved, and can be refreshed explicitly. Refresh advances the revision only when its content/source changes. The center prepares service, fee, duration and commercial terms; the platform owner can amend those terms on a draft. Existing financial values are never invented from a member profile.
4. Once required source details and terms are complete and the source snapshot is current, the center issues the version for signature. Each named party reviews, explicitly confirms acceptance and signs that exact version/hash with their authenticated account. No member retypes their identity into the contract.
5. Source changes during signing require a return, a new source snapshot and fresh signatures. An approved contract is an immutable historical snapshot, even after later profile changes.
6. HYDROLAND's independent owner can approve, reject, return for amendment, or add a note. Approval requires both signatures and current authority/source checks, then adds the internal platform seal. Rejection closes the contract without a seal. A note is recorded in lifecycle/audit history and notifies the parties without changing signed content. Return advances the revision and invalidates old signatures. An amendment is made only to the draft, then reviewed and signed again.
7. Authorized PDF download uses the same stored source snapshot, exact title, marine-reference navy platform letterhead, secondary center identity strip, cyan frame/section boundaries, both signature records, and a dedicated HYDROLAND stamp area. Before approval the stamp position is visibly reserved; it never displays an approval seal prematurely.

## State and evidence mapping

| User-visible status | Existing ManagedDocument status | Required evidence |
| --- | --- | --- |
| DRAFT | DRAFT | Immutable payload snapshot per saved revision |
| AWAITING_SIGNATURES | PENDING_APPROVAL | CONTRACT_ISSUED, zero or one party signature for this revision |
| AWAITING_PLATFORM_APPROVAL | PENDING_APPROVAL | Both distinct party signatures on this revision/hash |
| APPROVED | SIGNED | Both signatures plus CONTRACT_PLATFORM_APPROVED and actor-attributed AuditEvent |
| REJECTED | ARCHIVED | CONTRACT_PLATFORM_REJECTED, a reason, no seal, no further editing |

Party signatures are not stored inside client-editable payloads. Generic document creation/revision/transition endpoints reject the reserved contract template. Generic organization lists and read/revision endpoints exclude private contracts. Authorized PDF/print paths recheck named-party/platform-owner authority. Failed audit/notification writes roll the entire state transition back.

## Signature scope and regulatory work remaining

This implementation records an authenticated-account electronic acknowledgement and internal platform approval. It does not issue a qualified digital certificate, use Nafath or claim a certified trust-service signature. A drawn mark/logo alone is not treated as proof. The owner still performs the approval; no AI signs or approves for a real person.

The existing cooperation PDF explicitly leaves full federation-source verification and later amendments unresolved. The current federation index still lists cooperation rules at <https://swsdf.sa/diving/regulations>. Direct retrieval of the federation page and the DGA electronic-transactions pages returned HTTP 403 in this review; indexed excerpts do not establish complete current compliance. References to professional/training/national-license/medical eligibility in the draft require the established legal and credential verification workflows. Nationality or work eligibility is not inferred from a name, email or signature, and no regulatory exception is invented.

The cooperation clause text is a review draft adapted from the existing saved document. It does not replace that file or assert federation approval. Employment and other contract families should adopt the same identity via their canonical workflows after their specific source/version/approval mapping is accepted; this change implements the requested center/professional cooperation workflow first.

## Validation

Relevant API/web builds, typecheck, web static/unit validations, protected routes, document RBAC/lifecycle/center access and Arabic PDF validation pass locally. The focused browser run passed 11/11 cases: nine new contract cases plus two retained operational-document cases. The dedicated HTTP harness passed 76 checks against the actual local Nest API and an isolated PGlite socket, including private logo access, pinned branding, exact version/hash, concurrent party submissions, authority rechecks, audit rollback and no HR/IAM side effects. PGlite multiplexing does not certify real PostgreSQL lock/concurrency behavior; the same harness is registered in API CI against PostgreSQL 16. Final remote execution evidence belongs in the pull request. The four-page unsigned preview and sealed fixture were rendered and visually checked for Arabic joining, mixed text, margins, repeated headers and stamp visibility.


## Formal contract design revision

The cooperation PDF now has a dedicated print composition with bundled OFL-licensed Amiri regular/bold fonts, A4 margins, fixed primary HYDROLAND identity, secondary pinned center identity, ruled party/terms tables, numbered clauses, and separate signature/approval blocks. The sample is four pages; long permitted values paginate without truncation. The website preview uses the same locally served Amiri family and a restrained navy/gold paper layout. Signature, hash, authorization and seal rules are unchanged. No external publication is authorized by this design revision.

Validation after the design revision: API build/typecheck and Arabic PDF checks passed; 76 actual HTTP checks passed against the isolated local PGlite test database; 11 focused Playwright browser checks passed, including locally served regular/bold contract fonts and mobile width; full web static/unit validations passed. All four unsigned sample pages and the signed/sealed final page were visually inspected. The improved preview replaces version 0 of the prior preview file while preserving its history.

## Automatic source integration validation

The source-integrated HTTP harness passes 107 local checks against actual Nest routes and isolated PGlite, including source ownership, canonical profile saves, draft synchronization, immutable identity fields, privacy exclusions, source-change approval blocking, owner amendments/notes/rejection and preserved signed snapshots. The five nullable columns match the Prisma schema diff and their additive migration was applied successfully to the prior schema in an isolated database. The final focused browser run passes 26 cases across contracts, membership/profile settings, center business profiles and operational documents. Existing membership/profile/center browser checks were retained; the updated center save test includes its two new source fields. Full web validators, API build/typecheck, document persistence/RBAC and Arabic PDF validation pass. Real PostgreSQL CI and publication are still pending an authorized remote review.

## Marine-reference visual identity alignment

The final contract identity follows the approved marine incident image: a full navy letterhead with prominent original HYDROLAND mark, English/Arabic wordmark and brand tagline; white contract title; cyan outlined secondary center strip; navy section bars with white labels; pale blue value cells; cyan outlines; and gold/cyan/navy footer waves. The Amiri contract type and exact Arabic title are retained. Center branding and the dedicated platform seal position remain subordinate and approval-controlled. The PDF and website preview use this same visual hierarchy. This replaces the previous white/gold double-frame treatment. No source-data or signature-state rules change in this visual revision.

Visual-alignment validation: API build and the 107-check local contract HTTP harness passed; full web validators passed; the final focused single-worker run passed 15 browser cases. All four unsigned PDF pages and the approved fixture seal page were rendered and visually inspected, along with the mobile preview. The initial parallel run had a transient failure in an unchanged operational-document save scenario; the complete focused rerun passed without weakening its assertions.
