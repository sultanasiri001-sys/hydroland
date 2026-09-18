import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ApprovalEngineService } from './approval-engine.service';
import { PolicyEngineService } from './policy-engine.service';
import { TrainingEligibilityService } from './training-eligibility.service';
import { TrainingWorkflowService } from './training-workflow.service';

@Module({
  imports: [AuditModule],
  providers: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService, TrainingWorkflowService],
  exports: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService, TrainingWorkflowService, AuditModule],
})
export class GovernanceModule {}
