import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const prefix = 'HYDROLAND Production Operational E2E ';
const cutoff = new Date(Date.now() - 10 * 60 * 1000);

async function blockerCounts(tripId) {
  const rows = await db.$queryRawUnsafe(`
    SELECT 'Booking' AS table_name, COUNT(*)::int AS rows FROM "Booking" WHERE "tripId"::text = $1
    UNION ALL SELECT 'ComplianceAssessment', COUNT(*)::int FROM "ComplianceAssessment" WHERE "tripId"::text = $1
    UNION ALL SELECT 'CrewAssignment', COUNT(*)::int FROM "CrewAssignment" WHERE "tripId"::text = $1
    UNION ALL SELECT 'DiveLog', COUNT(*)::int FROM "DiveLog" WHERE "sourceTripId"::text = $1
    UNION ALL SELECT 'DivePlan', COUNT(*)::int FROM "DivePlan" WHERE "tripId"::text = $1
    UNION ALL SELECT 'EmergencyPlan', COUNT(*)::int FROM "EmergencyPlan" WHERE "tripId"::text = $1
    UNION ALL SELECT 'SafetyChecklist', COUNT(*)::int FROM "SafetyChecklist" WHERE "tripId"::text = $1
    UNION ALL SELECT 'SafetyIncident', COUNT(*)::int FROM "SafetyIncident" WHERE "tripId"::text = $1
    UNION ALL SELECT 'TripBriefing', COUNT(*)::int FROM "TripBriefing" WHERE "tripId"::text = $1
    UNION ALL SELECT 'TripComplianceReview', COUNT(*)::int FROM "TripComplianceReview" WHERE "tripId"::text = $1
  `, tripId);
  return rows;
}

try {
  const staleTrips = await db.trip.findMany({
    where: {
      title: { startsWith: prefix },
      createdAt: { lt: cutoff },
    },
    select: { id: true, title: true, createdAt: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  let removed = 0;
  for (const trip of staleTrips) {
    const counts = await blockerCounts(trip.id);
    const blockers = counts.filter(row => Number(row.rows) > 0);
    if (blockers.length) {
      throw new Error(`Refusing stale E2E cleanup for trip ${trip.id}; blocking relations: ${JSON.stringify(blockers)}`);
    }

    await db.$transaction(async tx => {
      await tx.auditEvent.deleteMany({ where: { resourceId: trip.id } });
      await tx.operationalSetting.deleteMany({ where: { key: `trip-price:${trip.id}` } });
      const deleted = await tx.trip.deleteMany({
        where: {
          id: trip.id,
          title: { startsWith: prefix },
          createdAt: { lt: cutoff },
        },
      });
      if (deleted.count !== 1) {
        throw new Error(`Stale E2E trip ${trip.id} was not deleted exactly once.`);
      }
    });
    removed += 1;
    console.log(`Removed stale isolated Stage 2 trip ${trip.id} (${trip.createdAt.toISOString()}).`);
  }

  console.log(`Stage 2 stale-trip cleanup complete: removed=${removed}.`);
} finally {
  await db.$disconnect();
}
