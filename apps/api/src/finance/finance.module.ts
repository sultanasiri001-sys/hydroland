import { InstructorPostingController } from './posting/instructor-posting.controller';
import { InstructorPostingService } from './posting/instructor-posting.service';
import { CenterPayeesController } from './center-payees.controller';
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
import { FinancePeriodCloseService } from './finance-period-close.service';
import { FinanceSettlementService } from './finance-settlement.service';
import { CenterServiceEntitlementService } from '../commerce/center-service-entitlement.service';
import { CenterServiceTransferService } from '../commerce/center-service-transfer.service';
import { CenterServiceTransferController } from './center-service-transfer.controller';
import { CommerceSourceFinanceService } from '../commerce/commerce-source-finance.service';
import { CommerceSourceTransferService } from '../commerce/commerce-source-transfer.service';
import { CommerceSourceFinanceController } from './commerce-source-finance.controller';

@Module({
  imports: [AuthModule, AdminModule, PaymentsModule],
  controllers: [CommerceSourceFinanceController, CenterServiceTransferController, InstructorPostingController, FinanceController, CenterPayeesController],
  providers: [CommerceSourceFinanceService, CommerceSourceTransferService, CenterServiceTransferService, InstructorPostingService, CenterServiceEntitlementService, FinanceReceivablesWorkspaceService, FinanceWorkspaceService, FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService, FinanceAccessService, FinanceShiftsService, FinanceReceivablesService, FinanceShiftCloseService, FinancePeriodCloseService, FinanceSettlementService],
  exports: [CenterServiceEntitlementService, FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService, FinanceAccessService, FinanceShiftsService, FinanceReceivablesService, FinanceShiftCloseService, FinancePeriodCloseService, FinanceSettlementService],
})
export class FinanceModule {}
