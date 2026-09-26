import { Body, Controller, Post } from '@nestjs/common';
import { MoyasarPaymentService } from './moyasar-payment.service';
import { PaymentsService } from './payments.service';

@Controller('payments/provider/moyasar')
export class PaymentProviderController {
  constructor(private readonly moyasar:MoyasarPaymentService,private readonly payments:PaymentsService){}

  @Post('webhook')
  async webhook(@Body()body:unknown){
    const event=this.moyasar.verifyWebhook(body);
    return this.payments.reconcileWebhook(event.providerPaymentId);
  }
}
