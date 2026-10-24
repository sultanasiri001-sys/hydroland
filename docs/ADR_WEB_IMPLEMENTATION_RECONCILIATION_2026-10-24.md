# Web implementation reconciliation — 24 October 2026

Status: **Observed implementation recorded; baseline variance awaiting explicit
architecture disposition.** This record is not approval of a framework migration.

## Evidence

The Library Technical Master Specification v1.1
(`libfile_9f26c1efb38c8191b4eb85e78c94c848`, section 4) names Next.js + TypeScript
for Web. The reviewed production source at
`b77ff6002f9082d59c2387c4333e95f4b32d2bf8` instead has a JavaScript application
shell and feature modules. `apps/web/package.json` uses Node build/serve scripts;
`apps/web/scripts/build.mjs` copies `src` and `public` to `dist` and packages local
OCR/PDF dependencies. Render's Web service builds with
`node scripts/build-web-release.mjs` and serves through `apps/web`.

## Current work boundary

The reference-discovery addition follows the existing JavaScript workspace,
fresh authorization, server API and lifecycle fences. It does not introduce a
second Web application, replace the interface or change the accepted reference
screens. API remains NestJS with canonical Prisma/PostgreSQL persistence.

## Required disposition

The architecture owner must record whether the current Web implementation is
accepted as a baseline variance or whether a separately scoped migration is
approved. Any migration needs a concrete plan preserving route ownership,
authentication, permissions, accepted workflows and responsive/visual acceptance.
This discrepancy alone does not authorize rewriting working interfaces. The
original specification and approval history remain intact.
