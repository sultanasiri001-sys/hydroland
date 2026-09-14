import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CalendarAllocationController } from './calendar-allocation.controller';
import { CalendarAllocationService } from './calendar-allocation.service';
import { CrewAssignmentController } from './crew-assignment.controller';
import { CrewAssignmentService } from './crew-assignment.service';
import { TripAdminController } from './trip-admin.controller';
import { TripAdminService } from './trip-admin.service';
import { TripCompletionController } from './trip-completion.controller';
import { TripCompletionService } from './trip-completion.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { WeatherGateController } from './weather-gate.controller';
import { WeatherGateService } from './weather-gate.service';

@Module({
  imports: [AuthModule, AdminModule, AuditModule],
  controllers: [
    TripsController,
    TripAdminController,
    TripCompletionController,
    WeatherGateController,
    CalendarAllocationController,
    CrewAssignmentController,
  ],
  providers: [
    TripsService,
    TripAdminService,
    TripCompletionService,
    WeatherGateService,
    CalendarAllocationService,
    CrewAssignmentService,
  ],
})
export class TripsModule {}
