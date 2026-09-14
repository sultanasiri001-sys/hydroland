import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TripAdminService, TripStatusValue } from './trip-admin.service';

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
      status?: TripStatusValue;
    },
  ) {
    return this.trips.create(body);
  }

  @Patch(':id/status')
  status(@Param('id') id: string, @Body() body: { status: TripStatusValue }) {
    return this.trips.setStatus(id, body.status);
  }
}
