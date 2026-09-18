import { Module } from '@nestjs/common';
import { ResearchMarketFoundationService } from './research-market-foundation.service';
import { ResearchMarketWorkflowService } from './research-market-workflow.service';
import { ResearchMarketOperationsService } from './research-market-operations.service';
@Module({ providers:[ResearchMarketFoundationService, ResearchMarketWorkflowService, ResearchMarketOperationsService], exports:[ResearchMarketFoundationService, ResearchMarketWorkflowService, ResearchMarketOperationsService] })
export class ResearchMarketModule {}
