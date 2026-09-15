# Phase 12 — Testing and compliance readiness

## Automated quality gates
- API typecheck and build on every pull request.
- Phase 10 security validation confirms webhook signing, replay window, agent boundaries, Saudi Arabic and audit events.
- Manual release tests required: registration/login, protected routes, role scoping, duplicate booking prevention, trip capacity, payment idempotency, refund path, file ownership, webhook rejection and safety decision handling.

## Compliance release checklist
Before any public or pilot launch, the appointed compliance owner must record current evidence and approval for:
- SWSDF requirements for diving activities, instructors, centres and safety.
- SRSA requirements affecting marine tourism activities and operators.
- Zawil / General Directorate of Border Guard permits relevant to diving and marine movement.
- TGA requirements for any commercial marine transport operation.
- Privacy, retention, incident response, user terms and consent.
- Current official rules must be verified with the responsible authorities; this checklist is not legal approval.

## Security acceptance
No critical vulnerability, exposed secret, unrestricted admin route, unsigned webhook, untested restore plan, or safety/regulatory override may pass release.