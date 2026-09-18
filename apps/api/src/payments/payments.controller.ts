import { Body,Controller,Get,Param,Post,Req,UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PaymentsService } from './payments.service';

@UseGuards(AccessTokenGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly s:PaymentsService){}

  @Post()
  create(@Req()r:{auth:{accountId:string}},@Body()b:{bookingId:string;amountMinor:number;idempotencyKey:string}){return this.s.create(r.auth.accountId,b)}

  @Post(':id/refund-request')
  requestRefund(@Req()r:{auth:{accountId:string}},@Param('id')id:string,@Body()b:{reason:string}){return this.s.requestRefund(r.auth.accountId,id,b.reason)}

  @Get('mine')
  mine(@Req()r:{auth:{accountId:string}}){return this.s.mine(r.auth.accountId)}
}
