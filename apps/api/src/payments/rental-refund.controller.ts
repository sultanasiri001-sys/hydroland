import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RentalRefundService } from './rental-refund.service';

@Controller('payments/rentals')
@UseGuards(AccessTokenGuard)
export class RentalRefundController {
  constructor(private readonly refunds: RentalRefundService) {}
  @Get(':id/refund-requests')
  requests(@Req() request: { auth: { accountId: string } }, @Param('id') id: string) {
    return this.refunds.requests(request.auth.accountId, id);
  }
  @Post(':id/refund-requests')
  request(@Req() request: { auth: { accountId: string } }, @Param('id') id: string,
    @Body() input: Parameters<RentalRefundService['request']>[2]) {
    return this.refunds.request(request.auth.accountId, id, input);
  }
  @Post(':id/provider-handover-failure')
  failure(@Req() request: { auth: { accountId: string } }, @Param('id') id: string,
    @Body() input: Parameters<RentalRefundService['confirmProviderFailure']>[2]) {
    return this.refunds.confirmProviderFailure(request.auth.accountId, id, input);
  }
  @Post(':id/refund-operations')
  execute(@Req() request: { auth: { accountId: string } }, @Param('id') id: string,
    @Body() input: Parameters<RentalRefundService['execute']>[2]) {
    return this.refunds.execute(request.auth.accountId, id, input);
  }
  @Post(':id/refund-operations/:operationId/cancel-reservation')
  cancelReservation(@Req() request: { auth: { accountId: string } }, @Param('id') id: string, @Param('operationId') operationId: string,
    @Body() input: Parameters<RentalRefundService['cancelReservation']>[3]) {
    return this.refunds.cancelReservation(request.auth.accountId, id, operationId, input);
  }
  @Post(':id/refund-operations/:operationId/reconcile')
  reconcile(@Req() request: { auth: { accountId: string } }, @Param('id') id: string, @Param('operationId') operationId: string) {
    return this.refunds.reconcile(request.auth.accountId, id, operationId);
  }
}
