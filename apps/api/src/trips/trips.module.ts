import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BoatComplianceController } from './boat-compliance.controller';
import { BoatComplianceService } from './boat-compliance.service';
import { BookingParticipantService } from './booking-participant.service';
import { CalendarAllocationController } from './calendar-allocation.controller';
import { CalendarAllocationService } from './calendar-allocation.service';
import { CalendarResourceService } from './calendar-resource.service';
import { CrewAssignmentController } from './crew-assignment.controller';
import { CrewAssignmentService } from './crew-assignment.service';
import { CrewEscalationScheduler } from './crew-escalation.scheduler';
import { EquipmentInspectionController } from './equipment-inspection.controller';
import { EquipmentInspectionService } from './equipment-inspection.service';
import { EquipmentInventoryController } from './equipment-inventory.controller';
import { EquipmentInventoryService } from './equipment-inventory.service';
import { InventoryStocktakeController } from './inventory-stocktake.controller';
import { InventoryStocktakeService } from './inventory-stocktake.service';
import { OperationalClearanceScheduler } from './operational-clearance.scheduler';
import { OperationalClearanceService } from './operational-clearance.service';
import { PolicyControlController } from './policy-control.controller';
import { PolicyControlService } from './policy-control.service';
import { TripAdminController } from './trip-admin.controller';
import { TripAdminService } from './trip-admin.service';
import { TripComplianceController } from './trip-compliance.controller';
import { TripComplianceService } from './trip-compliance.service';
import { TripCompletionController } from './trip-completion.controller';
import { TripCompletionService } from './trip-completion.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { WeatherGateController } from './weather-gate.controller';
import { WeatherGateService } from './weather-gate.service';

@Module({
  imports: [AuthModule, AdminModule, AuditModule, NotificationsModule],
  controllers: [TripsController,TripAdminController,TripCompletionController,WeatherGateController,CalendarAllocationController,CrewAssignmentController,PolicyControlController,BoatComplianceController,TripComplianceController,EquipmentInspectionController,EquipmentInventoryController,InventoryStocktakeController],
  providers: [TripsService,TripAdminService,TripCompletionService,WeatherGateService,CalendarAllocationService,CalendarResourceService,CrewAssignmentService,CrewEscalationScheduler,OperationalClearanceService,OperationalClearanceScheduler,BookingParticipantService,PolicyControlService,BoatComplianceService,TripComplianceService,EquipmentInspectionService,EquipmentInventoryService,InventoryStocktakeService],
  exports: [PolicyControlService,BoatComplianceService,TripComplianceService,EquipmentInspectionService,EquipmentInventoryService,InventoryStocktakeService],
})
export class TripsModule {}
