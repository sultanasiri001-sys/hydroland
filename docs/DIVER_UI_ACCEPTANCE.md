# HYDROLAND Diver Workspace Acceptance

Scope: authenticated diver workspace presentation built on existing services.

## Acceptance criteria

- The workspace is visible only for authenticated users while the active portal is the diver view.
- The workspace disappears when a protected role portal is selected or the user signs out.
- Profile status, medical fitness, verified credential count and active equipment count are derived from existing account data only.
- Missing data is displayed as incomplete/review state; no operational status is invented.
- Existing diver profile, equipment, credential and dive-log actions are reused through their current action handlers.
- Trips and store navigation reuse existing page sections.
- The dashboard does not replace trip-level safety checks or marine readiness decisions.
- No API contract, RBAC, booking authorization or safety policy changes are introduced.
- Responsive behavior is supported on desktop, tablet and mobile.
