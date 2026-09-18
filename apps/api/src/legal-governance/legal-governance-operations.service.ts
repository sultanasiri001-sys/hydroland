import { BadRequestException, Injectable } from '@nestjs/common';
import { InsurancePolicy, InsuranceStatus, LegalDocument, LegalDocumentStatus, LegalObligation } from './legal-governance.domain';

export type LegalOperationalSource =
  | 'HR' | 'TRAINING' | 'MARINE_OPERATIONS' | 'INVENTORY' | 'FINANCE' | 'SAFETY'
  | 'CUSTOMER_SERVICE' | 'MARKETING' | 'TECHNOLOGY_SECURITY' | 'FACILITIES_MAINTENANCE'
  | 'ADMINISTRATIVE_AFFAIRS' | 'EXECUTIVE_GOVERNANCE' | 'RESEARCH_MARKET';

export interface LegalOperationalContext {
  organizationId: string; source: LegalOperationalSource; sourceRecordId: string;
  legalDocuments: LegalDocument[]; obligations: LegalObligation[];
  requiredInsurance?: InsurancePolicy; now?: Date;
}
export interface LegalOperationalReadiness { allowed: boolean; blockers: string[]; }

@Injectable()
export class LegalGovernanceOperationsService {
  readiness(context: LegalOperationalContext): LegalOperationalReadiness {
    if (!context.organizationId || !context.sourceRecordId) throw new BadRequestException('Legal operational scope and source record are required.');
    const now = context.now ?? new Date();
    const blockers: string[] = [];

    for (const document of context.legalDocuments) {
      if (document.organizationId !== context.organizationId) throw new BadRequestException('Legal document organization mismatch.');
      if (document.status !== LegalDocumentStatus.ACTIVE) blockers.push('REQUIRED_LEGAL_DOCUMENT_NOT_ACTIVE');
      if (document.effectiveAt && document.effectiveAt > now) blockers.push('LEGAL_DOCUMENT_NOT_YET_EFFECTIVE');
      if (document.expiresAt && document.expiresAt <= now) blockers.push('LEGAL_DOCUMENT_EXPIRED');
    }

    for (const obligation of context.obligations) {
      if (obligation.organizationId !== context.organizationId) throw new BadRequestException('Legal obligation organization mismatch.');
      if (!context.legalDocuments.some(d => d.id === obligation.legalDocumentId)) throw new BadRequestException('Legal obligation document is outside operational scope.');
      if (!obligation.fulfilled && obligation.dueAt && obligation.dueAt <= now) blockers.push('OVERDUE_LEGAL_OBLIGATION');
    }

    if (context.requiredInsurance) {
      const policy = context.requiredInsurance;
      if (policy.organizationId !== context.organizationId) throw new BadRequestException('Insurance organization mismatch.');
      if (policy.status !== InsuranceStatus.ACTIVE || now < policy.startsAt || now >= policy.expiresAt) blockers.push('REQUIRED_INSURANCE_NOT_ACTIVE');
    }

    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
  }

  requireReady(context: LegalOperationalContext): LegalOperationalReadiness {
    const result = this.readiness(context);
    if (!result.allowed) throw new BadRequestException(`Legal operational readiness blocked: ${result.blockers.join(', ')}`);
    return result;
  }
}
