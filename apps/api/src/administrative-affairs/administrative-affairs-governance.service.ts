import { Injectable } from '@nestjs/common';
import { AdministrativeRecord, AdministrativeRecordStatus } from './administrative-affairs.domain';
import { AdministrativeRoutingRequest } from './administrative-affairs-workflow.service';

export interface AdministrativeAffairsGovernanceSnapshot {
  draftRecords: number;
  registeredRecords: number;
  archivedRecords: number;
  pendingDecisions: number;
  unassignedRoutings: number;
  rejectedRoutings: number;
  alerts: string[];
  generatedAt: Date;
}

@Injectable()
export class AdministrativeAffairsGovernanceService {
  snapshot(records: AdministrativeRecord[], routings: AdministrativeRoutingRequest[], now = new Date()): AdministrativeAffairsGovernanceSnapshot {
    const draftRecords = records.filter((item) => item.status === AdministrativeRecordStatus.DRAFT).length;
    const registeredRecords = records.filter((item) => item.status === AdministrativeRecordStatus.REGISTERED).length;
    const archivedRecords = records.filter((item) => item.status === AdministrativeRecordStatus.ARCHIVED).length;
    const pendingDecisions = routings.filter((item) => item.assignedTo && !item.decision).length;
    const unassignedRoutings = routings.filter((item) => !item.assignedTo && !item.decision).length;
    const rejectedRoutings = routings.filter((item) => item.decision === 'REJECT').length;
    const alerts: string[] = [];
    if (pendingDecisions) alerts.push('PENDING_ADMINISTRATIVE_DECISION_REVIEW');
    if (unassignedRoutings) alerts.push('UNASSIGNED_ADMINISTRATIVE_ROUTING');
    if (rejectedRoutings) alerts.push('REJECTED_ADMINISTRATIVE_ROUTING_REVIEW');
    if (draftRecords) alerts.push('DRAFT_ADMINISTRATIVE_RECORD_REVIEW');
    return { draftRecords, registeredRecords, archivedRecords, pendingDecisions, unassignedRoutings, rejectedRoutings, alerts, generatedAt: now };
  }

  automationSignals(snapshot: AdministrativeAffairsGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.pendingDecisions) signals.push('ESCALATE_PENDING_ADMINISTRATIVE_DECISIONS');
    if (snapshot.unassignedRoutings) signals.push('ASSIGN_PENDING_ADMINISTRATIVE_ROUTINGS');
    if (snapshot.rejectedRoutings) signals.push('CREATE_REJECTED_ROUTING_FOLLOWUP');
    if (snapshot.draftRecords) signals.push('REVIEW_UNREGISTERED_ADMINISTRATIVE_RECORDS');
    return signals;
  }
}
