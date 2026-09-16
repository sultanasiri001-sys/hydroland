import {Module} from '@nestjs/common';
import {DatabaseModule} from '../database/database.module';
import {FinanceController} from './finance.controller';
import {FinanceAccessService} from './finance-access.service';
import {FinanceShiftsService} from './finance-shifts.service';
import {FinanceReceivablesService} from './finance-receivables.service';

@Module({imports:[DatabaseModule],controllers:[FinanceController],providers:[FinanceAccessService,FinanceShiftsService,FinanceReceivablesService],exports:[FinanceAccessService,FinanceShiftsService,FinanceReceivablesService]})
export class FinanceModule{}
