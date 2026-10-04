import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { riyadhToday } from './center-report-range';

@Injectable()
export class CenterOverviewService {
  constructor(private readonly db: DatabaseService) {}

  overview(accountId: string, query: Record<string, unknown> = {}) {
    if (Object.keys(query).length) throw new BadRequestException('ملخص المركز يعرض بيانات المركز الحالي فقط.');
    return this.db.serializable(async tx => {
      const role = await tx.roleAssignment.findFirst({ where: { accountId, role: 'DIVE_CENTER', status: 'ACTIVE', account: { status: 'ACTIVE' } }, select: { id: true } });
      const membership = await tx.organizationMember.findFirst({
        where: { accountId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { organization: { select: { id: true, displayName: true } } },
      });
      if (!role || !membership) throw new ForbiddenException('يتطلب الملخص إدارة مركز غوص نشط.');
      const center = membership.organization, now = new Date(), today = riyadhToday(now);
      const tripScope = { organizationId: center.id };
      const tripToday = { ...tripScope, startsAt: { gte: today.start, lt: today.end }, status: { not: 'CANCELLED' as const } };
      const upcoming: Prisma.TripWhereInput = { ...tripScope, status: { in: ['OPEN', 'CLOSED'] }, endsAt: { gt: now } };
      const training: Prisma.TrainingSessionWhereInput = { trainingRecord: { enrollment: { centerOrganizationId: center.id } }, status: { in: ['SCHEDULED', 'CHECK_IN_OPEN', 'IN_PROGRESS'] }, OR: [{ endsAt: { gt: now } }, { endsAt: null, OR: [{ startsAt: { gte: now } }, { status: { in: ['CHECK_IN_OPEN', 'IN_PROGRESS'] } }] }] };
      const licenses: Prisma.AdministrativeRecordWhereInput = { organizationId: center.id, type: { in: ['LICENSE', 'PERMIT', 'CERTIFICATE', 'REGULATORY_APPROVAL'] }, status: { not: 'ARCHIVED' } };
      // License dates are calendar dates, as on the center's document page.
      const licenseDay = new Date(today.date + 'T00:00:00Z'), licenseHorizon = new Date(licenseDay.getTime() + 31 * 86400000);
      const equipmentScope = await tx.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='EquipmentBarcode' AND column_name='organizationId'`;
      const [newBookings, tripsToday, activeMembers, totalTrips, draftTrips, confirmedToday, upcomingCount, trips, trainingCount, sessions, openIncidents, criticalIncidents, licenseTotal, expired, expiringSoon, incomplete, pendingReview, equipment] = await Promise.all([
        tx.booking.count({ where: { trip: tripScope, status: 'PENDING' } }),
        tx.trip.count({ where: tripToday }),
        tx.organizationMember.count({ where: { organizationId: center.id, status: 'ACTIVE', account: { status: 'ACTIVE' } } }),
        tx.trip.count({ where: tripScope }),
        tx.trip.count({ where: { ...tripScope, status: 'DRAFT' } }),
        tx.booking.aggregate({ where: { trip: tripToday, status: 'CONFIRMED' }, _count: { _all: true }, _sum: { seats: true } }),
        tx.trip.count({ where: upcoming }),
        tx.trip.findMany({ where: upcoming, select: { id: true, title: true, startsAt: true, endsAt: true, status: true }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 5 }),
        tx.trainingSession.count({ where: training }),
        tx.trainingSession.findMany({ where: training, select: { id: true, startsAt: true, endsAt: true, status: true, trainingRecord: { select: { enrollment: { select: { courseCode: true } } } } }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 5 }),
        tx.safetyIncident.count({ where: { trip: tripScope, status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
        tx.safetyIncident.count({ where: { trip: tripScope, status: { in: ['OPEN', 'UNDER_REVIEW'] }, severity: 'CRITICAL' } }),
        tx.administrativeRecord.count({ where: licenses }),
        tx.administrativeRecord.count({ where: { ...licenses, licenseExpiresAt: { lt: licenseDay } } }),
        tx.administrativeRecord.count({ where: { ...licenses, licenseExpiresAt: { gte: licenseDay, lt: licenseHorizon } } }),
        tx.administrativeRecord.count({ where: { ...licenses, OR: [{ licenseExpiresAt: null }, { licenseIssuedAt: null }, { licenseAssetId: null }] } }),
        tx.administrativeRecord.count({ where: { ...licenses, licenseReviewStatus: 'PENDING' } }),
        equipmentScope.length ? tx.$queryRaw<Array<{ status: string; active: boolean; count: number }>>`
          SELECT b."stockStatus" AS status,r."active",COUNT(*)::int AS count
          FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId"
          WHERE b."organizationId"=(jsonb_populate_record(NULL::"EquipmentBarcode",jsonb_build_object('organizationId',${center.id}::text)))."organizationId" AND r."type"='EQUIPMENT'
          GROUP BY b."stockStatus",r."active" ORDER BY b."stockStatus",r."active"` : Promise.resolve([]),
      ]);
      return {
        center, date: today.date, timeZone: 'Asia/Riyadh', generatedAt: now,
        metrics: { newBookings, tripsToday, activeMembers, totalTrips },
        operations: { draftTrips, confirmedBookingsToday: confirmedToday._count._all, confirmedSeatsToday: confirmedToday._sum.seats ?? 0 },
        safety: { openIncidents, criticalIncidents },
        licenses: { total: licenseTotal, expired, expiringSoon, incomplete, pendingReview },
        equipment: { available: Boolean(equipmentScope.length), total: equipmentScope.length ? equipment.reduce((total, row) => total + row.count, 0) : null, groups: equipment },
        schedule: { trips: { total: upcomingCount, items: trips }, training: { total: trainingCount, items: sessions.map(({ trainingRecord, ...row }) => ({ ...row, courseCode: trainingRecord.enrollment.courseCode })) } },
      };
    });
  }
}
