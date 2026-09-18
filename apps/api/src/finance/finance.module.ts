import { Module } from '@nestjs/common';
import { FinanceFoundationService } from './finance-foundation.service';
import { FinanceWorkflowService } from './finance-workflow.service';
import { FinanceOperationsService } from './finance-operations.service';
import { FinanceGovernanceService } from './finance-governance.service';
import { FinancePersistenceService } from './finance-persistence.service';

@Module({
  providers: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService],
  exports: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService, FinancePersistenceService],
})
export class FinanceModule {}
