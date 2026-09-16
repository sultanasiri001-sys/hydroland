import {Module} from '@nestjs/common';
import {DatabaseModule} from '../database/database.module';
import {FinanceController} from './finance.controller';
import {FinanceShiftsService} from './finance-shifts.service';

@Module({imports:[DatabaseModule],controllers:[FinanceController],providers:[FinanceShiftsService],exports:[FinanceShiftsService]})
export class FinanceModule{}
