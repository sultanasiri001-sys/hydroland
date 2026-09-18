import { Injectable } from '@nestjs/common';
import { CustomerCase } from './customer-service.domain';

export interface CustomerServiceGovernanceSnapshot {
  openCases: number;
  assignedCases: number;
  waitingCustomerCases: number;
  urgentCases: number;
  unresolvedComplaints: number;
  safetyConcerns: number;
  alerts: string[];
  generatedAt: Date;
}

@Injectable()
export class CustomerServiceGovernanceService {
  snapshot(cases: CustomerCase[]): CustomerServiceGovernanceSnapshot {
    const active = cases.filter((record) => record.status !== 'CLOSED');
    const openCases = active.filter((record) => record.status === 'OPEN').length;
    const assignedCases = active.filter((record) => record.status === 'ASSIGNED').length;
    const waitingCustomerCases = active.filter((record) => record.status === 'WAITING_CUSTOMER').length;
    const urgentCases = active.filter((record) => record.priority === 'URGENT').length;
    const unresolvedComplaints = active.filter((record) => record.type === 'COMPLAINT' && record.status !== 'RESOLVED').length;
    const safetyConcerns = active.filter((record) => record.type === 'SAFETY_CONCERN' && record.status !== 'RESOLVED').length;
    const alerts: string[] = [];
    if (urgentCases) alerts.push('URGENT_CASE_ESCALATION');
    if (unresolvedComplaints) alerts.push('COMPLAINT_MANAGEMENT_REVIEW');
    if (safetyConcerns) alerts.push('SAFETY_CONCERN_ESCALATION');
    if (openCases) alerts.push('UNASSIGNED_CASE_REVIEW');
    return { openCases, assignedCases, waitingCustomerCases, urgentCases, unresolvedComplaints, safetyConcerns, alerts, generatedAt: new Date() };
  }

  automationSignals(snapshot: CustomerServiceGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.urgentCases) signals.push('NOTIFY_CUSTOMER_SERVICE_MANAGER');
    if (snapshot.unresolvedComplaints) signals.push('CREATE_COMPLAINT_FOLLOWUP');
    if (snapshot.safetyConcerns) signals.push('NOTIFY_SAFETY_MANAGEMENT');
    if (snapshot.openCases) signals.push('ASSIGN_OPEN_CASES');
    return signals;
  }
}
