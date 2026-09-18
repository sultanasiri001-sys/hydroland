import { Module } from '@nestjs/common';
import { ExecutiveGovernanceFoundationService } from './executive-governance-foundation.service';
import { ExecutiveGovernanceWorkflowService } from './executive-governance-workflow.service';
import { ExecutiveGovernanceOperationsService } from './executive-governance-operations.service';

@Module({
  providers: [ExecutiveGovernanceFoundationService, ExecutiveGovernanceWorkflowService, ExecutiveGovernanceOperationsService],
  exports: [ExecutiveGovernanceFoundationService, ExecutiveGovernanceWorkflowService, ExecutiveGovernanceOperationsService],
})
export class ExecutiveGovernanceModule {}
