import { Body, Controller, Post } from '@nestjs/common';
import { StorePaymentProviderService } from '../store/store-payment-provider.service';
import { MoyasarPaymentService } from './moyasar-payment.service';
import { PaymentsService } from './payments.service';

@Controller('payments/provider/moyasar')
export class PaymentProviderController {
  constructor(private readonly moyasar:MoyasarPaymentService,private readonly payments:PaymentsService,private readonly storePayments:StorePaymentProviderService){}

  @Post('webhook')
  async webhook(@Body()body:unknown){
    const event=this.moyasar.verifyWebhook(body);
    const remote=await this.moyasar.fetchPayment(event.providerPaymentId);
    if(this.moyasar.scope(remote)==='STORE')return this.storePayments.reconcileWebhookPayment(remote);
    if(this.moyasar.scope(remote)==='BOOKING')return this.payments.reconcileWebhook(event.providerPaymentId);
    return{accepted:true,ignored:true,reason:'UNSUPPORTED_PAYMENT_SCOPE'};
  }
}
