import { BadRequestException, Injectable } from '@nestjs/common';
import { ApprovalStepDefinition, ApprovalWorkflowDefinition } from './domain';

export type ApprovalDecision = 'APPROVE' | 'REJECT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalInstance {
  id: string;
  workflowId: string;
  resourceType: string;
  resourceId: string;
  status: ApprovalStatus;
  currentStepOrder?: number;
  completedStepOrders: number[];
  rejectedAtOrder?: number;
}

@Injectable()
export class ApprovalEngineService {
  private orderedSteps(workflow: ApprovalWorkflowDefinition): ApprovalStepDefinition[] {
    const steps = [...workflow.steps].sort((a, b) => a.order - b.order);
    const orders = new Set<number>();
    for (const step of steps) {
      if (!Number.isInteger(step.order) || step.order < 0 || orders.has(step.order)) throw new BadRequestException('Approval workflow step orders must be unique non-negative integers.');
      orders.add(step.order);
    }
    return steps;
  }

  start(workflow: ApprovalWorkflowDefinition, input: { id: string; resourceType: string; resourceId: string }): ApprovalInstance {
    const required = this.orderedSteps(workflow).filter((step) => step.required);
    return {
      id: input.id,
      workflowId: workflow.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: required.length ? 'PENDING' : 'APPROVED',
      currentStepOrder: required[0]?.order,
      completedStepOrders: [],
    };
  }

  decide(workflow: ApprovalWorkflowDefinition, instance: ApprovalInstance, actorRole: string, decision: ApprovalDecision): ApprovalInstance {
    if (instance.status !== 'PENDING' || instance.currentStepOrder == null) throw new BadRequestException('Approval instance is not pending.');
    const required = this.orderedSteps(workflow).filter((step) => step.required);
    const index = required.findIndex((step) => step.order === instance.currentStepOrder);
    if (index < 0) throw new BadRequestException('Current approval step is not valid for this workflow.');
    const step = required[index];
    if (step.actorRole !== actorRole) throw new BadRequestException('Actor role cannot decide the current approval step.');
    if (decision === 'REJECT') return { ...instance, status: 'REJECTED', rejectedAtOrder: step.order, currentStepOrder: undefined };
    const completedStepOrders = [...instance.completedStepOrders, step.order];
    const next = required[index + 1];
    return { ...instance, status: next ? 'PENDING' : 'APPROVED', currentStepOrder: next?.order, completedStepOrders };
  }
}
