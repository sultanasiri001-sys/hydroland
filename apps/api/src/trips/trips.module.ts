import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TripAdminController } from './trip-admin.controller';
import { TripAdminService } from './trip-admin.service';
import { TripCompletionController } from './trip-completion.controller';
import { TripCompletionService } from './trip-completion.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [AuthModule, AdminModule, AuditModule],
  controllers: [TripsController, TripAdminController, TripCompletionController],
  providers: [TripsService, TripAdminService, TripCompletionService],
})
export class TripsModule {}
