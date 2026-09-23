import { Module } from '@nestjs/common';
import { AdministrativeAffairsFoundationService } from './administrative-affairs-foundation.service';
import { AdministrativeAffairsWorkflowService } from './administrative-affairs-workflow.service';
import { AdministrativeAffairsOperationsService } from './administrative-affairs-operations.service';
import { AdministrativeAffairsGovernanceService } from './administrative-affairs-governance.service';
import { AdministrativeAffairsPersistenceService } from './administrative-affairs-persistence.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService, AdministrativeAffairsOperationsService, AdministrativeAffairsGovernanceService, AdministrativeAffairsPersistenceService],
  exports: [AdministrativeAffairsFoundationService, AdministrativeAffairsWorkflowService, AdministrativeAffairsOperationsService, AdministrativeAffairsGovernanceService, AdministrativeAffairsPersistenceService],
})
export class AdministrativeAffairsModule {}
