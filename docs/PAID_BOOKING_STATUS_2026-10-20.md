# Paid booking status and confirmation acceptance — 20 October 2026

## Observed production state

Read-only checks were performed against the published `dd41eaaa6eaf86f1d704f577d4c72e2031c993f8` release. The API returned HTTP 200, `ready`, and database `ok` at 05:17 UTC; the Web returned HTTP 200 at 05:19 UTC.

The existing explicitly labelled payment-only test has one SAR 1.00 payment in `CAPTURED`. Its provider webhook audit records `paid`, `live=false`, and `providerVerified=true`. The linked one-seat booking remains `PENDING`, with one participant whose eligibility is `PENDING` and no recorded profile snapshot. No safety checklist exists for this trip. No successful booking-confirmation audit was found; rejected attempts need not create such an audit.

At inspection, participant eligibility, safety approval, and capacity policies were enabled. The payment policy was under review. The effective weather setting was disabled, despite an older weather-policy row still saying enabled. The configured SAR 1.00 seat price matches the captured amount. Neither payment nor weather explains the outstanding participant and safety requirements.

No customer details, provider credentials, or production connection strings are included here. The inspection did not edit the payment, booking, eligibility, policies, or trip dates.

## Intended lifecycle

Booking creation produces `PENDING`. Authoritative Moyasar verification updates the payment and its audit; it does not approve participants or confirm the booking. An authorized center or platform operator must use the existing confirmation action after its requirements are met.

The customer interface must therefore distinguish:

| Payment | Booking | Required display |
| --- | --- | --- |
| CAPTURED | PENDING | Payment succeeded; awaiting operator confirmation |
| CAPTURED | CONFIRMED | Payment succeeded; booking confirmed |
| CAPTURED | CANCELLED | Payment succeeded; booking cancelled; refund is a separate process |
| CAPTURED | Missing, unknown, or unreadable | Payment succeeded; booking status could not be verified |
| Unverified or failed refresh | Any previously displayed state | Verification unavailable; refresh without creating another payment |

Only protected server responses establish these states. Return query parameters are not payment or booking evidence. A late response after dismissal, logout, or session change must not restore a previous account's result.

Session expiry removes the private result immediately and retains only an opaque payment identifier for protected re-verification after sign-in. Explicit logout discards that intent. Signing in with a different account must pass server-side payment ownership checks before any payment or booking result is shown.

## Explicit safety deferral

The operational-controls catalogue and `docs/calendar-weather-gate.md` already state that disabling optional approval does not override an explicit `DEFERRED` trip decision. Booking creation enforced this boundary, while booking confirmation previously applied only the optional approval policy.

Confirmation now preserves explicit deferral in all three policy states. Missing or pending approval continues to follow the selected policy; an allowed decision permits otherwise eligible confirmation. No global policy is changed, and the existing `SAFETY_APPROVAL` response code remains compatible.

## Verification boundaries

The API change is covered by actual HTTP/PostgreSQL cases for the three approval-policy states and four safety states: missing, review required, allowed, and deferred. They exercise permitted confirmations and rejected center/admin actions, preserving booking data, captured payments, audit attribution, and notification behavior.

The Moyasar HTTP/database regression checks that a verified paid webhook, duplicate webhook, and authenticated reconciliation leave the booking pending without implicit confirmation notifications or audits.

Browser regressions cover separate payment/booking state, manual refresh, reload recovery, cancelled and unknown bookings, failed verification, and dismissal/logout/session changes. Three expiry cases use a failed protected request and actual failed authentication-refresh route, followed by same-account sign-in, different-account sign-in, or explicit logout. Full CI and deployment results are recorded on the release pull request; local static checks alone do not establish browser or database acceptance.

## Center acceptance remains separate

The existing isolated center UAT runtime predates this release. Its earlier license/finance evidence remains tied to the exact version tested. Its schema guard must remain enforced when synchronizing the environment, and any upgrade must preserve its saved synthetic records and be rehearsed on disposable databases first.

Technical tests do not supply the center representative's identity, observations, or sign-off. Actual operator acceptance remains outstanding until performed and recorded by that representative. This change does not introduce automatic confirmation, authorize an actual departure, settle a real payment, or resolve the separate organization billing/calendar decisions.
