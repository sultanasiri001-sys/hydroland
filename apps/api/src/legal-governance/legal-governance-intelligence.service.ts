import { Injectable } from '@nestjs/common';
import { InsurancePolicy, InsuranceStatus, LegalDocument, LegalDocumentStatus, LegalObligation } from './legal-governance.domain';

export interface LegalGovernanceSnapshot {
  activeDocuments: number; expiringDocuments: number; overdueObligations: number;
  activeInsurancePolicies: number; expiringInsurancePolicies: number; inactiveRequiredCoverage: number;
  alerts: string[]; generatedAt: Date;
}

@Injectable()
export class LegalGovernanceIntelligenceService {
  snapshot(documents: LegalDocument[], obligations: LegalObligation[], policies: InsurancePolicy[], now = new Date(), horizonDays = 30): LegalGovernanceSnapshot {
    const horizon = new Date(now.getTime() + horizonDays * 86400000);
    const activeDocuments = documents.filter(d => d.status === LegalDocumentStatus.ACTIVE).length;
    const expiringDocuments = documents.filter(d => d.status === LegalDocumentStatus.ACTIVE && d.expiresAt && d.expiresAt > now && d.expiresAt <= horizon).length;
    const overdueObligations = obligations.filter(o => !o.fulfilled && o.dueAt && o.dueAt <= now).length;
    const activeInsurancePolicies = policies.filter(p => p.status === InsuranceStatus.ACTIVE && p.startsAt <= now && p.expiresAt > now).length;
    const expiringInsurancePolicies = policies.filter(p => p.status === InsuranceStatus.ACTIVE && p.expiresAt > now && p.expiresAt <= horizon).length;
    const inactiveRequiredCoverage = policies.filter(p => p.status !== InsuranceStatus.ACTIVE || p.startsAt > now || p.expiresAt <= now).length;
    const alerts: string[] = [];
    if (expiringDocuments) alerts.push('EXPIRING_LEGAL_DOCUMENT_REVIEW');
    if (overdueObligations) alerts.push('OVERDUE_LEGAL_OBLIGATION_ESCALATION');
    if (expiringInsurancePolicies) alerts.push('INSURANCE_RENEWAL_REVIEW');
    if (inactiveRequiredCoverage) alerts.push('INSURANCE_COVERAGE_REMEDIATION');
    return { activeDocuments, expiringDocuments, overdueObligations, activeInsurancePolicies, expiringInsurancePolicies, inactiveRequiredCoverage, alerts, generatedAt: now };
  }

  automationSignals(snapshot: LegalGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.expiringDocuments) signals.push('CREATE_LEGAL_DOCUMENT_RENEWAL_FOLLOWUP');
    if (snapshot.overdueObligations) signals.push('ESCALATE_OVERDUE_LEGAL_OBLIGATIONS');
    if (snapshot.expiringInsurancePolicies) signals.push('CREATE_INSURANCE_RENEWAL_FOLLOWUP');
    if (snapshot.inactiveRequiredCoverage) signals.push('ESCALATE_INSURANCE_COVERAGE_GAP');
    if (!signals.length) signals.push('MONITOR_LEGAL_GOVERNANCE');
    return signals;
  }
}
