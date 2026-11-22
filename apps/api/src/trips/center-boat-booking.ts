import { ConflictException } from '@nestjs/common';

export const boatBookingInclude = {
  organization: { select: { id: true, kind: true, status: true, displayName: true, legalName: true, registrationNumber: true, address: true } },
  marineAsset: { select: { id: true, organizationId: true, reviewCenterId: true, status: true, passengerCapacity: true } },
} as const;

type TripSource = { type: string; capacity: number; organizationId: string | null;
  organization?: { kind: string; status: string } | null;
  marineAsset?: { reviewCenterId: string | null; organizationId: string; status: string; passengerCapacity: number | null } | null };

export function isBoatTrip(type: string) {
  return ['BOAT','BOAT_DIVE','MARINE_TRIP'].includes(type?.toUpperCase());
}

export function bookableThroughCenter(trip: TripSource) {
  if (trip.organization?.kind === 'MARINE_OPERATOR') return false;
  if (!isBoatTrip(trip.type)) return true;
  const vessel = trip.marineAsset;
  return Boolean(trip.organization?.kind === 'DIVE_CENTER' && trip.organization.status === 'ACTIVE' &&
    vessel?.status === 'ACTIVE' && (vessel.reviewCenterId ?? vessel.organizationId) === trip.organizationId &&
    (vessel.passengerCapacity === null || vessel.passengerCapacity >= trip.capacity));
}

export function requireCenterBoat(trip: TripSource) {
  if (!bookableThroughCenter(trip)) throw new ConflictException('يتطلب حجز الرحلة قاربًا مرتبطًا بمركز غوص نشط.');
}
