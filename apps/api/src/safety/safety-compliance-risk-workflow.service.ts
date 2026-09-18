import { BadRequestException, Injectable } from '@nestjs/common';
import { ComplianceAssessment, ComplianceRequirement, RiskRecord } from './safety-compliance-risk.domain';
import { SafetyComplianceRiskFoundationService } from './safety-compliance-risk-foundation.service';

export type SafetyApprovalStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';
export interface SafetyApprovalRequest {
  id: string;
  subjectType: 'RISK' | 'COMPLIANCE_ASSESSMENT';
  subjectId: string;
  organizationId: string;
  status: SafetyApprovalStatus;
  requestedBy: string;
  approvedBy?: string;
}

@Injectable()
export class SafetyComplianceRiskWorkflowService {
  constructor(private readonly foundation: SafetyComplianceRiskFoundationService) {}

  requestRiskApproval(record: RiskRecord, requestedBy: string): SafetyApprovalRequest {
    this.foundation.validateRisk(record);
    if (!requestedBy) throw new BadRequestException('Requester is required.');
    return { id: `risk-${record.id}`, subjectType: 'RISK', subjectId: record.id, organizationId: record.organizationId, status: 'REQUESTED', requestedBy };
  }

  requestComplianceApproval(assessment: ComplianceAssessment, requirement: ComplianceRequirement, requestedBy: string): SafetyApprovalRequest {
    this.foundation.validateRequirement(requirement);
    this.foundation.validateAssessment(assessment, requirement);
    if (!requestedBy) throw new BadRequestException('Requester is required.');
    return { id: `compliance-${assessment.id}`, subjectType: 'COMPLIANCE_ASSESSMENT', subjectId: assessment.id, organizationId: assessment.organizationId, status: 'REQUESTED', requestedBy };
  }

  decide(request: SafetyApprovalRequest, approverId: string, decision: 'APPROVED' | 'REJECTED'): SafetyApprovalRequest {
    if (request.status !== 'REQUESTED') throw new BadRequestException('Only requested approvals can be decided.');
    if (!approverId) throw new BadRequestException('Approver is required.');
    if (approverId === request.requestedBy) throw new BadRequestException('Requester cannot approve their own request.');
    return { ...request, status: decision, approvedBy: approverId };
  }
}
