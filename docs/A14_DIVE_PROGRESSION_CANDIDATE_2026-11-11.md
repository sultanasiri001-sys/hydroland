# A14 dive progression and qualification candidate

Prepared 11 November 2026. This is an unconnected technical candidate, not acceptance of a real programme, agency source, licence, operating condition or certificate. No operational profile, source approval, runtime setting or production record is created. Every evaluation returns `productionAuthorized: false`.

## Repository scope

- Draft [PR 585](https://github.com/sultanasiri001-sys/hydroland/pull/585) owns this pure evaluator and its tests.
- Main at preparation: `19a8dc31a2f98b993bcda8048cdd986f9bd21f3c`.
- Draft [PR 582](https://github.com/sultanasiri001-sys/hydroland/pull/582), head `a7fc659c218ed41e26287b59a23acc93715d7efb`, remains untouched. Its 17 discovered PR workflows passed, including 667 browser cases and real PostgreSQL calendar checks in three timezones. Those earlier results do not test this new extension.
- No application call site imports this evaluator. No database schema, dependency, public API, source profile, certificate or deployment changes are included.
- The existing API validation workflow runs the entire test file unconditionally. Its original assertions and other steps remain intact.

## Version 1 remains supported

Schema version 1 retains per-dive minimum bottom minutes, maximum depth, ordered qualifying dives, experience-stage caps, daily counts/ordinal depth and dated skill prerequisites. Its original 70 tests remain unchanged.

An experience dive does not advance the qualifying sequence. Rejected dives do not advance it either. Any violation keeps the complete result false, including a failed attempt followed by a valid retry. Operational retry/remediation policy is not invented here.

## Version 2 closes two representation gaps

V2 is selected explicitly through `schemaVersion: 2`. It is not inferred or silently upgraded. Its per-dive stage rules omit v1's mandatory bottom-minute minimum.

### Actual qualifying evidence

An explicit common `qualification` rule specifies:

- `minimumDepthMetres`.
- `minimumPercentAtDepth`, an integer percentage with `AT_LEAST` or `MORE_THAN` comparison.
- One or two alternative minimums, by metric `SUBMERGED_SECONDS` or `BREATHED_GAS_LITRES`. At least one alternative must be met. The depth and depth-time conditions must also hold.

Each v2 dive supplies `qualificationEvidence` with actual submerged seconds, the measured depth threshold, seconds at or deeper than that threshold and gas litres or explicit null if not measured. This is not elapsed calendar attendance or a mere maximum-depth reading. Measurement threshold must match the policy; submerged time must fit the actual dive window; time at depth cannot exceed submerged time. A claimed positive time below a threshold deeper than the dive's maximum is rejected.

Gas evidence may be absent when the time route suffices. The gas route can satisfy a dive below the time threshold without an artificial one-minute floor. Strict percentage comparisons reject equality, inclusive comparisons accept it. Percent calculations use bounded integer seconds to avoid rounding a failed equality into a pass.

Qualification applies to both qualifying and experience evidence in this bounded schema. Programmes needing different qualification rules by stage require a reviewed extension rather than an implicit fallback.

### Confined activity before open water

V2 adds `dayLimits.afterConfinedWaterMaximumDives`, no greater than the general daily cap. The evaluator's fifth argument is an explicit complete caller-verified confined activity history, even when empty:

`evaluateDiveProgression(policy, dives, skills, asOf, confinedActivities)`

Each activity includes ID, profile hash, POOL or CONFINED_WATER environment and actual start/end. A completed activity preceding an OW dive on the same policy-local day activates the conditional daily cap for that dive. The daily ordinal still includes all preceding OW dives, including experience dives and OW dives before the confined activity. Previous-day activity does not trigger the condition, and later confined activity does not retroactively change earlier OW dives.

Confined records with wrong hash, future or nonpositive windows, duplicate IDs, cross-local-day spans, overlapping confined windows or IDs shared with OW evidence are rejected. Overlap between an OW dive and confined activity is a violation. Exact adjacent windows are allowed; this does not waive source-specific equipment/transition rules.

V2 refuses a missing confined-history argument. V1 refuses a supplied confined-history argument instead of silently ignoring it. **Explicit history does not prove completeness**; the trusted adapter must establish that separately.

## Defensive input boundary

Inputs must be plain or null-prototype data records and dense ordinary arrays. Unknown, hidden or symbol properties, executable accessors, inherited/custom record prototypes and overridden array methods are rejected. Allowed data-property values are captured once before validation, preventing a getter from changing enum, hash or timestamp values between validation and construction.

This is not a sandbox for hostile JavaScript Proxies or arbitrary code execution in the same process. Integrations should pass trusted normalized data, normally from authenticated JSON/database records. Neither parser execution nor matching hashes confers source approval.

UTC timestamps must be explicit and valid. All existing source, sequence, future, overlap and bounded-list protections remain. Cross-local-day dives or confined activities fail closed pending an approved source-specific treatment.

## Why these additions were needed

The owner's existing Arabic PADI Instructor Manual 2026 was inspected as source preparation, not approved as current operational policy:

- Physical PDF 27, printed 25, contains the depth/time-at-depth condition and a gas-or-submerged-time alternative.
- PDF 67, printed 65, has a narrower OW daily limit after confined-water training on the same day.
- Programme/junior/group/assistant rules on PDF 30, 33 and 54–57 show why these two additions still do not represent a complete programme.

The manual's identity is SHA-256 `964e748524064ff3b62027e826bce9e818b0e978ca4e7bc0b80141069d0cb47f`, 225 pages and 24,387,189 bytes. No manual is redistributed. Later bulletins, regional applicability and independent authorised source review remain pending. All executable fixtures use deliberately synthetic limits and identities, never PADI/SSI/NAUI defaults.

## Local verification of the v2 extension

Node 24.22.1:

- **150/150 contracts passed**, zero failures or skips: 70 unchanged v1 tests plus 80 added v2/data-boundary tests.
- Strict standalone TypeScript with ES2022/CommonJS and Node types passed.
- Repository API ESLint correctness rules and JavaScript syntax checks passed.
- An independent initial review found no ordinary JSON-path semantic bypass but reproduced a changing-getter validation issue. The parser now rejects accessors without executing them and snapshots data descriptors; 14 final regressions include that reproduction and boundary cases.
- Targeted independent re-review reran all 150 tests and the original changing-getter reproduction; it now throws with zero accessor invocations. No new blocker was found within the documented data-object scope.
- Eight isolated mutations were detected by assertions: OR changed to AND, strict fraction equality weakened, conditional quota removed, mismatched depth threshold accepted, submerged time outside its window accepted, missing confined history defaulted to empty, production authority changed and confined overlap removed. The unchanged final source was rerun after mutation checks.

Reproduce with:

```sh
node --experimental-strip-types --test apps/api/scripts/training-dive-progression.test.mjs
```

At local preparation, the extension's Node 22/full repository/HTTP/database/browser checks and exact-head remote CI had not yet run. Their subsequent receipts belong to the exact updated PR commit, not the earlier v1 head. Prior PR585 head `5b237d75da8f2d4163ef72915600f3e472582a90` passed 15/15 discovered workflows and its 70 contracts on Node 22.23.4; that historical evidence does not substitute for new-head checks.

## Before operational integration

1. Complete and independently accept actual agency editions, updates, effective dates, programme exceptions, credential identifiers and official form mappings. Bind the whole versioned policy into the same immutable approved profile hash, never attach new unreviewed rules to an already approved hash.
2. Authenticate records for the exact enrolment, participant, centre, instructor and source. Retrieve complete paginated OW and confined histories; prohibit caller-selected subsets and invented historic approvals.
3. Verify physical dive identities, classifications, actual measurement provenance and attendance windows. The pure function cannot distinguish two IDs for one real dive or authenticate gas/depth measurements.
4. Derive pre-dive skills from actual verified performance completion time, separately from document signature time. Define policy for late documentation rather than treating signature time as performance time.
5. Implement group and staff rosters, junior/mixed-group limits, role-specific assistant supervision, equipment routes, risk assessment, medical/forms/materials and applicable Saudi/site/marine/weather gates. Numerical depth/time acceptance does not waive those requirements.
6. Add source-bound planning/start gates, not fabricated future-completion records. Connect later evidence evaluation consistently to attendance, completion, certificate recommendation/approval, transfer, rescheduling, revocation and legacy/direct paths.
7. Define source-specific attempts, referrals and existing-course adoption. A later retry does not erase the current evaluator's earlier violation.
8. Run real isolated PostgreSQL, HTTP and browser/concurrency acceptance for those adapters and obtain authorised live functional acceptance before any release.

A14 remains open. This draft does not request merge, deployment or operational approval.
