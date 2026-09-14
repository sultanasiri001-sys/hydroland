import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { WeatherGateService, WeatherSnapshot } from './weather-gate.service';

type TripListRow = {
  id: string;
  title: string;
  status: string;
  startsAt: Date;
  capacity: number;
  bookings: Array<{ seats: number }>;
  safetyChecklists: Array<{
    id: string;
    decision: string;
    items: Prisma.JsonValue;
    notes: string | null;
    decidedAt: Date | null;
    createdAt: Date;
  }>;
  [key: string]: unknown;
};

@Injectable()
export class TripsService {
  constructor(private readonly db: DatabaseService, private readonly weatherGate: WeatherGateService) {}

  private weatherFromItems(items: Prisma.JsonValue): WeatherSnapshot | null {
    if (!items || Array.isArray(items) || typeof items !== 'object') return null;
    const weather = (items as Record<string, unknown>).weather;
    if (!weather || Array.isArray(weather) || typeof weather !== 'object') return null;
    return weather as WeatherSnapshot;
  }

  async list() {
    const trips = (await this.db.trip.findMany({
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
          select: { id: true, decision: true, items: true, notes: true, decidedAt: true, createdAt: true },
        },
      },
    })) as TripListRow[];

    return trips.map((trip: TripListRow) => {
      const bookedSeats = trip.bookings.reduce((sum: number, booking: { seats: number }) => sum + booking.seats, 0);
      const latestSafety = trip.safetyChecklists[0] ?? null;
      const weatherSnapshot = latestSafety ? this.weatherFromItems(latestSafety.items) : null;
      const weather = this.weatherGate.evaluate(weatherSnapshot);
      const { bookings, safetyChecklists, ...base } = trip;
      return {
        ...base,
        bookedSeats,
        remainingSeats: Math.max(0, trip.capacity - bookedSeats),
        safety: latestSafety,
        weather: { snapshot: weatherSnapshot, gate: this.weatherGate.settings(), evaluation: weather },
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
        select: { decision: true, items: true },
      });
      if (!latestSafety || latestSafety.decision !== 'ALLOWED') {
        throw new ConflictException('Trip requires safety approval before booking.');
      }

      const weatherSnapshot = this.weatherFromItems(latestSafety.items);
      const weather = this.weatherGate.evaluate(weatherSnapshot);
      if (weather.blocking) {
        throw new ConflictException(weather.reason || 'Trip is unavailable because of weather conditions.');
      }

      const used = await tx.booking.aggregate({
        where: { tripId, status: { in: ['PENDING', 'CONFIRMED'] } },
        _sum: { seats: true },
      });
      if ((used._sum.seats ?? 0) + seats > trip.capacity) throw new ConflictException('Trip capacity reached.');

      return tx.booking.create({ data: { tripId, accountId, seats, status: 'PENDING' } });
    });
  }

  mine(accountId: string) {
    return this.db.booking.findMany({ where: { accountId }, include: { trip: true }, orderBy: { createdAt: 'desc' } });
  }
}
