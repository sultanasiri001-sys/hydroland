import { Injectable } from '@nestjs/common';
import { InnovationOpportunity, MarketStudy, ResearchInitiative, ResearchInitiativeStatus } from './research-market.domain';

export interface ResearchMarketGovernanceSnapshot {
  proposedInitiatives: number; activeInitiatives: number; completedInitiatives: number;
  evidenceBackedStudies: number; studiesWithoutEvidence: number; innovationOpportunities: number;
  unlinkedOpportunities: number; alerts: string[]; generatedAt: Date;
}

@Injectable()
export class ResearchMarketGovernanceService {
  snapshot(initiatives: ResearchInitiative[], studies: MarketStudy[], opportunities: InnovationOpportunity[], now = new Date()): ResearchMarketGovernanceSnapshot {
    const proposedInitiatives = initiatives.filter(i => i.status === ResearchInitiativeStatus.PROPOSED).length;
    const activeInitiatives = initiatives.filter(i => i.status === ResearchInitiativeStatus.ACTIVE).length;
    const completedInitiatives = initiatives.filter(i => i.status === ResearchInitiativeStatus.COMPLETED).length;
    const evidenceBackedStudies = studies.filter(s => s.evidenceReferences?.length).length;
    const studiesWithoutEvidence = studies.length - evidenceBackedStudies;
    const studyIds = new Set(studies.map(s => s.id));
    const innovationOpportunities = opportunities.length;
    const unlinkedOpportunities = opportunities.filter(o => o.sourceStudyId && !studyIds.has(o.sourceStudyId)).length;
    const alerts: string[] = [];
    if (proposedInitiatives) alerts.push('PROPOSED_RESEARCH_INITIATIVE_REVIEW');
    if (studiesWithoutEvidence) alerts.push('MARKET_STUDY_EVIDENCE_REMEDIATION');
    if (unlinkedOpportunities) alerts.push('INNOVATION_OPPORTUNITY_TRACEABILITY_REVIEW');
    if (activeInitiatives && !evidenceBackedStudies) alerts.push('ACTIVE_RESEARCH_WITHOUT_EVIDENCE_BACKED_STUDY');
    return { proposedInitiatives, activeInitiatives, completedInitiatives, evidenceBackedStudies, studiesWithoutEvidence, innovationOpportunities, unlinkedOpportunities, alerts, generatedAt: now };
  }

  automationSignals(snapshot: ResearchMarketGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.proposedInitiatives) signals.push('REVIEW_PROPOSED_RESEARCH_INITIATIVES');
    if (snapshot.studiesWithoutEvidence) signals.push('REMEDIATE_MARKET_STUDY_EVIDENCE');
    if (snapshot.unlinkedOpportunities) signals.push('RECONCILE_INNOVATION_TRACEABILITY');
    if (snapshot.activeInitiatives) signals.push('MONITOR_ACTIVE_RESEARCH_INITIATIVES');
    if (snapshot.innovationOpportunities) signals.push('REVIEW_INNOVATION_PIPELINE');
    return signals;
  }
}
