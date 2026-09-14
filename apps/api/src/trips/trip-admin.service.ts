import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

type CreateTripInput = {
  title?: string;
  type?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  status?: TripStatus;
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
        status: input.status ?? TripStatus.DRAFT,
      },
    });
  }

  async setStatus(id: string, status: TripStatus) {
    if (!Object.values(TripStatus).includes(status)) throw new BadRequestException('Invalid trip status.');
    const trip = await this.db.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found.');
    if (status === TripStatus.OPEN && trip.startsAt <= new Date()) {
      throw new ConflictException('A trip that already started cannot be opened.');
    }
    return this.db.trip.update({ where: { id }, data: { status } });
  }
}
