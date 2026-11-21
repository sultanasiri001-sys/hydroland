import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TrainingCheckoutService } from './training-checkout.service';

@Controller('payments/courses')
@UseGuards(AccessTokenGuard)
export class TrainingCheckoutController {
  constructor(private readonly training: TrainingCheckoutService) {}
  @Get(':id/quote')
  quote(@Req() req: {auth: {accountId: string}}, @Param('id') id: string) { return this.training.quote(req.auth.accountId, id); }
  @Post(':id/cancellation')
  cancel(@Req() req: {auth: {accountId: string}}, @Param('id') id: string) {
    return this.training.cancelConfirmedCourse(req.auth.accountId, id);
  }
  @Post(':id/checkout')
  checkout(@Req() req: {auth: {accountId: string}}, @Param('id') id: string,
    @Body() input: {quoteHash?: string; acceptedPolicyVersion?: string; idempotencyKey?: string}) { return this.training.checkout(req.auth.accountId, id, input); }
  @Post(':id/refresh')
  refresh(@Req() req: {auth: {accountId: string}}, @Param('id') id: string) { return this.training.refresh(req.auth.accountId, id); }
  @Post(':id/reconcile-invoice')
  reconcile(@Req() req: {auth: {accountId: string}}, @Param('id') id: string, @Body() input: {providerInvoiceId?: string}) {
    return this.training.reconcileInvoice(req.auth.accountId, id, input?.providerInvoiceId);
  }
  @Post(':id/collection')
  collection(@Req() req: {auth: {accountId: string}}, @Param('id') id: string, @Body() input: {financeEntryId?: string}) {
    return this.training.publishCollection(req.auth.accountId, id, input?.financeEntryId);
  }
}
