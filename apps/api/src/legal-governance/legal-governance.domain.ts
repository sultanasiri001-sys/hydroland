export enum LegalDocumentType { CONTRACT='CONTRACT', AGREEMENT='AGREEMENT', WAIVER='WAIVER', POLICY='POLICY', LEGAL_OPINION='LEGAL_OPINION' }
export enum LegalDocumentStatus { DRAFT='DRAFT', ACTIVE='ACTIVE', EXPIRED='EXPIRED', TERMINATED='TERMINATED', ARCHIVED='ARCHIVED' }
export enum InsuranceStatus { PENDING='PENDING', ACTIVE='ACTIVE', EXPIRED='EXPIRED', CANCELLED='CANCELLED' }

export interface LegalDocument {
  id: string; organizationId: string; type: LegalDocumentType; title: string;
  ownerAccountId: string; status: LegalDocumentStatus; effectiveAt?: Date; expiresAt?: Date;
}
export interface ContractParty {
  id: string; organizationId: string; legalDocumentId: string; partyType: string; partyReferenceId: string;
}
export interface LegalObligation {
  id: string; organizationId: string; legalDocumentId: string; title: string;
  responsibleAccountId: string; dueAt?: Date; fulfilled: boolean;
}
export interface InsurancePolicy {
  id: string; organizationId: string; policyNumber: string; providerName: string;
  insuredReferenceId: string; status: InsuranceStatus; startsAt: Date; expiresAt: Date;
}
