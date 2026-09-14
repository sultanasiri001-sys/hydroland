import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {TripsModule} from '../trips/trips.module';
import {PaymentsController} from './payments.controller';
import {PaymentsService} from './payments.service';
@Module({imports:[AuthModule,TripsModule],controllers:[PaymentsController],providers:[PaymentsService]})
export class PaymentsModule {}
