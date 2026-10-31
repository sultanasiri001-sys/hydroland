import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { WarehouseLocationController } from './warehouse-location.controller';
import { WarehouseLocationService } from './warehouse-location.service';
import { InventoryFoundationService } from './inventory-foundation.service';
import { InventoryWorkflowService } from './inventory-workflow.service';
import { InventoryOperationsService } from './inventory-operations.service';
import { InventoryGovernanceService } from './inventory-governance.service';

@Module({
  imports:[DatabaseModule,AuthModule,AdminModule],
  controllers:[WarehouseLocationController],
  providers: [WarehouseLocationService,InventoryFoundationService, InventoryWorkflowService, InventoryOperationsService, InventoryGovernanceService],
  exports: [InventoryFoundationService, InventoryWorkflowService, InventoryOperationsService, InventoryGovernanceService],
})
export class InventoryModule {}
