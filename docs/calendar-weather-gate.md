# HYDROLAND Unified Calendar Weather Gate

All bookings remain anchored to the unified operational calendar. Weather and marine conditions are evaluated against each calendar slot.

## Admin control
The main admin dashboard exposes a global Weather Gate switch:
- ENFORCE: weather/marine evaluation can block or require review for booking and trip confirmation.
- ADVISORY: weather/marine data is shown but does not automatically block booking.

The switch is global by default and may later support per-activity or per-location overrides.

## Calendar weather snapshot
Each calendar slot may display:
- weather timestamp and provider status
- wind speed and direction
- gusts
- wave height and direction when available
- visibility/precipitation when relevant
- marine condition summary
- operational recommendation: ALLOWED, REVIEW_REQUIRED, or DEFERRED

## Booking behavior
When Weather Gate is ENFORCE:
1. A slot without a valid weather/marine evaluation is REVIEW_REQUIRED.
2. ALLOWED permits normal booking flow.
3. REVIEW_REQUIRED keeps the slot visible but requires authorized operational review before confirmation.
4. DEFERRED prevents new confirmation for the affected slot until conditions are reassessed or an authorized policy changes the decision.

When Weather Gate is ADVISORY:
- weather is displayed in the unified calendar and trip details;
- booking continues subject to non-weather safety controls;
- weather does not automatically reject or defer the booking.

## Safety rule
Disabling automatic Weather Gate enforcement does not disable the general safety workflow or legal/operational responsibilities. Safety administrators retain authority to defer or cancel a trip independently of the global Weather Gate switch.

## Provider neutrality
No weather or marine provider is selected or activated by this design. The integration remains provider-neutral until credentials and provider selection are explicitly approved.