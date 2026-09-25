import {Module} from '@nestjs/common';
import {AdminModule} from '../admin/admin.module';
import {AuthModule} from '../auth/auth.module';
import {MarineOperationsController} from './marine-operations.controller';
import {MarineOperationsService} from './marine-operations.service';
@Module({imports:[AuthModule,AdminModule],controllers:[MarineOperationsController],providers:[MarineOperationsService],exports:[MarineOperationsService]})
export class MarineOperationsModule{}
