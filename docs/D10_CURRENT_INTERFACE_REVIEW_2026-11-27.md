# D10 — current web, community and native interface review

Date: 27 November 2026. Tracker: D10 / HYD-63, criterion D10.01.

This review records executable checks of the current implementation. A successful
build does not establish complete web/mobile parity, human visual approval or
physical-device acceptance. Those decisions remain explicit in Q01 and the D05
coverage matrix.

## Web and community

The existing community browser suite now includes eight responsive scenarios:
Arabic and English, widths 320 and 1024 pixels, and active/suspended community
policy. All scenarios use the real web application with a bounded synthetic HTTP
fixture; they do not activate a real community policy or create customer posts.

The browser opens the actual mobile menu, enters the community, loads existing
records and switches the actual locale. An active-policy scenario submits through
the real form and observes its successful result. Suspended-policy scenarios
retain withdrawal and cancellation controls while publication is unavailable.
The suite verifies the document direction, lack of horizontal page overflow,
control placement and non-collapsing control width. Long Arabic titles and an
unbroken reference string exercise wrapping. Each scenario saves both the full
page and the community section, for 16 screenshots.

Two observed defects were corrected and retested:

| Defect | Smallest implemented correction | Regression evidence |
| --- | --- | --- |
| Membership card intrinsic width expanded a 320-pixel page to 341 pixels. | Allow card/grid children to shrink, wrap flex rows and long content, and use a zero-minimum grid track. No page-level overflow hiding was introduced. | All eight current community viewport/locale/policy combinations assert the page and visible community controls stay within the viewport. |
| A post's review status ran directly into its title. | Display the status on its own line with a small logical block margin. | The active-policy cases assert that the status starts below the rendered title. |

The full community suite passed **12/12** locally: four existing functional and
authorization regressions plus the eight current responsive cases. The current
web static validation also passed. The authoritative published-source result is
the matching PR/main `Web validation` run, including its source-bound full
browser receipt. Focused repetitions are reported separately, not added as unique
test coverage. The workflow retains current images under
`d10-community-responsive-review`; existing public, portal, account and bilingual
operational review artifacts remain available through their original steps.

## Native product screens

D07's isolated native build installs the actual compiled application before
running Maestro. Its product flow opens account, credentials, trips, bookings,
training, finance and notifications in both Arabic and English. Each screen must
show its loaded synthetic record before capture. The second flow independently
checks guest/login behavior and real Expo native crypto, SecureStore and file
operations. The acceptance recorder requires both passing flows and all 17
screenshots; missing, failed or skipped cases cannot yield an acceptance receipt.

The virtual-device HTTP fixture is loopback-only, labelled synthetic and blocked
from performing real business mutations. It validates native rendering and
navigation. D05's separate real-React component tests and actual Nest/PostgreSQL
contract suite validate actions, server responses and session boundaries. D06's
server/client suites validate offline authority and conflict behavior. A static
screenshot does not replace any of those checks.

Native results are recorded in the platform's `acceptance.json` with source
commit/tree, dependency versions, package hashes, installation information, JUnit
cases and screenshot hashes. The runbook and committed test definitions are not
themselves proof of execution. Inspect the completed matching workflow artifact
before recording a native result as passed.

## Acceptance boundaries

This technical review does not grant a product decision to exclude web functions
from mobile. It does not approve operational policies, provider entitlements,
real push delivery, production signing, store submission or visual acceptance by
the owner. Q01 retains physical iOS/Android, accessibility, real network/process
lifecycle and human acceptance evidence as separately named requirements.
