import { Module } from '@nestjs/common';
import { ResearchMarketFoundationService } from './research-market-foundation.service';
@Module({ providers:[ResearchMarketFoundationService], exports:[ResearchMarketFoundationService] })
export class ResearchMarketModule {}
