# HYDROLAND approved UI implementation

This UI pass follows the approved marine HYDROLAND visual direction only.

## Approved interface coverage

- Visitor / public discovery: existing main experience retained.
- Diver: existing diver workspace retained.
- Dive Professionals (محترفي الغوص): completed approved role dashboard.
- Dive Center (مركز الغوص): completed approved role dashboard.
- Marine Brokerage (الوساطة البحرية): completed approved role dashboard, including boats, trips, bookings, maintenance, crew, licences, technical services and spare-parts entry points.
- Companies & Government (الشركات والجهات الحكومية): completed approved role dashboard.
- Administration (الإدارة): completed approved control-center dashboard.

## Design system lock

The implementation uses the approved dark marine HYDROLAND language: deep navy, marine blue, aqua, sand/gold accents, rounded cards, bilingual labels, responsive mobile-first layouts, and explicit system-backed placeholders instead of invented operational metrics.

## Safety and authorization

The UI does not bypass existing role authorization. Protected role actions revalidate portal access before navigation and retain the existing fail-closed behavior.
