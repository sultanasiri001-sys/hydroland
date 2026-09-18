import { Injectable } from '@nestjs/common';
import { ExecutiveDecision, ExecutiveDecisionStatus, ExecutiveMandate, GovernanceBody } from './executive-governance.domain';

export interface ExecutiveGovernanceSnapshot {
  activeGovernanceBodies: number;
  activeMandates: number;
  draftDecisions: number;
  issuedDecisions: number;
  closedDecisions: number;
  supersededDecisions: number;
  issuedDecisionsWithoutActiveMandateCoverage: number;
  alerts: string[];
  generatedAt: Date;
}

@Injectable()
export class ExecutiveGovernanceIntelligenceService {
  snapshot(bodies: GovernanceBody[], mandates: ExecutiveMandate[], decisions: ExecutiveDecision[], now = new Date()): ExecutiveGovernanceSnapshot {
    const activeGovernanceBodies = bodies.filter((item) => item.active).length;
    const activeMandates = mandates.filter((item) => item.active).length;
    const draftDecisions = decisions.filter((item) => item.status === ExecutiveDecisionStatus.DRAFT).length;
    const issuedDecisions = decisions.filter((item) => item.status === ExecutiveDecisionStatus.ISSUED).length;
    const closedDecisions = decisions.filter((item) => item.status === ExecutiveDecisionStatus.CLOSED).length;
    const supersededDecisions = decisions.filter((item) => item.status === ExecutiveDecisionStatus.SUPERSEDED).length;
    const activeMandateOwners = new Set(mandates.filter((item) => item.active).map((item) => item.ownerAccountId));
    const issuedDecisionsWithoutActiveMandateCoverage = decisions.filter((item) =>
      item.status === ExecutiveDecisionStatus.ISSUED && !activeMandateOwners.has(item.issuedByAccountId)
    ).length;

    const alerts: string[] = [];
    if (draftDecisions) alerts.push('EXECUTIVE_DRAFT_DECISION_REVIEW');
    if (issuedDecisionsWithoutActiveMandateCoverage) alerts.push('EXECUTIVE_AUTHORITY_COVERAGE_REVIEW');
    if (!activeGovernanceBodies) alerts.push('GOVERNANCE_BODY_CONTINUITY_REVIEW');
    if (!activeMandates) alerts.push('EXECUTIVE_MANDATE_CONTINUITY_REVIEW');

    return { activeGovernanceBodies, activeMandates, draftDecisions, issuedDecisions, closedDecisions, supersededDecisions, issuedDecisionsWithoutActiveMandateCoverage, alerts, generatedAt: now };
  }

  automationSignals(snapshot: ExecutiveGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.draftDecisions) signals.push('REVIEW_PENDING_EXECUTIVE_DECISIONS');
    if (snapshot.issuedDecisionsWithoutActiveMandateCoverage) signals.push('REVIEW_EXECUTIVE_AUTHORITY_COVERAGE');
    if (!snapshot.activeGovernanceBodies) signals.push('ESCALATE_GOVERNANCE_BODY_CONTINUITY');
    if (!snapshot.activeMandates) signals.push('ESCALATE_EXECUTIVE_MANDATE_CONTINUITY');
    if (snapshot.issuedDecisions) signals.push('MONITOR_ISSUED_EXECUTIVE_DECISIONS');
    return signals;
  }
}
