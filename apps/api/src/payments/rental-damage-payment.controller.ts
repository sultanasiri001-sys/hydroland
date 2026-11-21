import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RentalDamagePaymentService } from './rental-damage-payment.service';

type Request={auth:{accountId:string}};
@Controller('payments/rental-damage/:id')
@UseGuards(AccessTokenGuard)
export class RentalDamagePaymentController {
  constructor(private readonly damage:RentalDamagePaymentService){}
  @Post('checkout') start(@Req() r:Request,@Param('id') id:string){return this.damage.start(r.auth.accountId,id);}
  @Post('refresh') refresh(@Req() r:Request,@Param('id') id:string){return this.damage.observe(id,'renter',r.auth.accountId);}
  @Post('reconcile') verify(@Req() r:Request,@Param('id') id:string,@Body() input:{invoiceId?:string;financeEntryId?:string}){return this.damage.verify(r.auth.accountId,id,input);}
}
