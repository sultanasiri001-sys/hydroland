import {Module} from '@nestjs/common';
import {AdminModule} from '../admin/admin.module';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {TripsModule} from '../trips/trips.module';
import {IntegrationModule} from '../integrations/integration.module';
import {PaymentsController} from './payments.controller';
import {PaymentsWebhookController} from './payments-webhook.controller';
import {SettlementReadinessController} from './settlement-readiness.controller';
import {PaymentsService} from './payments.service';
import {MoyasarPaymentProviderService} from './moyasar-payment-provider.service';
import {MoyasarSettlementProviderService} from './moyasar-settlement-provider.service';
@Module({imports:[AdminModule,AuthModule,AuditModule,TripsModule,IntegrationModule],controllers:[PaymentsController,PaymentsWebhookController,SettlementReadinessController],providers:[PaymentsService,MoyasarPaymentProviderService,MoyasarSettlementProviderService],exports:[PaymentsService,MoyasarSettlementProviderService]})
export class PaymentsModule {}
