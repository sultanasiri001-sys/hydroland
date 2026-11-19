# D11 core interface localization

## Covered source

The core delivery binds the static shell, guest entry, public discovery/details, fallback role console, six authenticated dashboards, workspace headings, role access feedback, navigation routing and shared UI primitives. The existing navigation engine remains the shared dependency. Interface labels are source-owned; canonical role/route/action keys remain unchanged.

Public trip/product names and descriptions, account/organization identities, user initials, messages and provider errors remain opaque. Introductory course text comes from the in-file public path definitions and is explicitly bound as authored content. Public details consume the commerce batch's optional `explainMessage` and `tripTypeMessage` descriptors when available; the existing string APIs remain compatible. No locale change authorizes an action, changes an API payload or reads/writes a remote service.

Local dashboard errors use a private WeakMap to distinguish authored messages from provider text. Summary timestamps are formatted for the active interface language with the same Riyadh timezone. A locale change updates only a still-current timestamp binding; a replaced loading/error state cannot be revived. Workspace breadcrumbs copy the current rendered heading and never rebuild the service form.

## Direction audit

The audit inspected 113 CSS rules containing physical direction/alignment/edge declarations across the loaded styles. Shared `hydroland-locale.css` mirrors the shell, portal drawer, managed service margins, mobile behavior, action/metric arrows, form labels, profile/conversation lists, map controls, notification position, and public cards/teaser artwork positions.

Existing centered layouts remain centered. Source document/contract paper keeps its explicit content direction and physical document design; cryptographic codes, date inputs, brand blocks and other explicitly LTR data remain LTR. UI notice borders mirror without changing source text. At mobile widths, both service margins and closed/open drawer transforms have explicit LTR rules. These are source-level CSS changes; visual/layout acceptance requires the combined browser run.

## Local verification

- All **130 Node tests passed**, followed by all six existing validators.
- All **73 authored HTML templates** were rendered with the actual localization engine in English; no untranslated literal text or supported static display attributes remained in those segments.
- Actual source bootstrap in JSDOM loaded the application and checked **12 public surfaces**, then the diver and five operational dashboards through AR↔EN roundtrips. No untranslated source-owned public/core UI text remained; Arabic account initials and names remained unchanged as data.
- The actual-source run recorded **zero console errors** and **zero non-GET writes**. Authentication and role switching used synthetic local responses.
- Build and syntax validation passed.

The existing shell accessible-name test ignores only the engine's transparent authored comment markers before checking the same Arabic names, native dialog association and bootstrap order. Its expected names and authority checks have not been relaxed.

## Activation boundary

English stays disabled in this source commit. A separate activation commit will introduce the visible `[data-hl-locale-switch]` control, update real keyboard/click tests and add operational layout assertions. Combined source, browser and screen-reader evidence must be reviewed before releasing that activation. Written or discovered browser tests are not a passed browser result.
