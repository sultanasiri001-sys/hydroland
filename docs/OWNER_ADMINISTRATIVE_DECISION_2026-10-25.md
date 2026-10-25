# Limited administrative-owner decision

Sultan was asked whether to proceed with a separately named owner administrative-decision route for routine minutes and follow-up, excluding financial, contractual, sensitive personnel, legal and safety authorisation. His next instruction was “واصل”. This delivery implements that limited route; it does not grant additional users access, allow independent self-approval, or execute a production decision on his behalf.

## Scope and semantics

Only `ADM-MEETING-MINUTES` (ADMIN_AFFAIRS_RECORDS) and `EXE-FOLLOWUP` (EXECUTIVE_GOVERNANCE) are eligible, with their three known TEXT field bindings and complete bounded payload. DRAFT or PENDING_APPROVAL sources only; an existing approval, signature or final state is excluded. General executive decisions and all other templates remain excluded.

A receipt is a **separate OWNER_DECISION_RECORDED record**, not an APPROVED/SIGNED ManagedDocument. It records the verified owner's administrative acknowledgement and routine follow-up note. It does not enact or approve decisions mentioned in free text or in referenced documents. Before every recording, the owner attests routine-only scope and the absence of independent approval/signature. Software cannot determine every legal/financial implication of arbitrary text; the fixed template allowlist and explicit scope acknowledgement do not certify substantive compliance.

The source remains in its existing lifecycle status. Its later revisions are permitted through unchanged source rules; each receipt permanently identifies and embeds exactly the reviewed source version. A later version does not inherit an older decision. Old source PDFs retain their existing rendering and status. The owner receipt has a separate PDF and a notice on every page. No one else's approval or signature is fabricated.

## Persistence and controls

Existing OperationalSetting storage is used under an exact `OWNER_ADMIN_DECISION:v1:<org>:<document>:<version>` namespace, with a unique key per source version. Only a create operation exists; there is no update/delete endpoint, automatic seed or migration. Actor-attributed AuditEvent and receipt are saved in the same serializable transaction. Audit failure rolls back the receipt. Generic lifecycle tables, counters, roles, memberships and source revisions are not written.

Current internal-owner authorization is rechecked for inspection, recording and private receipt PDF reads. PDF authorisation is checked again after rendering. The server review hash binds the verified account, policy, source version/content, template and pinned branding. The hash provides an integrity comparison, not an electronic signature. Stale reviews, unknown input properties, changes to field bindings and duplicates are rejected. The UI never automatically replays an uncertain write.

Receipt reads are private/no-store. History is bounded to the most recent 100 records and explicitly identifies truncation. Existing receipts for the current version are read separately, including when outside that window. Historical receipt PDFs use their immutable stored snapshot, not the latest template, document content or organization branding.

## Verification/release boundaries

Local: 16 compiled-from-TypeScript domain/controller tests with synthetic transaction and authorization dependencies; 17 isolated Chromium tests of the actual new dialog; 12 retained workflow diagnostic UI tests. No full local dependency installation or real database acceptance is inferred.

Dedicated CI adds real HTTP/PostgreSQL owner-decision acceptance, a real-font PDF layout check, and the browser/controller checks while retaining all prior tests. No production account or business record is used in CI. Merge/deploy requires all applicable exact-head checks and review of generated PDF evidence.

#509 remains open for the independent approval workflow outside these two eligible routine types. Catalog setup from #508 remains a separate authenticated owner action and is not executed by deployment. This feature is not a blanket completion of the 14 departments' procedures or content approvals.
