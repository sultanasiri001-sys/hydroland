import { Module } from '@nestjs/common';
import { FacilitiesMaintenanceFoundationService } from './facilities-maintenance-foundation.service';
import { FacilitiesMaintenanceWorkflowService } from './facilities-maintenance-workflow.service';
import { FacilitiesMaintenanceOperationsService } from './facilities-maintenance-operations.service';

@Module({
  providers: [FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService, FacilitiesMaintenanceOperationsService],
  exports: [FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService, FacilitiesMaintenanceOperationsService],
})
export class FacilitiesMaintenanceModule {}
