import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { TripAdminController } from './trip-admin.controller';
import { TripAdminService } from './trip-admin.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [TripsController, TripAdminController],
  providers: [TripsService, TripAdminService],
})
export class TripsModule {}
