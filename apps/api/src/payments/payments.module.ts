import {Module} from '@nestjs/common';
import {AdminModule} from '../admin/admin.module';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {TripsModule} from '../trips/trips.module';
import {IntegrationModule} from '../integrations/integration.module';
import {StoreModule} from '../store/store.module';
import {PaymentProviderController} from './payment-provider.controller';
import {PaymentsAdminController} from './payments-admin.controller';
import {PaymentsController} from './payments.controller';
import {MoyasarPaymentService} from './moyasar-payment.service';
import {PaymentsService} from './payments.service';
@Module({imports:[AdminModule,AuthModule,AuditModule,TripsModule,IntegrationModule,StoreModule],controllers:[PaymentsController,PaymentsAdminController,PaymentProviderController],providers:[MoyasarPaymentService,PaymentsService],exports:[PaymentsService]})
export class PaymentsModule {}
