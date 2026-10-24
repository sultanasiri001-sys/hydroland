# Center seal evidence for cooperation contracts

New cooperation contracts require the authorized center representative to upload a PNG/JPEG image of the center seal and explicitly acknowledge authority to apply it when signing. This is separate from the professional's signature and HYDROLAND's later administrative approval. It does not claim a qualified electronic seal, federation acceptance, or regulatory certification.

## Evidence and access

- `centerSealRequired: true` is pinned in each new contract payload and content hash. Existing payloads remain unchanged and display missing historical seal evidence honestly.
- The center signature lifecycle event stores explicit seal consent, an immutable organization-scoped `CENTER_SEAL` asset ID, its SHA-256, and a generated seal evidence ID. The signature already binds actor, exact contract version/hash and time. The same evidence is recorded atomically in the audit event; audit failure rolls back bytes and signature.
- Only the assigned center signer can apply the seal, with current verified account and scoped center authority rechecked. The professional and platform owner cannot apply it for the center. No account roles or employment records are changed.
- Images are limited to 2 MB, PNG/JPEG, 4096 pixels per dimension; canonical base64, file signature and image readability are checked. Existing assets with a different purpose cannot be reused as seals. These controls validate image structure, not the authenticity of the seal or delegation document.
- GET `/contracts/cooperation/:id/center-seal` requires current contract access and serves private/no-store bytes. Stamp assets cannot be read through the organization-logo path.
- Contract reads and platform approvals validate the asset's organization, purpose and digest. Returning a contract to draft preserves historical evidence but removes the current stamp along with both signatures. A new signature must apply it again.
- The browser preview and PDF show the uploaded center seal separately from HYDROLAND approval. Pending and historical missing evidence never display an invented seal. Late image responses are fenced by session, view, contract and seal evidence ID.

## Compatibility and validation

No database migration, dependency change, automatic approval or production signing is part of this change. Existing contracts remain readable without gaining new evidence. A downgrade to an old reader cannot interpret the new hash-bound payload field; retain this reader for contracts created after release.

Local validation: API build; Web unit/design/access checks; 16 contract browser cases plus three focused reruns; isolated Nest/PGlite HTTP suites (93 library and 143 cooperation checks). The cooperation suite covers missing consent/image, role denial, MIME/base64 failures, private image access, audit rollback, tampered image reads/approval, lost-response retry, revision invalidation, and historical payload compatibility. PGlite supplements native PostgreSQL CI and does not replace it. The synthetic approved PDF was rendered and visually checked with separate center and platform seals.

Legal review remains required before publishing a library template. The uploaded cooperation rules (section ز, revision 02, 2021, pp. 1-3) and professional-license rules (section ج, revision 01, 2021, pp. 1-3) inform the draft; the current applicable edition and acceptance of the resulting electronic copy must still be confirmed.
