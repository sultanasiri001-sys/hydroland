# Department reference discovery and operational linkage

This unit connects the existing reference registers to the current 14-department
ownership catalog. The read-only workspace is under **إدارة الموظفين → مراجع
الإدارات واللوائح**; its API is `GET /api/v1/admin/department-references`.

## Source identity and interpretation

`department-reference-catalog.ts` is a versioned discovery snapshot of existing
user-owned Library registers, not an authoritative copy of Saudi law or a new
effective rule store:

- Technical baseline v1.1: `libfile_9f26c1efb38c8191b4eb85e78c94c848`.
- Nineteen authority/service entries, dated 17 September:
  `libfile_b25914938cb48191810b0975bcb1affe`.
- Fifteen legal references in registry v3, dated 16 September:
  `libfile_ca42d7e978508191bc589ce6314b7b18`.
- Six HR sources and seven candidate controls, dated 23 October:
  `libfile_1a456a366bc8819180f339b98fa0ca50` and mapping
  `libfile_cce1fc6f9f3881918c3dac2d4d262a18`.
- Ten existing diving/marine PDF archives uploaded on 24 October are linked by
  their resolved Library and backing-file identities: diving regulation,
  membership, professional/non-professional licensing, trip organization, Zawil,
  vessel conditions, licensing incentives, cooperation contracts and shore-dive
  permits. Their department routing is proposed. File presence is verified;
  issuer/source-byte identity, effective version and legal approval are not
  certified. The snapshot date is the inventory date, not the regulation date.

The legal registry's existing department links are retained. New routing of the
nineteen authority/service entries is explicitly **proposed ownership routing**.
زاول is a service entry; the count does not establish nineteen independent
government bodies. Historical `Active` source labels remain historical metadata,
not a certification of today's law, legal applicability or internal approval.
The later labor-law PDF archive is identified separately; byte identity against
the official source is not certified by this catalog. Protected standards are
not copied or represented as licensed.

## Architecture and permission boundary

Canonical ownership remains in `governance/department-ownership.domain.ts`;
department Arabic names reuse `hr/staffing-catalog.ts`. No parallel organization,
permission, evidence, audit or effective-control store is introduced.

Each read rechecks an active, verified ADMIN, resolves the existing internal
platform organization, reads its department records, and projects current
`PolicyControl` rows into their ownership groups. Shared controls may appear in
more than one group; the overall control count remains distinct. A recorded set
of requirement/version/evidence/approval references is reported as **recorded**,
not legally verified. Raw policy metadata and actor identities are not returned.

The client loads only after expansion and a fresh role check. Closing, leaving,
logout, role loss or session changes clear content and fence late responses.
Source text uses text nodes, and links require HTTPS without URL credentials.

## Existing approval path preserved

The HR panel links to its existing compliance-control review panel. Candidate
sources, clauses and evidence specifications are visible for review; no candidate
is submitted, enabled or filled into approved requirement/evidence/legal-approval
fields. All seven candidate controls retain null approved references and empty
actual evidence arrays. Existing owner responsibility, temporary-review rules,
independent employment-template legal review, earlier template decisions and
employee signing remain separate and unchanged.

## Remaining closure

For each applicable procedure, complete source/version identity, approved clause
and requirement, applicability, action/scope mapping, verified evidence and a real
legal approval through the existing governed workflow. Non-HR activation workflows
and full versioned regulatory persistence are separate work; this discovery view
does not claim them complete or declare any department closed.

The web implementation discrepancy is recorded in
`ADR_WEB_IMPLEMENTATION_RECONCILIATION_2026-10-24.md` without replacing baseline
v1.1 or initiating a framework rewrite.
