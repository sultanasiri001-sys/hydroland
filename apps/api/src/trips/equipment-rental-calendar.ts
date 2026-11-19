import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Both reservation writers read the other domain within the same serializable
// transaction as their write, including retries after a concurrent reservation.
export async function assertRentalFitsCalendar(tx: Prisma.TransactionClient, resourceIds: string[], dueAt: Date | null) {
  const now = new Date();
  const allocation = await tx.calendarAllocation.findFirst({
    where: {
      resourceId: { in: resourceIds }, status: 'ACTIVE', event: { status: 'ACTIVE' },
      endsAt: { gt: now }, ...(dueAt && dueAt > now ? { startsAt: { lt: dueAt } } : {}),
    },
    select: { id: true },
  });
  if (allocation) throw new ConflictException('المعدّة مخصّصة في التقويم خلال مدة الإيجار.');
}

export async function assertTripFitsEquipmentRentals(tx: Prisma.TransactionClient, resourceIds: string[], startsAt: Date, endsAt: Date) {
  if (!resourceIds.length) return;
  const equipment = await tx.calendarResource.findMany({
    where: { id: { in: resourceIds }, type: 'EQUIPMENT' }, select: { id: true },
  });
  if (!equipment.length) return;

  // The base calendar can operate before the optional rental module is installed.
  // A partially installed module must surface a schema error during the claim read.
  const [schema] = await tx.$queryRaw<Array<{absent: boolean}>>`
    SELECT to_regclass('"EquipmentRental"') IS NULL AND to_regclass('"EquipmentRentalItem"') IS NULL AS absent`;
  if (schema.absent) return;

  const conflict = await tx.$queryRaw<Array<{id: string}>>(Prisma.sql`
    SELECT r."id" FROM "EquipmentRentalItem" i JOIN "EquipmentRental" r ON r."id" = i."rentalId"
    WHERE i."resourceId" IN (${Prisma.join(equipment.map(resource => resource.id))})
      AND i."returnedAt" IS NULL AND r."reservedAt" < (${endsAt}::timestamptz AT TIME ZONE 'UTC')
      AND (r."dueAt" IS NULL OR r."dueAt" > (${startsAt}::timestamptz AT TIME ZONE 'UTC')
        OR r."dueAt" <= (statement_timestamp() AT TIME ZONE 'UTC'))
      AND ((r."paymentStatus" = 'PAID' AND r."status" IN ('RESERVED', 'ACTIVE'))
        OR (r."paymentStatus" = 'PENDING' AND r."status" = 'RESERVED' AND r."holdExpiresAt" > clock_timestamp()))
    LIMIT 1`);
  if (conflict.length) throw new ConflictException('المعدّة محجوزة للتأجير خلال موعد الرحلة.');
}
