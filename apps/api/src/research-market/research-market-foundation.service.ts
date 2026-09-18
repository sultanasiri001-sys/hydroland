import { BadRequestException, Injectable } from '@nestjs/common';
import { InnovationOpportunity, MarketStudy, ResearchInitiative } from './research-market.domain';

@Injectable()
export class ResearchMarketFoundationService {
  validateInitiative(item: ResearchInitiative): ResearchInitiative {
    if (!item.id || !item.organizationId || !item.title || !item.ownerAccountId || !item.objective) throw new BadRequestException('Research initiative identity, scope, owner and objective are required.');
    return item;
  }
  validateStudy(item: MarketStudy, initiative?: ResearchInitiative): MarketStudy {
    if (!item.id || !item.organizationId || !item.title || !item.analystAccountId || !item.evidenceReferences?.length) throw new BadRequestException('Market study identity, scope, analyst and evidence are required.');
    if (initiative && (initiative.id !== item.initiativeId || initiative.organizationId !== item.organizationId)) throw new BadRequestException('Market study initiative scope mismatch.');
    return item;
  }
  validateOpportunity(item: InnovationOpportunity, study?: MarketStudy): InnovationOpportunity {
    if (!item.id || !item.organizationId || !item.title || !item.proposedByAccountId || !item.hypothesis) throw new BadRequestException('Innovation opportunity identity, scope, proposer and hypothesis are required.');
    if (study && (study.id !== item.sourceStudyId || study.organizationId !== item.organizationId)) throw new BadRequestException('Innovation opportunity source scope mismatch.');
    return item;
  }
}
