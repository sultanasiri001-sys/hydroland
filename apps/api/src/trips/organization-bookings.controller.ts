import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { BookingManagementService } from './booking-management.service';
import { BookingParticipantService } from './booking-participant.service';
import { TripsService } from './trips.service';

type RequestWithAuth = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('organizations/:organizationId/bookings')
export class OrganizationBookingsController {
  constructor(private readonly trips: TripsService, private readonly lifecycle: BookingManagementService, private readonly participants: BookingParticipantService) {}

  @Get()
  list(@Req() request: RequestWithAuth, @Param('organizationId') organizationId: string, @Query() query: Record<string, string | undefined>) {
    return this.trips.listOrganizationBookings(request.auth.accountId, organizationId, Number(query.page ?? 1), Number(query.pageSize ?? 20));
  }

  @Post()
  create(@Req() request: RequestWithAuth, @Param('organizationId') organizationId: string, @Body() body: Record<string, unknown>) {
    const allowed = ['tripId', 'seats', 'requestKey', 'participantNames'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new BadRequestException('حقول طلب الحجز غير صالحة.');
    if (typeof body.tripId !== 'string' || typeof body.requestKey !== 'string' || typeof body.seats !== 'number' || body.participantNames !== undefined && (!Array.isArray(body.participantNames) || body.participantNames.some(name => typeof name !== 'string'))) throw new BadRequestException('طلب الحجز غير صالح.');
    return this.trips.bookForOrganization(request.auth.accountId, organizationId, { tripId: body.tripId, seats: body.seats, requestKey: body.requestKey, participantNames: body.participantNames as string[] | undefined });
  }

  @Get(':bookingId')
  detail(@Req() request: RequestWithAuth, @Param('organizationId') organizationId: string, @Param('bookingId') bookingId: string) {
    return this.lifecycle.detailForOrganization(request.auth.accountId, organizationId, bookingId);
  }

  @Post(':bookingId/cancel')
  async cancel(@Req() request: RequestWithAuth, @Param('organizationId') organizationId: string, @Param('bookingId') bookingId: string, @Body() body: Record<string, unknown>) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['requestId', 'expectedState', 'reason'].includes(key)) || typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId) || typeof body.expectedState !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedState) || typeof body.reason !== 'string' || body.reason.trim().length < 10 || body.reason.trim().length > 1000) throw new BadRequestException('حمّل تفاصيل الحجز وأدخل رقم طلب وسبب إلغاء صالحين.');
    return this.lifecycle.apply(request.auth.accountId, bookingId, { action: 'CANCEL', requestId: body.requestId, expectedState: body.expectedState, reason: body.reason.trim(), financialAcknowledged: true }, 'organization', undefined, organizationId);
  }

  @Patch(':bookingId/participants/:participantId')
  updateParticipant(@Req() request: RequestWithAuth, @Param('organizationId') organizationId: string, @Param('bookingId') bookingId: string, @Param('participantId') participantId: string, @Body() body: Record<string, unknown>) {
    const allowed = ['expectedUpdatedAt', 'fullName', 'certificationTitle'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new BadRequestException('حقول تعديل المشارك غير صالحة.');
    return this.participants.updateForOrganization(request.auth.accountId, organizationId, bookingId, participantId, body as { expectedUpdatedAt: string; fullName: string; certificationTitle?: string | null });
  }
}
