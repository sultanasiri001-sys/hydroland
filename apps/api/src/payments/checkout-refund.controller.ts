import {Body, Controller, Param, Post, Req, UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {CheckoutRefundService} from './checkout-refund.service';

@Controller('payments')
@UseGuards(AccessTokenGuard)
export class CheckoutRefundController {
  constructor(private readonly refunds: CheckoutRefundService) {}
  @Post('courses/cancellations/:id/refund')
  course(@Req() req: {auth:{accountId:string}}, @Param('id') id: string, @Body() body: {financeEntryId:string}) {
    return this.refunds.execute(req.auth.accountId,'COURSE',id,body?.financeEntryId);
  }
  @Post('goods/returns/:id/refund')
  goods(@Req() req: {auth:{accountId:string}}, @Param('id') id: string, @Body() body: {financeEntryId:string}) {
    return this.refunds.execute(req.auth.accountId,'GOODS',id,body?.financeEntryId);
  }
}
