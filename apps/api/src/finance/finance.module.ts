import { Module } from '@nestjs/common';
import { FinanceFoundationService } from './finance-foundation.service';
import { FinanceWorkflowService } from './finance-workflow.service';
import { FinanceOperationsService } from './finance-operations.service';

@Module({
  providers: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService],
  exports: [FinanceFoundationService, FinanceWorkflowService, FinanceOperationsService],
})
export class FinanceModule {}
