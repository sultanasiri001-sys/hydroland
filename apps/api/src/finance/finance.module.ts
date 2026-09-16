import {Module} from '@nestjs/common';
import {DatabaseModule} from '../database/database.module';
import {FinanceController} from './finance.controller';
import {FinanceAccessService} from './finance-access.service';
import {FinanceShiftsService} from './finance-shifts.service';

@Module({imports:[DatabaseModule],controllers:[FinanceController],providers:[FinanceAccessService,FinanceShiftsService],exports:[FinanceAccessService,FinanceShiftsService]})
export class FinanceModule{}
