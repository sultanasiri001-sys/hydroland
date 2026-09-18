import { BadRequestException, Injectable } from '@nestjs/common';
import { MaintainableAsset, MaintenancePlan } from './facilities-maintenance.domain';

export type MaintenanceWorkOrderStatus = 'REQUESTED' | 'APPROVED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'REJECTED';

export interface MaintenanceWorkOrder {
  id: string;
  organizationId: string;
  assetId: string;
  planId?: string;
  description: string;
  status: MaintenanceWorkOrderStatus;
  requestedBy: string;
  approvedBy?: string;
  assignedTo?: string;
  scheduledAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class FacilitiesMaintenanceWorkflowService {
  request(asset: MaintainableAsset, description: string, requesterId: string, plan?: MaintenancePlan): MaintenanceWorkOrder {
    if (!requesterId || !description.trim()) throw new BadRequestException('Maintenance requester and description are required.');
    if (asset.status === 'RETIRED') throw new BadRequestException('Retired assets cannot receive maintenance work orders.');
    if (plan && (plan.assetId !== asset.id || plan.organizationId !== asset.organizationId)) throw new BadRequestException('Maintenance plan asset scope mismatch.');
    return { id: `maintenance-${asset.id}-${Date.now()}`, organizationId: asset.organizationId, assetId: asset.id, planId: plan?.id, description, status: 'REQUESTED', requestedBy: requesterId };
  }

  decide(order: MaintenanceWorkOrder, approverId: string, decision: 'APPROVED' | 'REJECTED'): MaintenanceWorkOrder {
    if (order.status !== 'REQUESTED') throw new BadRequestException('Only requested work orders can be decided.');
    if (!approverId || approverId === order.requestedBy) throw new BadRequestException('Independent maintenance approver is required.');
    return { ...order, status: decision, approvedBy: approverId };
  }

  schedule(order: MaintenanceWorkOrder, assigneeId: string, scheduledAt: Date): MaintenanceWorkOrder {
    if (order.status !== 'APPROVED') throw new BadRequestException('Only approved work orders can be scheduled.');
    if (!assigneeId || Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Valid assignee and schedule are required.');
    return { ...order, status: 'SCHEDULED', assignedTo: assigneeId, scheduledAt };
  }

  start(order: MaintenanceWorkOrder, actorId: string): MaintenanceWorkOrder {
    if (order.status !== 'SCHEDULED' || !order.assignedTo || order.assignedTo !== actorId) throw new BadRequestException('Assigned technician must start a scheduled work order.');
    return { ...order, status: 'IN_PROGRESS' };
  }

  complete(order: MaintenanceWorkOrder, actorId: string): MaintenanceWorkOrder {
    if (order.status !== 'IN_PROGRESS' || order.assignedTo !== actorId) throw new BadRequestException('Assigned technician must complete an in-progress work order.');
    return { ...order, status: 'COMPLETED', completedAt: new Date() };
  }

  close(order: MaintenanceWorkOrder, closerId: string): MaintenanceWorkOrder {
    if (order.status !== 'COMPLETED' || !closerId) throw new BadRequestException('Completed work order and closer are required.');
    if (closerId === order.assignedTo) throw new BadRequestException('Independent maintenance closure is required.');
    return { ...order, status: 'CLOSED' };
  }
}
