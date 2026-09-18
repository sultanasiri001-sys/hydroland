import { Module } from '@nestjs/common';
import { AdministrativeAffairsFoundationService } from './administrative-affairs-foundation.service';
import { AdministrativeAffairsWorkflowService } from './administrative-affairs-workflow.service';

@Module({
  providers: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService],
  exports: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService],
})
export class AdministrativeAffairsModule {}
