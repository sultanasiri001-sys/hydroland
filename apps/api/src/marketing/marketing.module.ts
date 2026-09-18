import { Module } from '@nestjs/common';
import { MarketingFoundationService } from './marketing-foundation.service';

@Module({
  providers: [MarketingFoundationService],
  exports: [MarketingFoundationService],
})
export class MarketingModule {}
