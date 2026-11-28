import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EquipmentInspectionService } from '../trips/equipment-inspection.service';
import { PolicyControlService } from '../trips/policy-control.service';
import { AssetPassportsController } from './asset-passports.controller';
import { AssetPassportsService } from './asset-passports.service';

// The two native evidence readers are stateless; importing TripsModule would
// unnecessarily start its schedulers for a passport-only consumer.
@Module({ imports: [AuthModule, AuditModule], controllers: [AssetPassportsController],
  providers: [AssetPassportsService, EquipmentInspectionService, PolicyControlService], exports: [AssetPassportsService] })
export class AssetPassportsModule {}
