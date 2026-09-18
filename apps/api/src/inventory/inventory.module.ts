import { Module } from '@nestjs/common';
import { InventoryFoundationService } from './inventory-foundation.service';
import { InventoryWorkflowService } from './inventory-workflow.service';
import { InventoryOperationsService } from './inventory-operations.service';
import { InventoryGovernanceService } from './inventory-governance.service';

@Module({
  providers: [InventoryFoundationService, InventoryWorkflowService, InventoryOperationsService, InventoryGovernanceService],
  exports: [InventoryFoundationService, InventoryWorkflowService, InventoryOperationsService, InventoryGovernanceService],
})
export class InventoryModule {}
