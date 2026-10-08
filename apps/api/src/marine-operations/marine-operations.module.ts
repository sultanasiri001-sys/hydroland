import {Module} from '@nestjs/common';
import {AdminModule} from '../admin/admin.module';
import {AuthModule} from '../auth/auth.module';
import {AuditModule} from '../audit/audit.module';
import {MarineOperationsController} from './marine-operations.controller';
import {MarineOperationsService} from './marine-operations.service';
import {MarineTripManagementService} from './marine-trip-management.service';
@Module({imports:[AuthModule,AdminModule,AuditModule],controllers:[MarineOperationsController],providers:[MarineOperationsService,MarineTripManagementService],exports:[MarineOperationsService,MarineTripManagementService]})
export class MarineOperationsModule{}
