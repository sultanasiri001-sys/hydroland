import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationModule } from '../integrations/integration.module';
import { MoyasarPaymentService } from '../payments/moyasar-payment.service';
import { StoreController } from './store.controller';
import { StorePaymentProviderService } from './store-payment-provider.service';
import { StoreService } from './store.service';
@Module({imports:[AuthModule,AdminModule,AuditModule,IntegrationModule],controllers:[StoreController],providers:[StoreService,MoyasarPaymentService,StorePaymentProviderService],exports:[StoreService,StorePaymentProviderService]})
export class StoreModule {}
