import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ApprovalEngineService } from './approval-engine.service';
import { PolicyEngineService } from './policy-engine.service';
import { TrainingEligibilityService } from './training-eligibility.service';

@Module({
  imports: [AuditModule],
  providers: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService],
  exports: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService, AuditModule],
})
export class GovernanceModule {}
