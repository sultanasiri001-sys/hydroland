export enum ResearchInitiativeStatus { PROPOSED='PROPOSED', ACTIVE='ACTIVE', COMPLETED='COMPLETED', ARCHIVED='ARCHIVED' }
export enum MarketStudyType { MARKET='MARKET', COMPETITOR='COMPETITOR', CUSTOMER='CUSTOMER', TECHNOLOGY='TECHNOLOGY', SERVICE='SERVICE' }

export interface ResearchInitiative {
  id: string; organizationId: string; title: string; ownerAccountId: string;
  objective: string; status: ResearchInitiativeStatus;
}
export interface MarketStudy {
  id: string; organizationId: string; initiativeId?: string; title: string;
  type: MarketStudyType; analystAccountId: string; evidenceReferences: string[];
}
export interface InnovationOpportunity {
  id: string; organizationId: string; title: string; sourceStudyId?: string;
  proposedByAccountId: string; hypothesis: string;
}
