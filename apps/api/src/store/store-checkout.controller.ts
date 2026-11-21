import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { StoreCheckoutService } from './store-checkout.service';

@Controller('store/orders')
@UseGuards(AccessTokenGuard)
export class StoreCheckoutController {
  constructor(private readonly checkoutService: StoreCheckoutService) {}
  @Get(':id/quote')
  quote(@Req() req: {auth: {accountId: string}}, @Param('id') id: string) {
    return this.checkoutService.quote(req.auth.accountId, id);
  }
  @Post(':id/checkout')
  checkout(@Req() req: {auth: {accountId: string}}, @Param('id') id: string,
    @Body() input: {quoteHash?: string; acceptedPolicyVersion?: string; idempotencyKey?: string}) {
    return this.checkoutService.checkout(req.auth.accountId, id, input);
  }
  @Post(':id/refresh')
  refresh(@Req() req: {auth: {accountId: string}}, @Param('id') id: string) {
    return this.checkoutService.refresh(req.auth.accountId, id);
  }
  @Post(':id/reconcile-invoice')
  reconcile(@Req() req: {auth: {accountId: string}}, @Param('id') id: string, @Body() input: {providerInvoiceId?: string}) {
    return this.checkoutService.reconcileInvoice(req.auth.accountId, id, input?.providerInvoiceId);
  }
  @Post(':id/collection')
  collection(@Req() req: {auth: {accountId: string}}, @Param('id') id: string, @Body() input: {financeEntryId?: string}) {
    return this.checkoutService.publishCollection(req.auth.accountId, id, input?.financeEntryId);
  }
}
