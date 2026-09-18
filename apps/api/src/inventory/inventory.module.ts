import { Module } from '@nestjs/common';
import { InventoryFoundationService } from './inventory-foundation.service';
import { InventoryWorkflowService } from './inventory-workflow.service';
import { InventoryOperationsService } from './inventory-operations.service';

@Module({
  providers: [InventoryFoundationService, InventoryWorkflowService, InventoryOperationsService],
  exports: [InventoryFoundationService, InventoryWorkflowService, InventoryOperationsService],
})
export class InventoryModule {}
