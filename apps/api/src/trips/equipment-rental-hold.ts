import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const RENTAL_HOLD_MINUTES = 15;

export function rentalStatus(row: { status: string; paymentStatus: string; holdExpiresAt: Date | null }) {
  if (row.status === 'RESERVED' && row.paymentStatus === 'PENDING' &&
      row.holdExpiresAt && row.holdExpiresAt.getTime() <= Date.now()) return 'EXPIRED';
  return row.status;
}

// Call after locking the equipment rows in resource ID order, in a serializable transaction.
export async function assertNoRentalClaim(tx: Prisma.TransactionClient, resourceIds: string[], ownRentalId?: string) {
  const claims = await tx.$queryRaw<Array<{resourceId: string}>>`
    SELECT i."resourceId" FROM "EquipmentRentalItem" i JOIN "EquipmentRental" r ON r."id" = i."rentalId"
    WHERE i."resourceId" = ANY(${resourceIds}::text[]) AND i."returnedAt" IS NULL
      ${ownRentalId ? Prisma.sql`AND r."id" <> ${ownRentalId}` : Prisma.empty}
      AND ((r."paymentStatus" = 'PAID' AND r."status" IN ('RESERVED', 'ACTIVE'))
        OR (r."paymentStatus" = 'PENDING' AND r."status" = 'RESERVED' AND r."holdExpiresAt" > clock_timestamp()))
    LIMIT 1`;
  if (claims.length) throw new ConflictException('المعدّة محجوزة حاليًا.');
}
