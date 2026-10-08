import { FinanceReceivablesWorkspaceService } from './finance-receivables-workspace.service';
import { FinanceWorkspaceService } from './finance-workspace.service';
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { FinanceController } from './finance.controller';
import { FinanceFoundationService } from './finance-foundation.service';
import { FinanceWorkflowService } from './finance-workflow.service';
import { FinanceOperationsService } from './finance-operations.service';
import { FinanceGovernanceService } from './finance-governance.service';
import { FinancePersistenceService } from './finance-persistence.service';
import { FinanceAccessService } from './finance-access.service';
import { FinanceShiftsService } from './finance-shifts.service';
import { FinanceReceivablesService } from './finance-receivables.service';
import { FinanceShiftCloseService } from './finance-shift-close.service';

@Module({
  imports: [AuthModule, AdminModule, PaymentsModule],
  controllers: [FinanceController],
  providers: [FinanceReceivablesWorkspaceService, FinanceWorkspaceService, FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService, FinanceAccessService, FinanceShiftsService, FinanceReceivablesService, FinanceShiftCloseService],
  exports: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService, FinanceAccessService, FinanceShiftsService, FinanceReceivablesService, FinanceShiftCloseService],
})
export class FinanceModule {}
