# Integration and delivery evidence — 19 November 2026

This register fixes a finite scope: **80 first-parent deliveries** after the accepted [PR530](https://github.com/sultanasiri001-sys/hydroland/pull/530) baseline through `4cc1cc3ad3697a279b692271a6bed1b2b8e10227`. Each entry carries its exact PR head, merge source, first-parent diff, before/after blob IDs, observed check results, author-declared limits and repository merge decision. Future work belongs to a new register version.

[Machine-readable register](release-deliveries-2026-11-19.json). The exact PR checks were retrieved from GitHub; a passed check is not relabeled a production exercise or independent source review. PR593 contains one intentionally skipped manual provider drill. All other recorded checks succeeded.

## Review performed

- Reconciled the complete first-parent chain and every accepted PR head with its check results; there are no missing deliveries in this denominator.
- Independently compared all accepted PR-head and merge trees: 78 are identical. PR556 preserves the 12 byte-identical files from the intervening accepted PR555 base; PR567 preserves the 2 byte-identical V6 files from accepted PR566. The listed PR checks are not relabeled as exact checks of those two different merge trees. PR567's author description separately records its tested synthetic merge and subsequent main-push checks.
- Read the baseline-to-candidate Prisma changes and all added SQL migrations. The schema diff has 320 added lines and 0 removed lines. The new table mappings are unique. This mechanical check does not replace semantic ownership review.
- Compared all historical migration paths. 8 migration files were added; none of the existing migration files was modified or deleted.
- Independently ran the existing literal route scanner on the named candidate: 606 signatures across 465 TypeScript files, with no duplicate method/path signature. Runtime precedence, every controller method body and full A10 acceptance are outside this result.
- Reviewed the current ownership and integration boundaries against the existing architecture and integration reports. A payment, document, inventory item, organization and audit record retain their canonical owners; a review document does not execute a financial or access-control effect.

## Migration-specific conclusions

| Change | Reviewed effect and limit |
|---|---|
| AI provider attempts | Adds attempt/retry fields and durable per-attempt rows with lifecycle/result updates; backfills existing tasks into attempt 1 and updates the new counters. This is an intentional data migration, not a claim of zero existing-row updates. |
| Community runtime | Adds scoped post/participation/volunteer structures and constraints with TEXT/UUID identity normalization. It does not grant public moderation, consent or retention policy. |
| Marketing drafts | Adds draft/revision storage, idempotency and append-only revisions. DRAFT/ARCHIVED does not represent authorized publication or measurement. |
| Warehouse locations | Adds location/revision storage and constraints. It does not create a complete procurement, receiving, custody or stocktake execution chain. |
| Operational evidence | Adds scoped evidence/revision records with referenced document version and hash. Referencing an event does not execute it or certify its acceptance. |
| Linked correspondence | Adds correspondence relationships and snapshots. Existing TEXT/UUID recovery is preserved as a separate corrective path; the original migration is not rewritten. |
| Document PDF attachments | Adds content-hash storage and document relationships. Existing TEXT/UUID recovery and PostgreSQL 18 checks remain separate. |
| Customer-case deadlines | Adds a nullable TIMESTAMPTZ(3) deadline and status/deadline index. Existing cases remain null; the application requires an explicit future deadline at first assignment and does not invent a default SLA or automatic customer acceptance. |

The CI database bootstrap uses the canonical schema plus explicitly selected raw migrations and recovery scripts. It is **not** evidence that every historical migration can be applied, unmodified and in order, to an empty database. Recovery procedures and actual existing-data fixtures must remain identified separately.

## Acceptance limits

Independent review is complete for the named 80-delivery source/check reconciliation and the stated schema, migration, literal-route and ownership boundaries. This supports I01/I02 only for the delivered integration scope through this commit; future deliveries and F01–F08 expansion changes retain their own review and acceptance. It does **not** assert that all changed source files in all deliveries received a fresh independent behavioral review, nor does it close Q04 or any operational department automatically.

C11 and C04 source and their exact PR gates are included. Render rollout and the full-main release result are separate evidence. A06 and D11 candidates that are not in this named commit are outside this version and must be added after acceptance. Owner-closed items and deferred field operation retain their prior disposition.

## Delivery index

| PR | Merge | Exact PR head | Checks | Files |
|---|---|---|---|---|
| [#532](https://github.com/sultanasiri001-sys/hydroland/pull/532) | `4f0b6ac663ba` | `aab411749d9f` | 13 passed | 11 |
| [#533](https://github.com/sultanasiri001-sys/hydroland/pull/533) | `a3d5ad1d73da` | `aae676678513` | 14 passed | 5 |
| [#549](https://github.com/sultanasiri001-sys/hydroland/pull/549) | `40e20c8f3804` | `41433d105daf` | 23 passed | 31 |
| [#550](https://github.com/sultanasiri001-sys/hydroland/pull/550) | `8dd35aa2c7e4` | `7089d0514fba` | 12 passed | 4 |
| [#552](https://github.com/sultanasiri001-sys/hydroland/pull/552) | `7cac30177c35` | `2fb8f57e4b8c` | 17 passed | 20 |
| [#553](https://github.com/sultanasiri001-sys/hydroland/pull/553) | `e86768cf8205` | `a1e9870d857f` | 13 passed | 16 |
| [#554](https://github.com/sultanasiri001-sys/hydroland/pull/554) | `df9b896c06dc` | `0050b8da32cf` | 10 passed | 3 |
| [#555](https://github.com/sultanasiri001-sys/hydroland/pull/555) | `4f0b7114b0af` | `6f0abed08aef` | 13 passed | 12 |
| [#556](https://github.com/sultanasiri001-sys/hydroland/pull/556) | `497833f85beb` | `7b32d6c2bf76` | 19 passed | 17 |
| [#557](https://github.com/sultanasiri001-sys/hydroland/pull/557) | `6d259d55aef2` | `7cac649a3351` | 19 passed | 26 |
| [#558](https://github.com/sultanasiri001-sys/hydroland/pull/558) | `1aead97e9064` | `50b8d276cfbe` | 23 passed | 28 |
| [#559](https://github.com/sultanasiri001-sys/hydroland/pull/559) | `b4f2b54db95e` | `13fc1def2f9e` | 14 passed | 3 |
| [#560](https://github.com/sultanasiri001-sys/hydroland/pull/560) | `e0950ddd42ae` | `3703a05ff991` | 14 passed | 6 |
| [#561](https://github.com/sultanasiri001-sys/hydroland/pull/561) | `20695b841699` | `6c95f99db160` | 14 passed | 2 |
| [#562](https://github.com/sultanasiri001-sys/hydroland/pull/562) | `8d7b5f1ce989` | `16496390251a` | 14 passed | 3 |
| [#563](https://github.com/sultanasiri001-sys/hydroland/pull/563) | `30bedb75b0a6` | `1bd1605f3545` | 14 passed | 4 |
| [#564](https://github.com/sultanasiri001-sys/hydroland/pull/564) | `30c53fbecac9` | `67790610a7eb` | 14 passed | 3 |
| [#565](https://github.com/sultanasiri001-sys/hydroland/pull/565) | `b7a4b876cd01` | `d0bf5aa4b12e` | 20 passed | 22 |
| [#566](https://github.com/sultanasiri001-sys/hydroland/pull/566) | `91df2d2175fc` | `8ec981d0ed0a` | 15 passed | 2 |
| [#567](https://github.com/sultanasiri001-sys/hydroland/pull/567) | `ebfccb46a60e` | `4bc4d29b9927` | 33 passed | 76 |
| [#568](https://github.com/sultanasiri001-sys/hydroland/pull/568) | `9ee9ff825ebe` | `e150fbf4add0` | 12 passed | 5 |
| [#569](https://github.com/sultanasiri001-sys/hydroland/pull/569) | `d17c95eed576` | `fe872367ae52` | 17 passed | 11 |
| [#571](https://github.com/sultanasiri001-sys/hydroland/pull/571) | `593a9124438d` | `547bf38fe5d9` | 17 passed | 19 |
| [#572](https://github.com/sultanasiri001-sys/hydroland/pull/572) | `982e6a4c159a` | `9b1e5b08cff9` | 23 passed | 20 |
| [#573](https://github.com/sultanasiri001-sys/hydroland/pull/573) | `6e75b20f87c2` | `272e733dc16d` | 15 passed | 3 |
| [#575](https://github.com/sultanasiri001-sys/hydroland/pull/575) | `c76b138d8479` | `2ef9ed4e3437` | 15 passed | 3 |
| [#576](https://github.com/sultanasiri001-sys/hydroland/pull/576) | `1782d8b8e58c` | `172655c39556` | 18 passed | 9 |
| [#577](https://github.com/sultanasiri001-sys/hydroland/pull/577) | `2c56b9be5505` | `9a238ab1faf8` | 19 passed | 13 |
| [#578](https://github.com/sultanasiri001-sys/hydroland/pull/578) | `a1adcc490da2` | `1a4340bf2020` | 16 passed | 5 |
| [#579](https://github.com/sultanasiri001-sys/hydroland/pull/579) | `8f953c22eb80` | `c12ce9a1c0bd` | 17 passed | 10 |
| [#580](https://github.com/sultanasiri001-sys/hydroland/pull/580) | `0eea1b696d6f` | `630e27a7c1ca` | 16 passed | 8 |
| [#581](https://github.com/sultanasiri001-sys/hydroland/pull/581) | `0c2bb13eeba4` | `3e4d95ae12ee` | 19 passed | 14 |
| [#583](https://github.com/sultanasiri001-sys/hydroland/pull/583) | `bb25994d6fd5` | `6b15b9aed936` | 16 passed | 5 |
| [#584](https://github.com/sultanasiri001-sys/hydroland/pull/584) | `19a8dc31a2f9` | `63d810765469` | 13 passed | 6 |
| [#587](https://github.com/sultanasiri001-sys/hydroland/pull/587) | `cb2f5e212c6e` | `b80745a33f14` | 20 passed | 6 |
| [#588](https://github.com/sultanasiri001-sys/hydroland/pull/588) | `ff04b0239af6` | `c0eabd3655ef` | 18 passed | 5 |
| [#589](https://github.com/sultanasiri001-sys/hydroland/pull/589) | `3f6702cacb73` | `52b6c0e0ee7f` | 18 passed | 4 |
| [#590](https://github.com/sultanasiri001-sys/hydroland/pull/590) | `53bfb8652e76` | `2c8b57925310` | 17 passed | 2 |
| [#593](https://github.com/sultanasiri001-sys/hydroland/pull/593) | `6c59e5933a66` | `17f092c7fe5f` | 13 passed / 1 intentionally skipped | 6 |
| [#595](https://github.com/sultanasiri001-sys/hydroland/pull/595) | `c4dd45096456` | `f3130844e869` | 11 passed | 1 |
| [#591](https://github.com/sultanasiri001-sys/hydroland/pull/591) | `ca99fc928a9f` | `3275b73339d6` | 25 passed | 15 |
| [#592](https://github.com/sultanasiri001-sys/hydroland/pull/592) | `32d427d0d9d3` | `e171925ab1d7` | 19 passed | 18 |
| [#597](https://github.com/sultanasiri001-sys/hydroland/pull/597) | `cf9fc4fd6d73` | `da938dcd58c6` | 30 passed | 26 |
| [#596](https://github.com/sultanasiri001-sys/hydroland/pull/596) | `9c0ed8480e50` | `ad2437e46c84` | 28 passed | 16 |
| [#598](https://github.com/sultanasiri001-sys/hydroland/pull/598) | `7706ef52e4a6` | `2c3548ca897a` | 18 passed | 4 |
| [#599](https://github.com/sultanasiri001-sys/hydroland/pull/599) | `beeed6533d63` | `f945a46042ab` | 17 passed | 2 |
| [#600](https://github.com/sultanasiri001-sys/hydroland/pull/600) | `105b1b43c1ca` | `8a1d3348cd7d` | 17 passed | 2 |
| [#601](https://github.com/sultanasiri001-sys/hydroland/pull/601) | `a6944b9cb9b9` | `f6715db0f955` | 25 passed | 6 |
| [#602](https://github.com/sultanasiri001-sys/hydroland/pull/602) | `417ee4d6fe5a` | `5224d4737246` | 17 passed | 1 |
| [#586](https://github.com/sultanasiri001-sys/hydroland/pull/586) | `752d9f1e1589` | `dff257bc010a` | 22 passed | 44 |
| [#603](https://github.com/sultanasiri001-sys/hydroland/pull/603) | `b9ede578b72e` | `17305f7ebf1c` | 20 passed | 8 |
| [#604](https://github.com/sultanasiri001-sys/hydroland/pull/604) | `493ed22ef7cf` | `2c7abd88ca74` | 11 passed | 3 |
| [#605](https://github.com/sultanasiri001-sys/hydroland/pull/605) | `33d14d797d0e` | `34bc2c0ce586` | 20 passed | 13 |
| [#607](https://github.com/sultanasiri001-sys/hydroland/pull/607) | `af127a3eeed9` | `97073240cb74` | 26 passed | 18 |
| [#606](https://github.com/sultanasiri001-sys/hydroland/pull/606) | `b82fbce00e5a` | `b0874f0b2574` | 18 passed | 3 |
| [#609](https://github.com/sultanasiri001-sys/hydroland/pull/609) | `e9f50f6e6c8b` | `3c7d262ff4ca` | 17 passed | 4 |
| [#610](https://github.com/sultanasiri001-sys/hydroland/pull/610) | `835cd88294b2` | `a9b6ddb33e9b` | 28 passed | 10 |
| [#611](https://github.com/sultanasiri001-sys/hydroland/pull/611) | `2537fd5290fb` | `50485177671f` | 24 passed | 6 |
| [#612](https://github.com/sultanasiri001-sys/hydroland/pull/612) | `56b05552a8fc` | `847cb74f173d` | 18 passed | 3 |
| [#613](https://github.com/sultanasiri001-sys/hydroland/pull/613) | `c13f7e21bb52` | `babfa6383b03` | 26 passed | 7 |
| [#614](https://github.com/sultanasiri001-sys/hydroland/pull/614) | `04e1dfb8ee13` | `f366501a58e3` | 13 passed | 1 |
| [#616](https://github.com/sultanasiri001-sys/hydroland/pull/616) | `e06a4ed68ee6` | `888be1e27998` | 17 passed | 3 |
| [#615](https://github.com/sultanasiri001-sys/hydroland/pull/615) | `1f1fad582f38` | `6bed84025ca7` | 18 passed | 6 |
| [#617](https://github.com/sultanasiri001-sys/hydroland/pull/617) | `236ef474ebee` | `e9177580f2cf` | 18 passed | 5 |
| [#619](https://github.com/sultanasiri001-sys/hydroland/pull/619) | `cb415678b1d7` | `b00a6d33e827` | 18 passed | 5 |
| [#620](https://github.com/sultanasiri001-sys/hydroland/pull/620) | `c5528c0f8a41` | `2a0661ddfdcb` | 20 passed | 3 |
| [#621](https://github.com/sultanasiri001-sys/hydroland/pull/621) | `66a7bc5f4881` | `98ab2045cd7e` | 19 passed | 3 |
| [#622](https://github.com/sultanasiri001-sys/hydroland/pull/622) | `231561456737` | `730a6d7ec83d` | 12 passed | 4 |
| [#623](https://github.com/sultanasiri001-sys/hydroland/pull/623) | `4da23980c357` | `3c02e2a321b9` | 25 passed | 9 |
| [#624](https://github.com/sultanasiri001-sys/hydroland/pull/624) | `824805cbfe81` | `140a1a29b26b` | 17 passed | 4 |
| [#625](https://github.com/sultanasiri001-sys/hydroland/pull/625) | `0fb86cb3de65` | `aa1e25f87848` | 19 passed | 4 |
| [#626](https://github.com/sultanasiri001-sys/hydroland/pull/626) | `024eb1ec6fe0` | `c3a7cb36cd5d` | 17 passed | 1 |
| [#627](https://github.com/sultanasiri001-sys/hydroland/pull/627) | `26a2fdb848ee` | `495929bc5aa2` | 19 passed | 2 |
| [#628](https://github.com/sultanasiri001-sys/hydroland/pull/628) | `4413d98bf261` | `21bd09f23d30` | 18 passed | 4 |
| [#629](https://github.com/sultanasiri001-sys/hydroland/pull/629) | `a3771fcaa6c6` | `28266ad54e27` | 19 passed | 2 |
| [#630](https://github.com/sultanasiri001-sys/hydroland/pull/630) | `19cf0b0c1c66` | `b46dee40e0dd` | 19 passed | 3 |
| [#631](https://github.com/sultanasiri001-sys/hydroland/pull/631) | `7bc688580c4d` | `a02d7736cb91` | 19 passed | 2 |
| [#632](https://github.com/sultanasiri001-sys/hydroland/pull/632) | `d5f5f0a8df8a` | `b7e8dd4ba0de` | 19 passed | 5 |
| [#633](https://github.com/sultanasiri001-sys/hydroland/pull/633) | `85775a5603f2` | `327fe39da06a` | 25 passed | 17 |
| [#634](https://github.com/sultanasiri001-sys/hydroland/pull/634) | `4cc1cc3ad369` | `3e2d345321d4` | 23 passed | 23 |
