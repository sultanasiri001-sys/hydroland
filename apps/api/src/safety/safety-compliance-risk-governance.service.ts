import { Injectable } from '@nestjs/common';
import { ComplianceAssessment, RiskRecord } from './safety-compliance-risk.domain';

export interface SafetyGovernanceSnapshot {
  activeRisks: number;
  criticalRisks: number;
  highRisks: number;
  nonCompliantAssessments: number;
  reviewRequiredAssessments: number;
  alerts: string[];
  generatedAt: Date;
}

@Injectable()
export class SafetyComplianceRiskGovernanceService {
  snapshot(risks: RiskRecord[], assessments: ComplianceAssessment[]): SafetyGovernanceSnapshot {
    const active = risks.filter((risk) => risk.active);
    const criticalRisks = active.filter((risk) => risk.level === 'CRITICAL').length;
    const highRisks = active.filter((risk) => risk.level === 'HIGH').length;
    const nonCompliantAssessments = assessments.filter((assessment) => assessment.status === 'NON_COMPLIANT').length;
    const reviewRequiredAssessments = assessments.filter((assessment) => assessment.status === 'REVIEW_REQUIRED').length;
    const alerts: string[] = [];
    if (criticalRisks) alerts.push('CRITICAL_RISK_ESCALATION');
    if (highRisks) alerts.push('HIGH_RISK_REVIEW');
    if (nonCompliantAssessments) alerts.push('NON_COMPLIANCE_REMEDIATION_REQUIRED');
    if (reviewRequiredAssessments) alerts.push('COMPLIANCE_REVIEW_REQUIRED');
    return { activeRisks: active.length, criticalRisks, highRisks, nonCompliantAssessments, reviewRequiredAssessments, alerts, generatedAt: new Date() };
  }

  automationSignals(snapshot: SafetyGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.criticalRisks) signals.push('REQUIRE_EXECUTIVE_SAFETY_REVIEW');
    if (snapshot.highRisks) signals.push('CREATE_RISK_TREATMENT_FOLLOWUP');
    if (snapshot.nonCompliantAssessments) signals.push('CREATE_COMPLIANCE_REMEDIATION');
    if (snapshot.reviewRequiredAssessments) signals.push('SCHEDULE_COMPLIANCE_REVIEW');
    return signals;
  }
}
