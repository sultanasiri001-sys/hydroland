# Personal customer-case integrity — 17 November 2026

The individual support endpoints previously accepted unbounded or incorrectly typed inputs and wrote cases/replies without the attributed audit used by organization requests. Validate allowed create fields, enums, text bounds and optional reference strings before writing. Treat missing or non-string replies as invalid requests.

Create each case with its initial interaction and audit inside one existing serializable database transaction. Create replies with their attributed audit in the same transaction, retaining the existing individual-account and organization-null boundary. Audit metadata contains the type or interaction ID, never the subject, description, reply text or reference values. No schema or policy changes.

Extend the guarded loopback HTTP/PostgreSQL acceptance suite: malformed and oversized values, unknown/foreign targeting fields, cross-account replies, attributed audit contents, and a temporary database trigger that rejects only the synthetic actor's personal-case audits. Failed create/reply responses must leave cases, interactions and audit counts unchanged. Trigger/function teardown is mandatory. This is a disposable CI database, not a production fault injection.

This narrow fix does not implement assignment, SLA, escalation, resolution, customer acceptance or objections and does not close C04. Publication evidence is separate from code and CI acceptance.
