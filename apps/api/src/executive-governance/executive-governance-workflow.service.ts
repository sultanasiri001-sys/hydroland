import { BadRequestException, Injectable } from '@nestjs/common';
import { ExecutiveDecision, ExecutiveDecisionStatus, ExecutiveMandate, GovernanceBody } from './executive-governance.domain';

export type ExecutiveApprovalDecision = 'APPROVE' | 'REJECT';

export interface ExecutiveDecisionApproval {
  id: string;
  organizationId: string;
  executiveDecisionId: string;
  requestedByAccountId: string;
  approverAccountId?: string;
  decision?: ExecutiveApprovalDecision;
}

@Injectable()
export class ExecutiveGovernanceWorkflowService {
  requestApproval(decision: ExecutiveDecision, requesterId: string): ExecutiveDecisionApproval {
    if (!requesterId || decision.status !== ExecutiveDecisionStatus.DRAFT) throw new BadRequestException('Only a draft executive decision can enter approval.');
    return { id: `approval-${decision.id}`, organizationId: decision.organizationId, executiveDecisionId: decision.id, requestedByAccountId: requesterId };
  }

  decide(approval: ExecutiveDecisionApproval, approverId: string, decision: ExecutiveApprovalDecision): ExecutiveDecisionApproval {
    if (!approverId || approval.decision) throw new BadRequestException('Pending executive approval and approver are required.');
    if (approverId === approval.requestedByAccountId) throw new BadRequestException('Independent executive approval is required.');
    return { ...approval, approverAccountId: approverId, decision };
  }

  issue(decision: ExecutiveDecision, approval: ExecutiveDecisionApproval, body: GovernanceBody, actorId: string): ExecutiveDecision {
    if (!actorId || approval.decision !== 'APPROVE') throw new BadRequestException('Approved executive decision and issuer are required.');
    if (decision.status !== ExecutiveDecisionStatus.DRAFT) throw new BadRequestException('Only draft executive decisions can be issued.');
    if (approval.organizationId !== decision.organizationId || approval.executiveDecisionId !== decision.id || body.organizationId !== decision.organizationId || body.id !== decision.governanceBodyId) throw new BadRequestException('Executive decision approval scope mismatch.');
    if (actorId !== body.chairAccountId) throw new BadRequestException('Governance body chair must issue the executive decision.');
    return { ...decision, status: ExecutiveDecisionStatus.ISSUED, issuedByAccountId: actorId, issuedAt: new Date() };
  }

  validateMandatedAction(mandate: ExecutiveMandate, actorId: string, authority: string): void {
    if (!mandate.active || mandate.ownerAccountId !== actorId || !mandate.authorityScope.includes(authority)) throw new BadRequestException('Executive mandate does not authorize this action.');
  }

  close(decision: ExecutiveDecision, actorId: string): ExecutiveDecision {
    if (!actorId || decision.status !== ExecutiveDecisionStatus.ISSUED) throw new BadRequestException('Only an issued executive decision can be closed.');
    return { ...decision, status: ExecutiveDecisionStatus.CLOSED };
  }
}
