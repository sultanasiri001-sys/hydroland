# HYDROLAND Activity Booking Model

HYDROLAND uses one booking engine for diving, snorkeling, fishing, leisure cruises, island trips, swimming/water activities, boat rental, and organization bookings.

## Core flow
Customer -> Booker -> Activity -> Participants -> Requirements -> Equipment -> Safety -> Payment/Confirmation.

## Booker types
- MEMBER: authenticated HYDROLAND customer.
- GUEST: guest customer using minimum contact data.
- ORGANIZATION: company or government booking contact.

The booker does not have to be a participant.

## Participant types
- DIVER: requires diver profile, credentials, equipment and dive eligibility.
- TRAINEE: requires course prerequisites and assigned instructor workflow.
- SNORKELER: requires basic participant, equipment sizing and water-safety requirements.
- ANGLER: requires fishing activity and equipment requirements.
- PASSENGER: leisure/island-trip passenger; no diving credential requirement.
- WATER_ACTIVITY: requirements are defined by the selected activity.
- NON_PARTICIPATING_BOOKER: booker who does not join the activity.

## Activity requirements
Each activity defines its own required fields, eligibility rules, equipment checklist, waiver set, safety checklist and capacity rules. Diving-only fields must never be required for leisure/fishing passengers.

## Booking snapshot
At booking time, operational data is copied into an immutable booking snapshot. Later profile edits do not silently rewrite the trip manifest.

## Guest conversion
Guest booking records can later be claimed by a verified HYDROLAND account after contact verification. Claiming must not rewrite historical booking snapshots.

## Privacy
Only data necessary for the activity is copied into the booking snapshot. Sensitive identity data is masked where operationally possible. Emergency contact data is restricted to operational/safety roles and the relevant booking.