import { Module } from '@nestjs/common';
import { FacilitiesMaintenanceFoundationService } from './facilities-maintenance-foundation.service';
import { FacilitiesMaintenanceWorkflowService } from './facilities-maintenance-workflow.service';
import { FacilitiesMaintenanceOperationsService } from './facilities-maintenance-operations.service';
import { FacilitiesMaintenanceGovernanceService } from './facilities-maintenance-governance.service';

@Module({
  providers: [FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService, FacilitiesMaintenanceOperationsService, FacilitiesMaintenanceGovernanceService],
  exports: [FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService, FacilitiesMaintenanceOperationsService, FacilitiesMaintenanceGovernanceService],
})
export class FacilitiesMaintenanceModule {}
