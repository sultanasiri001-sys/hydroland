import { BadRequestException, Injectable } from '@nestjs/common';
import { CybersecurityFinding } from './technology-security.domain';

export type SecurityDecision = 'RESOLVE' | 'ACCEPT_RISK';
export type SecurityApprovalStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';

export interface SecurityApprovalRequest {
  id: string;
  findingId: string;
  organizationId: string;
  decision: SecurityDecision;
  status: SecurityApprovalStatus;
  requestedBy: string;
  approvedBy?: string;
}

@Injectable()
export class TechnologySecurityWorkflowService {
  beginMitigation(finding: CybersecurityFinding, actorId: string): CybersecurityFinding {
    if (!actorId) throw new BadRequestException('Mitigation actor is required.');
    if (finding.status !== 'OPEN') throw new BadRequestException('Only open findings can begin mitigation.');
    return { ...finding, status: 'MITIGATING' };
  }

  requestDecision(finding: CybersecurityFinding, decision: SecurityDecision, requesterId: string): SecurityApprovalRequest {
    if (!requesterId) throw new BadRequestException('Requester is required.');
    if (finding.status !== 'MITIGATING' && decision === 'RESOLVE') throw new BadRequestException('Resolution requires mitigation state.');
    if (finding.status !== 'OPEN' && finding.status !== 'MITIGATING') throw new BadRequestException('Finding cannot request a decision from its current state.');
    return { id: `security-approval-${finding.id}-${decision}`, findingId: finding.id, organizationId: finding.organizationId, decision, status: 'REQUESTED', requestedBy: requesterId };
  }

  decide(request: SecurityApprovalRequest, approverId: string, status: 'APPROVED' | 'REJECTED'): SecurityApprovalRequest {
    if (request.status !== 'REQUESTED') throw new BadRequestException('Security approval request is already decided.');
    if (!approverId || request.requestedBy === approverId) throw new BadRequestException('Independent security approver is required.');
    return { ...request, status, approvedBy: approverId };
  }

  applyDecision(finding: CybersecurityFinding, request: SecurityApprovalRequest): CybersecurityFinding {
    if (request.findingId !== finding.id || request.organizationId !== finding.organizationId || request.status !== 'APPROVED') throw new BadRequestException('Approved security decision is required.');
    return { ...finding, status: request.decision === 'RESOLVE' ? 'RESOLVED' : 'ACCEPTED' };
  }
}
