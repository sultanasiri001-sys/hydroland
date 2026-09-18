import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SafetyController } from './safety.controller';
import { SafetyReviewService } from './safety-review.service';
import { SafetyService } from './safety.service';
import { SafetyComplianceRiskFoundationService } from './safety-compliance-risk-foundation.service';
import { SafetyComplianceRiskWorkflowService } from './safety-compliance-risk-workflow.service';
import { SafetyComplianceRiskOperationsService } from './safety-compliance-risk-operations.service';
import { SafetyComplianceRiskGovernanceService } from './safety-compliance-risk-governance.service';

@Module({
  imports: [AuthModule, AdminModule, AuditModule],
  controllers: [SafetyController],
  providers: [SafetyService, SafetyReviewService, SafetyComplianceRiskFoundationService, SafetyComplianceRiskWorkflowService, SafetyComplianceRiskOperationsService, SafetyComplianceRiskGovernanceService],
  exports: [SafetyComplianceRiskFoundationService, SafetyComplianceRiskWorkflowService, SafetyComplianceRiskOperationsService, SafetyComplianceRiskGovernanceService],
})
export class SafetyModule {}
