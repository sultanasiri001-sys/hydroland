import { Module } from '@nestjs/common';
import { ResearchMarketFoundationService } from './research-market-foundation.service';
import { ResearchMarketWorkflowService } from './research-market-workflow.service';
import { ResearchMarketOperationsService } from './research-market-operations.service';
import { ResearchMarketGovernanceService } from './research-market-governance.service';
@Module({ providers:[ResearchMarketFoundationService, ResearchMarketWorkflowService, ResearchMarketOperationsService, ResearchMarketGovernanceService], exports:[ResearchMarketFoundationService, ResearchMarketWorkflowService, ResearchMarketOperationsService, ResearchMarketGovernanceService] })
export class ResearchMarketModule {}
