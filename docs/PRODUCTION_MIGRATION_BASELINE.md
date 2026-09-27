# Production Prisma migration baseline

The Render production database already records these 18 migrations as applied. A read-only snapshot of Prisma's `_prisma_migrations` table was checked on 2026-09-27. Ten applied migration files were missing from `main`, and eight tracked files no longer matched their applied checksums.

This change restores the exact migration SQL whose SHA-256 matches the recorded successful production entries. It does not run SQL against production. On the existing production database, Prisma should recognize those names and checksums as already applied. This baseline does not claim that the historical migration chain can bootstrap a new empty database; the repository's separate environment-bootstrap process remains in place.

`apps/api/prisma/production-migration-baseline.json` records the verified checksums. The release gate checks every file against that list and permits a change to an existing historical migration only when the restored file matches its listed production checksum. The gate rejects edits to the baseline manifest in the same pull request as historical migration changes, and rejects other historical edits.
