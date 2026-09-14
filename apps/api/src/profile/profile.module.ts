import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DiverMasterProfileController } from './diver-master-profile.controller';
import { DiverMasterProfileService } from './diver-master-profile.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController, DiverMasterProfileController],
  providers: [ProfileService, DiverMasterProfileService],
})
export class ProfileModule {}
