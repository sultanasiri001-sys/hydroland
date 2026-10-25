# Administrative form content completion

Revision `2026-10-25.1` covers 157 generic form types across 14 departments.
It retains the original 60 codes, adds 97 types derived from the additional
document families in `HYDROLAND_14_Department_Handbooks_v1`, and introduces
case details, record date, domain record reference and responsible unit fields
to 58 original definitions. Evidence references, follow-up date and retention
policy references are optional when applicable. References do not upload files
or execute the referenced domain action.

The handbook source snapshot is `d101ce1530f4424b63434cb6e8d33f61e302f5b0`.
The handbooks are **PREPARED_FOR_REVIEW**; the derived catalog does not confer
legal, financial, personnel, training certificate, safety or signature authority.
The 157 types are a documented implementation scope, not certification of a
complete mandatory institutional inventory or a target of 230 documents.

## Applying the revision

The existing form library exposes an explicit preview and separate confirmation.
Only the verified owner of the configured active internal organization can use
`GET/POST /documents/organizations/:organizationId/template-completion`.
Creation and update authority are checked again inside the same serializable
transaction as the preview hash and writes.

For an unchanged 60-template installation the plan is 97 creates, 58 new versions,
and 2 matching routine templates retained. `ADM-MEETING-MINUTES` and
`EXE-FOLLOWUP` retain their exact existing schema and routine-owner policy.
An edited title, field definition, printable flag, cross-department code,
or conflicting active versions blocks the batch; custom edits are never replaced
automatically. Inactive definitions are retained without reactivation.
Stale hashes and concurrent requests are rejected. Audit failure rolls back
both retirements and new definitions. A repeated matching plan makes no changes.

Historical rows retain their content. Managed documents keep their original
template IDs, revisions, branding, lifecycle events and approval/signature evidence.
The old add-only 60-template setup remains available and unchanged.
Specialized contracts are excluded from both paths.

## Validation and acceptance

Create, revise and submit/approve/sign validate payloads against the actual pinned
template, including required values, unknown keys, field types, real dates,
selection options and bounded content. Invalid creates allocate no reference;
invalid revisions create no revision. Historical signed records remain readable,
printable and archivable. No stored payload is normalized or silently rewritten.

Focused suites cover schema migration, authorization, stale previews, transaction
rollback and payload validation. Browser tests cover consent, field preview,
scope/session changes, input preservation and uncertain write responses.
The isolated HTTP/PostgreSQL suite exercises create/revise/submit for all 157
definitions and preserves an existing signed fixture. Actual PDF renderer checks
cover a representative rich form from every department, all field values,
pagination, official identity and absence of invented approval evidence.

These are synthetic acceptance cases. Publishing the code or applying the catalog
does not close real department operations: professional review, actual case
evidence, delegated authority, independent decisions and domain execution remain
recorded in their original workflows. Department closure gates are not changed.
