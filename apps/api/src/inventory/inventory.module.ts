import { Module } from '@nestjs/common';
import { InventoryFoundationService } from './inventory-foundation.service';
import { InventoryWorkflowService } from './inventory-workflow.service';

@Module({
  providers: [InventoryFoundationService, InventoryWorkflowService],
  exports: [InventoryFoundationService, InventoryWorkflowService],
})
export class InventoryModule {}
