import { BadRequestException, Injectable } from '@nestjs/common';
import { ComplianceAssessment, ComplianceRequirement, RiskRecord, classifyRisk } from './safety-compliance-risk.domain';

@Injectable()
export class SafetyComplianceRiskFoundationService {
  validateRisk(record: RiskRecord): RiskRecord {
    if (!record.id || !record.organizationId || !record.sourceType || !record.sourceId || !record.hazard) throw new BadRequestException('Risk identity and source are required.');
    const expected = classifyRisk(record.likelihood, record.severity);
    if (record.level !== expected) throw new BadRequestException('Risk level does not match likelihood and severity.');
    return record;
  }

  validateRequirement(requirement: ComplianceRequirement): ComplianceRequirement {
    if (!requirement.id || !requirement.organizationId || !requirement.code || !requirement.title || !requirement.sourceAuthority) throw new BadRequestException('Compliance requirement identity is incomplete.');
    return requirement;
  }

  validateAssessment(assessment: ComplianceAssessment, requirement: ComplianceRequirement): ComplianceAssessment {
    if (assessment.requirementId !== requirement.id || assessment.organizationId !== requirement.organizationId) throw new BadRequestException('Compliance assessment scope mismatch.');
    if (!assessment.subjectType || !assessment.subjectId) throw new BadRequestException('Compliance assessment subject is required.');
    if (assessment.status === 'COMPLIANT' && assessment.evidenceReferences.length === 0) throw new BadRequestException('Compliance evidence is required for a compliant assessment.');
    return assessment;
  }
}
