import { Module } from '@nestjs/common';
import { ResearchMarketFoundationService } from './research-market-foundation.service';
import { ResearchMarketWorkflowService } from './research-market-workflow.service';
@Module({ providers:[ResearchMarketFoundationService, ResearchMarketWorkflowService], exports:[ResearchMarketFoundationService, ResearchMarketWorkflowService] })
export class ResearchMarketModule {}
