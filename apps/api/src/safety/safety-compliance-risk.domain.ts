export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComplianceStatus = 'COMPLIANT' | 'REVIEW_REQUIRED' | 'NON_COMPLIANT';

export interface RiskRecord {
  id: string;
  organizationId: string;
  sourceType: string;
  sourceId: string;
  hazard: string;
  likelihood: number;
  severity: number;
  level: RiskLevel;
  controls: string[];
  active: boolean;
}

export interface ComplianceRequirement {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  sourceAuthority: string;
  active: boolean;
}

export interface ComplianceAssessment {
  id: string;
  requirementId: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  status: ComplianceStatus;
  evidenceReferences: string[];
}

export function classifyRisk(likelihood: number, severity: number): RiskLevel {
  if (!Number.isInteger(likelihood) || !Number.isInteger(severity) || likelihood < 1 || likelihood > 5 || severity < 1 || severity > 5) throw new Error('Risk likelihood and severity must be integers from 1 to 5.');
  const score = likelihood * severity;
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  return 'LOW';
}
