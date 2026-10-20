# Marine trip delivery — 19 October 2026

## Scope

Integrate the existing organization-scoped marine trip management (#439) and
read-only booking visibility (#440) with main `48544dbb8114e7fd7a5540e9dd8f7f26c652ff58`.
Preserve the newly published central operational controls and center finance
routes when resolving the dashboard, application bootstrap and module conflicts.
No database migration, dependency, provider configuration or role assignment is
part of this release.

An active BOAT_OWNER account additionally needs active operating membership of
an active MARINE_OPERATOR organization. Lists, draft creation/editing/publishing
and booking reads repeat that scope check on the server. Booking details are
read-only; this interface grants no cancellation, refund or approval powers.
Publishing opens booking visibility and never manufactures safety, weather or
departure approval.

Draft creation reuses its request key for an unchanged payload after an uncertain
network response. A changed payload gets a new key; concurrent submissions are
blocked in the interface. Existing backend revision and replay checks remain.
Private interface state, including retry keys, is cleared on role/session loss.

## Verification

Local API build, web unit/static/access validation, web production build and
marine architecture checks passed. Full browser and HTTP/PostgreSQL regression
results must be recorded on the exact release head before merge. The browser
suite includes the create/edit/publish/read-booking path and a connection-loss,
unchanged retry, changed payload and duplicate-submit regression.

## Remaining boundaries

- Marine document storage is the separate #441 change; it is not delivered here.
- Organization customer workflows and their commercial policy remain separate.
- Human operator acceptance, actual operational records and external integrations
  are not implied by passing synthetic tests or by application publication.
- Center technical functionality remains delivered; its representative sign-off
  is still outstanding. Do not merge the isolated center sandbox into production.
