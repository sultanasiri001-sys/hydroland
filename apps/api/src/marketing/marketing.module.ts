import { Module } from '@nestjs/common';
import { MarketingFoundationService } from './marketing-foundation.service';
import { MarketingWorkflowService } from './marketing-workflow.service';
import { MarketingOperationsService } from './marketing-operations.service';

@Module({
  providers: [MarketingFoundationService, MarketingWorkflowService, MarketingOperationsService],
  exports: [MarketingFoundationService, MarketingWorkflowService, MarketingOperationsService],
})
export class MarketingModule {}
