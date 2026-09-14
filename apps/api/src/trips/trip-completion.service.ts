import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type CompleteTripInput = {
  siteName?: string;
  regionCode?: string;
  maxDepthM?: number;
  durationMin?: number;
  instructorName?: string;
  notes?: string;
};

@Injectable()
export class TripCompletionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async complete(reviewerAccountId: string, tripId: string, input: CompleteTripInput) {
    const siteName = input.siteName?.trim();
    if (!siteName) throw new BadRequestException('Dive site is required.');
    if (!Number.isFinite(input.maxDepthM) || Number(input.maxDepthM) <= 0 || Number(input.maxDepthM) > 150) {
      throw new BadRequestException('Invalid max depth.');
    }
    if (!Number.isInteger(input.durationMin) || Number(input.durationMin) < 1 || Number(input.durationMin) > 600) {
      throw new BadRequestException('Invalid duration.');
    }

    const result = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new NotFoundException('Trip not found.');
      if (trip.status === 'CANCELLED') throw new ConflictException('Cancelled trip cannot be completed.');
      if (trip.status === 'COMPLETED') {
        const existing = await tx.diveLog.count({ where: { notes: { contains: `HYDROLAND_TRIP:${tripId}` } } });
        return { trip, createdDiveLogs: 0, existingDiveLogs: existing, alreadyCompleted: true };
      }
      if (trip.startsAt > new Date()) throw new ConflictException('Trip has not started yet.');

      const latestSafety = await tx.safetyChecklist.findFirst({
        where: { tripId },
        orderBy: { createdAt: 'desc' },
        select: { decision: true },
      });
      if (latestSafety?.decision !== 'ALLOWED') {
        throw new ConflictException('Trip requires an ALLOWED safety decision before completion.');
      }

      const bookings = await tx.booking.findMany({
        where: { tripId, status: 'CONFIRMED' },
        select: { accountId: true },
      });
      if (!bookings.length) throw new ConflictException('Trip has no confirmed participants.');

      let createdDiveLogs = 0;
      const marker = `HYDROLAND_TRIP:${tripId}`;
      for (const booking of bookings) {
        const id = randomUUID();
        const noteText = [marker, input.notes?.trim()].filter(Boolean).join(' | ');
        const inserted = await tx.$executeRawUnsafe(
          `INSERT INTO "DiveLog" ("id","accountId","siteName","regionCode","diveDate","maxDepthM","durationMin","instructorName","notes","status","createdAt","updatedAt","sourceTripId")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'DRAFT',NOW(),NOW(),$10)
           ON CONFLICT ("accountId","sourceTripId") DO NOTHING`,
          id,
          booking.accountId,
          siteName,
          input.regionCode?.trim() || null,
          trip.startsAt,
          Number(input.maxDepthM),
          Number(input.durationMin),
          input.instructorName?.trim() || null,
          noteText,
          tripId,
        );
        createdDiveLogs += inserted;
      }

      const completedTrip = await tx.trip.update({ where: { id: tripId }, data: { status: 'COMPLETED' } });
      return {
        trip: completedTrip,
        createdDiveLogs,
        existingDiveLogs: bookings.length - createdDiveLogs,
        alreadyCompleted: false,
      };
    });

    await this.audit.record({
      action: 'TRIP_COMPLETED',
      resource: 'Trip',
      resourceId: tripId,
      metadata: {
        reviewerAccountId,
        createdDiveLogs: result.createdDiveLogs,
        existingDiveLogs: result.existingDiveLogs,
      },
    });

    return result;
  }
}
