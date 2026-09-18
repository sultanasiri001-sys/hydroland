import { Module } from '@nestjs/common';
import { MarketingFoundationService } from './marketing-foundation.service';
import { MarketingWorkflowService } from './marketing-workflow.service';

@Module({
  providers: [MarketingFoundationService, MarketingWorkflowService],
  exports: [MarketingFoundationService, MarketingWorkflowService],
})
export class MarketingModule {}
