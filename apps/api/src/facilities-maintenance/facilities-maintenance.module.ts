import { Module } from '@nestjs/common';
import { FacilitiesMaintenanceFoundationService } from './facilities-maintenance-foundation.service';

@Module({
  providers: [FacilitiesMaintenanceFoundationService],
  exports: [FacilitiesMaintenanceFoundationService],
})
export class FacilitiesMaintenanceModule {}
