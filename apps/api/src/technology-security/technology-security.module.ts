import { Module } from '@nestjs/common';
import { TechnologySecurityFoundationService } from './technology-security-foundation.service';
import { TechnologySecurityWorkflowService } from './technology-security-workflow.service';
import { TechnologySecurityOperationsService } from './technology-security-operations.service';
import { TechnologySecurityGovernanceService } from './technology-security-governance.service';
import { AuditModule } from '../audit/audit.module';
import { StaffingIamService } from './staffing-iam.service';

@Module({
  imports: [AuditModule],
  providers: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService, TechnologySecurityGovernanceService,StaffingIamService],
  exports: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService, TechnologySecurityGovernanceService,StaffingIamService],
})
export class TechnologySecurityModule {}
