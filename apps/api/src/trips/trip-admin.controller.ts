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
  create(@Req() req:{auth:{accountId:string}},@Body() body: { title?: string; type?: string; startsAt?: string; endsAt?: string; capacity?: number; status?: TripStatusValue; locationName?:string; latitude?:number; longitude?:number; pricePerSeatMinor?:number }) { return this.trips.create(req.auth.accountId,body); }

  @Patch(':id/price')
  price(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:{pricePerSeatMinor:number}){return this.trips.setPrice(req.auth.accountId,id,body.pricePerSeatMinor);}

  @Patch(':id/location')
  location(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:{locationName?:string;latitude?:number;longitude?:number}){return this.trips.location(req.auth.accountId,id,body);}

  @Post(':id/operational-clearance')
  operationalClearance(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Body() body: { reason?: string }) { return this.trips.operationalClearance(req.auth.accountId, id, body.reason); }

  @Get(':id/bookings')
  bookings(@Param('id') id: string) { return this.trips.bookings(id); }

  @Patch(':id/bookings/:bookingId/participants/:participantId/eligibility')
  participantEligibility(
    @Req() req:{auth:{accountId:string}},
    @Param('id') id:string,
    @Param('bookingId') bookingId:string,
    @Param('participantId') participantId:string,
    @Body() body:{status:'ELIGIBLE'|'REJECTED'},
  ){return this.trips.setParticipantEligibility(req.auth.accountId,id,bookingId,participantId,body.status);}

  @Patch(':id/bookings/:bookingId/confirm')
  confirmBooking(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Param('bookingId') bookingId: string) { return this.trips.confirmBooking(req.auth.accountId, id, bookingId); }

  @Patch(':id/bookings/:bookingId/cancel')
  cancelBooking(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Param('bookingId') bookingId: string) { return this.trips.cancelBooking(req.auth.accountId, id, bookingId); }

  @Patch(':id/status')
  status(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Body() body: { status: TripStatusValue }) { return this.trips.setStatus(req.auth.accountId, id, body.status); }
}
