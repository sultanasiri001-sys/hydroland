import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TripsModule } from '../trips/trips.module';
import { DiverMasterProfileController } from './diver-master-profile.controller';
import { DiverMasterProfileService } from './diver-master-profile.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [AuthModule, TripsModule, AuditModule],
  controllers: [ProfileController, DiverMasterProfileController],
  providers: [ProfileService, DiverMasterProfileService],
})
export class ProfileModule {}
