# A16 legacy policy-write atomicity

The generic `PolicyControlService.setState` and `upsert` paths previously committed their policy write before calling `AuditService.record`. An audit failure could therefore leave a changed control without its audit event. They now read the current row with `FOR UPDATE`, check its mandatory binding, write, and record the attributed audit inside the existing serializable transaction helper. A failure rolls back both records. Existing policy metadata and the specialized HR/training-source boundaries are preserved.

The change adds no schema migration, provider call, policy adoption or production fixture. It does not implement the remaining A16 proposal/approval, effective-version and rollback workflow. A16 remains partially accepted until those separate criteria have evidence.

## Validation

- Local API build, strict TypeScript and ESLint passed.
- Eight focused compiled-service tests passed, including state/upsert/create rollback when audit recording fails, actor attribution, mandatory adoption observed at transaction entry, missing rows and protected domains.
- Existing booking-safety validation passed 18 checks, mandatory-policy validation passed 48 groups, and operational-control validation passed.
- The existing API workflow runs the focused tests and imports a guarded HTTP/PostgreSQL fixture. That fixture injects an actual audit-table failure and checks byte-equivalent row/audit snapshots after three rejected writes. It also checks authentication, native actor attribution and mandatory-binding refusal. Remote execution is recorded by the corresponding GitHub Actions run; this document does not predeclare its result.

All fixtures are synthetic and restricted to the existing loopback CI acceptance environment. Deployment alone does not establish completion of A16.
