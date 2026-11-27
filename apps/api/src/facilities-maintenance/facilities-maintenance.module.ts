import { Module } from '@nestjs/common';
import { FacilitiesMaintenanceFoundationService } from './facilities-maintenance-foundation.service';
import { FacilitiesMaintenanceWorkflowService } from './facilities-maintenance-workflow.service';
import { FacilitiesMaintenanceOperationsService } from './facilities-maintenance-operations.service';
import { FacilitiesMaintenanceGovernanceService } from './facilities-maintenance-governance.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { MaintenanceOrganizationsController, MaintenanceWorkOrderController } from './maintenance-work-order.controller';
import { MaintenanceWorkOrderService } from './maintenance-work-order.service';

@Module({
  imports:[AuthModule,AuditModule],
  controllers:[MaintenanceOrganizationsController,MaintenanceWorkOrderController],
  providers: [MaintenanceWorkOrderService,FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService, FacilitiesMaintenanceOperationsService, FacilitiesMaintenanceGovernanceService],
  exports: [FacilitiesMaintenanceFoundationService, FacilitiesMaintenanceWorkflowService, FacilitiesMaintenanceOperationsService, FacilitiesMaintenanceGovernanceService],
})
export class FacilitiesMaintenanceModule {}
