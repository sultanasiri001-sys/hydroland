import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type CrewResourceRow = { id: string; type: string; name: string; referenceId: string };
type AssignmentRow = {
  id: string;
  tripId: string;
  resourceId: string;
  accountId: string;
  roleType: string;
  status: string;
  replacesAssignmentId: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type AssignmentWithTripRow = AssignmentRow & {
  tripTitle: string;
  tripType: string;
  startsAt: Date;
  endsAt: Date;
};

@Injectable()
export class CrewAssignmentService {
  constructor(private readonly db: DatabaseService) {}

  private async notify(accountId: string, type: string, payload: Record<string, unknown>) {
    return this.db.notification.create({ data: { accountId, type, payload, status: 'PENDING' } });
  }

  private async notifyAdmins(type: string, payload: Record<string, unknown>) {
    const admins = await this.db.roleAssignment.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { accountId: true },
    });
    await Promise.all(admins.map((admin: { accountId: string }) => this.notify(admin.accountId, type, payload)));
  }

  async dispatchForConfirmedBooking(tripId: string, bookingId: string) {
    const trip = await this.db.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found.');

    const resources = await this.db.$queryRaw<CrewResourceRow[]>`
      SELECT r."id", r."type", r."name", r."referenceId"
      FROM "CalendarAllocation" a
      JOIN "CalendarResource" r ON r."id" = a."resourceId"
      JOIN "Account" ac ON ac."id" = r."referenceId"
      WHERE a."tripId" = ${tripId}
        AND a."status" = 'ACTIVE'
        AND r."active" = true
        AND r."referenceId" IS NOT NULL
        AND ac."status" = 'ACTIVE'
    `;

    for (const resource of resources) {
      const existing = await this.db.$queryRaw<AssignmentRow[]>`
        SELECT * FROM "CrewAssignment"
        WHERE "tripId" = ${tripId}
          AND "resourceId" = ${resource.id}
          AND "status" IN ('PENDING', 'ACCEPTED')
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      if (!existing.length) {
        const created = await this.db.$queryRaw<AssignmentRow[]>`
          INSERT INTO "CrewAssignment" (
            "id", "tripId", "resourceId", "accountId", "roleType", "status", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, ${tripId}, ${resource.id}, ${resource.referenceId}, ${resource.type}, 'PENDING', NOW(), NOW()
          )
          RETURNING *
        `;
        await this.notify(resource.referenceId, 'TRIP_CREW_ASSIGNMENT', {
          assignmentId: created[0].id,
          tripId,
          bookingId,
          tripTitle: trip.title,
          startsAt: trip.startsAt,
          endsAt: trip.endsAt,
          roleType: resource.type,
          resourceName: resource.name,
          actionRequired: true,
        });
      } else {
        await this.notify(existing[0].accountId, 'TRIP_BOOKING_CONFIRMED', {
          assignmentId: existing[0].id,
          tripId,
          bookingId,
          tripTitle: trip.title,
          startsAt: trip.startsAt,
          endsAt: trip.endsAt,
          roleType: existing[0].roleType,
          actionRequired: existing[0].status === 'PENDING',
        });
      }
    }

    return { tripId, bookingId, notifiedCrew: resources.length };
  }

  async mine(accountId: string) {
    return this.db.$queryRaw<AssignmentWithTripRow[]>`
      SELECT c.*, t."title" AS "tripTitle", t."type" AS "tripType", t."startsAt", t."endsAt"
      FROM "CrewAssignment" c
      JOIN "Trip" t ON t."id" = c."tripId"
      WHERE c."accountId" = ${accountId}
      ORDER BY t."startsAt" ASC, c."createdAt" DESC
      LIMIT 100
    `;
  }

  async respond(accountId: string, assignmentId: string, response: 'ACCEPTED' | 'REJECTED') {
    const rows = await this.db.$queryRaw<AssignmentRow[]>`
      SELECT * FROM "CrewAssignment" WHERE "id" = ${assignmentId} LIMIT 1
    `;
    const assignment = rows[0];
    if (!assignment || assignment.accountId !== accountId) throw new NotFoundException('Crew assignment not found.');
    if (assignment.status !== 'PENDING') throw new ConflictException('Crew assignment already answered.');

    if (response === 'ACCEPTED') {
      await this.db.$executeRaw`
        UPDATE "CrewAssignment"
        SET "status" = 'ACCEPTED', "respondedAt" = NOW(), "updatedAt" = NOW()
        WHERE "id" = ${assignmentId}
      `;
      await this.notifyAdmins('CREW_ASSIGNMENT_ACCEPTED', { assignmentId, tripId: assignment.tripId, accountId });
      return { assignmentId, status: 'ACCEPTED' };
    }

    await this.db.$executeRaw`
      UPDATE "CrewAssignment"
      SET "status" = 'REJECTED', "respondedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${assignmentId}
    `;

    const replacement = await this.findReplacement(assignment);
    if (!replacement) {
      await this.notifyAdmins('CREW_REPLACEMENT_REQUIRED', {
        assignmentId,
        tripId: assignment.tripId,
        roleType: assignment.roleType,
        rejectedByAccountId: accountId,
      });
      return { assignmentId, status: 'REJECTED', replacement: null, requiresAdminAction: true };
    }

    const replacementAssignment = await this.replaceAssignment(assignment, replacement);
    return {
      assignmentId,
      status: 'REJECTED',
      replacement: {
        assignmentId: replacementAssignment.id,
        accountId: replacement.referenceId,
        resourceId: replacement.id,
        resourceName: replacement.name,
      },
    };
  }

  private async findReplacement(assignment: AssignmentRow): Promise<CrewResourceRow | null> {
    const trip = await this.db.trip.findUnique({ where: { id: assignment.tripId } });
    if (!trip) return null;

    const candidates = await this.db.$queryRaw<CrewResourceRow[]>`
      SELECT r."id", r."type", r."name", r."referenceId"
      FROM "CalendarResource" r
      JOIN "Account" ac ON ac."id" = r."referenceId"
      WHERE r."active" = true
        AND r."type" = ${assignment.roleType}
        AND r."referenceId" IS NOT NULL
        AND r."id" <> ${assignment.resourceId}
        AND ac."status" = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM "CalendarAllocation" a
          WHERE a."resourceId" = r."id"
            AND a."status" = 'ACTIVE'
            AND a."startsAt" < ${trip.endsAt}
            AND a."endsAt" > ${trip.startsAt}
            AND a."tripId" <> ${assignment.tripId}
        )
      ORDER BY r."name" ASC
      LIMIT 1
    `;
    return candidates[0] ?? null;
  }

  private async replaceAssignment(assignment: AssignmentRow, replacement: CrewResourceRow) {
    await this.db.$executeRaw`
      UPDATE "CalendarAllocation"
      SET "resourceId" = ${replacement.id}, "updatedAt" = NOW()
      WHERE "tripId" = ${assignment.tripId}
        AND "resourceId" = ${assignment.resourceId}
        AND "status" = 'ACTIVE'
    `;

    const created = await this.db.$queryRaw<AssignmentRow[]>`
      INSERT INTO "CrewAssignment" (
        "id", "tripId", "resourceId", "accountId", "roleType", "status", "replacesAssignmentId", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${assignment.tripId}, ${replacement.id}, ${replacement.referenceId}, ${assignment.roleType}, 'PENDING', ${assignment.id}, NOW(), NOW()
      )
      RETURNING *
    `;

    const trip = await this.db.trip.findUnique({ where: { id: assignment.tripId } });
    await this.notify(replacement.referenceId, 'TRIP_CREW_ASSIGNMENT', {
      assignmentId: created[0].id,
      tripId: assignment.tripId,
      tripTitle: trip?.title ?? 'HYDROLAND Trip',
      startsAt: trip?.startsAt ?? null,
      endsAt: trip?.endsAt ?? null,
      roleType: assignment.roleType,
      resourceName: replacement.name,
      replacementForAssignmentId: assignment.id,
      actionRequired: true,
    });
    await this.notifyAdmins('CREW_REASSIGNED', {
      tripId: assignment.tripId,
      rejectedAssignmentId: assignment.id,
      replacementAssignmentId: created[0].id,
      replacementAccountId: replacement.referenceId,
      roleType: assignment.roleType,
    });
    return created[0];
  }
}