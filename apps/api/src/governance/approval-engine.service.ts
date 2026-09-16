import { Injectable } from '@nestjs/common';
import { ApprovalWorkflowDefinition } from './domain';

export interface ApprovalInstance {
  id: string;
  workflowId: string;
  resourceType: string;
  resourceId: string;
  currentStep: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  decisions: ApprovalDecision[];
}

export interface ApprovalDecision {
  step: number;
  actorId: string;
  actorRole: string;
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
  decidedAt: string;
}

@Injectable()
export class ApprovalEngineService {
  start(id: string, workflow: ApprovalWorkflowDefinition, resourceType: string, resourceId: string): ApprovalInstance {
    if (!workflow.steps.length) throw new Error('Approval workflow must contain at least one step');
    return { id, workflowId: workflow.id, resourceType, resourceId, currentStep: 0, status: 'PENDING', decisions: [] };
  }

  decide(instance: ApprovalInstance, workflow: ApprovalWorkflowDefinition, decision: ApprovalDecision): ApprovalInstance {
    if (instance.status !== 'PENDING') throw new Error('Approval instance is not pending');
    const step = workflow.steps[instance.currentStep];
    if (!step || step.order !== decision.step || step.actorRole !== decision.actorRole) {
      throw new Error('Actor is not authorized for the current approval step');
    }

    const decisions = [...instance.decisions, decision];
    if (decision.decision === 'REJECT') return { ...instance, status: 'REJECTED', decisions };
    const nextStep = instance.currentStep + 1;
    if (nextStep >= workflow.steps.length) return { ...instance, currentStep: nextStep, status: 'APPROVED', decisions };
    return { ...instance, currentStep: nextStep, decisions };
  }
}
