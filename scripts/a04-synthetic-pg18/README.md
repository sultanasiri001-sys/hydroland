# A04 synthetic PG18 archive acceptance

Additive, independently reviewed synthetic test, not the saved UAT continuity package.
Local baseline:19 mocked unit tests passed; they do not prove PostgreSQL restoration.
The PR workflow runs an actual PG18 dump/restore in a disposable container and logs
its receipt. Acceptance must be read from the exact-head workflow, not this document.

## Isolation
Official `postgres:18-bookworm` base (resolved digest logged), Debian-signed Python3
package, non-root postgres user, overridden image entrypoint, no network/ports,
no secrets or existing database mounts. Checkout is exact PR head, token read-only,
credentials not persisted; no self-hosted runner. Runtime source mount is read-only.
The harness creates a fresh private cluster with Unix sockets only and accepts no
DSN/credentials/existing target. It compares five synthetic fixture tables, attachment
bytes, sequences, columns, constraints and indexes before/after custom archive restore.
It verifies unchanged source, detects an intentional rollback-only discrepancy, and
fails if its own server cannot stop. Container removal is enforced even on failure.

No saved UAT or production reads/writes; no application startup, deployment or merge.
No dump/database files are uploaded. Only aggregate receipt/hashes appear in job logs.
`archivePreserved` means unchanged during the run, NOT retained after container teardown.
The entire cluster/archive disappears with the CI container; no durable backup claim.

`actualSyntheticRestore=PASS` establishes only this small synthetic archive round trip.
`realUatAcceptance` and `applicationStartup` always remain `NOT_RUN`. This is not full
UAT schema coverage, live-source export, human sign-off, approved lifecycle, nor RPO/RTO.
A04 remains partial until those separately authorized requirements are evidenced.

## Local checks and explicitly authorized execution
```
python3 -m unittest -v test_acceptance.py
python3 acceptance.py  # exits2, no execution
```
With already installed PG18 tools, a non-root POSIX environment, and execution approval:
```
python3 acceptance.py --execute-approved-synthetic
```
Do not install dependencies or supply real database credentials to this harness.
The CI-specific image installs Python only in the disposable build image.

Source context: existing center-UAT tests exercise upgrade/smoke, not archive restore.
Existing production recovery runner remains untouched. The original local A04 mock
package is separate; this adds the missing real synthetic integration path, not a
replacement or repeated actual-production restore. Coordination: issue523.

Official dependency reference: https://github.com/docker-library/docs/tree/master/postgres
