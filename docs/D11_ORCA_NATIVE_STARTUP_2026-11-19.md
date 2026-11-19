# D11 native Orca startup boundary

## Observed failure

Source head: `5c62ee0f479edddef1f09b5f83c2e8a5b4509ce5`.

- [Workflow run 44487597490, native Orca job 135434843209](https://github.com/sultanasiri001-sys/hydroland/actions/runs/44487597490/job/135434843209).
- [Fresh native artifact 14512555777](https://github.com/sultanasiri001-sys/hydroland/actions/runs/44487597490/artifacts/14512555777), named `native-screen-reader-evidence-5c62ee0f479edddef1f09b5f83c2e8a5b4509ce5`.
- Downloaded ZIP SHA-256: `81948e55f975212a75a87be0395d460a60e3cf7bc911949df428561f0e98b69e`, matching the upload log.

The Arabic run failed before its first measured focus because the native monitor did not become quiet within the existing 15-second gate. Its 695,810-byte PCM recording contains sustained speech; this is not evidence of a silent or missing synthesizer.

The same fresh Orca 46.1 log records this ordering:

| UTC time | Native observation |
| --- | --- |
| 08:38:59.154 | Orca receives the test's `Control_L` press. |
| 08:38:59.155861 | Orca interrupts the presentation that existed at that time. |
| 08:38:59.826 | The loaded page queues its completion announcement and summary. |
| 08:38:59.839641–08:38:59.846 | Orca processes `document:load-complete` for the actual HYDROLAND title and `http://127.0.0.1:4173/`. |
| 08:38:59.920870 | Asynchronous Say All begins presenting the page's skip link. |

The earlier interrupt therefore precedes the native page-load reading it was intended to interrupt. DOM content readiness alone does not establish that Orca has finished processing the page load. The [GNOME web-navigation documentation](https://help.gnome.org/orca/preferences_web.html) describes Orca's automatic page reading and page summary as distinct navigation behavior.

## Bounded harness change

The harness now waits for DOM loading and for a completed native Orca `document:load-complete` block with the exact current title and loopback URI, read after the navigation's log offset. It then waits for 600 milliseconds without a new native presentation-queue entry. This covers the observed asynchronous Say All enqueue after the load event. It sends the existing ordinary X11 `Control_L` only after this boundary.

Before each measured focus, the original quiet gate now also requires a completed native `Control_L` event that records presentation interruption. The helper does not send text to Orca, alter Orca preferences, mute its output, generate audio, or replace the speech backend. A startup receipt and each measured row retain the native observations used for this boundary.

The existing acceptance conditions remain intact:

- Each locale must select its installed language voice and use the real visible language control.
- Thirteen measured surfaces per locale retain the exact control-name and selected-voice requirements in actual Orca speech diagnostics.
- Native PCM remains required after each measured focus: RMS above 100 and at least 800 samples whose absolute amplitude exceeds 200.
- Quiet remains a 19,200-byte window at 16 kHz mono PCM16LE, RMS below 40 and peak below 150, before and after each measurement.
- The existing 15-second quiet gates, 12-second name/voice and PCM gates, and 180-second Playwright test timeout are unchanged.
- Real keyboard traversal and draft-retention assertions are unchanged. No product JavaScript, native voice configuration, or PCM analysis code changes.

## Local verification and limit

The committed fixture contains only bounded diagnostic excerpts from the fresh artifact, including the early interrupt, completed native load, and later Say All entry. Seven regression cases check that the early interrupt cannot establish page readiness, asynchronous presentation resets the startup boundary, queued/incomplete/wrong-document events are rejected, and native interruption requires its complete event. These are event-ordering regressions, not a new native screen-reader acceptance run.

`npm run test -w @hydroland/web` passed 141 Node tests and all six existing validators. The A02 full-release-gate suite passed 23 tests. The source/voice/PCM checks still require a successful fresh CI execution before this change can be counted as actual Orca acceptance.
