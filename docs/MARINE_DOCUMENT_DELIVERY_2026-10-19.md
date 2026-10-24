# Marine document delivery — 19 October 2026

Integrate #441 on the marine trip release #468. This adds private PDF/JPEG/PNG
attachments to marine asset documents, owner and administrator signed access,
and a dedicated center entry point. Personal credential uploads retain their
existing storage path. No provider credentials are changed.

## Production preflight

A read-only query against the production database on 19 October confirmed no
unresolved migration entries, no applied `20261005000000_marine_asset_document_storage`
entry, and no existing attachment columns on MarineAssetDocument. Existing keys
are TEXT. The migration only adds five nullable attachment metadata columns and
two unique indexes; it changes no existing keys or historical migrations.

## Additional authority checks

Upload persistence repeats active account, organization and write-membership
checks after the external PUT and writes creation audit in the same transaction.
A failed persistence removes the unreferenced uploaded object when its absence
from the database can be established. Owner access repeats membership checks
after external HEAD; administrator access repeats active ADMIN authorization and
pending-document state after HEAD. Denial produces no signed URL/success audit.
Expiry parsing occurs before object storage writes.

The HTTP regression uses a local SigV4-compatible storage server and revokes the
member or administrator during PUT/HEAD. It checks denial, orphan cleanup, no
new document row and no success access audit. All records are isolated CI fixtures.

## Acceptance boundary

Current-head CI and deployed migration/schema/runtime checks are required before
technical closure. A synthetic file test is not an issuer's licence verification,
operator acceptance, or approval to perform a marine activity. No production
licence, safety decision or organization membership is fabricated by this release.
