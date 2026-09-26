import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments/provider')
export class PaymentsWebhookController {
  constructor(private readonly payments:PaymentsService){}

  @Post('moyasar/webhook')
  @HttpCode(HttpStatus.OK)
  moyasar(@Body()body:unknown){return this.payments.handleMoyasarWebhook(body)}
}
