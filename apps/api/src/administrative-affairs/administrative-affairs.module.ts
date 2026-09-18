import { Module } from '@nestjs/common';
import { AdministrativeAffairsFoundationService } from './administrative-affairs-foundation.service';

@Module({
  providers: [AdministrativeAffairsFoundationService],
  exports: [AdministrativeAffairsFoundationService],
})
export class AdministrativeAffairsModule {}
