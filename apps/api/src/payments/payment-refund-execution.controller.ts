import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { FinanceOperationGrantService } from '../finance/finance-operation-grant.service';
import { PaymentRefundExecutionService } from './payment-refund-execution.service';

@UseGuards(AccessTokenGuard)
@Controller('payments/refund-operations')
export class PaymentRefundExecutionController {
  constructor(private readonly refunds: PaymentRefundExecutionService,private readonly grants:FinanceOperationGrantService) {}
  @Post('financial-grants')
  grant(@Req() request:{auth:{accountId:string}},@Body() body:Parameters<FinanceOperationGrantService['create']>[1]){return this.grants.create(request.auth.accountId,body)}
  @Post('financial-grants/:id/revoke')
  revoke(@Req() request:{auth:{accountId:string}},@Param('id') id:string){return this.grants.revoke(request.auth.accountId,id)}
  @Post()
  execute(@Req() request: { auth: { accountId: string } }, @Body() body: { paymentId: string; requestAuditEventId: string; financeEntryId: string; idempotencyKey: string }) {
    return this.refunds.execute(request.auth.accountId, body);
  }
  @Post(':id/reconcile')
  reconcile(@Req() request: { auth: { accountId: string } }, @Param('id') id: string) {
    return this.refunds.reconcile(request.auth.accountId, id);
  }
}
