# C02 HR technical acceptance — 27 November 2026

## Candidate and evidence boundary

The local checks below exercised baseline
`32e07e17439026d741e4c137f9858bc725fced49`. The HR lifecycle runner additionally
used the companion session-fixture correction in `apps/api/scripts/hr-http-e2e.mjs`,
whose tested SHA-256 is
`a2cbc518e9590e3752557405035c4cbd2e7a1efd16f68e770f2e194d866f2805`.
That fixture change must accompany this acceptance record; it is not an HR
production-code change. Remote commit identity may differ when the same source
tree is published. Release CI and deployment must identify their own commit.

The first lifecycle attempt failed because the old test tokens lacked the
persisted session identifier required by current authentication. The corrected
runner creates disposable `Session` rows and includes their `sid` in its test
tokens. It exercises the normal HTTP guard, including a **401 response after
offboarding revokes the target session**. It does not bypass authentication or
claim that interactive password login was tested by this fixture.

All employees, accounts, documents, approvals and signatures were synthetic in
loopback PostgreSQL/API instances. These results verify technical behavior.
They are not a real employee's employment cycle, contractual consent, payroll
payment or professional/legal acceptance.

## Observed results

| Executed suite | Observed result |
| --- | --- |
| `npm run validate:hr --workspace=@hydroland/api` | Architecture, canonical schema, lifecycle/authorization and fail-closed compliance validations passed |
| `hr-http-e2e.mjs` after the fixture correction | Passed: persisted employment transitions, audit, denial without mutation, compliance denial/success, IAM offboarding and revoked-session HTTP denial |
| `hr-document-source-http-e2e.mjs` | **19 groups passed**; 12 native source providers and all 192 catalog definitions across 14 departments were exercised without invented fields |
| `hr-document-case-http-e2e.mjs` | **32 checks passed** over **25 synthetic documents**, including separate review/test-signature, printing, archive and later-template-version preservation |
| `hr-attendance-source-http-e2e.mjs` | **13 groups passed**; source identity, organization scope, approval/date consistency, immutable saved versions and current authority were checked |
| `hr-control-review-http-e2e.mjs` | Passed: scoped proposals, independent review, audit rollback, concurrency, stale-version denial and preserved effective controls |
| `temporary-owner-review-http-e2e.mjs` | **109 checks passed** for bounded owner delegation, expiry/revocation, transfer/regrant fencing, history and zero implicit identity grants |

Counts retain the units reported by each runner; they are not a platform
completion percentage. The document/control checks do not themselves activate
employment, grant IAM access, execute payroll or confer professional authority.

## Verified workflow implications

The document-source checks preserve the distinction between the document's
author and its employee/beneficiary, pin saved source values into revision
evidence, reject client-invented source snapshots and require fresh previews
when sources change. The attendance checks separately report missing approval,
rejected leave, inconsistent dates and missing clock-in evidence.

The document-case run retained one canonical employee and the actual isolated
runtime references across its 25 archived documents. Publishing a later
template version did not rewrite those documents or prior decisions. The
control and temporary-owner checks retained scoped authority and prior history;
they did not create unrequested accounts, roles, employees or AI assignments.

Actual employee onboarding, applicable source references, genuine signatures
and a suitably qualified professional's review remain operational acceptance
where required. No synthetic employee or signature was represented as that
acceptance. This record also does not reintroduce a separate hiring approver
previously removed by the owner's approved policy.

## Existing CI and minimal correction

The suites already run in repository CI:

| Workflow | Relevant coverage |
| --- | --- |
| `api-validation.yml` | HR policy/lifecycle, control review and temporary-owner review |
| `form-library-integration.yml` | HR document-case cycle and the exact checked-out HR lifecycle runner |
| `platform-form-source-validation.yml` | Native document-source verification |
| `owner-approval-validation.yml` | HR source and attendance verification |

The `HR HTTP/DB E2E` step in `api-validation.yml` now explicitly sets
`NODE_ENV: test`, matching the corrected runner's loopback test guard.
`form-library-integration.yml` already sets that value at job scope. No new
duplicate CI job or authentication exception was added.

The first combined PR's form-library diagnostic replay exposed a stale helper
that deleted `NODE_ENV` after copying the canonical step environment. It now
retains that environment, so the persisted-session fixture runs in the same
explicit test mode as the original API step. All grouped HTTP assertions and
the isolated-database guard remain enabled; the corrected remote run needs its
own receipt.

## Local evidence identity

The successful C02 entries are in `root-evidence/summary.json` with SHA-256
`a31a123804ceb29a7c25f57982d106e11f5c6d27a7877e010a732c0e5a22d6f8`.
The associated logs are `c02-domain.log`, `c02-lifecycle.log`,
`c02-document-source.log`, `c02-document-case.log`,
`c02-attendance-source.log`, `c02-control-review.log` and
`c02-temporary-owner.log`. The earlier failing lifecycle attempt remains in
`summary-c03-before-c02-fixture-fix.json`; it is not counted as a pass.
