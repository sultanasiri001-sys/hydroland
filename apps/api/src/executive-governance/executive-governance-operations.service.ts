import { BadRequestException, Injectable } from '@nestjs/common';
import { ExecutiveDecision, ExecutiveDecisionStatus, ExecutiveMandate } from './executive-governance.domain';

export type ExecutiveOperationType =
  | 'HR' | 'TRAINING' | 'MARINE_OPERATIONS' | 'INVENTORY' | 'FINANCE'
  | 'SAFETY' | 'CUSTOMER_SERVICE' | 'MARKETING' | 'TECHNOLOGY_SECURITY'
  | 'FACILITIES_MAINTENANCE' | 'ADMINISTRATIVE_AFFAIRS';

export interface ExecutiveOperationalContext {
  organizationId: string;
  operationType: ExecutiveOperationType;
  operationId: string;
  decision: ExecutiveDecision;
  mandate?: ExecutiveMandate;
  actorAccountId: string;
  requiredEvidenceComplete: boolean;
}

export interface ExecutiveOperationalReadiness {
  allowed: boolean;
  blockers: string[];
}

@Injectable()
export class ExecutiveGovernanceOperationsService {
  readiness(context: ExecutiveOperationalContext): ExecutiveOperationalReadiness {
    if (!context.organizationId || !context.operationId || !context.actorAccountId) throw new BadRequestException('Executive operational scope and actor are required.');
    if (context.decision.organizationId !== context.organizationId) throw new BadRequestException('Executive decision organization mismatch.');

    const blockers: string[] = [];
    if (context.decision.status !== ExecutiveDecisionStatus.ISSUED) blockers.push('EXECUTIVE_DECISION_NOT_ISSUED');
    if (!context.requiredEvidenceComplete) blockers.push('EXECUTIVE_EVIDENCE_INCOMPLETE');

    if (context.mandate) {
      if (context.mandate.organizationId !== context.organizationId) throw new BadRequestException('Executive mandate organization mismatch.');
      if (!context.mandate.active) blockers.push('EXECUTIVE_MANDATE_INACTIVE');
      if (context.mandate.ownerAccountId !== context.actorAccountId) blockers.push('EXECUTIVE_MANDATE_ACTOR_MISMATCH');
      if (!context.mandate.authorityScope.includes(context.operationType)) blockers.push('EXECUTIVE_MANDATE_SCOPE_MISSING');
    } else if (context.decision.issuedByAccountId !== context.actorAccountId) {
      blockers.push('EXECUTIVE_AUTHORITY_NOT_ESTABLISHED');
    }

    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  requireReady(context: ExecutiveOperationalContext): ExecutiveOperationalReadiness {
    const result = this.readiness(context);
    if (!result.allowed) throw new BadRequestException(`Executive operation blocked: ${result.blockers.join(', ')}`);
    return result;
  }
}
