import { BadRequestException, Injectable } from '@nestjs/common';
import { ContractParty, InsurancePolicy, LegalDocument, LegalObligation } from './legal-governance.domain';

@Injectable()
export class LegalGovernanceFoundationService {
  validateDocument(item: LegalDocument): LegalDocument {
    if (!item.id || !item.organizationId || !item.title || !item.ownerAccountId) throw new BadRequestException('Legal document identity, scope, title and owner are required.');
    if (item.effectiveAt && item.expiresAt && item.expiresAt <= item.effectiveAt) throw new BadRequestException('Legal document expiry must follow effective date.');
    return item;
  }
  validateParty(item: ContractParty, document: LegalDocument): ContractParty {
    if (!item.id || !item.partyType || !item.partyReferenceId) throw new BadRequestException('Contract party identity, type and reference are required.');
    this.assertDocumentScope(item.organizationId, item.legalDocumentId, document);
    return item;
  }
  validateObligation(item: LegalObligation, document: LegalDocument): LegalObligation {
    if (!item.id || !item.title || !item.responsibleAccountId) throw new BadRequestException('Legal obligation identity, title and responsible account are required.');
    this.assertDocumentScope(item.organizationId, item.legalDocumentId, document);
    return item;
  }
  validateInsurance(item: InsurancePolicy): InsurancePolicy {
    if (!item.id || !item.organizationId || !item.policyNumber || !item.providerName || !item.insuredReferenceId || !item.startsAt || !item.expiresAt) throw new BadRequestException('Insurance policy identity, scope, provider, insured reference and coverage dates are required.');
    if (item.expiresAt <= item.startsAt) throw new BadRequestException('Insurance policy expiry must follow coverage start.');
    return item;
  }
  private assertDocumentScope(organizationId: string, documentId: string, document: LegalDocument): void {
    if (document.organizationId !== organizationId || document.id !== documentId) throw new BadRequestException('Legal document scope mismatch.');
  }
}
