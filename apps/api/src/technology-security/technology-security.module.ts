import { Module } from '@nestjs/common';
import { TechnologySecurityFoundationService } from './technology-security-foundation.service';
import { TechnologySecurityWorkflowService } from './technology-security-workflow.service';
import { TechnologySecurityOperationsService } from './technology-security-operations.service';
import { TechnologySecurityGovernanceService } from './technology-security-governance.service';
import { AuditModule } from '../audit/audit.module';
import { StaffingIamService } from './staffing-iam.service';
import { AuthModule } from '../auth/auth.module';
import { TechnologyRequestService } from './technology-request.service';
import { TechnologyRequestController } from './technology-request.controller';
import { AdminModule } from '../admin/admin.module';
import { TechnologyAgentAccessService } from './technology-agent-access.service';
import { TechnologyAgentAccessController } from './technology-agent-access.controller';

@Module({
  imports: [AuditModule,AuthModule,AdminModule],
  controllers: [TechnologyRequestController,TechnologyAgentAccessController],
  providers: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService, TechnologySecurityGovernanceService,StaffingIamService,TechnologyRequestService,TechnologyAgentAccessService],
  exports: [TechnologySecurityFoundationService, TechnologySecurityWorkflowService, TechnologySecurityOperationsService, TechnologySecurityGovernanceService,StaffingIamService],
})
export class TechnologySecurityModule {}
