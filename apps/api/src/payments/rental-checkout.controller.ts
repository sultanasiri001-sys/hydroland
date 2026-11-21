import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RentalCheckoutService } from './rental-checkout.service';

@Controller('payments/rentals')
@UseGuards(AccessTokenGuard)
export class RentalCheckoutController {
  constructor(private readonly rentals: RentalCheckoutService) {}

  @Get(':id/quote')
  quote(@Req() req: {auth: {accountId: string}}, @Param('id') id: string) {
    return this.rentals.quote(req.auth.accountId, id);
  }
  @Post(':id/checkout')
  checkout(@Req() req: {auth: {accountId: string}}, @Param('id') id: string,
    @Body() input: {quoteHash?: string; acceptedPolicyVersion?: string; idempotencyKey?: string}) {
    return this.rentals.checkout(req.auth.accountId, id, input);
  }
  @Post(':id/refresh')
  refresh(@Req() req: {auth: {accountId: string}}, @Param('id') id: string) {
    return this.rentals.refresh(req.auth.accountId, id);
  }
  @Post(':id/reconcile-invoice')
  reconcile(@Req() req: {auth: {accountId: string}}, @Param('id') id: string, @Body() input: {providerInvoiceId?: string}) {
    return this.rentals.reconcileInvoice(req.auth.accountId, id, input?.providerInvoiceId);
  }
  @Post(':id/collection')
  collection(@Req() req: {auth: {accountId: string}}, @Param('id') id: string, @Body() input: {financeEntryId?: string}) {
    return this.rentals.publishCollection(req.auth.accountId, id, input?.financeEntryId);
  }
}
