# D11 browser execution evidence follow-on

Base: `5c62ee0f479edddef1f09b5f83c2e8a5b4509ce5`.

## Evidence gap addressed

The Q04.01 review of the historical #586 browser evidence found individual
execution results for 27 earlier cases, while the four cases in
`center-scoped-search.spec.js` had no separate retained execution result. Test
discovery and a successful aggregate cannot supply those missing individual
results retroactively. This change provides a new explicit execution and retained
native report on the candidate being tested; it does not relabel the historical
evidence as 31/31 or close Q04.01 by itself.

## Workflow behavior

Before tests, each Web validation job records the actual checkout commit and
tree, the GitHub event SHA, the requested PR head when present, and the run,
attempt, job and repository identity. A default pull-request checkout can be a
merge commit, so its commit is recorded separately from the requested PR head.
The receipt explicitly has no test result. Dirty tracked source or a checkout
that differs from the workflow SHA cannot produce an accepted receipt.

The browser job adds a focused execution of `center-scoped-search.spec.js` with
Playwright's existing `dot,json` reporters. Its JSON output is independent of the
full `Browser E2E` output, which now uses the same native reporters. The reports
are written outside the test-results folders, so later focused runs cannot erase
them.

Each successful invocation is followed by an explicit report verification step.
Verification requires a nonempty native JSON report, individual result records,
and an execution start after the source receipt. The focused report must contain
exactly the four specified cases, with actual passing outcomes. A discovered,
skipped, missing or unrelated case cannot satisfy that assertion. The full report
retains its own scope and native statistics; its aggregate count is never used as
a substitute for the focused cases. Verification also confirms the tracked
source is unchanged and writes hashes binding the result file to its source
receipt.

Successful evidence is uploaded as
`web-browser-evidence-<requested-head>-<run-id>-<attempt>`, with the source,
both native JSON reports and their verification records. On a failure, any
available files are retained under a separately named
`web-browser-incomplete-evidence-…` artifact. The latter does not claim completed
acceptance. Retention is 14 days. All pre-existing validation, regression and
screenshot steps remain in their original order.

The new mandatory source, evidence-contract, focused execution, verification and
successful upload steps are listed in `a02-release-inventory.json`; the existing
inventory digest pin is updated. The inventory remains
`PROPOSED_NOT_ADOPTED`; this patch changes neither deployment authorization nor
the distinction between PR evidence and main evidence.

## Native screen-reader job budget

Only the `screen-reader` job budget changes from 25 to 40 minutes. The bounded
reason is observed Ubuntu dependency download time in the
[main membership validation job](https://github.com/sultanasiri001-sys/hydroland/actions/runs/44483766914/job/135422080980)
on source `15f8358`: the 08:31:37.988Z log records 126 MB downloaded in
28 minutes 59 seconds from the us-east-2 Ubuntu mirror at 72.6 kB/s. The
08:32:56.495Z result records the membership suite's 30 passes in 43.8 seconds.
These observations concern installation and that membership suite. They are not
Orca acceptance evidence.

The additional job budget accommodates setup. This change does not alter the
Orca test's 180-second limit, native speech/name/voice assertions, PCM checks,
test configuration or application source. A pre-test source receipt is added to
the existing Orca evidence directory.

## Local verification and limits

- A02 full release gate contracts: **23/23 passed** with the new digest.
- Classified inventory and critical-step controls: **127/127 passed**.
- Evidence helper contracts: **6/6 passed**, including discovery-only, stale,
  skipped and mismatched source/report rejection.
- The installed Playwright **1.58.2** `dot,json` reporter was executed against
  two synthetic Node-only reporter fixtures. It wrote native individual results,
  and the actual receipt/verification CLI accepted them. This validates reporter
  plumbing; it is not a run of the product browser cases.
- Parsed workflow comparison confirms every existing step remains in order.
  The full-suite reporter option and screen-reader job budget are the only
  changes to existing steps/job limits. Whitespace validation passed.

This local patch does not claim a passing center-search, full browser or native
Orca run. Those results must come from execution of the published candidate and
its retained evidence.
