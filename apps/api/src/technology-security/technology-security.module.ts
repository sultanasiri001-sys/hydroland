import { Module } from '@nestjs/common';
import { TechnologySecurityFoundationService } from './technology-security-foundation.service';
import { TechnologySecurityWorkflowService } from './technology-security-workflow.service';
import { TechnologySecurityOperationsService } from './technology-security-operations.service';
import { TechnologySecurityGovernanceService } from './technology-security-governance.service';

@Module({
  providers: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService, TechnologySecurityGovernanceService],
  exports: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService, TechnologySecurityGovernanceService],
})
export class TechnologySecurityModule {}
