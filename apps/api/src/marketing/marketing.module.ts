import { Module } from '@nestjs/common';
import { MarketingFoundationService } from './marketing-foundation.service';
import { MarketingWorkflowService } from './marketing-workflow.service';
import { MarketingOperationsService } from './marketing-operations.service';
import { MarketingGovernanceService } from './marketing-governance.service';

@Module({
  providers: [MarketingFoundationService, MarketingWorkflowService, MarketingOperationsService, MarketingGovernanceService],
  exports: [MarketingFoundationService, MarketingWorkflowService, MarketingOperationsService, MarketingGovernanceService],
})
export class MarketingModule {}
