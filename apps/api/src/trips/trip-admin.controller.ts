import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TripAdminService, TripStatusValue } from './trip-admin.service';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('trips/admin')
export class TripAdminController {
  constructor(private readonly trips: TripAdminService) {}

  @Get()
  list() { return this.trips.list(); }

  @Post()
  create(@Body() body: { title?: string; type?: string; startsAt?: string; endsAt?: string; capacity?: number; status?: TripStatusValue }) {
    return this.trips.create(body);
  }

  @Get(':id/bookings')
  bookings(@Param('id') id: string) { return this.trips.bookings(id); }

  @Patch(':id/bookings/:bookingId/confirm')
  confirmBooking(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Param('bookingId') bookingId: string) {
    return this.trips.confirmBooking(req.auth.accountId, id, bookingId);
  }

  @Patch(':id/bookings/:bookingId/cancel')
  cancelBooking(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Param('bookingId') bookingId: string) {
    return this.trips.cancelBooking(req.auth.accountId, id, bookingId);
  }

  @Patch(':id/status')
  status(@Param('id') id: string, @Body() body: { status: TripStatusValue }) { return this.trips.setStatus(id, body.status); }
}
