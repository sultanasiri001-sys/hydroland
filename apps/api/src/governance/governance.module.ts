import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ApprovalEngineService } from './approval-engine.service';
import { PolicyEngineService } from './policy-engine.service';
import { TrainingEligibilityService } from './training-eligibility.service';
import { TrainingWorkflowService } from './training-workflow.service';
import { TrainingOperationsService } from './training-operations.service';
import { TrainingGovernanceService } from './training-governance.service';

@Module({
  imports: [AuditModule],
  providers: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService, TrainingWorkflowService, TrainingOperationsService, TrainingGovernanceService],
  exports: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService, TrainingWorkflowService, TrainingOperationsService, TrainingGovernanceService, AuditModule],
})
export class GovernanceModule {}
