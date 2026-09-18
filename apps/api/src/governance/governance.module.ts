import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ApprovalEngineService } from './approval-engine.service';
import { PolicyEngineService } from './policy-engine.service';
import { TrainingEligibilityService } from './training-eligibility.service';
import { TrainingWorkflowService } from './training-workflow.service';
import { TrainingOperationsService } from './training-operations.service';
import { TrainingGovernanceService } from './training-governance.service';
import { TrainingRepositoryService } from './training-repository.service';
import { TrainingController } from './training.controller';

@Module({
  imports: [AuditModule],
  controllers: [TrainingController],
  providers: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService, TrainingWorkflowService, TrainingOperationsService, TrainingGovernanceService, TrainingRepositoryService],
  exports: [PolicyEngineService, ApprovalEngineService, TrainingEligibilityService, TrainingWorkflowService, TrainingOperationsService, TrainingGovernanceService, TrainingRepositoryService, AuditModule],
})
export class GovernanceModule {}
