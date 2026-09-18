import { BadRequestException, Injectable } from '@nestjs/common';
import { AdministrativeRecord, AdministrativeRecordStatus } from './administrative-affairs.domain';

export type AdministrativeDecision = 'APPROVE' | 'REJECT';

export interface AdministrativeRoutingRequest {
  id: string;
  organizationId: string;
  recordId: string;
  fromUnitId: string;
  toUnitId: string;
  requestedBy: string;
  assignedTo?: string;
  decision?: AdministrativeDecision;
  decidedBy?: string;
}

@Injectable()
export class AdministrativeAffairsWorkflowService {
  register(record: AdministrativeRecord, actorId: string): AdministrativeRecord {
    if (!actorId || record.status !== AdministrativeRecordStatus.DRAFT) throw new BadRequestException('Only a valid actor can register a draft administrative record.');
    return { ...record, status: AdministrativeRecordStatus.REGISTERED };
  }

  route(record: AdministrativeRecord, request: AdministrativeRoutingRequest): AdministrativeRoutingRequest {
    if (record.status !== AdministrativeRecordStatus.REGISTERED) throw new BadRequestException('Only registered records can be routed.');
    if (!request.id || !request.requestedBy || !request.fromUnitId || !request.toUnitId || request.fromUnitId === request.toUnitId) throw new BadRequestException('Valid distinct routing units and requester are required.');
    if (request.organizationId !== record.organizationId || request.recordId !== record.id || request.fromUnitId !== record.unitId) throw new BadRequestException('Administrative routing scope mismatch.');
    return { ...request };
  }

  assign(request: AdministrativeRoutingRequest, assigneeId: string): AdministrativeRoutingRequest {
    if (!assigneeId || request.decision) throw new BadRequestException('A pending routing request requires a valid assignee.');
    return { ...request, assignedTo: assigneeId };
  }

  decide(request: AdministrativeRoutingRequest, approverId: string, decision: AdministrativeDecision): AdministrativeRoutingRequest {
    if (!request.assignedTo || !approverId || request.decision) throw new BadRequestException('Assigned pending routing request and approver are required.');
    if (approverId === request.requestedBy) throw new BadRequestException('Independent administrative approval is required.');
    return { ...request, decision, decidedBy: approverId };
  }

  archive(record: AdministrativeRecord, actorId: string): AdministrativeRecord {
    if (!actorId || record.status !== AdministrativeRecordStatus.REGISTERED) throw new BadRequestException('Only registered administrative records can be archived.');
    return { ...record, status: AdministrativeRecordStatus.ARCHIVED };
  }
}
