import { authorityCurrent } from './executive-authority.policy';
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
    if ((decision !== 'APPROVE' && decision !== 'REJECT') || !approval.requestedByAccountId || !approverId || approval.decision) throw new BadRequestException('Pending executive approval and approver are required.');
    if (approverId === approval.requestedByAccountId) throw new BadRequestException('Independent executive approval is required.');
    return { ...approval, approverAccountId: approverId, decision };
  }

  issue(decision: ExecutiveDecision, approval: ExecutiveDecisionApproval, body: GovernanceBody, actorId: string, now = new Date()): ExecutiveDecision {
    if (!body.active || !body.memberAccountIds.includes(body.chairAccountId)) throw new BadRequestException('Active governance body and chair membership are required.');
    if (!approval.approverAccountId || !body.memberAccountIds.includes(approval.approverAccountId) || !approval.requestedByAccountId || approval.approverAccountId === approval.requestedByAccountId) throw new BadRequestException('Independent governance member approval is required.');
    if (!decision.sourceReference?.trim() || decision.sourceType !== 'HUMAN_DECISION' || !Array.isArray(decision.authorityScope) || !decision.authorityScope.length || !authorityCurrent(decision, now)) throw new BadRequestException('Current human executive decision source and authority are required.');
    if (!actorId || approval.decision !== 'APPROVE') throw new BadRequestException('Approved executive decision and issuer are required.');
    if (decision.status !== ExecutiveDecisionStatus.DRAFT) throw new BadRequestException('Only draft executive decisions can be issued.');
    if (approval.organizationId !== decision.organizationId || approval.executiveDecisionId !== decision.id || body.organizationId !== decision.organizationId || body.id !== decision.governanceBodyId) throw new BadRequestException('Executive decision approval scope mismatch.');
    if (actorId !== body.chairAccountId) throw new BadRequestException('Governance body chair must issue the executive decision.');
    return { ...decision, status: ExecutiveDecisionStatus.ISSUED, issuedByAccountId: actorId, issuedAt: now };
  }

  validateMandatedAction(mandate: ExecutiveMandate, actorId: string, authority: string, now = new Date()): void {
    if (!mandate.sourceReference?.trim() || !authorityCurrent(mandate, now) || !mandate.active || mandate.ownerAccountId !== actorId || !mandate.authorityScope.includes(authority)) throw new BadRequestException('Executive mandate does not authorize this action.');
  }

  close(decision: ExecutiveDecision, actorId: string, result: { summary: string; evidenceReference: string }, now = new Date()): ExecutiveDecision {
    if (!actorId || decision.status !== ExecutiveDecisionStatus.ISSUED) throw new BadRequestException('Only an issued executive decision can be closed.');
    if (actorId !== decision.issuedByAccountId) throw new BadRequestException('Executive decision issuer must close the decision.');
    if (!result?.summary?.trim() || !result?.evidenceReference?.trim()) throw new BadRequestException('Executive result and evidence are required.');
    return { ...decision, status: ExecutiveDecisionStatus.CLOSED, closedAt: now, result: { summary: result.summary.trim(), evidenceReference: result.evidenceReference.trim() } };
  }
}
