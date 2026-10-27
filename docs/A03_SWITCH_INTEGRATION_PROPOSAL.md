# A03/A02 synthetic CI integration proposal

Local preparation only. The user authorized this synthetic package, CI setup and Draft publication, but A02 owns final assembly/publication and execution after independent review. This lane has not published, provisioned resources or executed a rehearsal. PR535 readiness work remains separate. No merge, production, paid resource, private archive, provider PITR or object recovery acceptance is included.

## Exact deliverables and contract

The isolated A02 integration branch now assembles the reviewed A02 helper and tests, A03 orchestration, and the complete CI delta. The checked-out workflow matches `docs/proposals/A03_SWITCH_WORKFLOW.proposed.yml`; the proposed patch remains a review reference and must not be reapplied to this branch. No integration changes have been published or executed.

`recovery-rehearsal.mjs` is byte-for-byte identical to baseline `a3d5ad1` through its original end; only a trailing opt-in hook is added. The hook requires a saved PASS receipt and runs after original temporary-file cleanup. Every migration, original synthetic fixture, restore1 corruption negative control, restore2 comparison, source fingerprint assertion and original receipt remain unchanged. Failure of the switch never rewrites the successful original recovery receipt. Original logical restore success and switch success remain separate claims.

The helper contract accepts `artifacts`, `artifactWorkspace`, `recoveryReport`, `evidenceDir`, `networkName`, `runtimeImageId`. A02 owns restore2-only mutations, source/restore1 fingerprints, lease accounting, four phases and all app checks. A03 wrapper performs no SQL or reseeding. Its receipt checks the original report hash and requires helper success plus confirmed process termination and cleanup. CI cleanup has a separate receipt; all required receipts and job success are needed for acceptance.

## Workflow and provenance

The proposed existing recovery workflow retains read-only contents permission, ordinary pull_request (never pull_request_target), manual/push/scheduled triggers and original source proof. It adds paths for both script families and disables persisted checkout credentials on all three checkouts.

Artifact pair is fixed, ordered, and checked against Git HEAD and canonical directories:
- Prior: `4f0b6ac663baeb814523d572def8c4cb8d754fbb`.
- Candidate: `a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d`.

The helper checks their lock/schema identity, source receipt provenance and output digests; prior predates PR533 and is not an approved production rollback target. No floating main is used for these two artifacts. Current workflow source may include the reviewed integration only; schema mismatch fails closed.

Ubuntu24 x64 with Node22 prepares locked dependencies and generated clients for all three checkouts using npm ci --ignore-scripts. Preparation pulls `node:22-bookworm` and `postgres:18`, records resolved image IDs/repository digests, and all subsequent runtime/container creation uses those immutable local IDs with pull disabled. The tags are acquisition references, not a claim of preverified digest reproducibility across runs. The receipt records which exact bytes ran.

Before database creation, an offline, read-only, nonroot, no-capability runtime probe on network none loads the candidate's generated `libquery_engine-debian-openssl-3.0.x.so.node` from a read-only node_modules mount. Node22, OpenSSL3, x64 and successful engine load are required. Missing engine, incompatible ABI or unexpected image properties fail; no alternate image/download fallback is implemented. This is executable verification, not an already-passed runtime claim. Real probe/build/app startup remain UNRUN locally.

Provisioning first creates an exclusive random ownership marker. It then creates a uniquely named IPv4 internal bridge with disposable and run-token labels. PostgreSQL has the same ownership labels, only that network, existing synthetic hydroland credentials/database and loopback-only 127.0.0.1:5432 publication. Runtime applications have no published ports. No real archive, account secret or provider endpoint is supplied. No image or container operations were performed while authoring this proposal.

## Cancellation, process ownership and cleanup

Before helper import or side effects, the detached Node child waits at an IPC START gate. Its parent persists Linux PID, PGID/session, process start ticks and boot identity for parent and child, then releases the gate. Failure to persist never releases it. The normal wrapper watchdog kills the entire group at 600 seconds and waits up to five more seconds for child exit AND group disappearance. Unconfirmed termination fails and skips Docker cleanup rather than racing a live group.

The workflow always cleanup first verifies saved process identities against /proc and current boot; PID reuse or a changed boot refuses signalling. It kills/awaits the recorded parent first, then the child group. Missing process records with a helper receipt fail closed. The gate ensures no helper resources exist before a record. After process confirmation, application cleanup requires a fresh helper receipt, UUID label, exact application name/index/kind and network. Never broaden to an all-container sweep.

The probe and PostgreSQL are removed only after their exact names, token/disposable labels, network mode and available recorded IDs match. The network requires exact name/token/ID, internal IPv4 bridge settings and zero remaining peers. Unknown peers, daemon errors or mismatches fail; an inspection error is never interpreted as absence. A missing resource is recognized only after a successful bounded list. PostgreSQL owned volumes are removed; images are ephemeral runner cache only.

Normal wrapper Docker cleanup has a 30-second aggregate budget, five-second per-command caps and explicit SIGKILL. CI always cleanup has a 60-second aggregate Docker budget (clock starts before process termination), plus an outer 150-second timeout with five-second hard-kill grace. Parent and child confirmation each allow five seconds. All receipts remain FAIL until their respective checks complete. A runner loss or platform hard cancellation can prevent always steps; ephemeral runner destruction is the final boundary, not proof that cleanup ran. Missing/PASS-less cleanup receipt is not acceptance. Ambiguous daemon-side creation after CLI termination remains a failed run requiring owner inspection; no bypass or broad cleanup is attempted.

## Time and evidence budgets

Job timeout: 60 minutes. Dependency preparation: 15 minutes. Image/provision/readiness: 8 minutes. Original recovery plus switch: 25-minute step, GNU timeout 24 minutes with ten-second kill grace. This contains the helper's 600-second runtime plus five-second termination confirmation and 30-second wrapper cleanup; it does not imply original recovery timings are measured. Always cleanup: 3-minute step (150+5 second hard cap). Upload: 3-minute step. Checkout/guard/setup and scheduling margins occupy the balance. These are conservative bounds, not measured RTO or demonstrated CI duration.

Upload occurs after cleanup and uses explicit filenames: original recovery report, synthetic migration manifest, image/resource ownership receipt, CI cleanup receipt, helper report and wrapper report. Do not upload config/input/process records, runtime logs, database dumps, compiled artifacts or arbitrary temporary files. Always upload on failures/cancellation when the runner can still execute. Preserve original production/PITR false flags.

## Validation and next action

17 pure mocked tests pass across orchestration and CI cleanup: delayed termination, termination failures, PID/boot reuse refusal, start-gate ordering and persistence failure, exact resource identity, unknown network peer refusal, missing process record refusal, aggregate SIGKILL budgets, receipt preservation and original failure refusal. They use fake process/Docker interfaces and local temporary files only. YAML parse, read-only permission/checkout checks, cleanup-before-upload order, explicit artifacts, path triggers, shell syntax, Node syntax, original-script unchanged-prefix assertion, whitespace and proposed-workflow patch applicability checks pass. After assembly, A02 independently passed all 28 combined pure tests, syntax checks for eight Node files and five shell steps, YAML/ordering checks, original-script prefix verification, and unchanged reviewed helper hashes.

All real Docker/network/PG operations, image acquisition/ABI probe, builds, HTTP version switching, cancellation and timings are UNRUN. The proposal implements preflight failure for unsupported runtime assumptions; there is no claim the runtime image is already verified. Next: independent review of the assembled local commit and diff, followed by parent-coordinated publication and the first synthetic run only after that review. PR535 remains separate. No runtime acceptance item is closed by the pure/static checks.
