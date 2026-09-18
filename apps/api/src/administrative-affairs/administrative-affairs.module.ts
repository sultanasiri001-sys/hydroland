import { Module } from '@nestjs/common';
import { AdministrativeAffairsFoundationService } from './administrative-affairs-foundation.service';
import { AdministrativeAffairsWorkflowService } from './administrative-affairs-workflow.service';
import { AdministrativeAffairsOperationsService } from './administrative-affairs-operations.service';
import { AdministrativeAffairsGovernanceService } from './administrative-affairs-governance.service';

@Module({
  providers: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService, AdministrativeAffairsOperationsService, AdministrativeAffairsGovernanceService],
  exports: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService, AdministrativeAffairsOperationsService, AdministrativeAffairsGovernanceService],
})
export class AdministrativeAffairsModule {}
