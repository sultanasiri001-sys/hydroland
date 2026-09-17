import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CompliancePersistenceService } from './compliance-persistence.service';
import { SafetyController } from './safety.controller';
import { SafetyReviewService } from './safety-review.service';
import { SafetyService } from './safety.service';

@Module({
  imports: [AuthModule, AdminModule, AuditModule],
  controllers: [SafetyController],
  providers: [SafetyService, SafetyReviewService, CompliancePersistenceService],
})
export class SafetyModule {}
