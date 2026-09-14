import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TripsService {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    const trips = await this.db.trip.findMany({
      where: { status: 'OPEN' },
      orderBy: { startsAt: 'asc' },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          select: { seats: true },
        },
        safetyChecklists: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, decision: true, notes: true, decidedAt: true, createdAt: true },
        },
      },
    });

    return trips.map((trip) => {
      const bookedSeats = trip.bookings.reduce((sum, booking) => sum + booking.seats, 0);
      const latestSafety = trip.safetyChecklists[0] ?? null;
      const { bookings, safetyChecklists, ...base } = trip;
      return {
        ...base,
        bookedSeats,
        remainingSeats: Math.max(0, trip.capacity - bookedSeats),
        safety: latestSafety,
      };
    });
  }

  async book(accountId: string, tripId: string, seats: number) {
    if (!Number.isInteger(seats) || seats < 1) throw new BadRequestException('Invalid seats.');

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip || trip.status !== 'OPEN') throw new NotFoundException('Trip unavailable.');
      if (trip.startsAt <= new Date()) throw new ConflictException('Trip already started.');

      const latestSafety = await tx.safetyChecklist.findFirst({
        where: { tripId },
        orderBy: { createdAt: 'desc' },
        select: { decision: true },
      });
      if (latestSafety?.decision === 'DEFERRED') {
        throw new ConflictException('Trip is deferred by safety review.');
      }

      const used = await tx.booking.aggregate({
        where: { tripId, status: { in: ['PENDING', 'CONFIRMED'] } },
        _sum: { seats: true },
      });
      if ((used._sum.seats ?? 0) + seats > trip.capacity) {
        throw new ConflictException('Trip capacity reached.');
      }

      return tx.booking.create({ data: { tripId, accountId, seats, status: 'PENDING' } });
    });
  }

  mine(accountId: string) {
    return this.db.booking.findMany({
      where: { accountId },
      include: { trip: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
