import { Module } from '@nestjs/common';
import { FinanceFoundationService } from './finance-foundation.service';
import { FinanceWorkflowService } from './finance-workflow.service';
import { FinanceOperationsService } from './finance-operations.service';
import { FinanceGovernanceService } from './finance-governance.service';

@Module({
  providers: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService],
  exports: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService, FinanceGovernanceService],
})
export class FinanceModule {}
