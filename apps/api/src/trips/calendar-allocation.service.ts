import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WeatherGateService, WeatherSnapshot } from './weather-gate.service';

type ResourceRow = { id: string; type: string; name: string; active: boolean };
type AllocationRow = { id: string; tripId: string; resourceId: string; startsAt: Date; endsAt: Date; status: string };
type AllocationWithResourceRow = AllocationRow & { resourceType: string; resourceName: string };
type JsonLike = Record<string, unknown> | unknown[] | string | number | boolean | null;
type CalendarTripRow = {
  id: string;
  title: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  status: string;
  bookings: Array<{ seats: number }>;
  safetyChecklists: Array<{
    decision: string;
    items: JsonLike;
    notes: string | null;
    decidedAt: Date | null;
    createdAt: Date;
  }>;
};

@Injectable()
export class CalendarAllocationService {
  constructor(private readonly db: DatabaseService, private readonly weatherGate: WeatherGateService) {}

  async resources() {
    return this.db.$queryRaw<ResourceRow[]>`
      SELECT "id", "type", "name", "active"
      FROM "CalendarResource"
      ORDER BY "type" ASC, "name" ASC
    `;
  }

  async tripAllocations(tripId: string) {
    return this.db.$queryRaw<AllocationRow[]>`
      SELECT "id", "tripId", "resourceId", "startsAt", "endsAt", "status"
      FROM "CalendarAllocation"
      WHERE "tripId" = ${tripId}
      ORDER BY "startsAt" ASC
    `;
  }

  private weatherFromItems(items: JsonLike): WeatherSnapshot | null {
    if (!items || Array.isArray(items) || typeof items !== 'object') return null;
    const weather = (items as Record<string, unknown>).weather;
    if (!weather || Array.isArray(weather) || typeof weather !== 'object') return null;
    return weather as WeatherSnapshot;
  }

  async calendar(fromRaw: string, toRaw: string) {
    const from = new Date(fromRaw);
    const to = new Date(toRaw);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException('Invalid calendar date range.');
    }

    const gate = await this.weatherGate.settings();
    const trips = (await this.db.trip.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from } },
      orderBy: { startsAt: 'asc' },
      include: {
        bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } }, select: { seats: true } },
        safetyChecklists: { orderBy: { createdAt: 'desc' }, take: 1, select: { decision: true, items: true, notes: true, decidedAt: true, createdAt: true } },
      },
    })) as CalendarTripRow[];

    const allocations = await this.db.$queryRaw<AllocationWithResourceRow[]>`
      SELECT a."id", a."tripId", a."resourceId", a."startsAt", a."endsAt", a."status",
             r."type" AS "resourceType", r."name" AS "resourceName"
      FROM "CalendarAllocation" a
      JOIN "CalendarResource" r ON r."id" = a."resourceId"
      WHERE a."startsAt" < ${to} AND a."endsAt" > ${from} AND a."status" = 'ACTIVE'
      ORDER BY a."startsAt" ASC
    `;

    return trips.map((trip: CalendarTripRow) => {
      const bookedSeats = trip.bookings.reduce((sum: number, booking: { seats: number }) => sum + booking.seats, 0);
      const latestSafety = trip.safetyChecklists[0] ?? null;
      const snapshot = latestSafety ? this.weatherFromItems(latestSafety.items) : null;
      const weather = this.weatherGate.evaluate(snapshot, gate);
      return {
        id: trip.id,
        title: trip.title,
        type: trip.type,
        startsAt: trip.startsAt,
        endsAt: trip.endsAt,
        capacity: trip.capacity,
        status: trip.status,
        bookedSeats,
        remainingSeats: Math.max(0, trip.capacity - bookedSeats),
        safety: latestSafety,
        weather: { snapshot, gate, evaluation: weather },
        resources: allocations
          .filter((allocation: AllocationWithResourceRow) => allocation.tripId === trip.id)
          .map((allocation: AllocationWithResourceRow) => ({
            id: allocation.id,
            resourceId: allocation.resourceId,
            startsAt: allocation.startsAt,
            endsAt: allocation.endsAt,
            status: allocation.status,
            resource: { type: allocation.resourceType, name: allocation.resourceName },
          })),
      };
    });
  }

  async assertResourcesAvailable(resourceIds: string[], startsAt: Date, endsAt: Date, excludeTripId?: string) {
    for (const resourceId of resourceIds) {
      const rows = await this.db.$queryRaw<Array<{ id: string; tripId: string }>>`
        SELECT "id", "tripId"
        FROM "CalendarAllocation"
        WHERE "resourceId" = ${resourceId}
          AND "status" = 'ACTIVE'
          AND "startsAt" < ${endsAt}
          AND "endsAt" > ${startsAt}
          AND (${excludeTripId ?? null}::text IS NULL OR "tripId" <> ${excludeTripId ?? null})
        LIMIT 1
      `;
      if (rows.length) throw new ConflictException('Calendar resource conflict detected.');
    }
  }

  async allocate(tripId: string, resourceIds: string[]) {
    const trip = await this.db.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found.');

    const unique = [...new Set(resourceIds.filter(Boolean))];
    await this.assertResourcesAvailable(unique, trip.startsAt, trip.endsAt, tripId);

    for (const resourceId of unique) {
      await this.db.$executeRaw`
        INSERT INTO "CalendarAllocation" ("id", "tripId", "resourceId", "startsAt", "endsAt", "status", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${tripId}, ${resourceId}, ${trip.startsAt}, ${trip.endsAt}, 'ACTIVE', NOW(), NOW())
      `;
    }

    return this.tripAllocations(tripId);
  }
}
