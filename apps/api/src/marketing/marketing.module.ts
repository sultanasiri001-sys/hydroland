import { Module } from '@nestjs/common';
import { MarketingFoundationService } from './marketing-foundation.service';
import { MarketingWorkflowService } from './marketing-workflow.service';
import { MarketingOperationsService } from './marketing-operations.service';
import { MarketingGovernanceService } from './marketing-governance.service';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { DatabaseModule } from '../database/database.module';
import { MarketingDraftController } from './marketing-draft.controller';
import { MarketingDraftService } from './marketing-draft.service';
import { CampaignLifecycleController } from './campaign-lifecycle.controller';
import { CampaignLifecycleService } from './campaign-lifecycle.service';

@Module({
  imports:[DatabaseModule,AuthModule,AdminModule],
  controllers:[MarketingDraftController,CampaignLifecycleController],
  providers: [MarketingDraftService,CampaignLifecycleService,MarketingFoundationService, MarketingWorkflowService, MarketingOperationsService, MarketingGovernanceService],
  exports: [MarketingFoundationService, MarketingWorkflowService, MarketingOperationsService, MarketingGovernanceService],
})
export class MarketingModule {}
