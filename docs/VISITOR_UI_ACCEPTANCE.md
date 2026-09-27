# HYDROLAND Visitor UI Acceptance

Scope: visitor presentation only. Protected operational flows remain unchanged.

## Acceptance criteria

- Visitor identity uses the approved HYDROLAND marine palette and Saudi-facing copy.
- The entry surface matches the approved Red Sea welcome treatment and exposes sign in, registration and guest exploration.
- The entry surface is accessible as a modal dialog, keeps keyboard focus within it, and does not leave the underlying page keyboard-accessible while open.
- Guest pages show a persistent sign-in action so visitors can return to account access after exploring.
- Notifications and internal messages are not exposed to visitors; they become available after authentication.
- Guest exploration never grants protected operational permissions.
- Booking continues to require an authenticated session.
- Visitor discovery routes to trips, training and marine intelligence without replacing existing system routes.
- Visitor discovery uses the approved light marine palette, with active navigation updated when a discovery route is chosen.
- Existing API, RBAC, safety gates and protected role interfaces are not modified by this change.
- Visitor-specific presentation is removed automatically after authentication.
- Responsive behavior is defined for desktop, tablet and mobile.
