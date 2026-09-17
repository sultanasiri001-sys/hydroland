# HYDROLAND Unified Calendar Booking

All HYDROLAND bookings are date-and-time bound and must resolve to one unified operational calendar.

## Rule
No booking can be created without a valid start time and end time. The calendar is the source of truth for availability and operational conflicts, not merely a display layer.

## Calendar responsibilities
The unified calendar controls:
- activity/trip time slots
- participant capacity
- instructor availability
- boat availability
- staff availability
- venue/site availability when applicable
- equipment reservation windows
- maintenance/blocked periods
- safety review windows
- weather/sea suitability status when connected

## Conflict policy
A booking is rejected or marked for review when the requested time overlaps an unavailable resource. Conflict checks must include all resources assigned to the booking, not only the customer.

## Activity coverage
The same calendar governs diving, training, snorkeling, fishing, leisure cruises, island trips, water activities, boat rental, and organization/government bookings.

## Time model
Store timestamps in UTC and render them in the operation/customer timezone. Saudi operations default to Asia/Riyadh unless the activity explicitly uses another operating timezone.

## Status model
Calendar slots should support states such as AVAILABLE, HELD, BOOKED, BLOCKED, MAINTENANCE, WEATHER_REVIEW, SAFETY_REVIEW, CANCELLED, and COMPLETED.

## Booking lifecycle
1. Customer selects activity/date/time.
2. Availability engine checks capacity and assigned resources.
3. A temporary hold may be created during checkout.
4. Confirmation converts the hold to a booking.
5. Cancellation releases capacity and resources.
6. Completed activities remain immutable historical calendar records.

## Source of truth
Trip `startsAt` / `endsAt` remain operational timestamps, but all new activity booking flows must reference the same unified calendar availability service before confirmation.