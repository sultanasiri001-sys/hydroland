# HYDROLAND Launch Readiness

Date: 2026-09-15

## Deployment

- Frontend service: `hydroland-web`
- Frontend branch: `feat/web-live-api`
- Backend service: `hydroland`
- Backend branch: `feat/live-trip-operations`
- Production API base: `https://hydroland.onrender.com/api/v1`
- Public web URL: `https://hydroland-web.onrender.com`

## Verified launch controls

- Web CI validates, typechecks, and builds the frontend.
- Frontend is configured to serve the production `dist` build on Render.
- Authentication uses the production API by default and supports refresh/retry for authorized requests.
- Public trip discovery and booking availability use the production API.
- Member bookings support cancellation and participant viewing/editing.
- Member profile data and credentials are loaded from the production API.
- Credentials can be viewed and created from the member profile.
- Dive logs use authenticated requests with token refresh.
- Trip, booking, calendar, crew, safety review, and dive-log review operations are wired to the live API.
- Equipment rental operations use authenticated API requests.
- A rollback snapshot exists at `release/hydroland-launch-2026-09-15`.

## Runtime validation boundary

CI/build/deploy checks are verified without requiring user credentials. Authenticated end-to-end role scenarios (diver, instructor, admin/reviewer) require dedicated test accounts and must not be reported as fully exercised until those accounts are available.

## Launch gate

A release is eligible for live use when the current web commit has a successful `HYDROLAND Web CI` run and the matching Render frontend deployment is `live`, while the backend service remains `live`.
