# Phase 3: internal account card and permission-protected QR

## Owner acceptance retained

On 2026-09-30, Sultan answered yes when asked whether conversations open after
Google sign-in and become inaccessible after logout. This is owner-reported
live acceptance of those two checks, not a new automated production test or
proof of every refresh/message operation. It is recorded in PR #368.

## Scope of #371

Implement the existing account-card actions rather than hiding pending labels.
The deliverable is an internal HYDROLAND account card derived from current
Account, Person and active RoleAssignment data. It is **not** a diving licence,
medical clearance, externally verified certification, paid subscription or
operational check-in. No such claims or privileges are manufactured.

The PNG contains only display name, current active account state, public-facing
member role labels, observation/expiry notice and the protected QR. It excludes
email, telephone, national identity, health information, certificate details,
internal ADMIN/REVIEWER labels and raw account/session identifiers.

## Authorization and reference lifecycle

POST /api/v1/me/membership-pass uses the existing authenticated session. Its
short reference is AES-256-GCM authenticated encryption with a fresh random IV
and a purpose-specific key derived from the configured application secret.
It is not a login JWT. It expires within five minutes or earlier when the
issuing session expires/is revoked or the owner becomes inactive/unverified.
No new persistent schema, account, role assignment or login session is created.

POST /api/v1/me/membership-pass/verify requires authentication and current
permission: the owner or the same active ADMIN role used by existing AdminGuard.
Ordinary members and guests cannot retrieve another member's information.
Current account and role data are read again at verification; a shared PNG is
only a dated snapshot and is not evidence of ongoing authorization.

The URL uses a fragment, not a query parameter. The application removes it
before protected verification and does not store references in browser storage.
No third-party QR service receives any reference or user information. Sensitive
request values remain in a POST body and are not added to application logs.

## User controls

The three existing buttons open a prepared-card dialog. Download/share require
an explicit checkbox after the preview. Native sharing is invoked only from
its dedicated user click; cancellation is not reported as success. Clipboard
or manual-copy fallback is explicit. Account details are not included in the
shared text; the link still requires authorization.

Logout/account change/page exit remove the dialog, canvas, reference and object
URLs. Late replies cannot restore an ended account context. Expiry disables
sharing/download. A downloaded PNG cannot be remotely recalled; the UI states
this while the embedded online reference is revocable.

## Verification

The original bounded QR encoder implements version 12/M byte mode. Four module
matrices were compared byte-for-byte against independently generated Python
qrcode output, including Unicode and maximum length. Five invalid/oversized
inputs are rejected. These vectors are retained in the repository tests.

The new CI job builds the API, runs real controllers/AccessTokenGuard with a
local identity fixture and PostgreSQL text/UUID schemas, and checks consent,
PNG bytes, native share/cancellation, expiry, denial and logout races in the
actual web application. Fixtures do not constitute new production-user or
Google sign-in acceptance. Existing account and messaging suites remain enabled.

Full CI/build/browser results and visual review must be recorded before merge.
No production data, provider settings, paid resources or historical migrations
are changed. The general recovery issue #369 is independent and remains open.
No overall Phase 3 closure is claimed merely by adding this feature.
