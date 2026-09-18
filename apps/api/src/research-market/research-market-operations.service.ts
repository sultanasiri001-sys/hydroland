import { BadRequestException, Injectable } from '@nestjs/common';
import { InnovationOpportunity, MarketStudy, ResearchInitiative, ResearchInitiativeStatus } from './research-market.domain';

export type ResearchOperationalSource =
  | 'TRAINING' | 'MARINE_OPERATIONS' | 'INVENTORY' | 'FINANCE' | 'SAFETY'
  | 'CUSTOMER_SERVICE' | 'MARKETING' | 'TECHNOLOGY_SECURITY'
  | 'FACILITIES_MAINTENANCE' | 'ADMINISTRATIVE_AFFAIRS' | 'EXECUTIVE_GOVERNANCE';

export interface ResearchOperationalContext {
  organizationId: string;
  source: ResearchOperationalSource;
  sourceRecordId: string;
  initiative: ResearchInitiative;
  study?: MarketStudy;
  opportunity?: InnovationOpportunity;
  evidenceComplete: boolean;
  approvedForOperationalUse: boolean;
}

export interface ResearchOperationalReadiness { allowed: boolean; blockers: string[]; }

@Injectable()
export class ResearchMarketOperationsService {
  readiness(context: ResearchOperationalContext): ResearchOperationalReadiness {
    if (!context.organizationId || !context.sourceRecordId) throw new BadRequestException('Research operational scope and source record are required.');
    if (context.initiative.organizationId !== context.organizationId) throw new BadRequestException('Research initiative organization mismatch.');

    const blockers: string[] = [];
    if (context.initiative.status !== ResearchInitiativeStatus.ACTIVE && context.initiative.status !== ResearchInitiativeStatus.COMPLETED) blockers.push('RESEARCH_INITIATIVE_NOT_OPERATIONALLY_ELIGIBLE');
    if (!context.evidenceComplete) blockers.push('RESEARCH_EVIDENCE_INCOMPLETE');
    if (!context.approvedForOperationalUse) blockers.push('RESEARCH_OPERATIONAL_USE_NOT_APPROVED');

    if (context.study) {
      if (context.study.organizationId !== context.organizationId) throw new BadRequestException('Market study organization mismatch.');
      if (context.study.initiativeId && context.study.initiativeId !== context.initiative.id) throw new BadRequestException('Market study initiative mismatch.');
      if (!context.study.evidenceReferences?.length) blockers.push('MARKET_STUDY_EVIDENCE_MISSING');
    }

    if (context.opportunity) {
      if (context.opportunity.organizationId !== context.organizationId) throw new BadRequestException('Innovation opportunity organization mismatch.');
      if (context.study && context.opportunity.sourceStudyId && context.opportunity.sourceStudyId !== context.study.id) throw new BadRequestException('Innovation opportunity source study mismatch.');
    }

    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  requireReady(context: ResearchOperationalContext): ResearchOperationalReadiness {
    const result = this.readiness(context);
    if (!result.allowed) throw new BadRequestException(`Research operational use blocked: ${result.blockers.join(', ')}`);
    return result;
  }
}
