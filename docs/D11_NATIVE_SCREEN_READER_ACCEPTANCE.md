# Native screen-reader acceptance for D11

This gate runs the shipped HYDROLAND web build in headed Chromium with real Orca,
AT-SPI, Speech Dispatcher and installed eSpeak NG Arabic and English voices. It
uses a disposable Xvfb/D-Bus session on the CI runner and synthetic loopback API
responses. Requests to other hosts are blocked. There are no provider calls,
customer records, access grants, live operational actions or outgoing messages.

For each language, a separate Orca preferences directory selects a genuine
installed voice. The suite checks the visible language switch through native
keyboard activation and verifies the rendered `lang` and `dir`. It then observes
Orca's actual Speech Dispatcher diagnostics for the visitor and six authenticated
portals. Thirteen control announcements per language cover navigation and search;
native Tab/Shift-Tab re-entry must retain an opaque draft. Each matched utterance
must also have an Orca speech-output record using the selected language voice.
Because those diagnostics can be written before synthesis fails, the test also
captures the dedicated native PulseAudio sink monitor. It waits for a quiet
window before each focus and requires new non-silent PCM samples afterward.
Per-control WAV excerpts, signal measurements and SHA-256 hashes are retained.
Neither a DOM snapshot nor an authored expected string can produce this receipt:
the suite does not call Orca's speech API or replace its event/speech backend.

The receipt records the checked-out commit and tree, Chromium version, installed
voice metadata, named control observations and timestamps. Runtime versions,
Orca diagnostics, native audio and any browser failure traces are retained for 14 days. All
data in these artifacts comes from the synthetic acceptance fixture. Missing
Orca, speech backend, language voice, language switch, announcement or keyboard
behavior fails the job; there is no fallback pass. The job and its two critical
steps are included in the existing A02 full-main release inventory, whose exact
digest is updated with this addition. All 28 existing workflow requirements remain.

## Execution

The `screen-reader` job in `.github/workflows/web-validation.yml` installs the
native runtime, then executes `apps/web/scripts/run-orca-acceptance.sh` under
`dbus-run-session` and `xvfb-run`. The standalone Playwright configuration is
`apps/web/playwright.orca.config.js`; the ordinary headless browser suite does not
silently substitute for this native job.

The local managed execution host prohibits the Unix socket used by Chromium.
Only syntax and release-gate contracts were checked there when this candidate
was prepared. A successful CI job and its exact-source receipts are required
before claiming this screen-reader check passed.

## Scope and limits

This is an automated Linux screen-reader smoke check of the declared controls.
Native audio proves synthesis produced a signal in the isolated focus window;
the test does not transcribe or semantically grade that signal.
It does not establish the pronunciation quality of every translated sentence,
every operational form's reading order, a blind user's usability assessment,
NVDA/JAWS/VoiceOver behavior, a physical mobile device or a WCAG certification.
The separate bilingual operational browser fixtures verify their named forms,
private-data boundaries, focus, layout and status behavior. Any wider acceptance
claim must identify the additional browser, assistive technology, device and
actual scenario evidence.

Implementation references:

- [Orca debugging output](https://orca.gnome.org/debugging): records actual
  accessibility events, keystrokes and speech output.
- [Orca invocation and AT-SPI support](https://gnome.pages.gitlab.gnome.org/orca/help/introduction.html).
- [Chromium accessibility inspection and activation](https://chromium.googlesource.com/chromium/src/+/HEAD/tools/accessibility/inspect/README.md).
- [Orca 46 speech output implementation](https://github.com/GNOME/orca/blob/gnome-46/src/orca/speech.py)
  and [Speech Dispatcher backend](https://github.com/GNOME/orca/blob/gnome-46/src/orca/speechdispatcherfactory.py).
