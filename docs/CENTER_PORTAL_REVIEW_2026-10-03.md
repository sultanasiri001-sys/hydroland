# Dive-center continuation — 2026-10-03

## Release remains held

Review started at PR #409 head `9e2dbf2e59d8389137d25076a8a7c676586b5d3f`.
Main and both inspected Render deployments remain at
`830d1be035f1d4c48e9a92f8cccbf86db910b8bc`.

The starting-head Web run `37094574096` passed 160/160 browser tests and a
separate 4/4 notification run. It retained public, portal and account screenshot
artifacts. These are the current evidence counts, superseding the older 154-test
checkpoint in the PR description; they are not a new manual visual acceptance.

A fresh `npm audit --json` against the unchanged lockfile reported 19 high,
10 moderate and 0 critical affected dependency entries. The high roots are:

- `node-forge <=1.4.0`, GHSA-86w9-cpqp-85rv / CVE-2026-85393.
- `braces <=3.0.3`, GHSA-vfj7-8cjw-p6xm / CVE-2026-93687.

The npm registry still advertises node-forge 1.4.0 and braces 3.0.3 as latest.
Expo 57.0.26 depends on CLI ^57.0.27; that CLI still depends on node-forge
^1.3.3. The latest @expo/code-signing-certificates 0.0.7 still depends on
node-forge ^1.4.0, and micromatch 4.0.8 still depends on braces ^3.0.3.
Therefore a compatible published upgrade removing these blockers was not
established. The advisory entries report no fixed versions, and forge PR #1152
remains open. Dependency manifests, lockfile, audit policy and release hold are
unchanged. No forced downgrade, package exception or unreviewed replacement is
introduced. A proposed changelog version is not a published security fix.

Sources checked:
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/digitalbazaar/forge/pull/1152
- npm registry metadata queried with `npm view` for the packages above.

## Server-side portal-role bypass repaired

The center service previously required active OWNER/ADMIN membership in an
active center but never checked the account's DIVE_CENTER role. The access-token
guard authenticates the account/session only. A local reproduction executing the
actual service allowed a suspended-role owner to reach both protected safety
queries, with zero role checks. Browser revocation alone could not protect direct
API callers.

The shared `managedCenter` boundary now reads the exact DIVE_CENTER assignment
and rejects every state except ACTIVE before querying center membership or data.
The existing manager membership and organization checks remain mandatory. An
unrelated active role does not substitute for the required portal role. This
matches the existing instructor-portal server authorization pattern.

The isolated center HTTP/PostgreSQL regression now covers:

- All twelve center routes, including the equipment write route, with DRAFT,
  PENDING_REVIEW, REJECTED, SUSPENDED, ARCHIVED and absent center roles.
- Same-session role revocation and restoration, while center and manager
  membership stay active; an unrelated INSTRUCTOR role remains active.
- Recovery of the eight non-equipment read routes after role restoration.
- Separate center document assets and all four regulatory record categories;
  exclusion of internal memos and cross-center records; no binary content or
  unnecessary administrative identifiers in list responses.
- The original safety ownership, payload minimization, staff denial and
  membership/organization suspension scenarios.

The fixtures are restricted to CI and loopback API/PostgreSQL, and are removed
after execution. The equipment denial scenarios use a nonexistent resource:
they establish role enforcement before lookup, not successful equipment writes.
Document coverage establishes metadata-list isolation, not upload, download,
signature or license-approval lifecycle acceptance.

## Validation and remaining acceptance

Local actual-service role matrix: 7/7 passed; denied roles never reached protected
queries. API typecheck/build, script syntax and diff whitespace checks pass.
HTTP/PostgreSQL results for this change must be taken from the updated PR's CI;
the earlier 160 browser results must not be relabeled as a run of this change.

Whole-center acceptance remains open, including successful equipment operations
against supported schemas, document/license lifecycles, finance/reporting and
production acceptance. The dependency-security gate must pass before merge or
deployment. No production data, role, setting, migration or external provider was
modified during this continuation.

## Equipment continuation

The center movement endpoint bypassed the canonical equipment inspection/service
policy check on CHECK_OUT and omitted the inventory audit event. It now calls
EquipmentInspectionService.evaluate, rejects blocked check-outs, and records
EQUIPMENT_INVENTORY_MOVED in the same transaction as movement/status changes.
Configured REVIEW/DISABLED behavior remains that of the canonical inventory
service; this does not introduce a new safety policy.

Scoped SQL now converts the bound center identifier to the actual EquipmentBarcode
organizationId column type through jsonb_populate_record. It supports canonical
TEXT and recovered UUID scope columns without casting the indexed column.

The center HTTP suite adds real equipment for two centers and exercises lookup,
list/history isolation, manager/staff/guest writes, invalid movements, foreign
and completed trips, missing/failed/expired inspections, all seven movement types,
retirement, actor/center/movement audit linkage, and unchanged foreign equipment.
It runs against both TEXT and UUID organizationId columns. The CI-only temporary
TEXT scope has a real Organization FK; UUID mode tests query compatibility and
is not proof of production FK migration/recovery. Fixtures and temporary schema
changes are removed. Successful run counts belong in the PR's current CI evidence;
typecheck and build passed locally before submission.

Production operation acceptance and document/license lifecycles remain open.
Security release hold is unchanged; no merge, deployment, production migration,
policy change or dependency-audit exception is authorized by this repair.

## Document lifecycle continuation

Review found a version race in DocumentPersistenceService.transition: after its
initial read, a concurrent DRAFT revision could commit before the transition
transaction. The transaction checked status only, so it submitted the changed
version. An actual-service local reproduction accepted version 2 after reading
version 1. The repaired transaction checks both status and version, including
both in the conditional update. The same reproduction now returns 400 without
writing a transition or event.

A deterministic CI PostgreSQL regression invokes the real transition service and
commits the competing revision through the running HTTP API before opening the
transition transaction. It checks that stale submit leaves DRAFT version 2 and
its revision history intact, writes no approval-transition event, and that a
fresh HTTP submit succeeds with exactly one version-2 event. Existing HTTP tests
continue to cover membership isolation, separation of creator/approver/signer,
PDF rendering, pinned branding/templates, archive immutability and numbering.
This server-side race guard does not add a client expected-version contract.

License acceptance remains separate: the center endpoint currently lists
AdministrativeRecord metadata; OrganizationDocumentAsset's implemented upload
endpoint accepts logos, not license attachments. Metadata fixtures of kind
LICENSE do not establish an upload/expiry/review/external-verification workflow.
No external license approval or qualified electronic-signature acceptance is
claimed. No production mutation, merge, deployment or security exception occurs.
