import { Module } from '@nestjs/common';
import { AdministrativeAffairsFoundationService } from './administrative-affairs-foundation.service';
import { AdministrativeAffairsWorkflowService } from './administrative-affairs-workflow.service';
import { AdministrativeAffairsOperationsService } from './administrative-affairs-operations.service';

@Module({
  providers: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService, AdministrativeAffairsOperationsService],
  exports: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService, AdministrativeAffairsOperationsService],
})
export class AdministrativeAffairsModule {}
