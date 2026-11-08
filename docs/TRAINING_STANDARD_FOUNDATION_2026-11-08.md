# A14 training-standard foundation — bounded integration

This change extracts only the side-effect-free profile parser/evaluator and its 32 synthetic unit contracts from draft PR #582, plus the first PADI 2026 Open Water source crosswalk. The existing API validation workflow runs the new core suite without creating or reclassifying a release workflow.

It does not import the new engine into any application service/controller, expose profile approval APIs, change a runtime policy, alter training enrolments/sessions/certificates, add a migration, seed or approve agency standards, or deploy a feature. Existing operational gates and training behaviour are unchanged.

No claim is made that every PADI/SSI/NAUI programme exception is implemented. The crosswalk explicitly identifies per-dive depth progression, junior limits, assistants/group rosters and other requirements needing mapping. Synthetic limits are not real agency rules.

The full candidate remains in #582. Its initial real integration checks correctly stopped on STANDARD_SELECTION_REQUIRED for existing synthetic courses without profile bindings. That is evidence of an unfinished adoption path, not permission to bypass the gate or apply it to live legacy courses. Integration/adoption, real source approval, full programme exceptions, signed-form mapping and functional acceptance must complete separately.

User direction authorises merging ready work only. Merge this bounded foundation only after exact-head checks and repository requirements pass. Its merge is not A14, Data Foundation, operational source approval, or project-level closure.

Local verification: Node 24.22.1, 32/32 pure contracts. These test the engine, not Nest/Prisma/HTTP/production. Remote CI and live deployments have separate evidence.
