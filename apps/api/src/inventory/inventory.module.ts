import { Module } from '@nestjs/common';
import { InventoryFoundationService } from './inventory-foundation.service';

@Module({
  providers: [InventoryFoundationService],
  exports: [InventoryFoundationService],
})
export class InventoryModule {}
