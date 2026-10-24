import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { BookingManagementService } from './booking-management.service';

@Controller('marine-operations/trips')
@UseGuards(AccessTokenGuard)
export class MarineTripBookingsController {
  constructor(private readonly bookings: BookingManagementService) {}

  @Get(':tripId/bookings')
  list(@Req() request: { auth: { accountId: string } }, @Param('tripId') tripId: string, @Query() query: Record<string, unknown>) {
    return this.bookings.listMarineTrip(request.auth.accountId, tripId, query);
  }

  @Get(':tripId/bookings/:bookingId')
  detail(@Req() request: { auth: { accountId: string } }, @Param('tripId') tripId: string, @Param('bookingId') bookingId: string) {
    return this.bookings.detailMarineTrip(request.auth.accountId, tripId, bookingId);
  }
}
