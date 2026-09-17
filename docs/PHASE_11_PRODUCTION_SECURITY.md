# Phase 11 — Production infrastructure and cybersecurity
- Containerized API with non-root runtime, read-only filesystem and no-new-privileges.
- Private PostgreSQL service; PostgreSQL remains the source of truth.
- Production environment template excludes real secrets; use KMS/secret manager.
- TLS is terminated by the selected production gateway; API binds only to localhost.
- Required before launch: managed database PITR, encrypted private document storage with versioning, tested restore procedure, monitoring/alerts, MFA, retention policy, RTO/RPO approval and domain/hosting accounts.
- No hosting account, domain, secret, provider or external subscription is activated in this phase.
