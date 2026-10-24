# Membership preview failure — 2026-09-30

## Observed production symptoms

The owner supplied a real iPhone screenshot showing the generic preparation
error. This supersedes any assumption of successful live card acceptance.
The deployed baseline is 87ec87ef4bd209f56ecac5530518ce0ec17be680.

Read-only Render logs show four POST /api/v1/me/membership-pass calls returned
HTTP 200 at 05:16:47, 05:17:08, 05:17:19 and 05:17:36 UTC. The screenshot/device
clock differs from these server times. No response body, token, membership
reference or private account data was retrieved. Earlier log service requests
returned 503; the bounded time-range query succeeded.

The old normalized() function compares a server expiresAt to device Date.now()
and throws INVALID_PASS before displaying the QR. The exact original module
blob 02b4ea771fb204b0d60317ec7c3f836c3eb67c20 was reproduced locally. A synthetic
fresh five-minute server response is accepted with aligned clocks but rejected
with the screenshot's generic error when the device clock is seven minutes
ahead. A slow device can conversely keep preview actions enabled too long.

This establishes a concrete reproducible defect consistent with the observed
200 responses and screenshot; it is not a captured JavaScript stack from the
owner's browser and does not exclude a separate device-specific failure.

## Correction

Use the existing authenticated server timestamps: verifiedAt for verification,
otherwise observedAt for issuance. Compute the remaining server lifetime,
cap it at five minutes, and anchor it to performance.now() at request start.
Subtracting the entire request round trip conservatively accounts for refresh,
network and parsing delay. Do not use client Date.now() as a fallback.

Device clock changes cannot prematurely reject a fresh preview or extend its
lifetime. Invalid timing metadata fails closed; an actually expired response
gets a specific Arabic expiry message. Discard the preview on backgrounding
because mobile engines may suspend clocks/timers. Downloaded files still cannot
be recalled, and server authorization/expiry/revocation remain authoritative.
No server lifetime, cryptography, authentication, database schema, role, provider
setting, storage configuration or user's device setting is changed.

## Regression evidence

21 pure deadline assertions passed locally: positive/negative device offsets,
clock-independent deadlines, fresh verification timestamp, upper bound, exact
expiry, round-trip exhaustion, missing/malformed timing and invalid clocks.
The exact baseline normalization also reproduced rejection at +7 minutes.

Seven new full-application browser cases cover +7/-7 minutes, later forward/
backward wall-clock jumps, a slow-clock expiry, delayed successful replies,
missing server metadata, scanned-reference remaining lifetime, and background
clearing. Existing eight membership cases remain enabled, using realistic
observedAt fixture timestamps. The dedicated workflow runs the fifteen cases
in both Chromium and WebKit and retains the existing real HTTP/PostgreSQL
52-assertion and QR validation suites. Full CI and deployment results must be
recorded after execution; they are not claimed by this document.

Issue #371 remains open for successful live acceptance after this correction.
The screenshot is a failed acceptance, not a new successful owner confirmation.

Technical references: W3C High Resolution Time, https://www.w3.org/TR/hr-time-3/;
Playwright clock API, https://playwright.dev/docs/clock. Use monotonic clocks for
elapsed durations and keep display dates separate from validity decisions.
