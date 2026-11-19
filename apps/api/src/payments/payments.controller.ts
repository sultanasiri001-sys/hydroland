import { Body,Controller,Get,Param,Post,Req,UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PaymentsService } from './payments.service';

@UseGuards(AccessTokenGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly s:PaymentsService){}

  @Post()
  create(@Req() request: { auth: { accountId: string } }, @Body() body: { bookingId: string; idempotencyKey: string }) {
    return this.s.create(request.auth.accountId, { bookingId: body?.bookingId, idempotencyKey: body?.idempotencyKey });
  }

  @Post(':id/refresh')
  refresh(@Req()r:{auth:{accountId:string}},@Param('id')id:string){return this.s.refresh(r.auth.accountId,id)}

  @Post(':id/refund-request')
  requestRefund(
    @Req() request: { auth: { accountId: string } },
    @Param('id') id: string,
    @Body() body: { reason?: string; amountMinor?: number; currency?: string },
  ) {
    return this.s.requestRefund(request.auth.accountId, id, body?.reason, body);
  }

  @Get('mine')
  mine(@Req()r:{auth:{accountId:string}}){return this.s.mine(r.auth.accountId)}
}
