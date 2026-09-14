import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TripAdminService } from './trip-admin.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin')
export class TripAdminController {
  constructor(private readonly trips: TripAdminService) {}

  @Get()
  list() {
    return this.trips.list();
  }

  @Post()
  create(
    @Body()
    body: {
      title?: string;
      type?: string;
      startsAt?: string;
      endsAt?: string;
      capacity?: number;
      status?: TripStatus;
    },
  ) {
    return this.trips.create(body);
  }

  @Patch(':id/status')
  status(@Param('id') id: string, @Body() body: { status: TripStatus }) {
    return this.trips.setStatus(id, body.status);
  }
}
