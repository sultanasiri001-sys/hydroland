import { Module } from '@nestjs/common';
import { ExecutiveGovernanceFoundationService } from './executive-governance-foundation.service';
import { ExecutiveGovernanceWorkflowService } from './executive-governance-workflow.service';
import { ExecutiveGovernanceOperationsService } from './executive-governance-operations.service';
import { ExecutiveGovernanceIntelligenceService } from './executive-governance-intelligence.service';

@Module({
  providers: [ExecutiveGovernanceFoundationService, ExecutiveGovernanceWorkflowService, ExecutiveGovernanceOperationsService, ExecutiveGovernanceIntelligenceService],
  exports: [ExecutiveGovernanceFoundationService, ExecutiveGovernanceWorkflowService, ExecutiveGovernanceOperationsService, ExecutiveGovernanceIntelligenceService],
})
export class ExecutiveGovernanceModule {}
