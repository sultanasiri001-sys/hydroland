import {Module} from '@nestjs/common';
import {AuditModule} from '../audit/audit.module';
import {AuthModule} from '../auth/auth.module';
import {TripsModule} from '../trips/trips.module';
import {IntegrationModule} from '../integrations/integration.module';
import {PaymentsController} from './payments.controller';
import {PaymentsService} from './payments.service';
@Module({imports:[AuthModule,AuditModule,TripsModule,IntegrationModule],controllers:[PaymentsController],providers:[PaymentsService],exports:[PaymentsService]})
export class PaymentsModule {}
