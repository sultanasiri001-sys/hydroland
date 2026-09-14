import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type ResourceRow = { id: string; type: string; name: string; active: boolean };
type AllocationRow = { id: string; tripId: string; resourceId: string; startsAt: Date; endsAt: Date; status: string };

@Injectable()
export class CalendarAllocationService {
  constructor(private readonly db: DatabaseService) {}

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
