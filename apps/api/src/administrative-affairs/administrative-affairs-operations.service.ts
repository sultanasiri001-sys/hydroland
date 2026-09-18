import { BadRequestException, Injectable } from '@nestjs/common';
import { AdministrativeRecord, AdministrativeRecordStatus } from './administrative-affairs.domain';
import { AdministrativeRoutingRequest } from './administrative-affairs-workflow.service';

export type AdministrativeOperationType =
  | 'HR'
  | 'TRAINING'
  | 'MARINE_OPERATIONS'
  | 'INVENTORY'
  | 'FINANCE'
  | 'SAFETY'
  | 'CUSTOMER_SERVICE'
  | 'MARKETING'
  | 'TECHNOLOGY_SECURITY'
  | 'FACILITIES_MAINTENANCE';

export interface AdministrativeOperationalContext {
  organizationId: string;
  operationType: AdministrativeOperationType;
  operationId: string;
  record: AdministrativeRecord;
  routing?: AdministrativeRoutingRequest;
  requiredAcknowledgementsComplete: boolean;
}

export interface AdministrativeOperationalReadiness {
  allowed: boolean;
  blockers: string[];
}

@Injectable()
export class AdministrativeAffairsOperationsService {
  readiness(context: AdministrativeOperationalContext): AdministrativeOperationalReadiness {
    if (!context.organizationId || !context.operationId) throw new BadRequestException('Administrative operational scope is required.');
    if (context.record.organizationId !== context.organizationId) throw new BadRequestException('Administrative record organization mismatch.');

    const blockers: string[] = [];
    if (context.record.status === AdministrativeRecordStatus.DRAFT) blockers.push('ADMINISTRATIVE_RECORD_NOT_REGISTERED');
    if (context.record.status === AdministrativeRecordStatus.ARCHIVED) blockers.push('ADMINISTRATIVE_RECORD_ARCHIVED');
    if (!context.requiredAcknowledgementsComplete) blockers.push('REQUIRED_ACKNOWLEDGEMENTS_INCOMPLETE');

    if (context.routing) {
      if (context.routing.organizationId !== context.organizationId || context.routing.recordId !== context.record.id) throw new BadRequestException('Administrative routing operational scope mismatch.');
      if (!context.routing.assignedTo) blockers.push('ADMINISTRATIVE_ROUTING_UNASSIGNED');
      if (!context.routing.decision) blockers.push('ADMINISTRATIVE_DECISION_PENDING');
      if (context.routing.decision === 'REJECT') blockers.push('ADMINISTRATIVE_DECISION_REJECTED');
    }

    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  requireReady(context: AdministrativeOperationalContext): AdministrativeOperationalReadiness {
    const result = this.readiness(context);
    if (!result.allowed) throw new BadRequestException(`Administrative operation blocked: ${result.blockers.join(', ')}`);
    return result;
  }
}
