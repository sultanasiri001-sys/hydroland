import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PaymentsService } from './payments.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(private readonly payments:PaymentsService){}

  @Post(':id/refund')
  refund(@Req()request:{auth:{accountId:string}},@Param('id')paymentId:string){
    return this.payments.executeRefund(request.auth.accountId,paymentId);
  }
}
