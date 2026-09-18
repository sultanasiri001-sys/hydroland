import { Module } from '@nestjs/common';
import { FacilitiesMaintenanceFoundationService } from './facilities-maintenance-foundation.service';
import { FacilitiesMaintenanceWorkflowService } from './facilities-maintenance-workflow.service';

@Module({
  providers: [FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService],
  exports: [FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService],
})
export class FacilitiesMaintenanceModule {}
