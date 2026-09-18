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

@Module({
  imports: [AuthModule, AdminModule, PaymentsModule],
  controllers: [FinanceController],
  providers: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService],
  exports: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService],
})
export class FinanceModule {}
