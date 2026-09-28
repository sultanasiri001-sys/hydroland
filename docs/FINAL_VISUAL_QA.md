# HYDROLAND Final Visual QA

> Historical checklist below; superseded by the approved September 28 reference images and `PHASE_1_VISUAL_AUDIT_2026_09_28.md`. The current visitor uses the dark marine identity (Tajawal/Montserrat, cyan illumination and gold actions), not the earlier light treatment. Current user-facing names are **هواة الغوص، محترفي الغوص، الوسائط البحرية**. Do not use the legacy terminology normalization below for new edits. This document is not evidence of final visual closure.

This pass is presentation-only. It does not change API contracts, RBAC, booking authorization, safety policy, external integration readiness, or portal architecture.

## Approved visual reference
- Deep blue: `#003B6F`
- Ocean blue: `#0077B6`
- Aqua: `#00B4D8`
- Light blue: `#E6F4F8`
- Gold: `#D4AF37`
- Sand: `#F5E6C8`
- Arabic typography: Tajawal
- English typography: Montserrat

## Portal treatment
- Visitor: light marine presentation with white/light-blue surfaces and the approved HYDROLAND palette.
- Diver: operational marine dashboard using the same palette with a darker authenticated treatment.
- Dive Professionals, Dive Center, Marine Brokerage, Companies & Government, Administration: preserve the existing operational dashboard architecture and normalize color, typography, focus states, spacing, cards and responsive behavior to the approved visual direction.

## Terminology locked by this pass
- `محترفي الغوص` / `DIVE PROFESSIONALS`
- `الوساطة البحرية` / `MARINE BROKERAGE`
- Legacy visible labels `مدرب معتمد`, `INSTRUCTOR`, `مشغل قارب`, `BOAT OPERATOR`, and `الوسائط البحرية` are normalized only when they appear as exact UI labels.

## Acceptance boundary
- No invented operational values.
- Existing `—`, review states, and `قيد الربط` indicators remain where the connected system does not provide production data.
- Existing authentication, authorization and freshness enforcement remain unchanged.
- External Stage 3 blockers remain external and are not visually represented as completed.
- Mobile and desktop retain the existing responsive portal structure.
