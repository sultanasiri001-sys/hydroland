# HYDROLAND Trip Intelligence & Offline Foundation

Status: implementation foundation.

This slice introduces versioned contracts for Trip Briefing, Dive Plan, Emergency Plan, safety/map/media/language versions, and Offline Package Manifest.

## Safety boundaries
- A downloaded package is not an operational safety authorization.
- Weather cached offline must retain its source timestamp and must not be represented as live.
- Controlled safety content requires reviewed translations.
- AI must not invent depth limits, weather values, evacuation resources, or operational authorization.
- Payment credentials and server secrets must never be included in offline packages.

## Next implementation
Persist briefing/version entities in Prisma, link to Trips/Safety, add publish/review authorization, package file manifests/checksums, translation metadata, and integration tests.
