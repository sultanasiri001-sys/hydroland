import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { OrganizationBookingCheckoutService } from './organization-booking-checkout.service';

type Actor = { auth: { accountId: string } };
@UseGuards(AccessTokenGuard)
@Controller('organizations/:organizationId/bookings/:bookingId/prepayment')
export class OrganizationBookingCheckoutController {
  constructor(private readonly checkout: OrganizationBookingCheckoutService) {}

  @Get('quote')
  quote(@Req() req: Actor, @Param('organizationId') org: string, @Param('bookingId') booking: string) {
    return this.checkout.quote(req.auth.accountId, org, booking);
  }

  @Post()
  start(@Req() req: Actor, @Param('organizationId') org: string, @Param('bookingId') booking: string, @Body() body: Record<string, unknown>) {
    return this.checkout.checkout(req.auth.accountId, org, booking, body);
  }

  @Post('refresh')
  refresh(@Req() req: Actor, @Param('organizationId') org: string, @Param('bookingId') booking: string) {
    return this.checkout.refresh(req.auth.accountId, org, booking);
  }

  @Post('match-ledger')
  match(@Req() req: Actor, @Param('organizationId') org: string, @Param('bookingId') booking: string, @Body() body: { financeEntryId?: unknown }) {
    return this.checkout.matchLedger(req.auth.accountId, org, booking, body?.financeEntryId);
  }

  @Post('reconcile')
  reconcile(@Req() req: Actor, @Param('organizationId') org: string, @Param('bookingId') booking: string, @Body() body: { providerInvoiceId?: unknown }) {
    return this.checkout.recover(req.auth.accountId, org, booking, body?.providerInvoiceId);
  }
}
