import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { DatabaseModule } from '../database/database.module';
import { InternalResearchService } from './internal-research.service';
import { InternalResearchController, InternalResearchReviewsController } from './internal-research.controller';
import { ResearchMarketFoundationService } from './research-market-foundation.service';
import { ResearchMarketWorkflowService } from './research-market-workflow.service';
import { ResearchMarketOperationsService } from './research-market-operations.service';
import { ResearchMarketGovernanceService } from './research-market-governance.service';
@Module({ imports:[DatabaseModule,AuthModule,AdminModule], controllers:[InternalResearchController,InternalResearchReviewsController], providers:[InternalResearchService,ResearchMarketFoundationService, ResearchMarketWorkflowService, ResearchMarketOperationsService, ResearchMarketGovernanceService], exports:[ResearchMarketFoundationService, ResearchMarketWorkflowService, ResearchMarketOperationsService, ResearchMarketGovernanceService] })
export class ResearchMarketModule {}
