import { Module } from '@nestjs/common';
import { ExecutiveGovernanceFoundationService } from './executive-governance-foundation.service';
import { ExecutiveGovernanceWorkflowService } from './executive-governance-workflow.service';

@Module({
  providers: [ExecutiveGovernanceFoundationService, ExecutiveGovernanceWorkflowService],
  exports: [ExecutiveGovernanceFoundationService, ExecutiveGovernanceWorkflowService],
})
export class ExecutiveGovernanceModule {}
