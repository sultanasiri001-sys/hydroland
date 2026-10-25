# Explicit internal template catalog setup

Follow-up to the merged form-library release (#507). This is an add-only setup action within the existing library, not a second library, a startup seed, a completed-document generator, or an approval workflow.

## Observed inventory

Read-only production inspection on 2026-10-25 found 21 active generic HR templates and one active generic legal report (`LEG-LEGAL-REPORT`), plus four active specialized `CLIB-` contract types with retained historical versions. The five active entries reported under the legal department comprise that generic report plus four contracts; they must not be described as five contract types.

The existing source catalog contains 60 generic definitions: 42 base/operational entries and 18 additional HR entries. The observed generic shortfall is therefore 38, not 39. These are source definitions, not evidence that all necessary business procedures are complete. Setup recomputes this count from the current scoped database; it never hard-codes the observed production number.

## Scope and safeguards

- GET and POST `/documents/organizations/:organizationId/template-setup`, with one selected department or `ALL`.
- Existing authentication and authorization; only the verified current internal platform owner. Normal center ownership or a platform ADMIN role alone is insufficient.
- Private/no-store preview shows missing, existing, inactive and conflicting codes. It performs no writes.
- POST requires explicit confirmation and a hash of the reviewed source/record snapshot. A changed snapshot or conflicting department/active-version ownership rejects the batch.
- The serializable transaction inserts missing empty template definitions only and records one attributable setup audit. Existing versions, inactive templates, contract records, documents, signatures, revisions, reference counters, roles and organization identity are not changed. Audit failure rolls back the inserts.
- No automatic retry after an uncertain client write response. The user must re-read the plan.
- UI appears inside the existing library for the eligible owner, preserves unsaved inputs, and uses the existing library invalidation/synchronization mechanism.
- No database schema migration, new credentials, paid services or production test accounts.

## Verification

New scripts:
- `apps/api/scripts/form-library-setup-validation.cjs`: compiled-controller logic with synthetic transactional/auth doubles.
- `apps/api/scripts/form-library-setup-http-e2e.mjs`: real HTTP and PostgreSQL acceptance, refusing all non-loopback or non-dedicated CI databases. It tests scoped access, explicit consent, concurrent setup, stale plans, retained historical data and audit attribution.
- `apps/web/scripts/form-library-setup-validation.cjs`: actual editor plus setup module in Chromium, with synthetic authorized-fetch fixtures.

The existing focused and real-integration workflows retain their previous tests and additionally run these scripts. Exact-commit CI results, merge and deployment status are recorded on the pull request. Local synthetic results alone are not production acceptance.

## Operator action

In the internal organization, open the existing form library, choose the setup scope, select `معاينة النماذج الناقصة`, review the list, check the confirmation, and select `حفظ النماذج الناقصة في المكتبة`. Publishing the application does not itself execute this owner-authenticated action. Template creation is not legal or departmental content approval.
