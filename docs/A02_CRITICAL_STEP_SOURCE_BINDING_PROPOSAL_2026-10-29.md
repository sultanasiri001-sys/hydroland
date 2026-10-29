# Critical-step and source-binding proposal — 29 October 2026

Status: **PROPOSED_NOT_ADOPTED**; offline implementation only. Reservation: issue523 comment6494299451. This is a separate branch based on verified Draft PR544 head `49c23d634bf471ffe939fff7a584772c62437f47`. PR544 remains unchanged, with all 24 discovered PR workflows successful. This proposal does not inherit those results as verification of its new code.

## Demonstrated gap and bounded correction

The previous collector discarded job steps, and the evaluator checked only job success. A conditional critical step can be skipped while its enclosing job is green. A step allowed to ignore failure can also produce misleading aggregate success. Source and evidence must both be checked.

The proposed inventory now names 23 critical validation/build steps: ten in Phase11 production security and thirteen in Web validation. The list comprises their named executable validation/build/browser steps. Diagnostic uploads and failure-only diagnostics are not critical acceptance steps; they may legitimately be skipped. Unnamed setup/install steps and all other workflows still require a broader step-sufficiency review; this is not an exhaustive step policy.

For rules declaring `criticalSteps`, the evaluator requires exactly one completed/success record for each named step in its required job. Missing, duplicate, skipped, neutral, failed, pending or malformed step evidence blocks, even if the job and workflow are green. Invalid policy mappings or empty lists block. Legacy rules without this optional field retain their prior job-only meaning; they are not silently described as step-verified.

The collector retains only declared critical steps' name, number, status and conclusion from the already attempt-pinned job response. It does not add API endpoints or permissions, retain step logs/commands, or collect unrelated step names. Existing run/attempt/head/pagination safeguards remain. Source validation independently rejects missing/duplicate critical names, any `if` on a critical step, and non-false `continue-on-error` on it. These source guards matter because a successful step conclusion alone cannot prove that source did not ignore a failure.

## Offline exact-source binding

`scripts/a02-release-source-binding.mjs` exports:

- `bindReleaseSource(trustedTarget)`: reads only existing local Git objects for an exact commit, verifies its tree and the inventory file's SHA256, then validates all committed workflow sources against that inventory. Returns a policy only after successful source binding.
- `evaluateBoundReleaseEvidence(trustedTarget, evidence, now)`: performs that source read itself before invoking the evaluator. A caller-supplied JSON object claiming source validation passed is insufficient.

The trusted target must contain an absolute `repositoryPath`, full `expectedCommit`, full `expectedTree`, `expectedInventoryDigest` (SHA256 of the exact inventory bytes), and `expectedRepository`. These values must come from protected coordinator selection/review. Computing a digest from an unreviewed candidate and then calling it approved defeats the trust boundary. No protected policy store, signature verifier or owner approval system is created here.

Reads use `git cat-file`, `rev-parse` and `ls-tree`; no fetch, checkout, hook, workflow command, database, provider call or deployment occurs. Git replacement objects are disabled, inherited Git overrides/tracing are excluded, and worktree files cannot substitute for committed bytes. Inventory/workflow files must be ordinary 100644 blobs. Reads have a five-second per-command limit, a thirty-second overall budget, a two-MiB output cap and a one-hundred-workflow ceiling. Failures are sanitized and return no policy.

The expected commit/tree bind the candidate source; the separately trusted inventory digest prevents the candidate silently removing a critical requirement. The implementation assumes a trusted Git executable and coordinator-owned local repository/object database. It does not authenticate a filesystem supplied by an untrusted remote caller. It also does not prove shell-script semantics or prevent an authorized reviewer from approving a weakened command: changes to workflow commands and invoked code still need substantive review.

## Verification

`node --test scripts/a02-release-*.test.mjs` passes 308 local tests on Node22.23.4, zero failures/skips (241 inherited plus 67 new). Tests use the actual evaluator, collector, source validator and binding module. Binding tests create isolated synthetic Git repositories, with no sockets, services, real records or credentials. Cases cover wrong target/tree/digest/repository, policy removal, worktree substitution, conditional/optional/missing critical steps, unclassified workflow, symlink mode, Git replacement refs, inherited Git environment overrides, sanitized failures and fabricated PASS objects. The combined source/evidence path accepts a valid synthetic receipt and rejects a skipped critical step.

The existing inventory CI workflow already runs the `a02-release-*.test.mjs` glob after a locked API-tooling install, so these tests need no workflow/package/lock changes. Fresh exact-head CI and remote source equality must be recorded on this new Draft; PR544's green status is not reused.

## Coordinator boundaries still open

The combined evaluator remains **CI_EVIDENCE_ONLY**, with `productionAuthorized=false` even on PASS. Binding results are **OFFLINE_SOURCE_BINDING_ONLY**. The new entrypoint is not activated in a production release path. The existing live collector sample still uses its explicitly limited two-workflow job-only policy; it does not exercise or adopt this proposal.

Protected policy storage/approval, trusted target selection, exhaustive critical-step sufficiency, authenticated evidence collection, release ownership serialization, immediate pre-execution revalidation and mandatory live enforcement remain separate. Local Git binding is immutable-source validation, not proof that remote main has not advanced. A branch changing after collection or an unobserved move away and back remains a coordinator risk. Actual main-push receipts, application rollback/PITR/object recovery and network least privilege remain open acceptance work. No merge, deployment, production authorization, permission/security change, credential creation, private-data copy or fees are included.
