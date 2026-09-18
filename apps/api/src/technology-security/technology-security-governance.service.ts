import { Injectable } from '@nestjs/common';
import { CybersecurityFinding, TechnologyAsset, TechnologyService } from './technology-security.domain';

export interface TechnologySecurityGovernanceSnapshot {
  activeAssets: number;
  criticalAssets: number;
  activeServices: number;
  openFindings: number;
  mitigatingFindings: number;
  highFindings: number;
  criticalFindings: number;
  acceptedRisks: number;
  alerts: string[];
  generatedAt: Date;
}

@Injectable()
export class TechnologySecurityGovernanceService {
  snapshot(assets: TechnologyAsset[], services: TechnologyService[], findings: CybersecurityFinding[]): TechnologySecurityGovernanceSnapshot {
    const activeAssets = assets.filter((item) => item.active).length;
    const criticalAssets = assets.filter((item) => item.active && item.criticality === 'CRITICAL').length;
    const activeServices = services.filter((item) => item.active).length;
    const openFindings = findings.filter((item) => item.status === 'OPEN').length;
    const mitigatingFindings = findings.filter((item) => item.status === 'MITIGATING').length;
    const highFindings = findings.filter((item) => (item.status === 'OPEN' || item.status === 'MITIGATING') && item.severity === 'HIGH').length;
    const criticalFindings = findings.filter((item) => (item.status === 'OPEN' || item.status === 'MITIGATING') && item.severity === 'CRITICAL').length;
    const acceptedRisks = findings.filter((item) => item.status === 'ACCEPTED').length;
    const alerts: string[] = [];
    if (criticalFindings) alerts.push('CRITICAL_CYBERSECURITY_ESCALATION');
    if (highFindings) alerts.push('HIGH_CYBERSECURITY_REVIEW');
    if (acceptedRisks) alerts.push('ACCEPTED_RISK_REVIEW');
    if (criticalAssets && !activeServices) alerts.push('CRITICAL_ASSET_SERVICE_COVERAGE_REVIEW');
    return { activeAssets, criticalAssets, activeServices, openFindings, mitigatingFindings, highFindings, criticalFindings, acceptedRisks, alerts, generatedAt: new Date() };
  }

  automationSignals(snapshot: TechnologySecurityGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.criticalFindings) signals.push('REQUIRE_EXECUTIVE_CYBERSECURITY_REVIEW');
    if (snapshot.highFindings) signals.push('CREATE_SECURITY_MITIGATION_FOLLOWUP');
    if (snapshot.acceptedRisks) signals.push('SCHEDULE_ACCEPTED_RISK_REVIEW');
    if (snapshot.openFindings) signals.push('REVIEW_OPEN_SECURITY_FINDINGS');
    return signals;
  }
}
