# Phase 9 — User interfaces and mobile experience

Status: implemented on `feat/user-interfaces`.

## Delivered scope

- One responsive, mobile-first application shell.
- Arabic RTL as the default with English/LTR switching.
- Six role-specific workspaces: diver, instructor, dive centre, boat owner, organizations, and administration.
- Role-specific metrics, primary actions, task queues, operational focus, and services.
- API client prepared for bearer-token authenticated requests under `/api/v1`.
- Live/preview states so an unavailable backend is visible and never misrepresented as live data.
- Safety decisions retain the controlled `GO`, `REVIEW`, and `NO_GO` vocabulary.
- PWA manifest and offline application-shell caching.
- Keyboard navigation, focus visibility, skip link, live announcements, and reduced-motion support.
- Dependency-free build and validation scripts suitable for CI.

## Integration boundary

The current backend exposes identity, profile, credential, activation, notification, trip, booking, safety, payment and administration foundations. The UI client calls only available shared endpoints and marks deeper role actions as ready for their dedicated endpoints. External providers remain outside Phase 9.

## Acceptance criteria

- All six workspaces render from one maintainable role model.
- Layout is usable at phone, tablet, and desktop widths.
- Arabic is the default interface direction.
- Backend downtime produces an explicit preview state rather than a false success.
- `npm run test -w @hydroland/web` and `npm run build -w @hydroland/web` pass.
