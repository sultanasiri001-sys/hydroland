import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CalendarAllocationService } from './calendar-allocation.service';

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
    private readonly calendar: CalendarAllocationService,
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

    const readiness = await this.calendar.readinessForTrip(tripId);
    if (readiness.status === 'NOT_READY') {
      throw new ConflictException(`Trip is NOT_READY: ${readiness.blockers.join(', ')}`);
    }

    const clearance = await this.db.auditEvent.findFirst({
      where: {
        resource: 'Trip',
        resourceId: tripId,
        action: { in: ['OPERATIONAL_CLEARANCE_GRANTED', 'OPERATIONAL_REVIEW_APPROVED'] },
      },
      orderBy: { occurredAt: 'desc' },
    });
    if (!clearance) throw new ConflictException('Operational clearance is required before trip completion.');
    if (readiness.status === 'REVIEW_REQUIRED' && clearance.action !== 'OPERATIONAL_REVIEW_APPROVED') {
      throw new ConflictException('Current readiness requires documented administrative review approval.');
    }

    const result = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new NotFoundException('Trip not found.');
      if (trip.status === 'CANCELLED') throw new ConflictException('Cancelled trip cannot be completed.');
      if (trip.status === 'COMPLETED') {
        const existing = await tx.diveLog.count({ where: { notes: { contains: `HYDROLAND_TRIP:${tripId}` } } });
        const seatCount = await tx.booking.aggregate({ where: { tripId, status: 'CONFIRMED' }, _sum: { seats: true } });
        return { trip, createdDiveLogs: 0, existingDiveLogs: existing, confirmedAccounts: existing, confirmedSeats: seatCount._sum.seats ?? 0, alreadyCompleted: true };
      }
      if (trip.startsAt > new Date()) throw new ConflictException('Trip has not started yet.');

      const latestSafety = await tx.safetyChecklist.findFirst({
        where: { tripId },
        orderBy: { createdAt: 'desc' },
        select: { decision: true },
      });
      if (latestSafety?.decision !== 'ALLOWED') throw new ConflictException('Trip requires an ALLOWED safety decision before completion.');

      const bookings = await tx.booking.findMany({
        where: { tripId, status: 'CONFIRMED' },
        select: { accountId: true, seats: true },
      });
      if (!bookings.length) throw new ConflictException('Trip has no confirmed participants.');
      const confirmedSeats = bookings.reduce((sum: number, booking: { seats: number }) => sum + booking.seats, 0);
      if (confirmedSeats > trip.capacity) throw new ConflictException('Confirmed participants exceed trip capacity.');

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
        confirmedAccounts: bookings.length,
        confirmedSeats,
        alreadyCompleted: false,
      };
    });

    await this.audit.record({
      actorId: reviewerAccountId,
      action: 'TRIP_COMPLETED',
      resource: 'Trip',
      resourceId: tripId,
      metadata: {
        reviewerAccountId,
        operationalClearanceEventId: clearance.id,
        readiness,
        confirmedAccounts: result.confirmedAccounts,
        confirmedSeats: result.confirmedSeats,
        createdDiveLogs: result.createdDiveLogs,
        existingDiveLogs: result.existingDiveLogs,
      },
    });

    return { ...result, readiness, operationalClearanceEventId: clearance.id };
  }
}
