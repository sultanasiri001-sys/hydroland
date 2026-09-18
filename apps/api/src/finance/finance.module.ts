import { Module } from '@nestjs/common';
import { FinanceFoundationService } from './finance-foundation.service';
import { FinanceWorkflowService } from './finance-workflow.service';

@Module({
  providers: [FinanceFoundationService, FinanceWorkflowService],
  exports: [FinanceFoundationService, FinanceWorkflowService],
})
export class FinanceModule {}
