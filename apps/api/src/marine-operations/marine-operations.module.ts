import {Module} from '@nestjs/common';
import {MarineOperationsService} from './marine-operations.service';
@Module({providers:[MarineOperationsService],exports:[MarineOperationsService]})
export class MarineOperationsModule{}
