import { createHash } from 'node:crypto';

export const safetyTripSelect = { id: true, title: true, status: true, type: true, startsAt: true, endsAt: true, updatedAt: true } as const;
export function safetyTripRevision(trip: { id: string; title: string; status: string; type: string; startsAt: Date; endsAt: Date; updatedAt: Date }) {
  return createHash('sha256').update(JSON.stringify([trip.id, trip.title, trip.status, trip.type, trip.startsAt.toISOString(), trip.endsAt.toISOString(), trip.updatedAt.toISOString()])).digest('hex');
}
