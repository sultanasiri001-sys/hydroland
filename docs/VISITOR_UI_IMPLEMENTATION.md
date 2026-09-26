# Visitor Identity Implementation

The visitor interface is implemented as an additive presentation layer.

Files:
- `apps/web/src/hydroland-visitor.css`
- `apps/web/src/hydroland-experience.js`
- `docs/VISITOR_UI_ACCEPTANCE.md`

Boundary:
- No API contract changes.
- No role or permission changes.
- No safety decision changes.
- No booking authorization changes.
- Guest mode remains discovery-only.
- Authenticated users leave the visitor presentation state automatically through the existing auth-change event.
