import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type TripStatusValue = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'COMPLETED';
const TRIP_STATUSES: TripStatusValue[] = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'];

type CreateTripInput = {
  title?: string;
  type?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  status?: TripStatusValue;
};

@Injectable()
export class TripAdminService {
  constructor(private readonly db: DatabaseService) {}

  list() {
    return this.db.trip.findMany({ orderBy: { startsAt: 'desc' } });
  }

  create(input: CreateTripInput) {
    if (!input.title?.trim() || !input.type?.trim() || !input.startsAt || !input.endsAt) {
      throw new BadRequestException('Trip title, type, startsAt and endsAt are required.');
    }
    if (!Number.isInteger(input.capacity) || Number(input.capacity) < 1) {
      throw new BadRequestException('Trip capacity must be a positive integer.');
    }
    if (input.status && !TRIP_STATUSES.includes(input.status)) {
      throw new BadRequestException('Invalid trip status.');
    }
    if (input.status === 'COMPLETED') {
      throw new BadRequestException('Use the governed trip completion workflow.');
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Trip date range is invalid.');
    }
    return this.db.trip.create({
      data: {
        title: input.title.trim(),
        type: input.type.trim(),
        startsAt,
        endsAt,
        capacity: Number(input.capacity),
        status: input.status ?? 'DRAFT',
      },
    });
  }

  async setStatus(id: string, status: TripStatusValue) {
    if (!TRIP_STATUSES.includes(status)) throw new BadRequestException('Invalid trip status.');
    if (status === 'COMPLETED') {
      throw new BadRequestException('Use the governed trip completion workflow.');
    }
    const trip = await this.db.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found.');
    if (status === 'OPEN' && trip.startsAt <= new Date()) {
      throw new ConflictException('A trip that already started cannot be opened.');
    }
    return this.db.trip.update({ where: { id }, data: { status } });
  }
}
