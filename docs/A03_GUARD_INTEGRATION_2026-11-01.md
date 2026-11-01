# A03 recovery guard integration — 1 November 2026

Integrate the existing #542/#546/#547 source chain (head `8fe90b231e4eb8641eb9575d7a97b18868c19763`) with current main `9ee9ff825ebeb03b3d865c3b30ff6a4e8815f8d1`. Preserve the original author commits, readback operator bytes, historical inventory, and dated recovery evidence. This source change does not run the operator against production.

## Release verification

The 42 existing guard/transport contracts now run after the existing locked dependency installation in the unconditional API validation job. The proposed release inventory names this step as critical, so skipped/missing/optional source evidence is rejected. The dedicated A03 workflow remains a focused credential-free check, classified as aggregate-covered by that API step. The proposed inventory now classifies 51 workflow files; its 28 required workflows and 31 job identities are unchanged. No deployment authorization is inferred from that proposal.

Inventory tests cover removal and optional execution of the actual API step. They locate the configured job rather than assuming every critical step belongs to a job named validate.

## Execution boundary

The operator still requires independently established expected owner identity and explicit Backblaze bucket ACL semantics before client loading/provider calls. Backblaze GetObjectAcl establishes bucket-level evidence, not per-version authorization. Reads stream into a digest without saving document payloads. Existing object/request/byte/time limits, fail receipts, client cleanup and false approval/transfer/application/PITR flags remain unchanged.

Source integration and CI do not prove bucket ownership, production bucket linkage, actual object version recovery, application cross-account denial, current PITR availability, or end-to-end RPO/RTO. Those remain acceptance items. No provider keys, credentials, owner identifiers or private object data are added to the repository. No settings, permissions, paid resource, database contents or object contents change as part of this integration.
